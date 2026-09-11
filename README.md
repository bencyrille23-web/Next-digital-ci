# Next Digital CI — version Railway corrigée

## Correction principale
Le serveur écoute sur `0.0.0.0` et utilise `process.env.PORT` fourni par Railway.
La page d'accueil est servie explicitement par `GET /`, et les pages `/order.html`, `/confirmation.html` et `/admin.html` ont leurs routes explicites.

Un endpoint `/health` est également disponible pour vérifier que le serveur répond.

## Railway
- Build/Start command : `npm start`
- Aucun port à saisir manuellement : Railway fournit `PORT`.
- Pour la base SQLite en production, utiliser un Volume Railway monté sur `/app/data`.
- Variables à configurer : `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `WHATSAPP_NUMBER`.

## Important
Ne mets jamais tes mots de passe ou clés privées dans GitHub ou dans une conversation.
