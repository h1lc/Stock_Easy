# Manuel de déploiement — StockEasy

## Prérequis

| Outil | Version minimale |
|---|---|
| Docker | 24.x |
| Docker Compose | 2.x |
| Git | 2.x |
| Node.js (dev local) | 20.x |

---

## Déploiement via Docker (recommandé)

### 1. Cloner le dépôt

```bash
git clone <url-du-repo> stockeasy
cd stockeasy
```

### 2. Configurer les variables d'environnement

```bash
cp server/.env.example server/.env
```

Éditer `server/.env` :

```env
DATABASE_URL="postgresql://stockeasy:MOT_DE_PASSE_FORT@db:5432/stockeasy_db"
JWT_SECRET="votre-secret-jwt-très-long-et-aléatoire"
PORT=3000
NODE_ENV=production
CLIENT_URL=http://votre-domaine.fr
```

### 3. Lancer les conteneurs

```bash
docker compose up -d --build
```

Les services démarrés :
- **db** : PostgreSQL 16 → port interne 5432
- **server** : API Node.js → port interne 3000
- **client** : Nginx + React → port **80**

### 4. Initialiser la base de données

```bash
# Les migrations sont appliquées automatiquement au démarrage du server
# Pour le jeu de données de démonstration :
docker compose exec server node src/prisma/seed.js
```

### 5. Vérifier le déploiement

```bash
curl http://localhost/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Déploiement en développement local

### Backend

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
node src/prisma/seed.js
npm run dev          # démarre sur http://localhost:3000
```

### Frontend

```bash
cd client
npm install
npm run dev          # démarre sur http://localhost:5173
```

---

## Architecture de déploiement

```
Internet
   │
   ▼
[Nginx :80]  ←── client React (SPA)
   │
   ├── /api/*  ──► [Express :3000]  ──► [PostgreSQL :5432]
   └── /*      ──► index.html (React Router)
```

---

## Variables d'environnement

### Server (`server/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret de signature des tokens | Chaîne aléatoire ≥ 32 caractères |
| `PORT` | Port d'écoute de l'API | `3000` |
| `NODE_ENV` | Environnement | `production` ou `development` |
| `CLIENT_URL` | URL du frontend (CORS) | `http://localhost:5173` |

### Client (`client/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de l'API (dev uniquement) | `http://localhost:3000/api` |

---

## CI/CD — GitHub Actions

Le pipeline `.github/workflows/ci.yml` exécute automatiquement :

1. **Tests backend** : `npm run test:coverage` (Jest)
2. **Tests frontend** : `npm run test` (Vitest)
3. **Build images Docker** (uniquement sur `main`)
4. **Déploiement SSH** (sur `main` avec secrets configurés)

### Secrets GitHub à configurer

| Secret | Usage |
|---|---|
| `DOCKER_USERNAME` | Docker Hub login |
| `DOCKER_TOKEN` | Docker Hub token |
| `DEPLOY_HOST` | IP/domaine du serveur |
| `DEPLOY_USER` | Utilisateur SSH |
| `DEPLOY_SSH_KEY` | Clé privée SSH |

---

## Résolution de problèmes courants

| Problème | Cause probable | Solution |
|---|---|---|
| `Cannot connect to database` | PostgreSQL non prêt | Attendre le healthcheck ou relancer `docker compose up` |
| `Invalid token` | JWT_SECRET différent en prod | Vérifier la variable d'environnement |
| Port 80 occupé | Autre service sur le port | Modifier `ports` dans `docker-compose.yml` |
