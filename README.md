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

Dans `backend/.env`, `DATABASE_URL` doit correspondre aux valeurs du `.env` racine. Avec les valeurs par défaut :

```env
DATABASE_URL="postgresql://colladoc:colladoc@localhost:5433/colladoc"
```

> Depuis la machine hôte, Postgres est exposé sur le port **5433** (`DB_PORT`), pas 5432.
> Dans le réseau Docker, le conteneur `backend` utilise `db:5432` (déjà configuré dans `docker-compose.yml`).

### 2. Base de données

```bash
docker compose up -d db               # démarre Postgres seul
cd backend
npx prisma db migrate --advance-ref db   # applique toutes les migrations
npx prisma db verify                  # vérifie que la base correspond au contrat
```

`db verify` doit afficher `Database marker and schema match contract`.

### 3. Lancer l'application

Tout dans Docker :

```bash
docker compose up -d --build
```

- frontend : http://localhost:8080
- backend : http://localhost:3000
