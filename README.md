# StockEasy — Gestion de stock pour PME

Application web de gestion de stock destinée à **Dupont & Fils**, une PME de distribution de matériel de bureau.  
Remplace la gestion Excel par une interface web simple, accessible depuis n'importe quel navigateur.

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Query v5, Recharts, Axios |
| **Backend** | Node.js, Express, Prisma ORM, JWT, RBAC |
| **Base de données** | PostgreSQL 16 |
| **Déploiement** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| **Gérant** | Accès total : dashboard, produits, stock, alertes, commandes |
| **Magasinier** | Saisie des entrées/sorties de stock, consultation |
| **Commercial** | Consultation en lecture seule |

---

## Fonctionnalités

- Authentification JWT avec RBAC (3 rôles)
- Gestion des produits : CRUD complet, archivage soft-delete
- Suivi des entrées et sorties de stock en temps réel
- Alertes automatiques quand un produit atteint son seuil minimum
- Génération automatique de bons de commande fournisseurs
- Tableau de bord KPIs : valeur du stock, ruptures, graphiques 7 jours

---

## Démarrage rapide

### Avec Docker (recommandé)

```bash
git clone <url-du-repo>
cd stock_easy

# Configurer les variables d'environnement
cp server/.env.example server/.env
# Éditer server/.env avec votre JWT_SECRET

# Lancer l'application
docker compose up -d --build

# Charger les données de démonstration
docker compose exec server node src/prisma/seed.js

# Accès : http://localhost
```

### En développement local

```bash
# Backend
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
node src/prisma/seed.js
npm run dev          # http://localhost:3000

# Frontend (autre terminal)
cd client
npm install
npm run dev          # http://localhost:5173
```

---

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Gérant | gerant@dupont-fils.fr | Password123! |
| Magasinier | magasinier@dupont-fils.fr | Password123! |
| Commercial | commercial@dupont-fils.fr | Password123! |

---

## Tests

```bash
# Backend (Jest)
cd server && npm test
cd server && npm run test:coverage

# Frontend (Vitest)
cd client && npm test
```

**Couverture minimale** : 60% (branches, fonctions, lignes)

---

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) exécute automatiquement :

1. **Tests backend** (Jest) sur chaque push/PR
2. **Tests frontend** (Vitest) sur chaque push/PR
3. **Build images Docker** sur `main`
4. **Déploiement SSH** sur `main` (secrets à configurer)

---

## Structure du projet

```
stock_easy/
├── client/                   # Frontend React
│   ├── src/
│   │   ├── api/              # Configuration Axios
│   │   ├── components/       # Composants réutilisables (Layout, ProtectedRoute)
│   │   ├── context/          # AuthContext (JWT + RBAC)
│   │   ├── pages/            # Dashboard, Products, StockMovements, Alerts, Orders
│   │   └── tests/            # Tests Vitest
│   └── Dockerfile
├── server/                   # Backend Node.js
│   ├── src/
│   │   ├── middleware/       # auth.js (JWT), rbac.js (permissions)
│   │   ├── prisma/           # schema.prisma, seed.js, migrations/
│   │   └── routes/           # auth, products, stock, alerts, orders, dashboard
│   └── tests/                # Tests Jest
├── docs/                     # Documentation
│   ├── manuel-deploiement.md
│   ├── manuel-utilisation.md
│   ├── manuel-mise-a-jour.md
│   ├── cahier-de-recettes.md
│   ├── plan-correction-bogues.md
│   └── protocole-deploiement-continu.md
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Sécurité (OWASP Top 10)

| Faille | Mesure |
|---|---|
| A01 Broken Access Control | RBAC avec permissions par rôle |
| A02 Cryptographic Failures | bcrypt (salt 10) pour les mots de passe |
| A03 Injection | Prisma ORM paramétré + `xss` lib |
| A04 Insecure Design | Rate limiting (10 logins/15min, 200 req/15min) |
| A05 Security Misconfiguration | Helmet.js (CSP, X-Frame-Options…) |
| A07 Auth Failures | JWT signé, expiration 8h, timing-safe compare |
| A08 Data Integrity | Validation express-validator, limit payload 10kb |

## Accessibilité (RGAA)

- Navigation au clavier complète (tabindex, focus-visible)
- Labels ARIA sur tous les formulaires et tableaux
- `role="alert"` sur les messages d'erreur
- `aria-pressed` sur les boutons de filtre
- Sémantique HTML : `<nav>`, `<main>`, `<section>`, `<article>`

---

## Documentation

Voir le dossier [`docs/`](docs/) :

- [Manuel de déploiement](docs/manuel-deploiement.md)
- [Manuel d'utilisation](docs/manuel-utilisation.md)
- [Manuel de mise à jour](docs/manuel-mise-a-jour.md)
- [Cahier de recettes](docs/cahier-de-recettes.md)
- [Plan de correction des bogues](docs/plan-correction-bogues.md)
- [Protocole CI/CD](docs/protocole-deploiement-continu.md)

---

## Versions

| Version | Date | Description |
|---|---|---|
| 1.0.0 | Juin 2024 | Version initiale — toutes fonctionnalités de base |
