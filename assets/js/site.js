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
    setTimeout(() => document.body.append(bandeau), 600);
  }

  /* Carrousel manuel des notes, avec toutes les notes lisibles sans JavaScript. */
  const notes = document.querySelector('[data-notes]');
  if (notes) {
    const citations = [...notes.querySelectorAll('blockquote')];
    const commandes = document.querySelector('[data-notes-commandes]');
    const statut = commandes.querySelector('[data-notes-statut]');
    let active = 0;

    const afficher = (index, annoncer = true) => {
      active = (index + citations.length) % citations.length;
      citations.forEach((citation, i) => {
        citation.classList.toggle('est-active', i === active);
        citation.setAttribute('aria-hidden', String(i !== active));
      });
      if (annoncer) {
        statut.textContent = `Note ${active + 1} sur ${citations.length}. ${citations[active].textContent}`;
      }
    };

    afficher(0, false);
    notes.classList.add('est-active');
    commandes.hidden = false;
    commandes.querySelector('[data-note-precedente]').addEventListener('click', () => afficher(active - 1));
    commandes.querySelector('[data-note-suivante]').addEventListener('click', () => afficher(active + 1));
  }

  /* Tarifs : pile animée à partir de la même liste que le mode comparaison. */
  const tarifs = document.querySelector('[data-tarifs]');
  if (tarifs) {
    const piste = tarifs.querySelector('[data-tarifs-piste]');
    const cartes = [...piste.querySelectorAll('.tarif')];
    const commandes = tarifs.querySelector('[data-tarifs-commandes]');
    const navigation = commandes.querySelector('[data-tarifs-navigation]');
    const compte = commandes.querySelector('[data-tarifs-compte]');
    const statut = commandes.querySelector('[data-tarifs-statut]');
    const pause = commandes.querySelector('[data-tarifs-pause]');
    const mode = commandes.querySelector('[data-tarifs-mode]');
    const mouvement = matchMedia('(prefers-reduced-motion: reduce)');
    let actif = 0;
    let comparaison = false;
    let arrete = mouvement.matches;
    let visible = !('IntersectionObserver' in window);
    let survole = false;
    let minuterie;
    let permutation;

    function placer() {
      cartes.forEach((carte, i) => {
        const rang = (i - actif + cartes.length) % cartes.length;
        const masque = !comparaison && rang !== 0;
        carte.style.setProperty('--rang', String(Math.min(rang, 3)));
        carte.style.setProperty('--ordre', String(cartes.length - rang));
        carte.style.setProperty('--visibilite', rang < 4 ? '1' : '0');
        carte.toggleAttribute('inert', masque);
        if (masque) carte.setAttribute('aria-hidden', 'true');
        else carte.removeAttribute('aria-hidden');
      });
      compte.textContent = `${actif + 1} / ${cartes.length}`;
    }

    function planifier() {
      clearTimeout(minuterie);
      const lectureEnCours = tarifs.matches(':focus-within') && document.activeElement !== pause;
      if (arrete || comparaison || survole || !visible || document.hidden || lectureEnCours) return;
      minuterie = setTimeout(() => changer(actif + 1), 4000);
    }

    function changer(index, manuel = false, animer = true) {
      const suivant = (index + cartes.length) % cartes.length;
      if (suivant === actif) { planifier(); return; }
      permutation?.cancel();
      const sortante = cartes[actif];
      actif = suivant;
      placer();
      if (animer && !comparaison && !mouvement.matches && sortante.animate) {
        permutation = sortante.animate([
          { transform: 'translate3d(0, 0, 0) skewY(-3deg)', opacity: 1, zIndex: 7 },
          { transform: 'translate3d(0, 180px, 0) skewY(-6deg)', opacity: 0, zIndex: 7, offset: .48 },
          { transform: 'var(--position)', opacity: 0, offset: .52 },
          { transform: 'var(--position)', opacity: 'var(--visibilite)' }
        ], { duration: 850, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      }
      if (manuel) statut.textContent = `Tarif ${actif + 1} sur ${cartes.length} : ${cartes[actif].querySelector('h3').textContent}`;
      planifier();
    }

    function synchroniserAncre(hash = location.hash) {
      const cible = document.getElementById(hash.slice(1))?.closest('.tarif');
      const index = cartes.indexOf(cible);
      if (index !== -1) {
        arrete = true;
        changer(index, false, false);
        afficherPause();
      }
    }

    function afficherPause() {
      pause.textContent = arrete ? 'Activer le défilement' : 'Mettre en pause';
      planifier();
    }

    tarifs.classList.add('tarifs--cartes');
    piste.tabIndex = -1;
    placer();
    synchroniserAncre();
    commandes.hidden = false;
    afficherPause();
    commandes.querySelector('[data-tarif-precedent]').addEventListener('click', () => changer(actif - 1, true));
    commandes.querySelector('[data-tarif-suivant]').addEventListener('click', () => changer(actif + 1, true));
    pause.addEventListener('click', () => { arrete = !arrete; afficherPause(); });
    mode.addEventListener('click', () => {
      permutation?.cancel();
      comparaison = !comparaison;
      tarifs.classList.toggle('tarifs--cartes', !comparaison);
      navigation.hidden = comparaison;
      mode.textContent = comparaison ? 'Revenir aux cartes' : 'Comparer tous les tarifs';
      placer();
      if (comparaison) piste.focus();
      else commandes.querySelector('[data-tarif-suivant]').focus();
      planifier();
    });

    piste.addEventListener('click', e => {
      if (comparaison || !(e.target instanceof Element) || e.target.closest('a, button')) return;
      if (e.target.closest('.tarif') !== cartes[actif] || window.getSelection()?.toString()) return;
      changer(actif + 1, true);
    });
    piste.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { survole = true; planifier(); } });
    piste.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { survole = false; planifier(); } });
    tarifs.addEventListener('focusin', planifier);
    tarifs.addEventListener('focusout', () => queueMicrotask(planifier));
    document.addEventListener('visibilitychange', planifier);
    window.addEventListener('hashchange', () => synchroniserAncre());
    document.addEventListener('click', e => {
      if (e.button || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const lien = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (lien) synchroniserAncre(lien.hash);
    });
    mouvement.addEventListener('change', e => { if (e.matches) { arrete = true; permutation?.cancel(); afficherPause(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entree]) => { visible = entree.isIntersecting; planifier(); }).observe(piste);
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
