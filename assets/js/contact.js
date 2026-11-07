/* Contact — validation à la sortie de champ et à l'envoi.
   L'envoi passe par FormSubmit (service gratuit, sans PHP sur l'hébergement) ;
   s'il ne répond pas en arrière-plan, le formulaire est envoyé de façon classique. */
(() => {
  'use strict';
  const form = document.querySelector('[data-bulletin]');
  if (!form) return;
  const ADRESSE = 'martin.petit@icloud.com';
  const etat = form.querySelector('.formulaire__etat');
  const bouton = form.querySelector('button[type="submit"]');
  const libelle = bouton.firstChild;
  const champs = { nom: form.elements.nom, email: form.elements.email, message: form.elements.message };
  // Les robots remplissent le formulaire en moins de 3 secondes : on ne leur envoie rien.
  const ouverture = Date.now();
  const ENVOI = 'https://formsubmit.co/ajax/' + ADRESSE;
  if (new URLSearchParams(location.search).has('envoye')) setTimeout(recu, 0);

  const regles = {
    nom: v => v.trim().length >= 2 ? '' : 'Indiquez votre nom pour que je sache à qui répondre.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Cette adresse e-mail semble incomplète. Exemple : prenom@exemple.fr',
    message: v => v.trim().length >= 10 ? '' : 'Écrivez quelques mots sur votre projet (au moins une phrase).',
  };
  function verifier(nom) {
    const champ = champs[nom], erreur = regles[nom](champ.value);
    document.getElementById('e-' + nom).textContent = erreur;
    champ.setAttribute('aria-invalid', erreur ? 'true' : 'false');
    return !erreur;
  }
  for (const nom in champs) {
    champs[nom].addEventListener('blur', () => { if (champs[nom].value) verifier(nom); });
    champs[nom].addEventListener('input', () => { if (champs[nom].getAttribute('aria-invalid') === 'true') verifier(nom); });
  }

  function recu() {
    const bloc = document.createElement('div');
    bloc.className = 'recu'; bloc.setAttribute('role', 'status'); bloc.tabIndex = -1;
    const coche = document.createElement('span'); coche.className = 'recu__coche'; coche.setAttribute('aria-hidden', 'true');
    coche.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const mot = document.createElement('p'); mot.textContent = 'Votre demande est bien partie. Je vous réponds par e-mail dès que possible.';
    bloc.append(coche, mot);
    form.replaceWith(bloc); bloc.focus();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const bons = Object.keys(champs).map(verifier);
    if (bons.includes(false)) { champs[Object.keys(champs)[bons.indexOf(false)]].focus(); return; }
    const donnees = new FormData(form);
    if (Date.now() - ouverture < 3000 || donnees.get('_honey')) { recu(); return; }
    donnees.delete('_next');
    bouton.disabled = true; libelle.textContent = 'Envoi en cours… '; etat.textContent = '';
    try {
      const rep = await fetch(ENVOI, { method: 'POST', body: donnees, headers: { Accept: 'application/json' } });
      const json = await rep.json();
      if (!rep.ok || String(json.success) !== 'true') throw new Error(json.message || 'envoi');
      recu();
    } catch {
      // Envoi en arrière-plan impossible (réseau, script bloqué) : on envoie le formulaire
      // normalement. FormSubmit le transmet puis ramène le visiteur ici avec ?envoye=1.
      form.submit();
      return;
    } finally {
      bouton.disabled = false; libelle.textContent = 'Envoyer ma demande ';
    }
  });
})();
