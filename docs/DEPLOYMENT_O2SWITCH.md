# Déploiement sur O2switch

Cette API est une application Node.js persistante qui expose une API HTTP. Sur l'hébergement
mutualisé O2switch, elle se déploie via cPanel **Setup Node.js App** avec Phusion Passenger ; ce
n'est pas un déploiement Docker ni une Edge Function Deno.

## Prérequis

- Un projet Node.js configuré sur la version 24.
- Une base PostgreSQL compatible avec les migrations du projet et un utilisateur dédié.
- Une instance Redis privée O2switch en mode port, avec l'hôte, le port et le mot de passe affichés
  dans cPanel.
- Un sous-domaine HTTPS dédié à l'API.

O2switch décrit la création d'applications Node.js avec Setup Node.js App et indique que Passenger
gère la liaison entre le domaine et le processus :
[guide officiel Node.js](https://faq.o2switch.fr/cpanel/logiciels/hebergement-nodejs-multi-version/).
Leurs outils cPanel proposent PostgreSQL et une instance Redis privée :
[PostgreSQL](https://faq.o2switch.fr/cpanel/bases-de-donnees/postgresql/) ·
[Redis](https://faq.o2switch.fr/cpanel/o2switch/redis/).

## Préparer l'application

1. Créer dans cPanel une application Node.js en version 24, en mode production, associée au
   sous-domaine API. Placer l'Application Root hors de `public_html`.
2. Déployer le code source et `package-lock.json` dans ce dossier. Ne pas copier les `node_modules`
   installés sous Windows.
3. Ouvrir le terminal de l'environnement Node.js indiqué par cPanel, puis exécuter :

   ```bash
   npm ci
   npm run build
   npm prune --omit=dev
   ```

4. Configurer `dist/server.js` comme fichier de démarrage Passenger.
5. Créer le dossier de stockage dans l'Application Root ou dans un répertoire privé du compte, avec
   les droits d'écriture de l'utilisateur de l'application. Ne pas le placer dans `public_html`.
6. Dans cPanel, configurer les variables suivantes pour l'application :

   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@127.0.0.1:5432/NOM_BASE
   REDIS_HOST=127.0.0.1
   REDIS_PORT=PORT_REDIS_AFFICHE_DANS_CPANEL
   REDIS_PASSWORD=MOT_DE_PASSE_REDIS
   INTEGRATION_API_KEY=SECRET_LONG_ALEATOIRE
   MEDIA_STORAGE_PATH=/home/UTILISATEUR/app-data/media
   MEDIA_PUBLIC_BASE_URL=https://api.example.com/media
   CORS_ORIGINS=https://example.com
   TRUST_PROXY=1
   SWAGGER_ENABLED=false
   ```

   Remplacer chaque valeur d'exemple par celle du compte et du domaine. Dans Redis, sélectionner
   le mode port : le client de ce projet se connecte par TCP.

## Base de données et démarrage

Depuis le terminal de l'environnement Node.js, appliquer les migrations avant de démarrer ou
redémarrer l'application :

```bash
npm run db:migrate:prod
```

Le fichier de démarrage `dist/server.js` doit être présent et l'application doit pouvoir joindre
PostgreSQL et Redis. Après chaque mise à jour du code, reconstruire avec `npm run build`, puis
redémarrer l'application depuis Setup Node.js App.

Vérifier ensuite les endpoints suivants :

- `https://api.example.com/api/v1/health/live`
- `https://api.example.com/api/v1/health/ready`
- `https://api.example.com/docs` si Swagger est activé

## Stockage et sauvegardes

Les fichiers restent sur le disque du compte via `MEDIA_STORAGE_PATH`. Prévoir une sauvegarde
distincte du dossier média et surveiller l'espace disque ; la base PostgreSQL ne contient que les
métadonnées et ne permet pas de reconstruire les fichiers supprimés.

O2switch recommande une instance Redis pour les données de cache éphémères. Redis est utilisé ici
pour le rate limiting, pas pour stocker les médias.
