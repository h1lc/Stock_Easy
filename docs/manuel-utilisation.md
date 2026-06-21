# Manuel d'utilisation — StockEasy

## Présentation

StockEasy est une application web de gestion de stock pour Dupont & Fils. Elle est accessible depuis n'importe quel navigateur sans installation.

**URL d'accès** : http://votre-serveur/ (ou http://localhost en développement)

---

## 1. Connexion

Ouvrez l'application et saisissez vos identifiants.

| Rôle | Email exemple | Mot de passe |
|---|---|---|
| Gérant | gerant@dupont-fils.fr | Password123! |
| Magasinier | magasinier@dupont-fils.fr | Password123! |
| Commercial | commercial@dupont-fils.fr | Password123! |

> Après 10 tentatives échouées en 15 minutes, l'accès est temporairement bloqué.

---

## 2. Tableau de bord (Gérant uniquement)

La page d'accueil du Gérant affiche :

- **Valeur totale du stock** : somme de (prix × quantité) pour tous les produits
- **Nombre de produits** en catalogue
- **Alertes stock** : produits sous leur seuil minimum
- **Ruptures** : produits à quantité zéro
- **Graphique** : entrées et sorties des 7 derniers jours
- **Liste des alertes actives** avec sévérité
- **Derniers mouvements** enregistrés

---

## 3. Produits

### Consulter la liste

Tous les rôles voient la liste des produits. Chaque ligne affiche :
- Référence, nom, catégorie, prix, stock actuel, seuil minimum, statut

Le statut peut être :
- **OK** (vert) : stock suffisant
- **Faible** (jaune) : stock ≤ seuil minimum
- **Rupture** (rouge) : stock = 0

### Rechercher / filtrer

- Saisissez un terme dans la barre de recherche pour filtrer par nom
- Cochez « Stock faible uniquement » pour n'afficher que les produits en alerte

### Créer un produit (Gérant)

1. Cliquer sur **+ Nouveau produit**
2. Renseigner : référence (unique), nom, prix, seuil minimum
3. Cliquer sur **Créer**

### Modifier un produit (Gérant)

Cliquer sur **Modifier** sur la ligne du produit.

### Archiver un produit (Gérant)

Cliquer sur **Archiver** — le produit n'est plus visible mais son historique est conservé.

---

## 4. Mouvements de stock (Gérant, Magasinier)

### Consulter l'historique

Tous les mouvements (entrées/sorties) sont listés avec date, produit, type, quantité, motif et responsable.

Utilisez les boutons **Tous / Entrées / Sorties** pour filtrer.

### Saisir un mouvement

1. Cliquer sur **+ Saisir un mouvement**
2. Sélectionner le produit dans la liste
3. Choisir **Entrée** (réception) ou **Sortie** (expédition/consommation)
4. Saisir la quantité
5. Ajouter un motif (optionnel)
6. Cliquer sur **Enregistrer**

> Le stock du produit est mis à jour instantanément. Une sortie impossible (quantité insuffisante) est bloquée par le système.

---

## 5. Alertes

La page affiche tous les produits dont le stock est ≤ au seuil minimum, regroupés par sévérité :

- **Rupture** (rouge) : quantité = 0
- **Stock faible** (jaune) : quantité > 0 mais ≤ seuil

### Générer des bons de commande automatiques (Gérant)

Cliquer sur **Générer les commandes** pour créer automatiquement des bons de commande pour tous les produits en alerte, groupés par fournisseur.

---

## 6. Bons de commande (Gérant, Magasinier — lecture)

Affiche tous les bons de commande fournisseurs avec leur statut.

### Cycle de vie d'un bon

```
Brouillon → Envoyé → Reçu
                ↓
             Annulé
```

### Changer le statut (Gérant)

- **Marquer comme envoyé** : le bon a été transmis au fournisseur
- **Marquer comme reçu** : la livraison a été effectuée
- **Annuler** : le bon est annulé

---

## 7. Déconnexion

Cliquer sur **Déconnexion** en bas du menu latéral. La session expire automatiquement après 8 heures.

---

## Raccourcis clavier & accessibilité

- Navigation au clavier : tabulation complète entre tous les éléments interactifs
- Lecteurs d'écran : tous les formulaires et tableaux sont annotés (ARIA)
- Contraste : conforme WCAG AA
