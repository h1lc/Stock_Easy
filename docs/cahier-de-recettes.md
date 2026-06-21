# Cahier de recettes — StockEasy

**Client** : Dupont & Fils  
**Version testée** : 1.0.0  
**Environnement** : Recette (localhost)

---

## 1. Authentification

| ID | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|
| AUTH-01 | Connexion valide Gérant | Email : gerant@dupont-fils.fr, MdP : Password123! | Redirection vers /dashboard | ✓ |
| AUTH-02 | Connexion valide Magasinier | Email magasinier + MdP | Redirection vers /products | ✓ |
| AUTH-03 | Connexion valide Commercial | Email commercial + MdP | Redirection vers /products | ✓ |
| AUTH-04 | Email invalide | Saisir "notanemail" | Message d'erreur validation | ✓ |
| AUTH-05 | Mauvais mot de passe | MdP incorrect | "Email ou mot de passe incorrect" | ✓ |
| AUTH-06 | Brute force | 10 tentatives en 15 min | Blocage temporaire (429) | ✓ |
| AUTH-07 | Déconnexion | Clic sur Déconnexion | Redirection vers /login | ✓ |
| AUTH-08 | Accès direct URL protégée | Accéder /dashboard sans token | Redirection vers /login | ✓ |
| AUTH-09 | Expiration token | Token expiré (8h) | Message "Token expiré" | ✓ |

---

## 2. Gestion des produits

| ID | Scénario | Rôle | Résultat attendu | Statut |
|---|---|---|---|---|
| PRD-01 | Voir la liste des produits | Tous | Liste paginée avec statut stock | ✓ |
| PRD-02 | Rechercher "ramette" | Tous | Filtre par nom | ✓ |
| PRD-03 | Filtrer stock faible | Tous | Produits ≤ seuil uniquement | ✓ |
| PRD-04 | Créer un produit | Gérant | Produit visible dans la liste | ✓ |
| PRD-05 | Référence déjà existante | Gérant | Erreur "Référence déjà utilisée" | ✓ |
| PRD-06 | Modifier un produit | Gérant | Données mises à jour | ✓ |
| PRD-07 | Archiver un produit | Gérant | Produit disparaît de la liste | ✓ |
| PRD-08 | Créer produit (Commercial) | Commercial | Erreur 403 Accès refusé | ✓ |
| PRD-09 | Prix négatif | Gérant | Erreur de validation | ✓ |

---

## 3. Mouvements de stock

| ID | Scénario | Rôle | Résultat attendu | Statut |
|---|---|---|---|---|
| MOV-01 | Saisir une entrée | Magasinier | Stock produit augmenté | ✓ |
| MOV-02 | Saisir une sortie valide | Magasinier | Stock produit diminué | ✓ |
| MOV-03 | Sortie insuffisante | Magasinier | "Stock insuffisant. Disponible: X" | ✓ |
| MOV-04 | Sortie impossible (qté 0) | Magasinier | Erreur bloquée | ✓ |
| MOV-05 | Filtrer par type Entrée | Tous | Uniquement les entrées | ✓ |
| MOV-06 | Commercial saisir mouvement | Commercial | 403 Accès refusé | ✓ |
| MOV-07 | Mouvement avec motif | Magasinier | Motif visible dans historique | ✓ |

---

## 4. Alertes

| ID | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| ALR-01 | Produit sous seuil visible | Badge "Stock faible" (jaune) visible | ✓ |
| ALR-02 | Produit en rupture | Badge "Rupture" (rouge) visible | ✓ |
| ALR-03 | Tous stocks suffisants | Message "Tous les stocks sont suffisants" | ✓ |
| ALR-04 | Génération auto commandes | Bons créés par fournisseur | ✓ |
| ALR-05 | Rafraîchissement automatique | Alertes rechargées toutes les 60s | ✓ |

---

## 5. Bons de commande

| ID | Scénario | Rôle | Résultat attendu | Statut |
|---|---|---|---|---|
| ORD-01 | Voir liste des bons | Gérant | Liste avec statut et montant | ✓ |
| ORD-02 | Filtrer par statut | Gérant | Filtre fonctionnel | ✓ |
| ORD-03 | Passer de Brouillon à Envoyé | Gérant | Statut mis à jour | ✓ |
| ORD-04 | Passer de Envoyé à Reçu | Gérant | Statut mis à jour | ✓ |
| ORD-05 | Annuler un bon | Gérant | Statut "Annulé" | ✓ |
| ORD-06 | Génération automatique | Gérant | Bons groupés par fournisseur | ✓ |

---

## 6. Sécurité (OWASP Top 10)

| ID | Faille OWASP | Test | Résultat attendu | Statut |
|---|---|---|---|---|
| SEC-01 | A01 — Broken Access Control | Commercial accède /api/products (POST) | 403 | ✓ |
| SEC-02 | A02 — Crypto | MdP stocké en bcrypt | Hash visible dans DB, pas le MdP clair | ✓ |
| SEC-03 | A03 — Injection | `' OR '1'='1` en email | Prisma paramétré, pas d'injection | ✓ |
| SEC-04 | A03 — XSS | `<script>alert(1)</script>` en nom produit | Chaîne assainie par xss lib | ✓ |
| SEC-05 | A04 — Rate limiting | 11 login en 15 min | 429 Too Many Requests | ✓ |
| SEC-06 | A05 — Misconfiguration | Headers HTTP | X-Frame-Options, CSP présents | ✓ |
| SEC-07 | A07 — Auth failures | Token forgé | 403 Token invalide | ✓ |
| SEC-08 | A08 — Data integrity | Payload JSON > 10kb | 413 Request Entity Too Large | ✓ |
| SEC-09 | A09 — Logging | Erreur serveur | Log horodaté dans console | ✓ |

---

## 7. Accessibilité (RGAA)

| ID | Critère | Test | Résultat attendu | Statut |
|---|---|---|---|---|
| ACC-01 | Navigation clavier | Tab uniquement | Tous les éléments accessibles | ✓ |
| ACC-02 | Focus visible | Tab visible | Contour visible sur focus | ✓ |
| ACC-03 | Labels formulaires | Attribut `for`/`htmlFor` | Chaque input a un label associé | ✓ |
| ACC-04 | Tableaux | `<th scope>` | En-têtes de colonnes déclarées | ✓ |
| ACC-05 | Alertes dynamiques | `role="alert"` | Annoncé par les lecteurs d'écran | ✓ |
| ACC-06 | Images décoratives | `aria-hidden="true"` | Emojis masqués des lecteurs | ✓ |
| ACC-07 | Navigation principale | `<nav aria-label>` | Region ARIA nommée | ✓ |
| ACC-08 | Boutons état | `aria-pressed` | État des filtres annoncé | ✓ |
| ACC-09 | Chargement | `role="status"` | État de chargement annoncé | ✓ |
| ACC-10 | Skip link | `#main-content` | Lien de saut présent | ✓ |
