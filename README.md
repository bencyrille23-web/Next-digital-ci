# Next Digital CI — version complète

Site e-commerce léger : catalogue, commandes, espace admin, stock de comptes, contrôle du paiement, attribution d'un compte fonctionnel, suivi d'expiration et préparation de livraison WhatsApp.

## Flux de commande
1. Le client choisit une offre et passe commande.
2. La commande apparaît dans l'admin avec « À vérifier ».
3. L'administrateur vérifie réellement le paiement sur son moyen de paiement.
4. Il clique sur « Confirmer paiement ».
5. Il attribue un compte du stock marqué « Fonctionnel » ou « Disponible ».
6. Le système prépare le message WhatsApp avec les identifiants.
7. L'administrateur vérifie le message puis l'envoie sur WhatsApp.
8. Il marque la commande « Livrée ».

## Stock / expiration
Chaque compte possède un service, une offre, un identifiant, un secret chiffré, un statut, une date de début et une date d'expiration. Les comptes expirés sont automatiquement exclus de l'attribution et signalés dans le tableau de bord.

## Sécurité
- Les secrets des comptes sont chiffrés en AES-256-GCM.
- Ne jamais mettre de vrais mots de passe ou clés API dans GitHub.
- Définir `CREDENTIAL_ENCRYPTION_KEY` dans Railway.
- Ne fournir que des comptes/offres que vous êtes autorisé à fournir et respecter les conditions des services concernés.

## Railway
- Déployer le projet depuis GitHub.
- Ajouter les variables d'environnement du fichier `.env.example`.
- Ajouter un Volume Railway monté sur `/app/data` pour conserver SQLite.
- Après chaque mise à jour du code, pousser les fichiers vers GitHub et attendre le déploiement.

## Important
Wave, Orange Money, MTN et WhatsApp ne sont pas des intégrations API automatiques ici. Le paiement est vérifié manuellement et le bouton WhatsApp ouvre un message prérempli. Les intégrations officielles peuvent être ajoutées plus tard avec les comptes/API correspondants.
