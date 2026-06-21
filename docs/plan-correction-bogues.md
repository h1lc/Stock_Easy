# Plan de correction des bogues — StockEasy

## Processus de gestion des bogues

### 1. Détection

Les bogues sont détectés via :
- Les tests unitaires automatisés (CI/CD)
- Le cahier de recettes (tests manuels)
- Les retours utilisateurs
- Les logs applicatifs (Winston / morgan)

### 2. Qualification

Chaque bogue est qualifié selon une matrice de criticité :

| Priorité | Criticité | Délai de correction |
|---|---|---|
| P1 | Bloquant (données corrompues, sécurité) | < 4h |
| P2 | Majeur (fonctionnalité principale KO) | < 24h |
| P3 | Mineur (gêne sans blocage) | Sprint suivant |
| P4 | Cosmétique | Backlog |

### 3. Correction

Processus :
1. Créer une branche `fix/nom-du-bogue`
2. Écrire un test qui reproduit le bogue
3. Corriger le code
4. Vérifier que le test passe
5. PR → merge sur `main` → déploiement CI/CD

---

## Bogues identifiés en recette v1.0.0

### BUG-001 — Filtrage "stock faible" côté serveur imprécis

**Description** : Le filtre `lowStock=true` de l'API `/api/products` effectue un double filtrage (BDD + mémoire) car Prisma ne supporte pas la comparaison de colonnes entre elles en `where`.

**Sévérité** : P3 — Mineur (résultat correct, performance légèrement dégradée)

**Analyse** : La requête Prisma récupère tous les produits puis filtre en JavaScript. Sur un catalogue < 10 000 produits, l'impact est négligeable.

**Correction proposée** : Utiliser une raw query Prisma pour la comparaison de colonnes :
```js
await prisma.$queryRaw`SELECT * FROM "Product" WHERE quantity <= "minThreshold" AND active = true`
```

**Statut** : Planifié — v1.1.0

---

### BUG-002 — Confirmation de suppression native (`window.confirm`)

**Description** : La confirmation d'archivage d'un produit utilise `window.confirm` (bloquant, non accessible).

**Sévérité** : P3 — Mineur / Accessibilité

**Analyse** : `window.confirm` n'est pas annoncé correctement par tous les lecteurs d'écran et bloque le thread.

**Correction proposée** : Remplacer par une modale React avec focus trap et `role="alertdialog"`.

**Statut** : Planifié — v1.1.0

---

### BUG-003 — Token non invalidé côté serveur à la déconnexion

**Description** : Le token JWT reste valide 8h après déconnexion (pas de blacklist).

**Sévérité** : P2 — Majeur (sécurité)

**Analyse** : Les JWT sont stateless. Sans Redis/blacklist, un token volé reste utilisable jusqu'à expiration.

**Correction proposée** : Implémenter une blacklist Redis avec TTL = durée restante du token.

```js
// À la déconnexion :
await redis.setex(`blacklist:${token}`, remainingTTL, '1');
// Dans le middleware auth :
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted) return res.status(401).json({ error: 'Token révoqué' });
```

**Statut** : Planifié — v1.1.0

---

### BUG-004 — Absence de pagination côté frontend

**Description** : La liste des produits ne gère pas la pagination côté interface (les boutons page suivante ne sont pas implémentés).

**Sévérité** : P3 — Mineur (fonctionnel pour < 200 produits)

**Correction proposée** : Ajouter des contrôles de pagination sous les tableaux avec React Query `keepPreviousData`.

**Statut** : Planifié — v1.1.0

---

## Suivi des corrections

| ID | Bogue | Version cible | Assigné |
|---|---|---|---|
| BUG-001 | Filtre stock faible | v1.1.0 | Dev Backend |
| BUG-002 | Modale de confirmation | v1.1.0 | Dev Frontend |
| BUG-003 | Blacklist JWT | v1.1.0 | Dev Backend |
| BUG-004 | Pagination frontend | v1.1.0 | Dev Frontend |
