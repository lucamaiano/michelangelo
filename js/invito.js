/* Invito — hero (stelle, parallasse), barra, countdown, RSVP, IBAN. */
(function () {
  'use strict';
  var CONFIG = window.INVITO_CONFIG || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- stelle ---- */
  function makeStars(el, count, maxSize) {
    if (!el) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      var size = Math.random() * maxSize + 1;
      s.className = 'inv-star';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 100).toFixed(2) + '%';
      s.style.setProperty('--dur', (2 + Math.random() * 5).toFixed(2) + 's');
      s.style.setProperty('--delay', (Math.random() * 5).toFixed(2) + 's');
      frag.appendChild(s);
    }
    el.appendChild(frag);
  }
  makeStars(document.getElementById('invStars'), 140, 2.6);

  /* ---- reveal ---- */
  var revealables = document.querySelectorAll('.inv-reveal');
  if (!('IntersectionObserver' in window) || reduced) {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add('is-in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        ro.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(revealables, function (el) { ro.observe(el); });
  }

  /* ---- barra che si nasconde scendendo (niente parallasse: con SmoothScroll dava l'effetto "pagina nella pagina") ---- */
  var nav = document.getElementById('invNav');
  var lastY = window.pageYOffset;
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset;
    if (nav) {
      if (y > 160 && y > lastY) nav.classList.add('is-hidden');
      else nav.classList.remove('is-hidden');
      lastY = y;
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
})();

/* ===================== countdown, RSVP, IBAN ===================== */
(function () {
  'use strict';
  var CONFIG = window.INVITO_CONFIG || {};

  /* ---- countdown ---- */
  var nums = document.querySelectorAll('[data-countdown-n]');
  var labels = document.querySelectorAll('[data-countdown-l]');
  function setAll(list, txt) { Array.prototype.forEach.call(list, function (el) { el.textContent = txt; }); }
  function tick() {
    var start = new Date(CONFIG.eventStart || '2026-11-01T13:00:00+01:00');
    var now = new Date();
    var dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
    var diff = dayStart - now;
    if (diff > 0) {
      var days = Math.ceil(diff / 86400000);
      setAll(nums, String(days));
      setAll(labels, days === 1 ? 'giorno' : 'giorni');
    } else if (now - start < 12 * 3600000) {
      setAll(nums, 'Oggi!');
      setAll(labels, 'ci vediamo alle 13');
    } else {
      setAll(nums, 'Fatto!');
      setAll(labels, 'grazie a tutti');
    }
  }
  if (nums.length) { tick(); setInterval(tick, 60000); }

  /* ---- copia IBAN ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    var original = btn.textContent;
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.getAttribute('data-copy'));
      var txt = (target ? target.textContent : '').replace(/\s+/g, '');
      function done() {
        btn.textContent = 'Copiato ✓';
        btn.classList.add('is-done');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('is-done'); }, 2200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { fallback(txt); done(); });
      } else { fallback(txt); done(); }
    });
  });
  function fallback(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---- RSVP ---- */
  var form = document.getElementById('rsvpForm');
  if (!form) return;
  var counts = document.getElementById('rsvpCounts');
  var ok = form.querySelector('.inv-rsvp__ok');
  var err = form.querySelector('.inv-rsvp__err');
  var submit = form.querySelector('.inv-submit');
  var wa = document.getElementById('rsvpWa');

  // stepper
  Array.prototype.forEach.call(form.querySelectorAll('[data-step]'), function (b) {
    b.addEventListener('click', function () {
      var input = b.parentNode.querySelector('input');
      var v = parseInt(input.value || '0', 10) + parseInt(b.getAttribute('data-step'), 10);
      input.value = Math.max(parseInt(input.min || '0', 10), Math.min(parseInt(input.max || '20', 10), v));
    });
  });
  // "purtroppo no" nasconde i contatori
  function syncChoice() {
    var no = form.querySelector('input[name=partecipa]:checked');
    counts.hidden = !!(no && no.value !== 'Ci saremo');
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name=partecipa]'), function (r) { r.addEventListener('change', syncChoice); });
  syncChoice();

  function values() {
    var yes = form.querySelector('input[name=partecipa]:checked').value === 'Ci saremo';
    return {
      nome: form.nome.value.trim(),
      partecipa: form.partecipa.value,
      adulti: yes ? form.adulti.value : '0',
      bimbi: yes ? form.bimbi.value : '0',
      note: form.note.value.trim()
    };
  }
  function waLink(v) {
    var msg = v.partecipa === 'Ci saremo'
      ? 'Ciao! ' + v.nome + ': ci saremo al compleanno di Michelangelo il 1 novembre. Adulti: ' + v.adulti + ', bambini: ' + v.bimbi + (v.note ? '. Note: ' + v.note : '')
      : 'Ciao! ' + v.nome + ': purtroppo non riusciamo a venire al compleanno di Michelangelo il 1 novembre.' + (v.note ? ' ' + v.note : '');
    return 'https://wa.me/' + (CONFIG.whatsapp || '') + '?text=' + encodeURIComponent(msg);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.nome.classList.add('is-touched');
    if (form.website.value) return; // honeypot
    if (!form.nome.value.trim()) { form.nome.focus(); return; }
    var v = values();
    ok.hidden = true; err.hidden = true;
    submit.disabled = true;

    function success() {
      form.querySelectorAll('.inv-field, .inv-choice, .inv-counts, .inv-submit').forEach(function (el) { el.hidden = true; });
      var intro = document.querySelector('.inv-rsvp__intro');
      if (intro) intro.hidden = true;
      ok.hidden = false;
    }
    function failure() {
      submit.disabled = false;
      if (wa) wa.href = waLink(v);
      err.hidden = false;
    }

    if (!CONFIG.formId) { setTimeout(success, 300); return; } // sviluppo locale
    var fd = new FormData();
    var en = CONFIG.entries || {};
    Object.keys(v).forEach(function (k) { if (en[k]) fd.append(en[k], v[k]); });
    fetch('https://docs.google.com/forms/d/e/' + CONFIG.formId + '/formResponse', { method: 'POST', mode: 'no-cors', body: fd })
      .then(success, failure);
  });
})();
