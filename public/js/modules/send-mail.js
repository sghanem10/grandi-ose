export function initSendMail() {
    const form = document.getElementById('contact-form');
    
    form.addEventListener('submit', async function(e) {
      // 1. Empêcher le rechargement classique de la page
      e.preventDefault();
    
      const statusEl = document.getElementById('form-status');
      statusEl.textContent = "Envoi en cours...";
    
      // 2. Récupérer les valeurs des champs du formulaire
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        message: document.getElementById('message').value,
        website: document.getElementById('website').value // Le piège à spam (doit être vide)
      };
    
      try {
        // 3. Envoyer les données en POST vers la fonction Cloudflare (/contact)
        const response = await fetch('/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
    
        const result = await response.json();
    
        if (response.ok && result.success) {
          statusEl.textContent = "Message envoyé avec succès ! Merci.";
          statusEl.style.color = "green";
          form.reset(); // Vider le formulaire
        } else {
          statusEl.textContent = "Erreur : " + (result.error || "Une erreur est survenue.");
          statusEl.style.color = "red";
        }
    
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Impossible d'envoyer le message. Vérifiez votre connexion.";
        statusEl.style.color = "red";
      }
    });
}
