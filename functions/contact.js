export async function onRequestPost(context) {
  try {
    const input = await context.request.json();
    const { name, email, message, website } = input;

    // 1. Vérification du Honeypot (le champ "website" doit être vide)
    if (website) {
      return new Response(JSON.stringify({ success: false, error: "Spam détecté." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Vérification des champs obligatoires
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ success: false, error: "Tous les champs obligatoires ne sont pas remplis." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Envoi de l'e-mail via l'API de Brevo
    const brevoApiKey = context.env.BREVO_API_KEY;

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        sender: {
          name: "Site Grani-Ose",
          email: "votre-email-verifie-sur-brevo@domaine.com" // ⚠️ Doit être un email validé sur Brevo
        },
        to: [
          {
            email: "votre-boite-mail-personnelle@gmail.com", // ⚠️ Votre email perso
            name: "Grani-Ose"
          }
        ],
        subject: `Nouveau message de contact de ${name}`,
        htmlContent: `
          <h3>Nouveau message reçu depuis le site web</h3>
          <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          <p><strong>Message :</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `
      })
    });

    if (!brevoResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "Erreur lors de l'envoi de l'e-mail." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Message envoyé avec succès !" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Une erreur interne est survenue." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}