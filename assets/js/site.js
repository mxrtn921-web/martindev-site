/* Martin Petit — comportements communs, volontairement peu nombreux.
   1. Menu sur téléphone.  2. Trait sous l'en-tête une fois la page défilée.
   3. Apparition discrète des blocs [data-entree].
   4. Captures [.ecran--suivi] qui défilent avec la page (variable CSS --p, de 0 à 1). */
(() => {
  'use strict';
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 0. Une nouvelle page s'ouvre toujours en haut (sauf lien vers un passage précis, ou bouton Retour).
     Certains navigateurs et hébergeurs gardent sinon la position de la page précédente. */
  const nav = performance.getEntriesByType('navigation')[0];
  if (!location.hash && (!nav || nav.type !== 'back_forward')) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const enHaut = () => scrollTo({ top: 0, left: 0, behavior: 'instant' });
    enHaut();
    addEventListener('load', enHaut, { once: true });
  }

  /* 1. Menu */
  const bouton = document.querySelector('.menu-bouton');
  const menu = document.getElementById('menu');
  if (bouton && menu) {
    const basculer = ouvert => {
      bouton.setAttribute('aria-expanded', String(ouvert));
      bouton.querySelector('.menu-bouton__mot').textContent = ouvert ? 'Fermer' : 'Menu';
      menu.classList.toggle('est-ouvert', ouvert);
    };
    bouton.addEventListener('click', () => basculer(bouton.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('est-ouvert')) { basculer(false); bouton.focus(); } });
    matchMedia('(min-width: 900px)').addEventListener('change', () => basculer(false));
  }

  /* 1 bis. Arrivée sur le site : on retire la classe une fois le rideau levé,
     pour que les animations ne se rejouent pas (redimensionnement, impression…). */
  if (document.documentElement.classList.contains('arrivee')) {
    setTimeout(() => document.documentElement.classList.remove('arrivee'), 2700);
  }

  /* 1 ter. Vidéo : grand bouton de lecture sur l'image d'aperçu, puis les commandes du navigateur. */
  document.querySelectorAll('.video__cadre').forEach(cadre => {
    const video = cadre.querySelector('video'), lancer = cadre.querySelector('.video__lancer');
    if (!video || !lancer) return;
    video.controls = false;
    lancer.hidden = false;
    // Au clic, le bouton est retiré de la page : rien ne reste au-dessus de la vidéo
    // et les commandes du navigateur (son, plein écran) sont accessibles.
    const retirer = () => { lancer.remove(); video.controls = true; };
    lancer.addEventListener('click', () => { retirer(); video.play().catch(() => {}); video.focus(); });
    video.addEventListener('play', retirer, { once: true });
  });

  /* 1 quater. Mesure d'audience sans cookie (GoatCounter).
     Renseignez l'adresse de votre compte GoatCounter, par exemple 'https://martindev.goatcounter.com/count'.
     Tant qu'elle est vide, rien n'est chargé. */
  const GOATCOUNTER = '';
  if (GOATCOUNTER && location.protocol === 'https:') {
    const s = document.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = GOATCOUNTER;
    document.head.append(s);
  }

  /* 1 quinquies. Bandeau d'information : le site ne dépose aucun cookie, on le dit simplement, une fois. */
  const lire = k => { try { return localStorage.getItem(k); } catch { return '1'; } };
  if (!lire('mp-info')) {
    const racine = document.querySelector('link[rel="manifest"]')?.getAttribute('href').replace('site.webmanifest', '') ?? '';
    const bandeau = document.createElement('div');
    bandeau.className = 'bandeau-info';
    bandeau.setAttribute('role', 'region');
    bandeau.setAttribute('aria-label', 'Information sur les cookies');
    bandeau.innerHTML = `<p>Ce site n’utilise pas de cookies. <a class="lien" href="${racine}politique-confidentialite.html">Confidentialité</a></p><button class="bouton" type="button">J’ai compris</button>`;
    bandeau.querySelector('button').addEventListener('click', () => {
      try { localStorage.setItem('mp-info', '1'); } catch {}
      bandeau.remove();
    });
    // Après l'animation d'arrivée, pour ne pas la recouvrir.
    setTimeout(() => document.body.append(bandeau), document.documentElement.classList.contains('arrivee') ? 2600 : 600);
  }

  /* Geste commun aux carrousels : le navigateur garde le scroll vertical,
     le glissement horizontal reste stable même quand le pointeur quitte la photo. */
  const activerGlissement = (piste, classe, variable, changer) => {
    let depart = null;
    let glisse = false;
    let minuterie = 0;
    const remettreAZero = () => requestAnimationFrame(() => piste.style.setProperty(variable, '0px'));
    const terminer = (e, annule = false) => {
      if (!depart || depart.id !== e.pointerId) return;
      const dx = e.clientX - depart.x;
      const horizontal = depart.horizontal;
      depart = null;
      if (!horizontal) return;
      piste.classList.remove(classe);
      if (!annule && Math.abs(dx) >= Math.max(36, piste.clientWidth * .08)) changer(dx < 0 ? 1 : -1);
      remettreAZero();
      glisse = true;
      clearTimeout(minuterie);
      minuterie = setTimeout(() => { glisse = false; }, 350);
    };

    piste.addEventListener('dragstart', e => e.preventDefault());
    piste.addEventListener('pointerdown', e => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const cible = e.target instanceof Element ? e.target : null;
      if (cible?.closest('a, input, select, textarea, [contenteditable="true"], [data-no-swipe]')) return;
      depart = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: false };
    });
    piste.addEventListener('pointermove', e => {
      if (!depart || depart.id !== e.pointerId) return;
      const dx = e.clientX - depart.x;
      const dy = e.clientY - depart.y;
      if (!depart.horizontal) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy) * 1.15) return;
        depart.horizontal = true;
        piste.classList.add(classe);
        try { piste.setPointerCapture(e.pointerId); } catch {}
      }
      if (e.cancelable) e.preventDefault();
      piste.style.setProperty(variable, Math.max(-280, Math.min(280, dx)) + 'px');
    });
    window.addEventListener('pointerup', e => terminer(e), { passive: true });
    window.addEventListener('pointercancel', e => terminer(e, true), { passive: true });
    piste.addEventListener('lostpointercapture', e => terminer(e, true));
    return { aBouge: () => glisse };
  };


  /* 1 septies. Carrousel manuel des services, sans défilement automatique. */
  const services = document.querySelector('[data-services]');
  if (services) {
    const piste = services.querySelector('[data-services-piste]');
    const cartes = [...services.querySelectorAll('[data-service-slide]')];
    const commandes = services.querySelector('[data-services-commandes]');
    const aide = services.querySelector('[data-services-aide]');
    const precedent = services.querySelector('[data-service-precedent]');
    const suivant = services.querySelector('[data-service-suivant]');
    const choix = [...services.querySelectorAll('[data-service-choix]')];
    const statut = services.querySelector('[data-service-statut]');

    if (piste && cartes.length === 3 && commandes && precedent && suivant && choix.length === 3 && statut) {
      let active = 0;
      const afficher = cible => {
        active = (cible + cartes.length) % cartes.length;
        cartes.forEach((carte, i) => {
          const rang = (i - active + cartes.length) % cartes.length;
          carte.classList.toggle('service--centre', rang === 0);
          carte.classList.toggle('service--droite', rang === 1);
          carte.classList.toggle('service--gauche', rang === cartes.length - 1);
          carte.classList.toggle('service--loin', rang !== 0 && rang !== 1 && rang !== cartes.length - 1);
          carte.setAttribute('aria-hidden', String(rang !== 0));
          if (rang === 0) carte.removeAttribute('inert');
          else carte.setAttribute('inert', '');
          const lien = carte.querySelector('a');
          if (lien) lien.tabIndex = rang === 0 ? 0 : -1;
        });
        choix.forEach((bouton, i) => {
          if (i === active) bouton.setAttribute('aria-current', 'step');
          else bouton.removeAttribute('aria-current');
        });
        statut.textContent = 'Service ' + (active + 1) + ' sur ' + cartes.length + ' : ' + cartes[active].querySelector('h3').textContent.trim();
      };

      piste.classList.add('services--actif');
      commandes.hidden = false;
      if (aide) aide.hidden = false;
      afficher(0);
      const geste = activerGlissement(piste, 'services--glisse', '--service-glissement', direction => afficher(active + direction));

      precedent.addEventListener('click', () => afficher(active - 1));
      suivant.addEventListener('click', () => afficher(active + 1));
      choix.forEach((bouton, i) => bouton.addEventListener('click', () => afficher(i)));
      piste.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        afficher(active + (e.key === 'ArrowRight' ? 1 : -1));
      });
      piste.addEventListener('click', e => {
        if (geste.aBouge()) { e.preventDefault(); e.stopPropagation(); }
      });
    }
  }

  /* 2. En-tête */
  const entete = document.querySelector('.entete');
  const marquer = () => entete && entete.classList.toggle('est-defile', scrollY > 8);
  addEventListener('scroll', marquer, { passive: true });
  marquer();

  /* 3. Apparitions */
  const blocs = document.querySelectorAll('[data-entree]');
  if (calme || !('IntersectionObserver' in window)) blocs.forEach(b => b.classList.add('est-vu'));
  else {
    const io = new IntersectionObserver(entrees => entrees.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('est-vu'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    blocs.forEach(b => io.observe(b));
  }

  /* 4. Captures qui suivent le défilement */
  const ecrans = [...document.querySelectorAll('.ecran--suivi')];
  if (!ecrans.length || calme) return;
  const visibles = new Set();
  const io2 = new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target));
    mettreAJour();
  });
  ecrans.forEach(e => io2.observe(e));
  let attente = false;
  const mettreAJour = () => {
    attente = false;
    const h = innerHeight;
    visibles.forEach(el => {
      const r = el.getBoundingClientRect();
      // 0 quand le haut du cadre entre par le bas de l'écran, 1 quand son bas atteint le haut.
      const p = Math.min(1, Math.max(0, (h - r.top) / (h + r.height)));
      const doux = p * p * (3 - 2 * p);
      el.style.setProperty('--p', doux.toFixed(4));
    });
  };
  addEventListener('scroll', () => { if (!attente) { attente = true; requestAnimationFrame(mettreAJour); } }, { passive: true });
  addEventListener('resize', mettreAJour);
  mettreAJour();
})();
