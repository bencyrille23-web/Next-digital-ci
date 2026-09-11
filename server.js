require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "next-digital.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'En attente',
  created_at TEXT NOT NULL
);
`);

const products = [
  ["netflix-essential","Netflix Essentiel","Netflix",5500,"1 mois"],
  ["netflix-standard","Netflix Standard","Netflix",7500,"1 mois"],
  ["netflix-premium","Netflix Premium","Netflix",9500,"1 mois"],
  ["netflix-standard-year","Netflix Standard","Netflix",15000,"1 an"],
  ["netflix-premium-year","Netflix Premium","Netflix",25000,"1 an"],
  ["prime-standard","Prime Video Standard","Prime Video",6500,"1 mois"],
  ["prime-premium","Prime Video Premium","Prime Video",8000,"1 mois"],
  ["prime-standard-year","Prime Video Standard","Prime Video",15000,"1 an"],
  ["prime-premium-year","Prime Video Premium","Prime Video",20000,"1 an"],
  ["spotify-month","Spotify","Spotify",2500,"1 mois"],
  ["spotify-3months","Spotify","Spotify",5000,"3 mois"],
  ["spotify-year","Spotify","Spotify",15000,"1 an"]
].map(([id,name,category,price,duration])=>({id,name,category,price,duration}));

function makeRef(){
  return "NDC-" + Date.now().toString(36).toUpperCase() + "-" +
    Math.random().toString(36).slice(2,6).toUpperCase();
}
function auth(req,res,next){
  const token=req.cookies.ndc_admin;
  try { req.admin=jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch(e){ return res.status(401).json({error:"Non autorisé"}); }
}
function sendConfirmationEmail(order){
  if(!process.env.SMTP_HOST || !order.email) return Promise.resolve();
  const transporter=nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:Number(process.env.SMTP_PORT||587),
    secure:String(process.env.SMTP_SECURE)==="true",
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
  });
  return transporter.sendMail({
    from:process.env.SMTP_FROM || process.env.SMTP_USER,
    to:order.email,
    subject:`Commande ${order.ref} — Next Digital CI`,
    text:`Bonjour ${order.customer_name},\n\nVotre commande ${order.ref} a bien été reçue.\nProduit : ${order.product_name}\nMontant : ${order.amount} F CFA\nStatut : ${order.status}\n\nMerci pour votre confiance.\nNext Digital CI`
  }).catch(()=>{});
}

app.get("/api/products",(req,res)=>res.json(products));

app.post("/api/orders", async (req,res)=>{
  const {name,phone,email,productId,paymentMethod,note}=req.body||{};
  const p=products.find(x=>x.id===productId);
  if(!name || !phone || !p) return res.status(400).json({error:"Informations de commande incomplètes."});
  const ref=makeRef(), createdAt=new Date().toISOString();
  db.prepare(`INSERT INTO orders
    (ref,customer_name,phone,email,product_id,product_name,amount,payment_method,note,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'En attente',?)`)
    .run(ref,name.trim(),phone.trim(),email?.trim()||"",p.id,p.name,p.price,paymentMethod||"Non précisé",note?.trim()||"",createdAt);
  const order={ref,customer_name:name.trim(),phone:phone.trim(),email:email?.trim()||"",product_name:p.name,amount:p.price,status:"En attente",created_at:createdAt};
  await sendConfirmationEmail(order);
  res.json({ok:true,order});
});

app.get("/api/orders/:ref",(req,res)=>{
  const row=db.prepare("SELECT ref,customer_name,product_name,amount,status,payment_method,created_at FROM orders WHERE ref=?").get(req.params.ref);
  if(!row) return res.status(404).json({error:"Commande introuvable."});
  res.json(row);
});

app.post("/api/admin/login",(req,res)=>{
  const {email,password}=req.body||{};
  if(email!==process.env.ADMIN_EMAIL || password!==process.env.ADMIN_PASSWORD)
    return res.status(401).json({error:"Identifiants incorrects."});
  const token=jwt.sign({email,role:"admin"},process.env.JWT_SECRET,{expiresIn:"7d"});
  res.cookie("ndc_admin",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*60*60*1000});
  res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{res.clearCookie("ndc_admin");res.json({ok:true});});
app.get("/api/admin/me",auth,(req,res)=>res.json({ok:true,email:req.admin.email}));

app.get("/api/admin/orders",auth,(req,res)=>{
  const rows=db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  const stats=db.prepare(`SELECT
    COUNT(*) total,
    COALESCE(SUM(amount),0) revenue,
    COALESCE(SUM(CASE WHEN status='En attente' THEN 1 ELSE 0 END),0) pending
    FROM orders`).get();
  res.json({orders:rows,stats});
});

app.patch("/api/admin/orders/:id",auth,(req,res)=>{
  const allowed=["En attente","Confirmée","Livrée","Annulée"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:"Statut invalide."});
  const result=db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);
  if(!result.changes) return res.status(404).json({error:"Commande introuvable."});
  res.json({ok:true});
});

app.use(express.static(__dirname));
app.get("*",(req,res)=>{
  if(req.path.startsWith("/api/")) return res.status(404).json({error:"API introuvable"});
  res.sendFile(path.join(__dirname,"index.html"));
});

app.listen(PORT,"0.0.0.0",()=>console.log(`Next Digital CI lancé sur ${PORT}`));
