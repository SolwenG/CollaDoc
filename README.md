# CollaDoc

Éditeur de documents collaboratif en temps réel (Projet Spé 4).

- **backend** : Node.js 24 + Express + socket.io, base PostgreSQL via **Prisma 8**
- **frontend** : Vue 3 + Quasar, servi par nginx
- **db** : PostgreSQL 18

Tout ce qui existe en production tourne dans Docker (nginx, API, serveur temps réel, base, migrations), avec les mêmes images en développement. Seul le serveur de développement Vite tourne sur ta machine, derrière le nginx de Docker.

## Prérequis

- Docker avec Docker Compose ≥ 2.32 (action `restart` de Compose Watch), inclus dans un Docker Desktop à jour
- Node.js ≥ 24 et npm (Vite, éditeur, scripts)

## Installation

```bash
cp .env.example .env
```

Dans `.env`, génère les trois secrets :

```bash
# TOTP_ENCRYPTION_KEY et SHARE_LINK_SECRET
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
# INTERNAL_SECRET
openssl rand -hex 32
```

Puis installe les dépendances :

```bash
npm run setup   # npm ci à la racine, dans backend/ et dans frontend/
```

Les images Docker installent leurs propres dépendances ; celles-ci servent sur ta machine : `npm run dev` et Prettier (racine), Vite (front), éditeur, tests et CLI Prisma (back).

### Optionnel : outils lancés sur ta machine

`npm run dev` n'en a pas besoin. Pour écrire une migration (CLI Prisma) ou lancer le backend hors de Docker :

```bash
cp backend/.env.example backend/.env
```

et reporte les mêmes secrets que dans `.env`.

## Développer

```bash
npm run dev
```

Ouvre **<http://localhost:8080>**, et non l'adresse `:9000` affichée par Quasar : c'est nginx qui route `/api` et `/socket.io` comme en production.

- `Ctrl+C` arrête la surveillance et Vite ; les conteneurs restent lancés, le prochain `npm run dev` est quasi instantané
- `npm run dev:stop` arrête les conteneurs en fin de journée

Ce qui se recharge tout seul :

| Tu modifies…                                    | Il se passe…                            |
| ----------------------------------------------- | --------------------------------------- |
| un fichier du front (`frontend/src`)            | rechargement à chaud dans le navigateur |
| `backend/src` ou `shared/`                      | redémarrage de `backend` et `realtime`  |
| la conf nginx (`frontend/nginx/`)               | redémarrage de `frontend` (environ 1 s) |
| une migration, le contrat Prisma                | rien : `Ctrl+C` puis `npm run dev`      |
| un `package.json`, un lockfile, un Dockerfile   | reconstruction de l'image concernée     |
| `.env`, `compose.yaml`, `compose.override.yaml` | rien : `Ctrl+C` puis `npm run dev`      |

Autres scripts : `npm run format` (Prettier sur tout le dépôt), `npm run typecheck` (back et front).

## Base de données

### Migrations : rien à faire

Le service `migrate` applique les migrations en attente à chaque démarrage, avant l'API et le serveur temps réel. Si une migration échoue, l'API ne démarre pas : `docker compose logs migrate`.

### Consulter la base (développement)

| Hôte        | Port   | Utilisateur, mot de passe, base                               |
| ----------- | ------ | ------------------------------------------------------------- |
| `127.0.0.1` | `5433` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` du `.env` |

Avec n'importe quel client SQL (DBeaver, l'onglet Database des IDE JetBrains…), ou sans rien installer :

```bash
docker compose exec db psql -U colladoc colladoc
```

En production, la base n'est pas exposée.

### Créer une migration

1. Crée `backend/.env` (voir « Optionnel : outils lancés sur ta machine »).
2. Écris la migration avec le CLI Prisma, depuis `backend/` : voir [`backend/prisma-8.md`](backend/prisma-8.md).
3. Une fois la migration **terminée**, fais avancer la ref `db` (sans toucher la base) et commite-la avec la migration : `npx prisma migration ref set db <dossier-de-la-migration>`, depuis `backend/`.
4. `Ctrl+C` puis `npm run dev` : le service `migrate` l'applique au démarrage.

Rien n'est appliqué pendant l'écriture, volontairement : une migration à moitié écrite ne doit pas toucher la base. Tant que le contrat est émis sans migration terminée, `npm run dev` refuse de démarrer (voir « Dépannage »).

Le script `npm run --prefix backend prisma:migrate` applique aussi les migrations depuis ta machine (et met à jour la ref `db` de `migrations/app/refs/db.json`), mais on préfère laisser le service `migrate` s'en charger.

## Tester l'API

Les scénarios de requêtes sont dans [`backend/requests/`](backend/requests/), un fichier par domaine, à lancer avec l'extension VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client), contre le backend Docker (`http://localhost:3000`) : rien à arrêter.

Ils sont écrits pour REST Client : le client HTTP intégré aux IDE JetBrains lit aussi les fichiers `.http`, mais pas leur syntaxe de chaînage `{{nom.response.body…}}` (« unsubstituted variable »).

- Chaque fichier se rejoue sans purger la base : il crée ses propres utilisateurs (`{{$timestamp}}`) et se connecte lui-même.
- **Lis l'en-tête de chaque fichier avant de l'exécuter** : il précise ses prérequis et ses particularités (ordre des requêtes, fichier d'exemple pour l'upload, nettoyage SQL des utilisateurs de test…).

## Lancer en mode production

```bash
docker compose -f compose.yaml up -d --build --wait
```

Sans `-f`, `docker compose` charge aussi `compose.override.yaml` (le développement). En production : pas de montage du code, cookie de session `Secure`, base non exposée, front servi en fichiers statiques. Sur un serveur, `COMPOSE_FILE=compose.yaml` dans son `.env` évite d'oublier le `-f`.

## Dépannage

- **502 sur <http://localhost:8080>** alors que `/api/health` répond : Vite n'est pas lancé, ou le port 9000 était pris et Quasar en a choisi un autre (« Setting port to closest one available » dans ses logs).
- **Un service `unhealthy`** : `docker compose logs <service>`.
- **`npm run dev` échoue sur `migrate`** (`MIGRATION.PATH_UNREACHABLE` ou `MIGRATION.RUNNER_FAILED` dans `docker compose logs migrate`) : le contrat Prisma a été émis sans migration terminée. Termine la migration, ou mets le changement de contrat de côté (`git stash`) le temps de lancer l'app.
- **Échec d'upload (`EACCES`)** avec un volume `colladoc_uploads-data` créé avant les images non-root : `docker run --rm -v colladoc_uploads-data:/v node:24.21-alpine3.24 chown -R 1000:1000 /v`
- **« Unresolved tag: !override »** dans VS Code : c'est une balise propre à Compose, à déclarer dans le réglage `yaml.customTags` de l'extension YAML.
