# SNPS GV Upload

API Node.js/Express pour recevoir et publier des images JPEG/PNG, des fichiers PDF et des documents
Word DOC/DOCX. Supabase reste responsable de l'authentification et appelle cette API depuis une Edge
Function avec `X-API-Key`.

## Fonctionnement

- `POST /api/v1/media` : upload privé, un fichier par requête, champs `file` ou `photo` historique.
- `GET /media/:filename` : lecture publique ; images en ligne, PDF/Word en pièce jointe.
- `DELETE /api/v1/media/:id` : suppression logique et retrait du fichier, réservé au service appelant.
- PostgreSQL conserve les métadonnées ; les fichiers restent dans le dossier `MEDIA_STORAGE_PATH`.
- Les images sont vérifiées et réencodées avec Sharp. PDF et Word sont vérifiés par leur signature
  réelle, puis stockés sans transformation.

## Développement local

Copier `.env.example` vers `.env`, puis configurer des secrets locaux et démarrer les services :

```bash
npm ci
npm run docker:dev
```

L'API écoute sur `http://localhost:6000`. Swagger est disponible sur `/docs`.

## Déploiement O2switch

Le projet se déploie comme application Node.js 24 via cPanel Setup Node.js App et Phusion Passenger.
Voir [le guide de déploiement O2switch](docs/DEPLOYMENT_O2SWITCH.md) pour la base PostgreSQL, Redis,
les variables et le stockage persistant.

## Intégration Supabase

La Edge Function vérifie l'utilisateur puis transmet le multipart à `/api/v1/media` avec la clé
privée `X-API-Key`. Voir [le contrat d'intégration](docs/INTEGRATION.md) et
[les règles de sécurité média](docs/MEDIA_SECURITY.md).
