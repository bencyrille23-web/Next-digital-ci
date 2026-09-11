# Next Digital CI — version Railway

## Déploiement
1. Crée un dépôt GitHub et importe le contenu de ce dossier.
2. Dans Railway : New Project → Deploy from GitHub Repo.
3. Variables à créer :
   - NODE_ENV=production
   - ADMIN_EMAIL=ton e-mail admin
   - ADMIN_PASSWORD=un mot de passe admin fort
   - JWT_SECRET=une longue clé secrète
   - WHATSAPP_NUMBER=225XXXXXXXXXX
4. Ajoute un Volume Railway monté sur `/app/data`.
5. Railway utilise `npm start`.
6. Dans Networking, génère le domaine public.

## URLs
- `/` : boutique
- `/order.html` : commande
- `/confirmation.html?ref=...` : confirmation
- `/admin.html` : administration

## Important
Le paiement Wave/Orange/MTN/Moov n'est pas une API de paiement automatique ici : le client sélectionne un moyen de paiement et la commande est enregistrée. Une vraie intégration nécessite les accès marchands/API du fournisseur.
Les e-mails nécessitent les variables SMTP.
