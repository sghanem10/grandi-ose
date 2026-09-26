# Grandi-Ose !

Site vitrine de Géraldine, kinésiologue à Thuir (66, Occitanie).

Site statique : du HTML, du CSS compilé depuis SCSS, et du JavaScript natif.
Aucune bibliothèque n'est chargée par le visiteur, aucun framework, aucun CMS.

Le plan de travail complet est dans [ROADMAP.md](ROADMAP.md).

---

## Démarrer

```bash
npm install
npm run dev        # compile le SCSS en continu
```

Puis ouvrir `public/index.html`. Pour un aperçu plus fidèle (les polices et le
CSS externe se chargent alors comme en production) :

```bash
npx serve public
```

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Compile `scss/` en continu, avec source map. **À lancer pendant qu'on travaille.** |
| `npm run css` | Compile une fois, en CSS lisible. |
| `npm run build` | Compile une fois, minifié. **À lancer avant de publier.** |
| `npm run check` | Vérifie qu'on n'a rien cassé par rapport à l'original (voir plus bas). |
| `npm run img` | Régénère `public/img/` depuis `img-src/`. Utile seulement si on change une image source. |
| `npm run fonts` | Régénère `public/fonts/` et `scss/base/_fonts.scss`. Utile seulement si on change de police. |

## Organisation

```
scss/            sources des styles  -> ne jamais éditer public/css/main.css
  main.scss        uniquement des @use, aucune règle. L'ORDRE Y COMPTE :
                   lire les commentaires avant de réordonner.
  abstracts/       outils, aucune sortie CSS
  base/            reset, typographie, palette, polices
  layout/          container, socle des sections, header, footer
  components/      boutons, cartes, formulaire, ornements
  sections/        une par section de la page

public/          C'EST CE QUI EST PUBLIÉ. Racine du site.
  index.html       le fichier qu'on édite pour changer le contenu
  css/main.css     GÉNÉRÉ — toute modification directe sera écrasée
  js/main.js       vide pour l'instant
  fonts/ img/      générés

img-src/         images sources en haute définition, non publiées
tools/           scripts de build et de vérification
grandi-ose-2.html   ORIGINAL. Ne pas supprimer : sert de référence.
```

### Où trouver un style ?

Par nom de section ou de composant, dans le dossier correspondant. Exemple :
la couleur des boutons est dans `scss/components/_buttons.scss`, la grille du
hero dans `scss/sections/_hero.scss`. Les couleurs de la marque sont toutes
dans `scss/base/_tokens.scss`.

## Publier une modification de style

`public/css/main.css` est versionné, donc le site se déploie sans étape de
build. En revanche il n'y a pas de cache busting automatique : après un
`npm run build`, incrémenter le numéro dans `index.html` pour que les
visiteurs reçoivent bien la nouvelle version.

```html
<link rel="stylesheet" href="css/main.css?v=2">
```

## Vérifier qu'on n'a rien cassé

```bash
npm run check      # comparaison analytique avec l'original
node tools/shoot.mjs   # comparaison visuelle, nécessite Google Chrome
```

`npm run check` compare `public/` à `grandi-ose-2.html` sur quatre plans : le
texte, la structure du DOM, l'ensemble des déclarations CSS, et surtout la
**cascade** — pour chaque élément et chaque propriété, la déclaration gagnante
doit avoir la même valeur. Il sort en erreur au moindre écart.

`tools/shoot.mjs` capture les deux versions dans Chrome à trois largeurs et
trois positions de page, puis les compare pixel à pixel.

Ces deux outils gardent leur intérêt tant que l'original reste la référence,
c'est-à-dire jusqu'aux modifications volontaires de la phase 6.

## Points d'attention

- **Encodage** : tous les fichiers sont en UTF-8. Configurer l'éditeur en
  conséquence, sinon les accents casseront.
- **Ne pas éditer** `public/css/main.css`, `scss/base/_fonts.scss`,
  `public/fonts/` ni `public/img/` : ils sont régénérés.
- **Pas de navigation sous 860 px** aujourd'hui : le menu disparaît et rien ne
  le remplace. C'est un défaut connu de l'original, corrigé en phase 6.
