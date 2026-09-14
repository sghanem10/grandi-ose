/**
 * Carrousel — enrichissement progressif.
 *
 * Le défilement fonctionne SANS ce script : la piste est une zone à
 * défilement horizontal natif avec accrochage (scroll-snap). Au doigt, au
 * trackpad ou au clavier, ça marche déjà. Ce module n'ajoute que les flèches
 * et les pastilles, et ne les révèle qu'une fois en place — d'où l'attribut
 * `data-ready`, sur lequel le CSS s'appuie pour les afficher. Si le script
 * échoue ou n'est pas chargé, l'utilisateur ne voit aucune commande cassée.
 *
 * Pas de défilement automatique : sur un site vitrine, il dessert la lecture
 * et pose un problème d'accessibilité (contenu qui bouge sans qu'on l'ait
 * demandé).
 */

/** Applique le comportement à un conteneur `[data-carousel]`. */
function setup(root) {
  const viewport = root.querySelector('.carousel-viewport');
  const slides = [...root.querySelectorAll('.carousel-slide')];
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  const dotsBox = root.querySelector('[data-carousel-dots]');

  if (!viewport || slides.length < 2) return;

  // --- Pastilles, une par diapositive ---------------------------------------
  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Aller au témoignage ${i + 1} sur ${slides.length}`);
    dot.addEventListener('click', () => scrollToSlide(i));
    dotsBox?.append(dot);
    return dot;
  });

  const scrollToSlide = (i) => {
    const target = slides[Math.max(0, Math.min(i, slides.length - 1))];
    // scrollLeft plutôt que scrollIntoView : ce dernier fait aussi défiler la
    // page verticalement, ce qui arracherait le visiteur à sa position.
    viewport.scrollTo({ left: target.offsetLeft - slides[0].offsetLeft, behavior: 'smooth' });
  };

  /** Index de la diapositive la plus proche du bord gauche du cadre. */
  const currentIndex = () => {
    const origin = slides[0].offsetLeft;
    const x = viewport.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((slide, i) => {
      const dist = Math.abs(slide.offsetLeft - origin - x);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  };

  /** Combien de diapositives tiennent dans le cadre (1 sur mobile, 3 en large). */
  const perView = () => Math.max(1, Math.round(viewport.clientWidth / slides[0].offsetWidth));

  const sync = () => {
    // Quand tous les témoignages tiennent dans le cadre — trois cartes sur un
    // grand écran, par exemple — il n'y a rien à faire défiler : on retire les
    // commandes plutôt que d'afficher des boutons inertes. Réévalué à chaque
    // redimensionnement, car la largeur des cartes dépend du point de rupture.
    const scrollable = viewport.scrollWidth > viewport.clientWidth + 1;
    root.toggleAttribute('data-ready', scrollable);
    if (!scrollable) return;

    const i = currentIndex();
    dots.forEach((dot, d) => dot.setAttribute('aria-current', String(d === i)));
    // Tolérance d'un pixel : les navigateurs arrondissent scrollLeft.
    if (prev) prev.disabled = viewport.scrollLeft <= 1;
    if (next) next.disabled = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1;
  };

  prev?.addEventListener('click', () => scrollToSlide(currentIndex() - perView()));
  next?.addEventListener('click', () => scrollToSlide(currentIndex() + perView()));

  // --- Clavier : flèches gauche/droite quand le carrousel a le focus ---------
  viewport.setAttribute('tabindex', '0');
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToSlide(currentIndex() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToSlide(currentIndex() - 1); }
  });

  // scroll se déclenche très souvent : on attend la frame suivante.
  let pending = false;
  viewport.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; sync(); });
  }, { passive: true });

  window.addEventListener('resize', sync, { passive: true });

  sync(); // pose data-ready et révèle les commandes, si defilement il y a
}

export function initCarousels(scope = document) {
  scope.querySelectorAll('[data-carousel]').forEach(setup);
}
