document.addEventListener("DOMContentLoaded", () => {
  // 1. Configuration de l'observateur
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15 // L'animation se déclenche quand 15% de l'élément est visible à l'écran
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Ajoute la classe qui déclenche l'animation
        entry.target.classList.add('is-visible');
        
        // Arrête d'observer cet élément pour que l'animation ne se joue qu'une seule fois
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 2. Sélection des éléments HTML à animer (basé sur la structure de votre code)
  const elementsToAnimate = document.querySelectorAll(`
    .hero-grid > div,
    .apropos-portrait,
    .apropos-text,
    .metier-grid > div,
    .metier-list li,
    .section-tag,
    .section-title,
    .section-intro,
    .card3,
    .step,
    .inspirations p,
    .constellation
  `);

  // 3. Initialisation : on ajoute la classe de base et on observe chaque élément
  elementsToAnimate.forEach((el, index) => {
    el.classList.add('reveal');
    
    // Petit bonus : Pour les listes ou les cartes, on ajoute un léger délai 
    // en cascade pour qu'elles n'apparaissent pas toutes en même temps, mais l'une après l'autre.
    if (el.classList.contains('card3') || el.classList.contains('step') || el.tagName.toLowerCase() === 'li') {
      const delay = (index % 3) * 0.15; // 0.15s de décalage entre chaque carte/étape
      el.style.transitionDelay = `${delay}s`;
    }

    observer.observe(el);
  });
});