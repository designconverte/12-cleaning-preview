/* Founder profile — reading progress, the contents rail, and the milestones line that draws with the scroll.
   Without this script (or with reduced motion) the page is complete and still: the line is full, every milestone
   and every tick of the ring is in place. */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var art = $('.pf');
  if (!art) return;
  var bar = $('[data-pf-progress]');
  var links = $$('[data-pf-link]');
  var secs = links.map(function (a) { return d.getElementById(a.getAttribute('data-pf-link')); });

  var msBox = $('.pf-ms');
  var ms = $('[data-ms]');
  var line = $('[data-ms-line]');
  var items = $$('[data-ms-i]');
  var ticks = $$('[data-ms-ring] line');
  var armed = !!(ms && line && !reduce);
  if (armed) msBox.classList.add('is-armed');

  var current = -1;
  function frame() {
    var vh = window.innerHeight;
    if (bar) {
      var r = art.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    if (links.length) {
      var k = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < vh * 0.36) k = i; });
      if (k !== current) {
        current = k;
        links.forEach(function (a, i) { if (i === k) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      }
    }
    if (armed) {
      var mr = ms.getBoundingClientRect();
      var reach = vh * 0.62;
      var mp = clamp((reach - mr.top) / Math.max(1, mr.height), 0, 1);
      msBox.style.setProperty('--p', mp.toFixed(4));
      items.forEach(function (it) { it.classList.toggle('is-on', it.getBoundingClientRect().top + 10 < reach); });
      var lit = Math.round(mp * ticks.length);
      ticks.forEach(function (t, i) { t.classList.toggle('is-lit', i < lit); });
    }
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; frame(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();
})();
