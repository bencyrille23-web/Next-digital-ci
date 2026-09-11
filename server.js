require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");

fs.mkdirSync(DATA, { recursive: true });

const db = new Database(path.join(DATA, "nextdigitalci.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  product TEXT NOT NULL,
  plan TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'En attente',
  payment_status TEXT NOT NULL DEFAULT 'En attente',
  account_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  plan TEXT,
  identifier TEXT NOT NULL,
  secret_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'À tester',
  start_date TEXT,
  expiry_date TEXT,
  assigned_order_ref TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

const products = [
  {id:"netflix-public-1m", service:"Netflix", plan:"Public — 1 mois", amount:2000},
  {id:"netflix-public-2m", service:"Netflix", plan:"Public — 2 mois", amount:3000},
  {id:"netflix-public-3m", service:"Netflix", plan:"Public — 3 mois", amount:5000},
  {id:"netflix-public-6m", service:"Netflix", plan:"Public — 6 mois", amount:7000},
  {id:"netflix-public-12m", service:"Netflix", plan:"Public — 12 mois", amount:12000},
  {id:"netflix-private-essential-m", service:"Netflix", plan:"Privé Essentiel — 1 mois", amount:5500},
  {id:"netflix-private-standard-m", service:"Netflix", plan:"Privé Standard — 1 mois", amount:7500},
  {id:"netflix-private-premium-m", service:"Netflix", plan:"Privé Premium — 1 mois", amount:9500},
  {id:"netflix-private-es-standard-y", service:"Netflix", plan:"Privé Essentiel + Standard — 1 an", amount:15000},
  {id:"netflix-private-premium-y", service:"Netflix", plan:"Privé Premium — 1 an", amount:25000},

  {id:"prime-public-1m", service:"Prime Video", plan:"Public — 1 mois", amount:2000},
  {id:"prime-public-2m", service:"Prime Video", plan:"Public — 2 mois", amount:3000},
  {id:"prime-public-3m", service:"Prime Video", plan:"Public — 3 mois", amount:5000},
  {id:"prime-public-6m", service:"Prime Video", plan:"Public — 6 mois", amount:7000},
  {id:"prime-public-12m", service:"Prime Video", plan:"Public — 12 mois", amount:10000},
  {id:"prime-private-standard-m", service:"Prime Video", plan:"Privé Standard — 1 mois", amount:6500},
  {id:"prime-private-premium-m", service:"Prime Video", plan:"Privé Premium — 1 mois", amount:8000},
  {id:"prime-private-standard-y", service:"Prime Video", plan:"Privé Standard — 1 an", amount:15000},
  {id:"prime-private-premium-y", service:"Prime Video", plan:"Privé Premium — 1 an", amount:20000},

  {id:"spotify-1m", service:"Spotify", plan:"1 mois", amount:2000},
  {id:"spotify-3m", service:"Spotify", plan:"3 mois", amount:5000},
  {id:"spotify-6m", service:"Spotify", plan:"6 mois", amount:8000},
  {id:"spotify-12m", service:"Spotify", plan:"12 mois", amount:15000},
  {id:"spotify-unlimited", service:"Spotify", plan:"Illimité", amount:22000},

  {id:"applemusic-1m", service:"Apple Music", plan:"1 mois", amount:2000},
  {id:"applemusic-3m", service:"Apple Music", plan:"3 mois", amount:5000},
  {id:"applemusic-6m", service:"Apple Music", plan:"6 mois", amount:8000},
  {id:"applemusic-12m", service:"Apple Music", plan:"12 mois", amount:15000},
  {id:"applemusic-unlimited", service:"Apple Music", plan:"Illimité", amount:22000},

  {id:"deezer-1m", service:"Deezer", plan:"1 mois", amount:2000},
  {id:"deezer-3m", service:"Deezer", plan:"3 mois", amount:5000},
  {id:"deezer-6m", service:"Deezer", plan:"6 mois", amount:8000},
  {id:"deezer-12m", service:"Deezer", plan:"12 mois", amount:15000},
  {id:"deezer-unlimited", service:"Deezer", plan:"Illimité", amount:22000},

  {id:"chatgpt-1m", service:"ChatGPT", plan:"1 mois", amount:10000},
  {id:"chatgpt-3m", service:"ChatGPT", plan:"3 mois", amount:27000},
  {id:"chatgpt-6m", service:"ChatGPT", plan:"6 mois", amount:50000},
  {id:"chatgpt-12m", service:"ChatGPT", plan:"12 mois", amount:90000},

  {id:"m365-1m", service:"Microsoft 365", plan:"1 mois", amount:6000},
  {id:"m365-3m", service:"Microsoft 365", plan:"3 mois", amount:17000},
  {id:"m365-6m", service:"Microsoft 365", plan:"6 mois", amount:32000},
  {id:"m365-12m", service:"Microsoft 365", plan:"12 mois", amount:60000},

  {id:"capcut-1m", service:"CapCut Pro", plan:"1 mois", amount:6000},
  {id:"capcut-3m", service:"CapCut Pro", plan:"3 mois", amount:17000},
  {id:"capcut-6m", service:"CapCut Pro", plan:"6 mois", amount:32000},
  {id:"capcut-12m", service:"CapCut Pro", plan:"12 mois", amount:60000},

  {id:"notion-1m", service:"Notion", plan:"1 mois", amount:5000},
  {id:"notion-3m", service:"Notion", plan:"3 mois", amount:14000},
  {id:"notion-6m", service:"Notion", plan:"6 mois", amount:26000},
  {id:"notion-12m", service:"Notion", plan:"12 mois", amount:50000},

  {id:"claude-pro-1m", service:"Claude Pro", plan:"1 mois", amount:10000},
  {id:"claude-pro-3m", service:"Claude Pro", plan:"3 mois", amount:27000},
  {id:"claude-pro-6m", service:"Claude Pro", plan:"6 mois", amount:50000},
  {id:"claude-pro-12m", service:"Claude Pro", plan:"12 mois", amount:90000},

  {id:"claude-max-1m", service:"Claude Max", plan:"1 mois", amount:15000},
  {id:"claude-max-3m", service:"Claude Max", plan:"3 mois", amount:40000},
  {id:"claude-max-6m", service:"Claude Max", plan:"6 mois", amount:75000},
  {id:"claude-max-12m", service:"Claude Max", plan:"12 mois", amount:135000},

  {id:"pack-decouverte", service:"Pack Découverte", plan:"Netflix 1 mois + Prime 1 mois", amount:6000},
  {id:"pack-duo", service:"Pack Duo", plan:"Netflix 3 mois + Prime 3 mois", amount:12000},
  {id:"pack-family", service:"Pack Family", plan:"Netflix 3 mois + Prime 3 mois + profil dédié", amount:18000},
  {id:"pack-ultimate", service:"Pack Ultimate", plan:"Netflix 6 mois + Prime 6 mois + profil dédié", amount:28000},

  {id:"pack-essentiel-3m", service:"Pack Essentiel", plan:"ChatGPT + CapCut — 3 mois", amount:25000},
  {id:"pack-essentiel-6m", service:"Pack Essentiel", plan:"ChatGPT + CapCut — 6 mois", amount:45000},
  {id:"pack-essentiel-12m", service:"Pack Essentiel", plan:"ChatGPT + CapCut — 12 mois", amount:120000},
  {id:"pack-business-3m", service:"Pack Business", plan:"ChatGPT + Microsoft 365 + CapCut — 3 mois", amount:55000},
  {id:"pack-business-6m", service:"Pack Business", plan:"ChatGPT + Microsoft 365 + CapCut — 6 mois", amount:95000},
  {id:"pack-business-12m", service:"Pack Business", plan:"ChatGPT + Microsoft 365 + CapCut — 12 mois", amount:180000},
  {id:"pack-premium-3m", service:"Pack Premium", plan:"Tous les outils — 3 mois", amount:75000},
  {id:"pack-premium-6m", service:"Pack Premium", plan:"Tous les outils — 6 mois", amount:140000},
  {id:"pack-premium-12m", service:"Pack Premium", plan:"Tous les outils — 12 mois", amount:260000}
];

const encKey = crypto.createHash("sha256")
  .update(String(process.env.CREDENTIAL_ENCRYPTION_KEY || "CHANGE_ME_ENCRYPTION_KEY"))
  .digest();

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(b => b.toString("base64")).join(".");
}
function decrypt(value) {
  if (!value) return "";
  const [ivB, tagB, dataB] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey, Buffer.from(ivB,"base64"));
  decipher.setAuthTag(Buffer.from(tagB,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB,"base64")), decipher.final()]).toString("utf8");
}

function now() { return new Date().toISOString(); }
function makeRef() {
  return "NDC-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
}
function adminAuth(req,res,next) {
  try {
    const token = req.cookies.ndc_admin;
    if (!token) return res.status(401).json({error:"Non autorisé"});
    jwt.verify(token, process.env.JWT_SECRET || "CHANGE_ME_SECRET");
    next();
  } catch {
    res.status(401).json({error:"Session expirée"});
  }
}
function normalizeWhatsApp(phone) {
  let p = String(phone || "").replace(/\D/g,"");
  if (p.startsWith("0")) p = "225" + p.slice(1);
  if (!p.startsWith("225") && p.length <= 10) p = "225" + p;
  return p;
}

app.use(express.json({limit:"1mb"}));
app.use(cookieParser());

// Health check — useful for Railway
app.get("/health", (req,res) => res.json({ok:true, service:"Next Digital CI"}));

// API
app.get("/api/products", (req,res) => res.json(products));

app.post("/api/orders", async (req,res) => {
  try {
    const {customer_name, customer_phone, customer_email, product_id} = req.body || {};
    const product = products.find(p => p.id === product_id);
    if (!customer_name || !customer_phone || !product) {
      return res.status(400).json({error:"Informations de commande incomplètes"});
    }
    let ref = makeRef();
    const created = now();
    db.prepare(`INSERT INTO orders
      (ref,customer_name,customer_phone,customer_email,product,plan,amount,status,payment_status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,'En attente','En attente',?,?)`)
      .run(ref, customer_name.trim(), customer_phone.trim(), customer_email || "",
            product.service, product.plan, product.amount, created, created);

    res.json({ok:true, ref, amount:product.amount, product});
  } catch (e) {
    console.error(e);
    res.status(500).json({error:"Impossible de créer la commande"});
  }
});

app.get("/api/orders/:ref", (req,res) => {
  const row = db.prepare("SELECT ref,customer_name,product,plan,amount,status,payment_status,created_at,updated_at FROM orders WHERE ref=?").get(req.params.ref);
  if (!row) return res.status(404).json({error:"Commande introuvable"});
  res.json(row);
});

app.post("/api/admin/login", (req,res) => {
  const email = String(req.body?.email || "");
  const password = String(req.body?.password || "");
  if (email !== String(process.env.ADMIN_EMAIL || "") || password !== String(process.env.ADMIN_PASSWORD || "")) {
    return res.status(401).json({error:"Identifiants incorrects"});
  }
  const token = jwt.sign({email}, process.env.JWT_SECRET || "CHANGE_ME_SECRET", {expiresIn:"7d"});
  res.cookie("ndc_admin", token, {httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", maxAge:7*24*3600*1000});
  res.json({ok:true});
});
app.post("/api/admin/logout", (req,res) => {
  res.clearCookie("ndc_admin");
  res.json({ok:true});
});
app.get("/api/admin/me", adminAuth, (req,res) => res.json({ok:true}));

app.get("/api/admin/orders", adminAuth, (req,res) => {
  const rows = db.prepare(`
    SELECT o.*, a.identifier AS account_identifier
    FROM orders o LEFT JOIN accounts a ON a.id=o.account_id
    ORDER BY o.id DESC
  `).all();
  res.json(rows);
});

app.patch("/api/admin/orders/:ref/payment", adminAuth, (req,res) => {
  const action = req.body?.action;
  const payment = action === "confirm" ? "Payé" : action === "reject" ? "Refusé" : null;
  if (!payment) return res.status(400).json({error:"Action invalide"});
  const status = action === "confirm" ? "Payé — À livrer" : "Annulée";
  const result = db.prepare("UPDATE orders SET payment_status=?, status=?, updated_at=? WHERE ref=?")
    .run(payment,status,now(),req.params.ref);
  if (!result.changes) return res.status(404).json({error:"Commande introuvable"});
  res.json({ok:true});
});

app.get("/api/admin/accounts", adminAuth, (req,res) => {
  const rows = db.prepare("SELECT id,service,plan,identifier,status,start_date,expiry_date,assigned_order_ref,notes,created_at,updated_at FROM accounts ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/admin/accounts", adminAuth, (req,res) => {
  const {service,plan,identifier,secret,status,start_date,expiry_date,notes} = req.body || {};
  if (!service || !identifier) return res.status(400).json({error:"Service et identifiant obligatoires"});
  const t=now();
  const result=db.prepare(`INSERT INTO accounts
    (service,plan,identifier,secret_encrypted,status,start_date,expiry_date,notes,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(service,plan||"",identifier,encrypt(secret||""),status||"À tester",start_date||null,expiry_date||null,notes||"",t,t);
  res.json({ok:true,id:result.lastInsertRowid});
});

app.patch("/api/admin/accounts/:id", adminAuth, (req,res) => {
  const old=db.prepare("SELECT * FROM accounts WHERE id=?").get(req.params.id);
  if(!old) return res.status(404).json({error:"Compte introuvable"});
  const b=req.body||{};
  db.prepare(`UPDATE accounts SET service=?,plan=?,identifier=?,secret_encrypted=?,status=?,start_date=?,expiry_date=?,notes=?,updated_at=? WHERE id=?`)
    .run(b.service??old.service,b.plan??old.plan,b.identifier??old.identifier,
      b.secret!==undefined?encrypt(b.secret):old.secret_encrypted,b.status??old.status,
      b.start_date??old.start_date,b.expiry_date??old.expiry_date,b.notes??old.notes,now(),old.id);
  res.json({ok:true});
});

app.get("/api/admin/available-accounts", adminAuth, (req,res) => {
  const rows=db.prepare(`SELECT id,service,plan,identifier,status,start_date,expiry_date
    FROM accounts WHERE status='Disponible' AND assigned_order_ref IS NULL
    ORDER BY id ASC`).all();
  res.json(rows);
});

app.post("/api/admin/orders/:ref/assign", adminAuth, (req,res) => {
  const order=db.prepare("SELECT * FROM orders WHERE ref=?").get(req.params.ref);
  if(!order) return res.status(404).json({error:"Commande introuvable"});
  if(order.payment_status!=="Payé") return res.status(400).json({error:"Paiement non confirmé"});
  const account=db.prepare("SELECT * FROM accounts WHERE id=?").get(req.body?.account_id);
  if(!account || account.status!=="Disponible" || account.assigned_order_ref) return res.status(400).json({error:"Compte indisponible"});
  const t=now();
  const tx=db.transaction(()=>{
    db.prepare("UPDATE orders SET account_id=?, status=?, updated_at=? WHERE ref=?")
      .run(account.id,"Payé — À livrer",t,order.ref);
    db.prepare("UPDATE accounts SET assigned_order_ref=?, updated_at=? WHERE id=?")
      .run(order.ref,t,account.id);
  });
  tx();
  res.json({ok:true});
});

app.get("/api/admin/orders/:ref/delivery", adminAuth, (req,res) => {
  const row=db.prepare(`SELECT o.*,a.service AS account_service,a.plan AS account_plan,a.identifier,a.secret_encrypted
    FROM orders o LEFT JOIN accounts a ON a.id=o.account_id WHERE o.ref=?`).get(req.params.ref);
  if(!row) return res.status(404).json({error:"Commande introuvable"});
  const secret=decrypt(row.secret_encrypted);
  const msg=`Bonjour ${row.customer_name},\n\nVotre commande Next Digital CI (${row.ref}) est prête.\nService : ${row.account_service || row.product}\nOffre : ${row.account_plan || row.plan || ""}\nIdentifiant : ${row.identifier || ""}\nMot de passe : ${secret}\n\nMerci pour votre confiance.\nNext Digital CI — Le digital, simplement.`;
  const wa="https://wa.me/"+normalizeWhatsApp(row.customer_phone)+"?text="+encodeURIComponent(msg);
  res.json({ok:true,identifier:row.identifier||"",secret,whatsapp:wa});
});

app.post("/api/admin/orders/:ref/delivered", adminAuth, (req,res) => {
  const order=db.prepare("SELECT * FROM orders WHERE ref=?").get(req.params.ref);
  if(!order) return res.status(404).json({error:"Commande introuvable"});
  db.prepare("UPDATE orders SET status='Livrée',updated_at=? WHERE ref=?").run(now(),order.ref);
  res.json({ok:true});
});

app.get("/api/admin/stats", adminAuth, (req,res) => {
  const orders=db.prepare("SELECT COUNT(*) c FROM orders").get().c;
  const pending=db.prepare("SELECT COUNT(*) c FROM orders WHERE status='En attente'").get().c;
  const revenue=db.prepare("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE payment_status='Payé'").get().s;
  const available=db.prepare("SELECT COUNT(*) c FROM accounts WHERE status='Disponible' AND assigned_order_ref IS NULL").get().c;
  res.json({orders,pending,revenue,available});
});

// IMPORTANT: static is mounted AFTER API routes and explicitly serves index.html.
// This fixes Railway "Not Found" when the server is healthy.
app.use(express.static(PUBLIC, {index:false}));

app.get("/", (req,res) => res.sendFile(path.join(PUBLIC,"index.html")));
app.get("/index.html", (req,res) => res.sendFile(path.join(PUBLIC,"index.html")));
app.get("/order", (req,res) => res.sendFile(path.join(PUBLIC,"order.html")));
app.get("/order.html", (req,res) => res.sendFile(path.join(PUBLIC,"order.html")));
app.get("/confirmation", (req,res) => res.sendFile(path.join(PUBLIC,"confirmation.html")));
app.get("/confirmation.html", (req,res) => res.sendFile(path.join(PUBLIC,"confirmation.html")));
app.get("/admin", (req,res) => res.sendFile(path.join(PUBLIC,"admin.html")));
app.get("/admin.html", (req,res) => res.sendFile(path.join(PUBLIC,"admin.html")));

app.use((req,res) => res.status(404).send("Not Found"));

app.listen(PORT,"0.0.0.0",()=> {
  console.log(`Next Digital CI running on port ${PORT}`);
});