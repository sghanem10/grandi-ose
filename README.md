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
| `npm run preview` | Une capture d'écran par section, en desktop et en mobile. Nécessite Google Chrome. |
| `npm run page` | La page entière en une seule image. Nécessite Google Chrome. |
| `npm run img` | Régénère `public/img/` depuis `img-src/`. Utile seulement si on change une image source. |
| `npm run fonts` | Régénère `public/fonts/` et `scss/base/_fonts.scss`. Utile seulement si on change de police. |
| `npm run check` | Compare à l'original. **Signale désormais de gros écarts, et c'est normal** (voir plus bas). |

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

## Relire visuellement

```bash
npm run preview        # une capture par section, en desktop et en mobile
npm run page           # la page entière en une image
```

Les images atterrissent dans `.captures/` (non versionné).

> Deux pièges de Chrome en mode headless, déjà contournés dans les outils :
> il **ignore le défilement** pour les captures — d'où la capture pleine page
> plutôt qu'un parcours par ancres — et il **impose une largeur de fenêtre
> minimale d'environ 500 px**, en dessous de laquelle l'image est rognée à
> droite et simule un débordement inexistant.

## Les outils de non-régression de la phase 1

```bash
npm run check          # comparaison analytique avec l'original
node tools/shoot.mjs   # comparaison visuelle avec l'original
```

Ils comparent `public/` à `grandi-ose-2.html`. `npm run check` porte sur quatre
plans : le texte, la structure du DOM, l'ensemble des déclarations CSS, et
surtout la **cascade** — pour chaque élément et chaque propriété, la déclaration
gagnante doit avoir la même valeur.

⚠️ **Depuis la phase 6, le site diverge volontairement de l'original.** Ces deux
outils signalent donc de gros écarts, ce qui est attendu. Ils restent dans le
dépôt comme trace de la validation du découpage initial ; ils ne sont plus un
test à faire passer.

## Points d'attention

- **Encodage** : tous les fichiers sont en UTF-8. Configurer l'éditeur en
  conséquence, sinon les accents casseront.
- **Ne pas éditer** `public/css/main.css`, `scss/base/_fonts.scss`,
  `public/fonts/` ni `public/img/` : ils sont régénérés.
- **Pas de navigation sous 860 px** aujourd'hui : le menu disparaît et rien ne
  le remplace. Défaut hérité de l'original, toujours à corriger — c'est la
  priorité n°1 de ce qui reste.
- **Les témoignages sont des textes de réserve.** Ne pas publier de faux avis :
  c'est une pratique commerciale trompeuse. Voir le commentaire dans
  `public/index.html`, au-dessus du carrousel.
- **Le portrait de la carte « Géraldine » est un SVG de réserve.** Mode
  d'emploi pour le remplacer dans `public/img/portrait-placeholder.svg`.
