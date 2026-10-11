# CollaDoc

Éditeur de documents collaboratif en temps réel (Projet Spé 4).

- **backend** : Node.js 24 + Express + socket.io, base PostgreSQL via **Prisma 8**
- **frontend** : Vue 3 + Quasar
- **db** : PostgreSQL 18 (Docker)

## Prérequis

- Docker et Docker Compose
- Node.js 24 et npm (pour lancer les commandes Prisma et le développement en local)

## Installation

### 1. Variables d'environnement

```bash
cp .env.example .env                  # utilisé par docker compose (identifiants Postgres, ports)
cp backend/.env.example backend/.env  # utilisé par Prisma et le backend lancés en local
```

Dans les **deux** fichiers `.env`, renseigne la **même** :

- `TOTP_ENCRYPTION_KEY`
- `INTERNAL_SECRET`
- `SHARE_LINK_SECRET`

Pour `SHARE_LINK_SECRET` et `TOTP_ENCRYPTION_KEY`, utilise :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

pour la générer.

Pour `INTERNAL_SECRET`, fais :

```bash
openssl rand -hex 32
```

> Même clé dans les deux : le backend local et celui de Docker partagent la même base, un secret chiffré par l'un doit pouvoir être déchiffré par l'autre.

### 2. Base de données

```bash
docker compose up -d db               # démarre Postgres seul
cd backend
npm ci
npx prisma db migrate --advance-ref db   # applique toutes les migrations
npx prisma db verify                  # vérifie que la base correspond au contrat
```

`db verify` doit afficher `Database marker and schema match contract`.

### 3. Lancer l'application

Tout dans Docker :

```bash
docker compose down
docker compose up <-d> --build
```

- frontend : http://localhost:8080

## Tester l'API

Les scénarios de requêtes sont dans [`backend/requests/`](backend/requests/), un fichier par domaine (`register`, `auth`, `mfa`, `profile`, `admin`, ...), à lancer avec l'extension VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client).

- Chaque fichier se rejoue sans purger la base : il crée ses propres utilisateurs (`{{$timestamp}}`) et se connecte lui-même.
- Envoie les requêtes dans l'ordre, depuis le haut du fichier : l'en-tête de chaque fichier liste ses prérequis (requête SQL éventuelle, à lancer avec `psql`, DBeaver ou tout autre client SQL ; nettoyage des utilisateurs de test).
- Lance le backend **en local** (`docker compose stop backend`, puis `cd backend && npm start`) : l'image Docker tourne en `NODE_ENV=production`, le cookie de session y est `Secure` et REST Client ne le renvoie pas en http.
