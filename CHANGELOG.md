# Journal des versions — StockEasy

Toutes les évolutions notables de ce projet sont consignées dans ce fichier.

Le format suit la convention [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [v1.1.0] — 2026-07-23 — Authentification avancée et mise en conformité

### Ajouté
- Création de compte en autonomie (rôle Commercial imposé par défaut).
- Connexion Google OAuth 2.0.
- Réinitialisation du mot de passe par courriel (lien à usage unique, valable 1 h).
- Sessions par jeton d'accès (15 min) et jeton de rafraîchissement httpOnly avec rotation.

### Corrigé
- **BUG-2026-07-001** : erreur 500 à l'authentification en mode Docker — migrations
  Prisma versionnées (commit `cede77c`).
- **BUG-001** : filtre « stock faible » corrigé, filtrage délégué à la base de données.
- **BUG-002** : `window.confirm` remplacé par une modale accessible (RGAA).
- Régression de la CI : correction du mock Prisma et d'un test client (commit `817c231`).

### Sécurité
- Assainissement contre les injections (XSS) étendu à tous les champs de texte libre.
- `npm audit` rendu bloquant dans la CI (échec sur sévérité haute ou critique).
- Deux vulnérabilités hautes (`brace-expansion`, `js-yaml`) corrigées.

> Tests : 155 automatisés (88 serveur, 67 client). Couverture serveur 81 %, client 90 %.

## [v1.0.0] — 2026-06 — Version initiale

### Ajouté
- Gestion des produits (création, lecture, modification, archivage logique, recherche, filtres).
- Mouvements de stock tracés, alertes automatiques sur seuil et sur rupture.
- Bons de commande fournisseurs avec génération automatique.
- Tableau de bord, authentification par jeton et contrôle d'accès à trois rôles.

[v1.1.0]: https://github.com/h1lc/Stock_Easy/releases/tag/v1.1.0
[v1.0.0]: https://github.com/h1lc/Stock_Easy/releases/tag/v1.0.0
