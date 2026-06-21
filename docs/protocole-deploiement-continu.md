# Protocole de déploiement continu — StockEasy

## Environnement de développement

### Outils mobilisés

| Outil | Rôle | Version |
|---|---|---|
| **VS Code** | Éditeur de code | 1.90+ |
| **Node.js** | Runtime JavaScript (backend + build frontend) | 20 LTS |
| **npm** | Gestionnaire de paquets | 10.x |
| **Git** | Gestionnaire de sources | 2.x |
| **Docker Desktop** | Virtualisation des conteneurs | 24.x |
| **Prisma** | ORM + outil de migration BDD | 5.x |
| **PostgreSQL** | Base de données relationnelle | 16 |

### Composants applicatifs

| Composant | Technologie | Port |
|---|---|---|
| API REST | Node.js + Express | 3000 |
| Frontend SPA | React 18 + Vite | 5173 (dev) / 80 (prod) |
| Base de données | PostgreSQL | 5432 |
| Reverse proxy | Nginx | 80 |

---

## Pipeline CI/CD

```
┌──────────┐    Push/PR    ┌────────────────────────────────┐
│ Dev local │──────────────►│  GitHub Actions                │
└──────────┘               │                                │
                           │  1. Test backend  (Jest)        │
                           │  2. Test frontend (Vitest)      │
                           │  3. Build Docker images         │
                           │  4. Deploy via SSH (main only)  │
                           └────────────────────────────────┘
```

### Séquences de déploiement

#### Branch `develop` → PR → `main`
1. **Developer** : commit + push sur `develop`
2. **GitHub Actions** : exécution automatique des tests (jobs 1 & 2)
3. Si tests OK → PR créée ou mise à jour
4. **Review** : relecture du code par un pair
5. **Merge** sur `main` → déclenchement automatique des jobs 3 & 4

#### Critères de qualité et performance
- Couverture de tests ≥ 60% (seuil configuré dans Jest/Vitest)
- Zéro erreur de lint
- Temps de build Docker < 3 min
- API health check OK après déploiement
- Temps de réponse API < 200ms pour les endpoints principaux

---

## Protocole d'intégration continue

### Séquences d'intégration

```yaml
# Déclencheurs
on:
  push:    [main, develop]   # tout commit sur ces branches
  pull_request: [main]       # toute PR vers main

# Séquence jobs
test-server  ──┐
               ├──► build-docker ──► deploy (main only)
test-client  ──┘
```

### Règles de fusion

- La branche `main` est protégée : merge direct interdit
- Tout merge sur `main` nécessite que les tests CI passent
- Historique Git conservé avec tags de version sémantique

---

## Gestion des versions

```bash
# Créer un tag de version
git tag -a v1.0.0 -m "Release v1.0.0 — Version initiale"
git push origin v1.0.0
```

L'historique complet est visible via :
```bash
git log --oneline --graph
git tag -l
```
