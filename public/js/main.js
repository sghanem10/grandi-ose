/**
 * Grandi-Ose ! — point d'entrée JavaScript
 *
 * Chargé en type="module", donc différé par défaut et en mode strict.
 *
 * Principe : tout le contenu du site reste accessible sans JavaScript. Les
 * modules n'ajoutent que du confort. Le dépliant « Lire la suite de mon
 * histoire » repose sur l'élément <details> natif, le défilement doux est géré
 * en CSS, et le carrousel de témoignages défile nativement — le module ne fait
 * qu'y ajouter flèches et pastilles.
 *
 * Modules à venir (voir ROADMAP.md) :
 *   modules/form.js    phase 4  soumission du formulaire, états, validation
 *   modules/nav.js     phase 6  menu mobile — il n'y a toujours AUCUNE
 *                               navigation sous 860px
 */
import { initCarousels } from './modules/carousel.js';
import { initSendMail } from './modules/send-mail.js';

initCarousels();
initSendMail();