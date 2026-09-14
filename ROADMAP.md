# Grandi-Ose ! — Roadmap technique

> Site vitrine — Géraldine, kinésiologue à Thuir (66, Occitanie)
> Document figé le **14/09/2026**. Toute évolution du plan est tracée au chapitre [Journal](#12--journal-des-décisions).

---

## Sommaire

1. [Règles de travail](#1--règles-de-travail)
2. [État des lieux](#2--état-des-lieux-du-fichier-existant)
3. [Outillage retenu](#3--outillage-retenu)
4. [Arborescence cible](#4--arborescence-cible)
5. [**Phase 1 — Découpage HTML / SCSS / JS**](#phase-1--découpage-html--scss--js) ✅ *terminée le 14/09/2026*
6. [Phase 2 — SEO technique](#phase-2--seo-technique-iso-visuel)
7. [Phase 3 — Éclatement multi-pages](#phase-3--éclatement-multi-pages) ✅ *terminée le 14/09/2026*
8. [Phase 4 — Formulaire → email](#phase-4--formulaire--email)
9. [Phase 5 — Mise en ligne](#phase-5--mise-en-ligne)
10. [Phase 6 — Modifications de contenu et de design](#phase-6--modifications-de-contenu-et-de-design)
11. [Phase 7 — Entretien](#phase-7--entretien)
12. [Coûts](#coûts--récapitulatif)
13. [Journal des décisions](#12--journal-des-décisions)

---

## 1 — Règles de travail

Contraintes posées par Selim, applicables à **toutes** les phases :

| # | Règle |
|---|---|
| R1 | **Aucune modification visuelle** du site sans demande explicite. Le rendu à l'écran doit rester strictement identique jusqu'à la Phase 6. |
| R2 | **Aucune modification du contenu rédactionnel** (textes, titres, formulations) sans demande explicite. |
| R3 | **Les images peuvent être optimisées** (poids, format, dimensions) tant que le rendu visuel est identique. |
| R4 | Le site reste **simple et statique**. Pas de CMS, pas de back-office : Selim édite les fichiers directement. |
| R5 | **Le SEO est délégué à 100 %** à Claude, décisions incluses. Si le SEO impose une architecture multi-pages, elle est mise en œuvre (Phase 3). |
| R6 | On travaille **sur l'existant d'abord**. Les ajouts fonctionnels arrivent après le refactor. |

### Conséquence importante sur l'ordre des phases

Les règles R1/R2 et R5 sont en tension : **éclater en plusieurs pages est, par nature, une modification de structure.** Le plan les concilie ainsi :

- **Phase 1** = refactor pur, une seule page, rendu **pixel-identique**. Zéro décision discutable.
- **Phase 2** = SEO **invisible** (balises `<head>`, `alt`, JSON-LD, `robots.txt`, `sitemap.xml`). Rien ne change à l'écran.
- **Phase 3** = éclatement multi-pages. C'est la première phase qui change ce que voit un visiteur → **elle demande une validation explicite avant démarrage**, même si R5 me donne la main sur le SEO.

---

## 2 — État des lieux du fichier existant

`grandi-ose-2.html` — 462 lignes, **815 Ko**, UTF-8 sans BOM.

### Répartition du poids

| Élément | Poids | Part |
|---|---|---|
| 4 images PNG en base64 | **594 Ko** | **73 %** |
| HTML | ~14 Ko | 2 % |
| CSS inline (`<style>`, lignes 11-264) | ~9 Ko | 1 % |
| *(surcoût d'encodage base64 ≈ +33 %)* | ~198 Ko | 24 % |

### 🔴 Le problème central : les images

Les 4 blocs base64 sont **le même fichier PNG, à l'octet près** :

```
lignes 270, 304, 314, 456
→ PNG 600×600, 148 567 octets, MD5 = F72330BC9A4F033F0C666C43AF406F19
```

Il est affiché à 4 tailles différentes : 40×40 (nav), 380px (hero), 88×88 (portrait), 40×40 (footer). Donc **594 Ko téléchargés pour un logo affiché à 40 pixels dans trois cas sur quatre.** C'est le seul vrai défaut technique du site, et il est corrigible sans toucher au rendu.

### Inventaire

| Élément | État | Action |
|---|---|---|
| `<style>` inline | 250 lignes, propre : custom properties, nommage cohérent, 1 seul breakpoint (860px) | → SCSS (Phase 1) |
| **JavaScript** | **Inexistant** (0 balise `<script>`, 0 attribut `onclick`) | → à créer (Phase 1 pour l'outillage, Phase 6 pour les comportements) |
| Formulaire (l. 437-451) | `<form>` sans `action`, sans `method`, sans consentement RGPD. **Ne fait rien.** | → Phase 4 |
| `<head>` | `title` + `description` seulement | → Phase 2 |
| `alt` des images | Présents mais faibles : « Logo Grandi-Ose ! » ×2, « Grandi-Ose ! Kinésiologie », « Grandi-Ose ! » | → Phase 2 (invisible) |
| Polices | Google Fonts en CDN, 9 graisses déclarées pour ~4 utilisées | → auto-hébergement (Phase 1) |
| Sections | 7, `id` déjà posés (`#apropos` `#metier` `#pourqui` `#deroulement` `#offre` `#contact`) | conservées |
| Mentions légales / confidentialité | Absentes | → Phase 3 (**obligation légale**) |

### Anomalies relevées (non corrigées en Phase 1 — voir Phase 6)

| Ligne | Constat | Pourquoi on ne touche pas maintenant |
|---|---|---|
| 250 | `@media (max-width:860px){ .nav-links{display:none} }` et il n'existe **aucun élément `.nav-toggle`** dans le HTML → **sur mobile, le site n'a plus aucune navigation** | Corriger = ajouter un menu burger = modification visuelle (R1) |
| 57 | `.nav-toggle{display:none}` : règle CSS orpheline | Idem |
| 180 | `.card3 .icon{...}` : CSS mort, aucun élément `.icon` dans le HTML | Conservé tel quel en Phase 1, supprimable en Phase 6 |
| 304 / 314 | Le logo sert de **placeholder** pour l'illustration hero et pour le portrait de Géraldine | Remplacer = modification visuelle (R1). **À prévoir : vraie photo + vraie illustration.** |
| 456 | Le logo du footer porte `style="height:36px;width:36px"`, qui écrase le `40px` de `.nav-logo img` : il s'affiche donc à **36 px**, ce que seule la lecture de l'attribut inline révélait | Reproduit à l'identique en phase 1 via `footer .nav-logo img` |
| 426-434 | `<h4>` employé directement après le `<h2>` de section (saut de niveau) | Corrigé en Phase 2 (invisible : restylé à l'identique) |
| 345 | `style="margin-bottom:24px"` inline | Déplacé en classe utilitaire, rendu identique (Phase 1) |
| 458 | `© 2026` codé en dur | Corrigé en JS en Phase 6 |

### Ce qui est déjà bien fait

- Contenu rédactionnel de qualité : incarné, spécifique, sans jargon — exactement ce que Google valorise depuis les mises à jour *helpful content*. C'est l'actif le plus précieux du projet.
- `prefers-reduced-motion` déjà géré (l. 261-263).
- `lang="fr"`, `<meta viewport>`, `scroll-behavior:smooth`, un seul `<h1>`.
- Champ lexical juridiquement prudent (« accompagner », « relâcher », « mieux-être ») → voir §Phase 2.4.
- Design cohérent, palette maîtrisée, un seul breakpoint : refactor facile.

---

## 3 — Outillage retenu

**Tout est gratuit, sans limite de durée, et sans limite atteignable à ce volume.**

| Besoin | Outil | Pourquoi celui-là |
|---|---|---|
| Compilation SCSS | **Dart Sass** (`npm i -D sass`) | La référence officielle. Une seule dépendance. |
| Optimisation d'images | **Sharp** (`npm i -D sharp`) ou **Squoosh.app** | Sharp = scriptable et reproductible. Squoosh = 100 % local dans le navigateur, rien n'est uploadé. |
| Versioning | **Git + GitHub** (repo privé) | Historique + déclencheur du déploiement auto (Phase 5). |
| Polices | **Fontsource** (`npm i @fontsource/...`) | Mêmes fichiers que Google Fonts, servis depuis notre domaine. |
| Hébergement | **Cloudflare Pages** | Bande passante illimitée, SSL gratuit, déploiement sur `git push`, previews par branche. |
| Backend formulaire | **Cloudflare Pages Functions** | Même repo, même domaine, zéro déploiement séparé, zéro CORS. |
| Envoi d'emails | **Brevo API** (300/jour) | Société française, données en UE. Détail en Phase 4. |
| Email pro sur domaine | **Cloudflare Email Routing** + Gmail | Redirection illimitée, gratuite. |
| Anti-spam | **Cloudflare Turnstile** | Sans clic, sans cookie, sans transfert vers Google. |
| Statistiques | **Cloudflare Web Analytics** | Sans cookie → **pas de bandeau de consentement obligatoire**. |
| Audits | Lighthouse, PageSpeed Insights, WAVE, axe DevTools | — |
| SEO | Google Search Console, Bing Webmaster Tools, Rich Results Test | — |
| Disponibilité | UptimeRobot (50 moniteurs) | — |

### ⚠️ Révision d'une recommandation précédente

J'avais d'abord proposé **Vite**. Compte tenu de R4 (« très simple », site maintenu à la main), **je retiens le CLI `sass` seul** :

- le site est statique pur, il n'y a rien à bundler (les modules ES natifs suffisent dans tous les navigateurs visés) ;
- **ce que tu édites est exactement ce qui est publié** — pas d'étape de build qui réécrit ton HTML, pas de noms de fichiers hachés illisibles ;
- une seule dépendance au lieu d'une trentaine, aucun fichier de configuration.

Contrepartie : pas de *cache busting* automatique. Réglé par un paramètre de version manuel (`main.css?v=2`) — un caractère à changer lors d'une mise à jour de style.

### Aucune dépendance côté navigateur

**Zéro bibliothèque JS n'est chargée par le visiteur.** Pas de jQuery, pas de framework, pas de SDK tiers. Les dépendances npm (`sass`, `sharp`) sont des outils de développement ; elles ne partent jamais en production. Les polices sont les seuls fichiers tiers, et elles seront auto-hébergées.

---

## 4 — Arborescence cible

```
Grandi-ose/
├── ROADMAP.md
├── README.md                    ← comment lancer / builder / déployer
├── package.json
├── .gitignore
├── grandi-ose-2.html            ← ORIGINAL, conservé intact comme référence
│
├── scss/                        ← sources (non publiées)
│   ├── main.scss                ← uniquement des @use, aucune règle
│   ├── abstracts/
│   │   ├── _variables.scss      breakpoints, maps, tokens de compilation
│   │   └── _mixins.scss         respond-to()
│   ├── base/
│   │   ├── _tokens.scss         :root { --violet … }   (l. 12-21)
│   │   ├── _reset.scss          (l. 22-23)
│   │   ├── _typography.scss     body, h1-h3, a         (l. 24-32)
│   │   ├── _fonts.scss          @font-face auto-hébergées
│   │   └── _motion.scss         prefers-reduced-motion (l. 261-263)
│   ├── layout/
│   │   ├── _container.scss      (l. 33)
│   │   ├── _section.scss        section, .section-tag/-title/-intro (l. 108-114)
│   │   ├── _header.scss         (l. 39-57 + 250)
│   │   └── _footer.scss         (l. 241-247)
│   ├── components/
│   │   ├── _buttons.scss        .btn-primary/-secondary, .nav-cta (l. 50-56, 85-97, 238)
│   │   ├── _cards.scss          .card3, .metier-card    (l. 163-182)
│   │   ├── _form.scss           (l. 230-238)
│   │   ├── _quotes.scss         .apropos-quote, .pull, .tagline-strip
│   │   ├── _read-more.scss      details.read-more       (l. 138-146)
│   │   ├── _botanical.scss      (l. 36)
│   │   └── _utilities.scss      classes extraites des style="" inline
│   └── sections/
│       ├── _hero.scss           (l. 60-100 + 251-254)
│       ├── _apropos.scss        (l. 117-150)
│       ├── _metier.scss         (l. 152-168 + 255)
│       ├── _pourqui.scss        (l. 171-182 + 256)
│       ├── _deroulement.scss    (l. 207-216 + 257)
│       ├── _offre.scss          (l. 184-205 + 259)
│       └── _contact.scss        (l. 219-228 + 258)
│
├── img-src/                     ← images sources haute définition (non publiées)
│   └── logo-grandi-ose.png      le PNG 600×600 extrait du base64
│
└── public/                      ← RACINE DU SITE PUBLIÉ
    ├── index.html
    ├── css/
    │   ├── main.css             généré — ne jamais éditer à la main
    │   └── main.css.map
    ├── js/
    │   ├── main.js              point d'entrée, type="module"
    │   └── modules/             (vides en Phase 1, remplis en Phase 4 et 6)
    ├── fonts/                   woff2 auto-hébergés
    ├── img/                     webp + png de repli, aux bonnes dimensions
    └── favicon.ico, etc.        (Phase 2)
```

**Points structurants :**
- `public/` est la racine servie. Sur Cloudflare Pages : *build command* = `npm run build`, *output directory* = `public`.
- `grandi-ose-2.html` **n'est jamais supprimé** : c'est la référence de non-régression pour toute la durée du projet.
- `main.scss` ne contient que des `@use`. Aucune règle CSS n'y est écrite. On sait ainsi toujours où trouver un style.

---

## Phase 1 — Découpage HTML / SCSS / JS

> **Objectif : rendu pixel-identique, poids divisé par 5 au minimum.**
> Durée estimée : une demi-journée. Aucune décision de design.

### 1.1 Mise en place (30 min)

1. `git init` + commit initial du fichier original **avant toute modification** → filet de sécurité.
2. `.gitignore` : `node_modules/`, `.env`, `.DS_Store`, `*.log`.
3. `package.json` avec les scripts :
   ```
   npm run dev      → sass --watch, rechargement à chaud
   npm run build    → sass --style=compressed + génération des images
   npm run img      → sharp : génère les dérivés depuis img-src/
   ```
4. `README.md` : 10 lignes, les 3 commandes ci-dessus. Ce sera utile dans 6 mois.

### 1.2 Extraction du CSS vers SCSS (2 h)

Découpage selon la carte du §4, **déclaration par déclaration, sans réécriture**.

Transformations autorisées — toutes à sortie CSS identique :

| Transformation | Détail |
|---|---|
| `@use` / `@forward` | Jamais `@import` (déprécié, suppression programmée dans Dart Sass). |
| Custom properties **conservées** | `--violet`, `--rose`… restent en `:root`. Elles sont utiles au runtime. Les variables SCSS ne servent qu'à ce qui se résout à la compilation (breakpoints, maps). |
| Media queries co-localisées | Le bloc `@media` global (l. 249-260) est éclaté : chaque règle mobile rejoint son composant via un mixin `respond-to(md)`. **Vérifié : aucune inversion de cascade** — chaque override mobile reste après sa règle de base dans l'ordre final. |
| Nesting ≤ 3 niveaux | Au-delà, la spécificité devient ingérable. |
| Styles inline extraits | `style="margin-bottom:24px"` (l. 345) et les `style` de positionnement des SVG (l. 283) → classes dans `_utilities.scss` / `_botanical.scss`, valeurs inchangées. |
| CSS mort **conservé** | `.card3 .icon` et `.nav-toggle` sont repris tels quels. On ne nettoie pas dans un refactor : ça masquerait les vraies régressions. Suppression en Phase 6. |

**Protocole de non-régression :**
1. Compiler en non minifié.
2. Diff normalisé du CSS généré contre le CSS original (déclarations triées) → l'écart attendu est **vide**.
3. Captures d'écran avant/après à 1440px, 860px, 390px → comparaison.
4. Seulement ensuite, activer la minification.

### 1.3 🔴 Optimisation des images (1 h — le plus gros gain du projet)

1. Décoder **une seule fois** le base64 → `img-src/logo-grandi-ose.png` (600×600).
2. **Inspecter le logo.** S'il est vectorisable (formes plates, peu de dégradés) → **SVG**, quelques Ko, net à toute taille et à tout zoom. Sinon, matriciel optimisé.
3. Générer les dérivés **aux dimensions réellement affichées, ×2 pour les écrans Retina** :

   | Emplacement | Taille CSS | Fichier généré |
   |---|---|---|
   | Nav (l. 270) | 40×40 | `logo-40.webp` (80×80) |
   | Hero (l. 304) | ≤ 380px | `logo-380.webp` (760×760) |
   | Portrait (l. 314) | 88×88 | `logo-88.webp` (176×176) |
   | Footer (l. 456) | 40×40 | `logo-40.webp` *(réutilisé)* |

4. `<picture>` : AVIF → WebP → PNG de repli. Attributs `width`/`height` explicites (supprime tout décalage de mise en page au chargement), `decoding="async"`, `loading="lazy"` partout **sauf** nav et hero.
5. `<link rel="preload">` sur l'image hero (c'est le *Largest Contentful Paint*).

**Objectif : 594 Ko → moins de 40 Ko. Page complète sous 120 Ko.**

> ⚠️ Le logo reste utilisé aux 4 emplacements, y compris comme placeholder hero et portrait (R1). Le remplacer par une vraie photo et une vraie illustration est une modification visuelle → **Phase 6**. C'est le seul élément du projet qui ne dépend pas de nous : **à demander à Géraldine dès maintenant** (photo professionnelle + visuel hero).

### 1.4 Auto-hébergement des polices (30 min)

Remplacement du CDN Google Fonts (l. 8-10) par des `woff2` locaux dans `public/fonts/`.

Trois bénéfices, zéro changement visuel :
- **Performance** : suppression de 2 connexions bloquantes vers un domaine tiers avant le premier rendu du texte.
- **RGPD** : l'appel à `fonts.googleapis.com` transmet l'adresse IP du visiteur aux États-Unis. La CNIL et la jurisprudence allemande ont déjà tranché sur ce point. Auto-héberger supprime le sujet.
- **Poids** : 9 graisses déclarées, ~4 utilisées → on ne charge que Playfair Display 600 + italique, et Nunito 400/700.

Vérification : comparaison des captures avant/après, plus contrôle que `font-display: swap` est bien présent.

### 1.5 Amorce JS (15 min)

Il n'y a aujourd'hui **aucun JavaScript**. On crée uniquement la structure :

```html
<script type="module" src="js/main.js"></script>
```

`main.js` est vide (un commentaire d'en-tête) avec un dossier `modules/` prêt. **Aucun comportement n'est ajouté en Phase 1** : ce serait une modification fonctionnelle (R1/R6). Les modules à venir :

| Module | Phase | Rôle |
|---|---|---|
| `form.js` | 4 | Soumission AJAX, états, validation |
| `nav.js` | 6 | Menu burger mobile (aujourd'hui inexistant sur mobile) |
| `reveal.js` | 6 | Apparition des sections au scroll |
| `year.js` | 6 | Année du footer automatique |

### ✅ Critères de validation de la Phase 1 — résultats

Vérification automatisée : `npm run check` et `node tools/shoot.mjs`.

| Critère | Résultat |
|---|---|
| Texte identique caractère pour caractère | ✅ 5 022 caractères, aucun écart |
| Structure DOM identique | ✅ 155 éléments, + le `<script>` d'amorce |
| Déclarations CSS identiques | ✅ 407 = 407, ensembles égaux |
| **Cascade identique** (déclaration gagnante par élément × propriété) | ✅ 1 116 couples en desktop, 1 119 en mobile, **0 divergence** |
| Comparaison pixel à pixel | ⚠️ **Portée réduite, voir ci-dessous.** 0,34 à 1,33 % d'écart sur les 3 captures du haut de page, imputables à la palettisation du logo (arbitrage documenté au journal) |
| Poids de la page | ✅ 795,7 Ko → **194,5 Ko** tout compris, dont 115,8 Ko de polices déjà téléchargées auparavant |
| HTML seul | ✅ 795,7 Ko → **11,1 Ko** (−98,6 %) |
| Accents et caractères spéciaux (`é`, `·e`, `œ`, `À`) | ✅ UTF-8 préservé, contrôlé par le diff de texte |
| Ancres internes | ✅ vérifiées par les captures `#metier` et `#contact` |
| `<details>` « Lire la suite » | ✅ fonctionne, toujours sans JavaScript |
| Zéro modification de texte | ✅ |

Restent à mesurer une fois le site en ligne : Lighthouse et les Core Web Vitals,
qui nécessitent un serveur réel (phase 5).

> ⚠️ **Correction apportée le 14/09/2026, en cours de phase 6.**
> Le bilan initial annonçait « 0 % d'écart sur 6 des 9 captures ». Ces 6 captures
> visaient les ancres `#metier` et `#contact`. Vérification faite, **Chrome en
> mode headless historique ne tient pas compte du défilement** pour
> `--screenshot` : ces 6 images étaient vides des deux côtés, et leur égalité ne
> prouvait rien. La comparaison visuelle de la phase 1 n'a donc réellement porté
> que sur le haut de page.
>
> La conclusion, elle, ne change pas : la preuve de fond est le **contrôle D de
> `npm run check`**, qui compare la déclaration CSS gagnante pour chacun des
> 155 éléments du document sur 1 116 couples (élément, propriété) aux deux
> points de rupture, et qui couvre donc la page entière. `tools/shoot.mjs` a été
> corrigé : il capture désormais la page entière en une seule image.

---

## Phase 2 — SEO technique (iso-visuel)

> Rien de ce qui suit ne change ce que voit un visiteur. Tout est dans le `<head>`, dans les attributs, ou dans des fichiers annexes.

### 2.1 `<head>` complet

| Balise | Contenu prévu |
|---|---|
| `title` | ≤ 60 car., métier + ville en tête : `Kinésiologue à Thuir (66) — Grandi-Ose ! Géraldine` |
| `description` | 150-160 car., avec accroche sur la séance découverte offerte |
| `canonical` | URL absolue |
| `og:` / `twitter:` | title, description, `image` 1200×630, url, `type`, `locale=fr_FR` |
| `robots` | `index, follow, max-image-preview:large` |
| `theme-color` | `#5b3a7a` |
| favicon | Jeu complet (ico, png 192/512, apple-touch-icon) + `manifest.webmanifest` |

### 2.2 Sémantique et accessibilité

- `<main>`, `<nav aria-label="Navigation principale">`, `<address>` dans le footer.
- **`alt` à reprendre sur les 4 images.** Ils existent mais sont peu descriptifs et redondants (« Grandi-Ose ! » seul), et deux d'entre eux décrivent un logo servant de placeholder. À réécrire une fois les vraies images en place (phase 6). SVG décoratifs → `aria-hidden="true"` + `focusable="false"`.
- Correction du saut de niveau `h2` → `h4` (l. 426-434) : passage en `h3` **restylé pour un rendu identique**.
- `scroll-margin-top` sur les cibles d'ancre : le header fixe (l. 39-44) masque actuellement le haut des titres au clic. Correction invisible hors interaction.
- Skip-link (visible uniquement au focus clavier), `:focus-visible` net, contrastes vérifiés AA.
- L'accessibilité est un facteur SEO indirect — et une évidence sur un site de bien-être.

### 2.3 Données structurées JSON-LD

Le levier le plus rentable et le plus souvent oublié. Aucun impact visuel, gros impact sur l'affichage dans les résultats.

| Schéma | Contenu |
|---|---|
| `LocalBusiness` / `HealthAndBeautyBusiness` | nom, `areaServed` (Thuir + communes voisines), `geo`, `priceRange`, horaires, `sameAs` |
| `Person` | Géraldine, `jobTitle`, `knowsAbout` |
| `Service` | la séance découverte |
| `FAQPage` | dès que la page FAQ existe (Phase 3) → éligible aux *rich snippets*, fort gain de taux de clic |

Validation : **Rich Results Test** + **Schema Markup Validator** (gratuits).

### 2.4 Vigilance juridique — à intégrer au SEO

La kinésiologie **n'est pas une profession de santé réglementée**. À bannir du vocabulaire : *soigner, guérir, traiter, thérapie, diagnostic*, et toute allusion à une pathologie nommée.

Le texte actuel tient déjà cette ligne (« relâcher », « accompagner », « mieux-être », « sans diagnostic médical ») — **on la conserve strictement**. Double enjeu :
- **juridique** : risque d'exercice illégal de la médecine et de pratique commerciale trompeuse (DGCCRF) ;
- **SEO** : Google applique aux sujets santé (*Your Money or Your Life*) des critères de qualité renforcés — un site prudent et transparent est mieux classé qu'un site qui promet des résultats.

À ajouter : mention « ne se substitue pas à un avis ou à un traitement médical ».

### 2.5 Performance (Core Web Vitals — facteur de classement)

Cibles : **LCP < 2,5 s · CLS < 0,1 · INP < 200 ms**. Après la Phase 1, ces cibles sont atteintes sans effort supplémentaire (site statique, < 120 Ko, sans JS bloquant). Mesure : PageSpeed Insights + Lighthouse.

### 2.6 Fichiers annexes

`robots.txt` · `sitemap.xml` · `404.html` · `_headers` Cloudflare (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

---

## Phase 3 — Éclatement multi-pages

> ⚠️ **Première phase qui modifie ce que voit le visiteur → validation explicite requise avant démarrage.**

### Pourquoi c'est nécessaire

**Une page = une seule cible de mots-clés.** C'est la limite structurelle du site actuel : il ne peut se positionner que sur une requête principale. Le marché visé est du **référencement local à faible concurrence** (« kinésiologue Thuir », « kinésiologie Perpignan », « kinésiologue 66 ») : avec 5 ou 6 pages solides, on peut viser la première place. Avec une seule page, on plafonne.

Deuxième argument, indépendant du SEO : **les mentions légales et la politique de confidentialité sont obligatoires** (LCEN + RGPD dès qu'un formulaire existe). Il faut de toute façon des pages supplémentaires.

### Architecture retenue — **réalisée**

| Fichier | Contenu | Cible de recherche |
|---|---|---|
| `index.html` | Hero, trois portes d'entrée, témoignages, bandeau offre | marque + « kinésiologue Thuir » |
| `kinesiologie-thuir.html` | Méthode, trois temps, motifs (« Pourquoi ? »), profils (« Pour qui ? ») | « kinésiologie Thuir », « séance de kinésiologie » |
| `qui-suis-je.html` | Histoire complète, vision de l'accompagnement, origine du nom | « Géraldine kinésiologue », autorité (E-E-A-T) |
| `seance-decouverte.html` | L'offre, le déroulement, le cadre | « séance kinésiologie offerte Perpignan » |
| `faq.html` | 11 questions | longue traîne |
| `contact.html` | Formulaire, informations pratiques | « contact kinésiologue Thuir » |
| `mentions-legales.html` | LCEN — `noindex, follow` | — |
| `confidentialite.html` | RGPD — `noindex, follow` | — |

**Consolidé plutôt qu'éparpillé.** Le plan initial prévoyait des pages séparées pour « Pourquoi ? » et « Pour qui ? ». Comme la règle R2 interdit d'inventer du contenu, ces pages auraient tenu en trois cartes chacune : des pages minces, que Google déclasse. Elles sont donc réunies dans la page pilier `kinesiologie-thuir.html`, qui y gagne en substance.

**Aucun texte existant n'a été réécrit : il a été redistribué.** Le bloc replié dans le `<details>` « Lire la suite de mon histoire » est désormais du texte courant sur `/qui-suis-je`, pleinement indexable. Les seuls textes **nouveaux** sont la FAQ et les pages légales, comme prévu.

### Mise en œuvre — ce qui a été fait

- **Blocs partagés** : `<header>` et `<footer>` recopiés à l'identique dans les 8 fichiers. `npm run links` vérifie qu'ils ne divergent pas, aux deux exceptions légitimes près (`aria-current="page"`, et la cible du bouton RDV sur la page Contact).
- **Maillage interne** : chaque page se termine par trois cartes vers d'autres pages, et le pied de page liste les 8 pages. Aucune page orpheline.
- **Fil d'ariane** textuel sur chaque page intérieure.
- **Un `<h1>` unique par page**, hiérarchie de titres sans saut de niveau, `title` et `description` propres et distincts — le tout vérifié automatiquement.
- **Bannière d'en-tête allégée** (`.page-header`) pour les pages intérieures : le hero en 100vh de l'accueil serait intenable sur une page qu'on vient lire.
- **Pages légales en `noindex, follow`** : sans intérêt dans les résultats de recherche, mais accessibles aux visiteurs, ce qui est l'obligation.
- **24 informations manquantes** signalées en jaune vif sur le site et listées par `npm run links`.

### Deux écarts par rapport au plan initial

| Prévu | Réalisé | Motif |
|---|---|---|
| Redirections 301 des anciennes ancres via `_redirects` | **Abandonné** | Techniquement impossible : un fragment d'URL (`#apropos`) n'est jamais transmis au serveur, donc aucune règle de redirection ne peut le voir. Et sans site publié, il n'existe aucune ancienne URL à rediriger. Un script côté navigateur serait du code mort. |
| `canonical` par page | **Reporté en phase 5** | La balise exige une URL absolue. Pointer vers un domaine qui n'existe pas encore serait pire que de ne rien mettre. Un commentaire `TODO` marque l'emplacement dans chaque `<head>`. |

### SEO local — le levier n°1, et il est hors du site

Pour un praticien local, **l'essentiel du trafic vient du pack Google Maps, pas du site**.

| Action | Outil | Coût |
|---|---|---|
| **Google Business Profile** | catégorie « Kinésiologue », zone de chalandise (adresse masquable si exercice à domicile) | Gratuit |
| Bing Places / Apple Business Connect | import en 1 clic depuis Google | Gratuit |
| Annuaires métier | Fédération Française de Kinésiologie, Resalib, Therapeutes.com, Medoucine, Pages Jaunes | Gratuit |
| Cohérence **NAP** | Nom / Adresse / Téléphone **identiques au caractère près** partout | — |
| Avis Google | demande systématique après séance, réponse à chacun | Gratuit |

> ⏱ **À lancer dès aujourd'hui, pas à la fin du projet.** La validation Google Business Profile prend de quelques jours à plusieurs semaines (courrier postal dans certains cas) et l'ancienneté de la fiche compte dans le classement. C'est le poste au délai le plus long du projet.

### Recherche de mots-clés — 100 % gratuite

Google Suggest et le bloc « Autres questions posées » · Google Trends (variantes régionales) · **Google Search Console** une fois en ligne (requêtes réelles : la meilleure source, et de loin) · Keyword Surfer ou Ubersuggest (extensions Chrome, version gratuite suffisante) · lecture des `title` des 5 concurrents positionnés sur « kinésiologue Perpignan ».

---

## Phase 4 — Formulaire → email

> Réponse détaillée à : **« Est-ce qu'il y a besoin d'une autre librairie / d'un autre site ? »**

### 4.1 Réponse courte

| Question | Réponse |
|---|---|
| **Une bibliothèque JS à charger sur le site ?** | **Non. Aucune.** ~50 lignes de JS natif (`fetch`). Rien de tiers côté visiteur. |
| **Un service externe ?** | **Oui, c'est incontournable.** Un site statique n'a pas de serveur : il ne peut pas envoyer d'email par lui-même. |
| **Un compte à créer ?** | Un seul, gratuit. Lequel dépend de l'option retenue ci-dessous. |
| **Un coût ?** | **0 €.** Les plans gratuits couvrent 10 à 100 fois le volume attendu. |

### 4.2 Pourquoi un service externe est obligatoire

Trois faits techniques qui ferment toutes les autres portes :

1. **Un `<form>` HTML seul n'envoie pas d'email.** Il fait un `POST` HTTP vers une URL. Il faut quelque chose à l'autre bout.
2. **Envoyer un email exige un serveur SMTP authentifié.** Les identifiants ou la clé d'API correspondants **ne peuvent pas** être placés dans du JavaScript : le code front-end est lisible par n'importe qui via `Ctrl+U`. Une clé exposée est une passerelle à spam en quelques heures.
3. **Un site statique (Cloudflare Pages, Netlify, GitHub Pages) n'exécute aucun code serveur.** Il ne sert que des fichiers.

Donc : soit un service qui fait le travail à notre place, soit une micro-fonction serveur que l'on héberge (gratuitement) et qui garde le secret côté serveur.

> **Et `mailto:` ?** `<form action="mailto:...">` ouvre le logiciel de messagerie du visiteur. Comportement erratique, inexistant sur mobile sans client configuré, message pré-rempli illisible, et **le visiteur voit qu'il doit envoyer lui-même** : taux d'abandon proche de 100 %. À proscrire comme mécanisme principal — conservé uniquement en **repli affiché** (adresse en clair + lien `tel:`).

### 4.3 Les deux architectures possibles

#### Option A — Service form-to-email clé en main

```
Navigateur  ──fetch POST──▶  api.web3forms.com  ──▶  boîte Gmail de Géraldine
            (clé publique)      (leur serveur)
```

| | |
|---|---|
| **Service** | **Web3Forms** — gratuit, **250 soumissions/mois**, pas même besoin de créer un compte (la clé d'accès arrive par email) |
| **Alternatives** | Formspree (50/mois), FormSubmit (illimité mais moins fiable), Basin, Getform |
| **Code à écrire** | `fetch()` vers leur endpoint. ~30 lignes. |
| **Bibliothèque** | **Aucune** |
| **Mise en place** | ~15 minutes |
| **Prérequis** | Aucun — fonctionne **avant même l'achat du domaine** |
| **Limites** | L'email transite par leur infrastructure et part de **leur** domaine (Reply-To = le visiteur, donc on répond normalement). Pas d'accusé de réception automatique au visiteur sur le plan gratuit. Un tiers de plus dans la politique de confidentialité. |

La « clé publique » est publique **par conception** : elle est restreinte au domaine déclaré et protégée par captcha. Ce n'est pas une faille.

#### Option B — Fonction serverless que l'on héberge ⭐ *retenue*

```
Navigateur ──POST /api/contact──▶ Cloudflare Pages Function ──▶ API Brevo ──▶ Gmail
            (même domaine,         (clé API côté serveur,        (envoi depuis
             aucun secret)          validation, anti-spam)     contact@grandi-ose.com)
```

| | |
|---|---|
| **Hébergement** | **Cloudflare Pages Functions** — un fichier `functions/api/contact.js` dans le repo, déployé automatiquement avec le site. **100 000 requêtes/jour** gratuites. Pas de second service à gérer, pas de CORS (même origine). |
| **Envoi** | **API Brevo** — 300 emails/jour gratuits (9 000/mois), **société française, données hébergées en UE**. Appel REST en `fetch`, **aucun SDK à installer**. |
| **Bibliothèque front** | **Aucune** |
| **Bibliothèque back** | **Aucune** — le runtime Cloudflare fournit `fetch` nativement |
| **Mise en place** | 1 à 2 h |
| **Prérequis** | Le domaine (Phase 5), pour la vérification d'expéditeur |

**Ce que cette option apporte de plus :**

| Avantage | Détail |
|---|---|
| **Email vraiment professionnel** | Part de `contact@grandi-ose.com`, signé SPF/DKIM sur notre domaine → boîte de réception, pas spam. Aucune marque tierce. |
| **Réponse en un clic** | `Reply-To` = l'adresse du visiteur. Géraldine répond depuis Gmail comme à un email normal. |
| **Accusé de réception automatique** | Email de confirmation au visiteur (« je réponds sous 48 h » — cohérent avec la l. 434). Rassure et réduit les relances. |
| **Template maîtrisé** | L'email reçu est mis en forme comme on veut : champs lisibles, sujet clair, date. |
| **Validation serveur** | Format, longueurs, honeypot, Turnstile, limitation de débit — côté serveur, donc non contournable. |
| **Un tiers de moins** | Le contenu du message ne passe que par Cloudflare et Brevo, tous deux en UE. |
| **Réversible** | Changer de fournisseur d'email = 10 lignes dans un seul fichier. Aucune dépendance structurelle. |

**Alternatives à Brevo** : Resend (3 000/mois, meilleure expérience développeur, mais **serveurs aux États-Unis**) · MailerSend (3 000/mois) · Mailgun (limité). **Brevo est retenu pour l'hébergement des données en UE** : le message d'un visiteur à un praticien de bien-être peut contenir des informations personnelles sensibles, autant qu'elles ne quittent pas l'Europe.

> **Piste à évaluer au moment de l'implémentation :** Cloudflare propose un *binding* `send_email` dans les Workers, qui permettrait d'envoyer la notification **sans aucun service tiers**. Restriction : l'envoi n'est possible que vers des adresses préalablement vérifiées dans Email Routing — ce qui convient pour prévenir Géraldine, mais pas pour l'accusé de réception au visiteur. À tester ; si ça fonctionne, Brevo ne servirait plus que pour l'accusé de réception. Je vérifie avant de m'engager dessus.

### 4.4 Décision et séquence

**Option B retenue.** Mais elle dépend du domaine, alors qu'on veut pouvoir tester le formulaire avant.

```
Phase 4a  │ form.js écrit avec l'endpoint dans UNE constante.
          │ Branché sur Web3Forms (option A) → formulaire fonctionnel
          │ et testable immédiatement, sans domaine.
          ▼
Phase 5   │ Domaine acheté et vérifié.
          ▼
Phase 4b  │ Ajout de functions/api/contact.js + bascule de la constante
          │ vers /api/contact. Le front-end ne change pas d'une ligne.
```

Le code front-end est **identique dans les deux cas** : même `fetch`, même corps JSON, même gestion d'états. Seule l'URL change. Aucun travail jeté.

### 4.5 Anti-spam — obligatoire

Un formulaire public non protégé reçoit du spam automatisé en quelques jours.

| Niveau | Mécanisme | Détail |
|---|---|---|
| 1 | **Honeypot** | Champ masqué en CSS, invisible pour l'humain. S'il est rempli → robot. Arrête l'essentiel du spam, coût nul, zéro friction. |
| 2 | **Time-trap** | Horodatage à l'affichage ; soumission en moins de 3 s → robot. |
| 3 | **Cloudflare Turnstile** | Gratuit, **sans clic** dans la quasi-totalité des cas, **sans cookie de pistage**. Remplace reCAPTCHA et évite d'envoyer des données à Google. Vérification **côté serveur** (appel `siteverify`). |
| 4 | **Limitation de débit** | Règle Cloudflare gratuite : n soumissions/IP/heure. |
| 5 | **Validation serveur** | Longueurs maximales, format d'email, rejet des URL en masse dans le message. |

Les niveaux 1, 2 et 5 sont indépendants du fournisseur : ils fonctionnent dès la Phase 4a.

### 4.6 Conformité RGPD du formulaire

Le formulaire est le seul point du site qui collecte des données personnelles. Il déclenche des obligations précises.

| Exigence | Mise en œuvre |
|---|---|
| **Consentement** | Case à cocher **non pré-cochée**, obligatoire, formulée explicitement, avec lien vers `/confidentialite`. |
| **Minimisation** | Nom, email, message. Téléphone **facultatif**. Pas un champ de plus. |
| **Information** | Finalité, destinataire, durée de conservation, droits d'accès/rectification/effacement, contact — sur `/confidentialite`. |
| **Durée de conservation** | 3 ans après le dernier contact pour un prospect (recommandation CNIL). |
| **Sous-traitants** | Cloudflare et Brevo nommés dans la politique de confidentialité. |
| **Pas de base de données** | Les messages ne sont **pas** stockés côté site (ni KV, ni D1). Ils sont transmis par email, point. Moins de données conservées = moins de risque et moins d'obligations. |
| **🔴 Données de santé** | Le champ message peut contenir des informations de santé, qui relèvent d'une catégorie particulière au sens du RGPD. **Mention à ajouter sous le champ : « merci de ne pas détailler d'informations de santé ici ; nous en parlerons de vive voix ».** Protège le visiteur, protège Géraldine, et réduit la portée des obligations. |
| **Chiffrement** | HTTPS de bout en bout (automatique). |

### 4.7 Expérience utilisateur et délivrabilité

| Sujet | Mise en œuvre |
|---|---|
| Validation | HTML5 (`required`, `type="email"`, `maxlength`) **plus** messages d'erreur en français sous le champ concerné |
| États | Bouton désactivé + libellé « Envoi… » pendant la requête ; message de succès **sans changement de page** ; message d'erreur avec repli email affiché |
| Accessibilité | `aria-live="polite"` sur la zone de statut, `aria-invalid` sur les champs en erreur, focus déplacé sur le message |
| Anti-double-envoi | Verrou sur le bouton pendant la requête |
| Repli | Adresse email en clair (obfusquée) + lien `tel:` toujours visibles — certains visiteurs n'utiliseront jamais un formulaire |
| **Délivrabilité** | **SPF + DKIM + DMARC** dans le DNS. Sans ces 3 enregistrements, les emails partent en spam. 10 minutes de configuration, effet décisif. Contrôle avec **mail-tester.com** (gratuit) → viser 9/10 minimum |

> **Bonus conversion :** un lien de réservation **Cal.com** (gratuit, open source, illimité) à côté du formulaire. Pour un praticien, la prise de rendez-vous directe convertit nettement mieux qu'un formulaire de contact. Optionnel, décidé plus tard — c'est un ajout visuel (R1).

---

## Phase 5 — Mise en ligne

### 5.1 Hébergement : Cloudflare Pages

| Critère | **Cloudflare Pages** | Netlify | GitHub Pages |
|---|---|---|---|
| Bande passante | **Illimitée** | 100 Go/mois | 100 Go/mois (souple) |
| Builds | 500/mois | 300 min/mois | illimité |
| Domaine perso + SSL | ✅ gratuit | ✅ | ✅ |
| Code serveur (formulaire) | ✅ **Functions** | Functions (125k/mois) | ❌ **impossible** |
| Analytics sans cookie | ✅ gratuit | ❌ | ❌ |
| Anti-spam intégré | ✅ Turnstile | ❌ | ❌ |

Cloudflare réunit tout dans un seul écosystème gratuit : **Pages** (hébergement) + **Functions** (formulaire) + **Email Routing** (email pro) + **Turnstile** (anti-spam) + **Web Analytics** (statistiques) + **Registrar** (domaine à prix coûtant). Un seul compte, une seule interface.

**Déploiement** : le repo GitHub est connecté → chaque `git push` sur `main` republie le site. Les autres branches génèrent des URL de prévisualisation : on peut montrer une modification à Géraldine avant de la publier.

### 5.2 Nom de domaine — la seule dépense du projet

**~10-12 €/an** pour un `.com`, **~7-10 €/an** pour un `.fr`.

Il n'existe **aucun** moyen d'obtenir un domaine professionnel gratuitement de façon pérenne. Les `.tk` / `.ml` gratuits sont révocables sans préavis et grillés en réputation SEO : à proscrire absolument pour une activité professionnelle.

Conseils (le choix du nom n'est pas traité ici) :
- **Cloudflare Registrar** vend **au prix coûtant**, sans marge et sans le piège « 1 € la première année puis 25 € ». Protection WHOIS incluse gratuitement.
- Prendre le `.com` **et** le `.fr` si le budget le permet (~20 €/an au total) et rediriger l'un vers l'autre : protège la marque contre le squatting. Pour une activité 100 % locale, le `.fr` en version principale est un signal pertinent.
- **Renouvellement automatique activé** + rappel d'agenda. Un domaine expiré coupe le site **et** les emails d'un coup.
- Choisir **une seule** version canonique (avec ou sans `www`) et rediriger l'autre en 301.
- ⏱ **À acheter tôt** (dès la Phase 1 idéalement) : propagation DNS, vérification des enregistrements email et ancienneté du domaine prennent du temps. On peut acheter sans rien mettre dessus.

### 5.3 Email professionnel sur le domaine — gratuit

**Montage retenu : Cloudflare Email Routing + Gmail**

- **Réception** : Email Routing (gratuit, alias illimités) redirige `contact@`, `geraldine@`, `rdv@`… vers la boîte Gmail existante. 5 minutes de configuration.
- **Envoi** : dans Gmail → *Paramètres › Comptes › Envoyer des emails en tant que*, via un SMTP gratuit (Brevo, 300/jour — déjà utilisé pour le formulaire). Géraldine répond depuis Gmail ; le destinataire voit `contact@grandi-ose.com`.
- Avantage décisif : **aucune nouvelle interface à apprendre.** Tout reste dans Gmail.

**Alternative : Zoho Mail « Forever Free »** — 5 Go, jusqu'à 5 utilisateurs, domaine personnalisé, webmail et application mobile dédiés. Limite : pas d'accès IMAP/SMTP externe sur l'offre gratuite (inutilisable depuis Outlook ou Thunderbird).

**Dans les deux cas : SPF + DKIM + DMARC obligatoires** (cf. §4.7).

### 5.4 Checklist avant publication

```
[ ] Lighthouse ≥ 90 sur les 4 catégories, en mobile ET desktop
[ ] Test réel sur iPhone et Android (formulaire, zones tactiles ≥ 44 px)
[ ] Formulaire testé de bout en bout : email reçu, Reply-To correct, accusé de réception parti
[ ] mail-tester.com ≥ 9/10
[ ] HTTPS forcé + redirection www ⇄ apex
[ ] Mentions légales + politique de confidentialité en ligne et liées depuis le footer
[ ] robots.txt et sitemap.xml accessibles
[ ] Page 404 personnalisée avec lien de retour
[ ] Aucun lien mort, aucune ancre cassée
[ ] Aperçu Open Graph vérifié (opengraph.xyz) — c'est ce qui s'affiche sur WhatsApp et Facebook
[ ] Relecture orthographique complète (crédibilité = conversion)
[ ] Favicon visible dans l'onglet
```

### 5.5 Juste après la publication

| Action | Outil | Délai d'effet |
|---|---|---|
| Vérifier le site + soumettre le sitemap | **Google Search Console** | indexation en 3-15 j |
| Idem | **Bing Webmaster Tools** (import 1 clic depuis GSC) | — |
| Lier le site à la fiche | Google Business Profile | immédiat |
| Statistiques sans bandeau cookies | **Cloudflare Web Analytics** | immédiat |
| Surveillance de disponibilité | **UptimeRobot** | — |

> 💡 **Cloudflare Web Analytics est sans cookie et sans donnée personnelle → aucun bandeau de consentement requis.** Google Analytics 4 impose, lui, une CMP conforme CNIL. Pour un site vitrine, GA4 est surdimensionné : le cookieless fait gagner sur la conformité **et** sur l'expérience.

### 5.6 Informations à récupérer auprès de Géraldine

Bloquantes pour les mentions légales et le SEO local :
statut juridique et **SIRET** · adresse (même non publiée — requise par Google Business Profile) · téléphone · assurance RC professionnelle · réseaux sociaux existants · état d'avancement de la formation · **photo professionnelle + visuel hero** (cf. §1.3).

---

## Phase 6 — Modifications de contenu et de design

> **Remontée et réalisée en priorité le 14/09/2026**, avant les phases 2 à 5,
> sur la base de `.claude/changements-contenu.md`.

### Réalisé

| # | Demande | Ce qui a été fait |
|---|---|---|
| 1 | Supprimer l'arbuste en fond à droite | SVG décoratif retiré du hero ; partial `_botanical.scss` supprimé |
| 2 | Agrandir le logo principal | Logo du hero passé de `min(380px, 80%)` à `min(460px, 92%)`, soit **415 px au lieu de 361** à 1440 px de large. La suppression de l'ornement végétal a libéré la place |
| 3 | Emplacement pour le portrait de Géraldine | Dans la **carte « Géraldine »** de la section « Mon histoire » — la carte porte déjà son prénom et son rôle, c'est sa place naturelle. Cercle de 140 px (au lieu de 88), `object-fit: cover`, SVG de réserve `portrait-placeholder.svg` en attendant la photo |
| 4 | Pictogrammes dans « La kinésiologie » | Trois SVG en trait fin remplacent les puces rondes : ondes d'écoute, chemin jalonné, feuille |
| 5 | Échanger « Mon histoire » et « La kinésiologie » | Ordre inversé dans la page **et** dans la navigation |
| 6 | « Pour qui ? » devient « Pourquoi ? » | `#pourqui` → `#pourquoi`. Titre et chapô adaptés : le contenu énonce des motifs, pas des profils |
| 7 | « Le déroulement » devient « Pour qui ? » | Nouvelle section à trois cartes (Enfants / Adultes / Chacun·e) + illustration en constellation. Les « trois temps » ont été **rapatriés dans « La kinésiologie »**, rien n'est perdu |
| 8 | Boutons « Je prends rendez-vous » | Hero et section offre ; « Je prends RDV » pour le bouton compact de l'en-tête |
| 9 | Remplacer « On en parle ? » | Devenu **« Je vous écoute »**, en écho au champ lexical de l'écoute présent partout dans les textes |
| 9b | Pictogrammes du contact incohérents | Les trois emoji (📍 🗓️ ✉️) remplacés par des SVG en trait fin |
| 10 | Section témoignages en carrousel | Défilement natif avec accrochage, flèches et pastilles ajoutées par JS, masquées s'il n'y a rien à faire défiler |

### Reste à faire

| Sujet | Pourquoi | Priorité |
|---|---|---|
| **Menu mobile** | Il n'y a toujours **aucune navigation sous 860 px**. Le problème s'aggrave : la page compte désormais 6 sections au lieu de 4. | 🔴 Haute |
| **Vraie photo de Géraldine** | La carte « Géraldine » affiche un emplacement de réserve. Format carré, 720 px minimum, visage centré. | 🔴 Haute |
| **Vrais témoignages** | Les trois cartes contiennent des textes de réserve explicites. **Ne pas publier de faux avis** : c'est une pratique commerciale trompeuse (art. L121-2 du code de la consommation). Recueillir l'accord écrit de chaque personne. | 🔴 Haute |
| Coordonnées réelles | Le bloc contact n'affiche ni téléphone ni email. | 🔴 Haute |
| Année du footer | `© 2026` figé → automatique en JS. | Basse |
| Nettoyage CSS mort | `.card3 .icon`, `.nav-toggle` orphelins. | Basse |
| Apparition au scroll | `IntersectionObserver`, dans le respect de `prefers-reduced-motion`. | Optionnelle |
| Lien actif au scroll | Indicateur de position dans le menu. | Optionnelle |
| Prise de RDV en ligne | Cal.com — convertit mieux qu'un formulaire. | À discuter |

---

## Phase 7 — Entretien

Environ 1 h par mois.

- **Search Console chaque mois** : repérer les requêtes positionnées entre la 8ᵉ et la 20ᵉ place. Ce sont les gains les plus faciles : il suffit d'enrichir la page concernée.
- **Un article toutes les 6 semaines** suffit (« Comment se déroule une séance de kinésiologie ? », « Kinésiologie et charge mentale »). La régularité compte plus que le volume.
- **Google Business Profile** : un post par mois, des photos, une réponse à chaque avis. Google mesure l'activité de la fiche.
- Mettre à jour la mention « en formation » dès l'obtention de la certification.
- `npm outdated` par trimestre + Lighthouse à chaque mise à jour importante.

---

## Coûts — récapitulatif

| Poste | Solution | Coût/an |
|---|---|---|
| Hébergement + CDN + SSL | Cloudflare Pages | 0 € |
| Backend formulaire | Cloudflare Pages Functions | 0 € |
| Envoi d'emails | Brevo (300/jour) | 0 € |
| Email pro sur domaine | Cloudflare Email Routing + Gmail | 0 € |
| Anti-spam | Cloudflare Turnstile | 0 € |
| Statistiques | Cloudflare Web Analytics | 0 € |
| Versioning | GitHub (privé) | 0 € |
| Outils SEO et audit | GSC, Bing, PageSpeed, Lighthouse, WAVE | 0 € |
| Monitoring | UptimeRobot | 0 € |
| Outils de build | sass, sharp (npm) | 0 € |
| **Nom de domaine** | Cloudflare Registrar | **~11 €** |
| | **Total** | **~11 €/an** |

Aucun plan gratuit utilisé n'est promotionnel ni limité dans le temps, et tous les quotas sont très au-dessus du volume attendu (formulaire : ~10-30 soumissions/mois contre 9 000 disponibles).

---

## Séquencement

```
Étape 1   Phase 1            Découpage, images, polices          [technique, iso-visuel]
          ↳ en parallèle : ouvrir la fiche Google Business Profile  (délai le plus long)
          ↳ en parallèle : demander photo + visuel hero à Géraldine
          ↳ en parallèle : acheter le domaine
Étape 2   Phase 2            SEO technique                       [iso-visuel]
Étape 3   Phase 3            Multi-pages + pages légales         [⚠️ validation requise]
Étape 4   Phase 4a           Formulaire fonctionnel (Web3Forms)
Étape 5   Phase 5 + 4b       Mise en ligne + bascule sur l'endpoint propre
Étape 6   Phase 6            Modifications de contenu et de design
Puis      Phase 7            Suivi
```

Les trois tâches « en parallèle » de l'étape 1 sont celles dont le délai ne dépend pas de nous. **Les lancer tôt, sinon elles deviendront le chemin critique.**

---

## 12 — Journal des décisions

| Date | Décision | Motif |
|---|---|---|
| 14/09/2026 | **CLI `sass` retenu, Vite écarté** | R4 « très simple ». Site statique sans rien à bundler ; 1 dépendance au lieu de ~30 ; ce qu'on édite est ce qui est publié. Contrepartie acceptée : cache busting manuel. |
| 14/09/2026 | **Custom properties CSS conservées** | Déjà en place et utiles au runtime. Les variables SCSS sont réservées à ce qui se résout à la compilation. |
| 14/09/2026 | **CSS mort conservé en Phase 1** | Nettoyer pendant un refactor masque les régressions. Reporté en Phase 6. |
| 14/09/2026 | **Multi-pages validé sur le fond, mais isolé en Phase 3** | R5 donne la main sur le SEO, mais l'éclatement modifie le parcours visiteur → validation explicite avant démarrage. |
| 14/09/2026 | **Brevo plutôt que Resend** | Données hébergées en UE. Les messages peuvent contenir des informations personnelles sensibles. Resend a une meilleure expérience développeur mais héberge aux États-Unis. |
| 14/09/2026 | **Cloudflare Pages Functions plutôt qu'un Worker séparé** | Même repo, même domaine, déploiement unique, pas de CORS. |
| 14/09/2026 | **Aucun stockage des messages** | Transmission par email uniquement. Moins de données conservées = moins de risque et moins d'obligations RGPD. |
| 14/09/2026 | **Polices auto-hébergées** | Performance (2 connexions tierces bloquantes supprimées) + RGPD (plus de transfert d'IP hors UE). |
| 14/09/2026 | **`grandi-ose-2.html` conservé définitivement** | Référence de non-régression pour toute la durée du projet. |
| 14/09/2026 | **PNG palettisé, pas de WebP ni d'AVIF, pas de `<picture>`** | Mesuré, contre le plan initial : sur du trait fin monochrome sur fond transparent, le PNG 256 couleurs est **plus léger** que WebP q90 et AVIF q80 à toutes les tailles (80 px : 2,8 Ko contre 3,1 et 2,5 ; 600 px : 39,8 Ko contre 104 et 126). Un simple `<img>` suffit : HTML plus simple, cohérent avec R4. |
| 14/09/2026 | **Fidélité du logo hero : mode « léger »** | Palette 256 couleurs, 39,8 Ko : 4 376 pixels d'écart sur 1 296 000 (0,34 %), sur l'anticrénelage. Le 24 bits coûte +95 Ko, soit la moitié du poids de la page, pour 0,04 %. R3 autorise d'alléger, et ce logo est un placeholder. Réversible via `HERO_FIDELITY` dans `tools/build-images.mjs`. |
| 14/09/2026 | **`height: auto` ajouté sur `.hero-visual img`** | Rendu nécessaire par l'ajout des attributs `width`/`height` : ces indications de présentation fixaient la hauteur à 600 px alors que le CSS n'écrasait que la largeur, ce qui étirait le logo. Détecté par la comparaison visuelle, pas par l'analyse statique — le vérificateur a été corrigé pour couvrir ce cas. |
| 14/09/2026 | **CSS compilé (`public/css/main.css`) versionné** | Permet de déployer sans étape de build côté hébergeur. Contrepartie : cache busting manuel via `?v=`, documenté dans le README. |
| 14/09/2026 | **`latin-ext` livré mais jamais téléchargé** | Vérifié : tous les caractères du texte tiennent dans le sous-ensemble `latin` (le `œ` de « sœur » est en U+0153, inclus dans `U+0152-0153`). Les fichiers `latin-ext` restent en filet de sécurité pour de futures modifications de texte, sans coût aujourd'hui grâce à `unicode-range`. |
| 14/09/2026 | **Multi-pages consolidé en 8 pages, pas 11** | Des pages « Pourquoi ? » et « Pour qui ? » séparées auraient tenu en trois cartes chacune. La règle R2 interdisant d'inventer du contenu, elles auraient été minces — ce que Google pénalise. Réunies dans la page pilier. |
| 14/09/2026 | **Redirections d'anciennes ancres abandonnées** | Le plan les prévoyait dans `_redirects`. Un fragment d'URL n'est jamais envoyé au serveur : la règle ne pourrait pas s'appliquer. Et le site n'ayant jamais été publié, il n'existe aucune ancienne URL. |
| 14/09/2026 | **`canonical` reporté en phase 5** | Exige une URL absolue. Une canonical pointant vers un domaine inexistant nuirait plus qu'elle n'aiderait. Emplacement marqué par un `TODO` dans chaque `<head>`. |
| 14/09/2026 | **Informations manquantes marquées en jaune sur le site** | 24 éléments (SIRET, tarif, durée, hébergeur…) que je ne peux pas inventer. Un commentaire HTML se rate ; un surlignage jaune vif en pleine page, non. `npm run links` les liste également. |
| 14/09/2026 | **Gain sur les polices : latence et RGPD, pas volume** | Correction d'une estimation trop optimiste du plan initial : les graisses déclarées mais inutilisées n'étaient de toute façon jamais téléchargées (Google Fonts les découpe déjà par `unicode-range`). Le bénéfice réel est la suppression de deux connexions tierces bloquantes et du transfert d'IP hors UE. |
