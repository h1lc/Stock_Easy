# Manuel de mise à jour — StockEasy

## Politique de versionnement

StockEasy suit le [Semantic Versioning](https://semver.org/) (SemVer) :
- **MAJOR** (x.0.0) : changements incompatibles (migration BDD obligatoire)
- **MINOR** (1.x.0) : nouvelles fonctionnalités rétrocompatibles
- **PATCH** (1.0.x) : corrections de bugs

L'historique des versions est tracé dans `CHANGELOG.md` et dans les tags Git.

---

## Mise à jour en production (Docker)

### 1. Sauvegarder la base de données

```bash
# Avant toute mise à jour !
docker compose exec db pg_dump -U stockeasy stockeasy_db > backup-$(date +%Y%m%d).sql
```

### 2. Récupérer les nouvelles sources

```bash
git pull origin main
```

### 3. Vérifier les changements de schéma

```bash
# Lire le CHANGELOG ou les fichiers de migration :
ls server/src/prisma/migrations/
```

### 4. Reconstruire et redémarrer

```bash
docker compose up -d --build
```

Les migrations Prisma sont appliquées automatiquement au démarrage du container `server`.

### 5. Vérifier le bon fonctionnement

```bash
curl http://localhost/api/health
docker compose logs server --tail=50
```

---

## Mise à jour des dépendances npm

### Audit de sécurité

```bash
cd server && npm audit
cd ../client && npm audit
```

### Mettre à jour les dépendances

```bash
# Mises à jour mineures (sûres)
npm update

# Mises à jour majeures (vérifier CHANGELOG des librairies)
npx npm-check-updates -u
npm install
```

---

## Mise à jour du schéma de base de données

### Créer une migration (développement)

```bash
cd server
npx prisma migrate dev --name description_du_changement
```

### Appliquer en production

```bash
npx prisma migrate deploy
```

> Ne jamais modifier manuellement la base de données en production sans migration Prisma.

---

## Rollback en cas de problème

### Rollback applicatif

```bash
git checkout <tag-version-précédente>
docker compose up -d --build
```

### Rollback base de données

```bash
# Restaurer le backup
docker compose exec -T db psql -U stockeasy stockeasy_db < backup-YYYYMMDD.sql
```

---

## Changelog

### v1.0.0 (2024-06)
- Version initiale
- Authentification JWT + RBAC (3 rôles)
- Gestion des produits (CRUD)
- Mouvements de stock (entrées/sorties)
- Alertes automatiques de seuil
- Bons de commande manuels et automatiques
- Tableau de bord KPIs + graphiques
- CI/CD GitHub Actions
- Déploiement Docker
