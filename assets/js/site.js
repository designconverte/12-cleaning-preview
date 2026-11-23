/* Twelve Cleaning · home: page motion and UI.
   Everything is in the HTML in its final state; motion starts from it. Without this script, or without the home model,
   the page still reads and both forms still send. Reduced motion: everything in place, nothing moving. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var isDesktop = function () { return window.innerWidth >= 1024; };
  var hasIO = 'IntersectionObserver' in window;
  var mqMobile = window.matchMedia('(max-width: 699px)');
  var Stage = window.TwelveStage || null;
  var ICONS = (function () { var u = $('use[href*="icons.svg"]'); var h = u ? u.getAttribute('href') : '/assets/img/icons.svg#'; return h.split('#')[0]; })();

  if (!reduce) doc.classList.add('rv-on');

  function onceVisible(el, fn, margin, threshold) {
    if (!el) return;
    if (!hasIO || reduce) { fn(el); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, { rootMargin: margin || '0px 0px -12% 0px', threshold: threshold || 0 });
    io.observe(el);
  }

  /* ── reveals: settle 14px, once ── */
  $$('[data-rv]').forEach(function (el) { onceVisible(el, function (n) { n.classList.add('in'); }); });

  /* ── header: solid after the hero, hides on a fast scroll down ── */
  var hdr = $('[data-hdr]');
  var hero = $('[data-hero]');
  var lastY = window.scrollY;
  function onScrollHeader() {
    if (!hdr) return;
    var y = window.scrollY;
    hdr.classList.toggle('is-solid', y > 24);
    var menuOpen = doc.classList.contains('menu-open');
    if (!menuOpen && y > 900 && y > lastY + 6) hdr.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 900) hdr.classList.remove('is-hidden');
    doc.classList.toggle('hdr-off', hdr.classList.contains('is-hidden'));
    lastY = y;
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ═════ the home model in the hero ═════ */
  var stageEl = $('[data-stage-canvas]');
  var stage = null;
  var capHome = $('[data-stage-home]'), capN = $('[data-stage-n]'), capR = $('[data-stage-r]');
  var READ = {
    'Weekly': ['52 visits', 'a year of weekly care'],
    'Every other week': ['26 visits', 'a year of every-other-week care'],
    'Custom': ['Custom', 'a rhythm we set with you'],
    'Just the reset for now': ['Just once', 'one reset'],
    'Just the move clean': ['Just once', 'the move clean'],
    'Not sure yet': ['26 visits', 'a year of every-other-week care']
  };
  function caption(home, n, r) {
    if (capHome && home != null) capHome.textContent = home;
    if (capN && n != null) capN.textContent = n;
    if (capR && r != null) capR.textContent = r;
  }
  function startStage(quiet) {
    if (stage || !Stage || !stageEl) return;
    try {
      stage = new Stage(stageEl, { reduce: reduce, beds: 4, baths: 3, service: 'recurring', pad: 0.02 });
      stage.setRhythm(26, { instant: true });
      stage.st.rise = reduce ? 1 : 0;
      /* quiet: drawn ahead of time behind the closed drawer; the house builds itself once the drawer is open */
      if (quiet) { stage.introPending = !reduce; stage.draw(); } else stage.intro();
    } catch (_e) { stage = null; }
  }
  var deskDrawer = function () { return !!$('[data-stage]') && !!$('[data-qcard]'); };
  var startIfStacked = function () {
    if (!deskDrawer()) { startStage(); return; }
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 600); };
    idle(function () { startStage(true); }, { timeout: 3000 });
  };
  if (stageEl && Stage) {
    if (reduce || document.readyState === 'complete') startIfStacked();
    else window.addEventListener('load', function () { setTimeout(startIfStacked, 120); });
    setTimeout(startIfStacked, 2500);
  }
  /* a fine pointer tilts the model a little; the light of the hero follows the scroll */
  if (hero && finePointer && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      if (!stage) return;
      var r = stageEl.getBoundingClientRect();
      stage.look((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
    });
    hero.addEventListener('pointerleave', function () { if (stage) stage.look(0, 0); });
  }
  var heroTick = false;
  function onScrollHero() {
    if (heroTick || !hero) return;
    heroTick = true;
    requestAnimationFrame(function () {
      heroTick = false;
      var p = clamp(window.scrollY / Math.max(1, hero.offsetHeight), 0, 1);
      hero.style.setProperty('--hero-p', p.toFixed(3));
      if (stage && !reduce && p < 1) stage.setSun(-2.3 + p * 1.1);
    });
  }
  if (!reduce) window.addEventListener('scroll', onScrollHero, { passive: true });

  /* ═════ forms ═════ */
  var SERVICE = { 'recurring': 'Recurring cleaning', 'deep-reset': 'Deep Cleaning Reset', 'move-in-out': 'Move-in / Move-out', 'not-sure': 'Not sure yet',
    'commercial-office': 'Office', 'commercial-medical': 'Medical or admin', 'commercial-coworking': 'Coworking or suite', 'commercial-facility': 'Building or facility' };
  var FREQ_Q = { 'deep-reset': 'After the reset, would you like a plan?', 'move-in-out': 'After the move, would you like regular cleaning?' };
  var heroHome = $('#quote-home-hero'), heroBiz = $('#quote-business-hero'), finalForm = $('#quote-final');
  var NS = 'http://www.w3.org/2000/svg';

  /* a small ring of the plan: n visits, the gold one at twelve; closed = the gold line goes all the way round */
  function miniRing(n, closed) {
    var s = '<svg class="mring" viewBox="0 0 100 100" aria-hidden="true"><circle class="mring__t" cx="50" cy="50" r="38"/>';
    var count = Math.max(1, Math.min(n || 26, 120));
    var rr = count > 60 ? 1.2 : count > 30 ? 1.7 : 2.4;
    for (var i = 0; i < count; i++) {
      var a = i / count * Math.PI * 2 - Math.PI / 2;
      s += '<circle ' + (i === 0 ? 'class="mring__g" ' : '') + 'cx="' + (50 + 38 * Math.cos(a)).toFixed(1) + '" cy="' + (50 + 38 * Math.sin(a)).toFixed(1) + '" r="' + (i === 0 ? 5 : rr) + '"/>';
    }
    if (closed) s += '<circle class="mring__c" cx="50" cy="50" r="44" pathLength="1" stroke-dasharray="1" stroke-dashoffset="' + (reduce ? 0 : 1) + '" transform="rotate(-90 50 50)"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.2s" fill="freeze"' + (reduce ? ' begin="indefinite"' : '') + '/></circle>';
    return s + '</svg>';
  }

  function setupForm(form) {
    var kind = form.getAttribute('data-kind');
    var isFinal = form.hasAttribute('data-final');
    var isHero = form === heroHome || form === heroBiz;
    var stepEls = $$('[data-cs-step]', form);
    var details = $('[data-details]', form);
    var full = $('[data-fullname]', form);
    var one = function (name) { var el = form.querySelector('[name="' + name + '"]'); if (!el) return ''; if (el.tagName === 'SELECT') return el.value; var c = form.querySelector('[name="' + name + '"]:checked'); return c ? c.value : (el.type === 'radio' || el.type === 'checkbox' ? '' : el.value); };
    var many = function (name) { return $$('[name="' + name + '"]:checked', form).map(function (el) { return el.value; }); };
    var val = function (name) { var el = form.querySelector('[name="' + name + '"]'); return el ? String(el.value || '').trim() : ''; };
    var dash = function (v) { return v ? String(v).replace(/\|/g, '/') : '-'; };
    var visibleStep = function () { return stepEls.filter(function (s) { return !s.hidden; })[0]; };

    /* counters: − / + that start empty, so the answer is a real choice */
    $$('[data-count]', form).forEach(function (box) {
      var input = $('input[type="hidden"]', box), out = $('[data-out]', box);
      var min = Number(box.getAttribute('data-min')), max = Number(box.getAttribute('data-max')), inc = Number(box.getAttribute('data-inc'));
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-d]');
        if (!b) return;
        var cur = input.value === '' ? null : Number(input.value);
        var d = Number(b.getAttribute('data-d'));
        var next = cur === null ? (d > 0 ? min : min) : clamp(cur + d * inc, min, max);
        input.value = String(next);
        out.textContent = (next >= max ? next + '+' : String(next));
        box.classList.remove('is-invalid');
        var err = $('[data-err]', box); if (err) err.hidden = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    function freqFor(svc) {
      $$('[data-for]', form).forEach(function (el) {
        var on = el.getAttribute('data-for').split(' ').indexOf(svc || 'recurring') > -1;
        if (el.tagName === 'OPTION') { el.hidden = !on; el.disabled = !on; return; }
        el.hidden = !on;
        if (!on) $$('input:checked', el).forEach(function (i) { i.checked = false; });
      });
      if (isFinal) {
        var sel = form.querySelector('select[name="frequency"]');
        if (sel && sel.selectedOptions[0] && sel.selectedOptions[0].disabled) sel.value = 'Every other week';
      }
      var q = $('[data-freq-q]', form);
      if (q) q.textContent = FREQ_Q[svc] || 'How often?';
    }

    function compose() {
      var first = val('first_name'), last = val('last_name');
      if (full) full.value = (first + ' ' + last).trim();
      if (!details) return;
      var notes = val('notes').replace(/\|/g, '/');
      var parts;
      if (kind === 'business') {
        parts = ['Form: Business', 'Space: ' + dash(SERVICE[one('service')]), 'Company: ' + dash(val('company')), 'Role: ' + dash(val('role')),
          'Size: ' + dash(one('bsize')), 'Restrooms: ' + dash(val('restrooms')), 'Frequency: ' + dash(one('frequency')), 'Cleaning time: -',
          'Switching: ' + dash(one('switching'))];
      } else {
        var src = isFinal && heroHome ? heroHome : form;
        var get = function (n) { var el = src.querySelector('[name="' + n + '"]'); if (!el) return ''; var c = src.querySelector('[name="' + n + '"]:checked'); return c ? c.value : (el.type === 'radio' || el.type === 'checkbox' ? '' : String(el.value || '').trim()); };
        var svc = one('service');
        var addons = $$('[name="addons"]:checked', src).map(function (el) { return el.value; });
        if (isFinal && heroHome) { var hn = get('notes'); if (hn) notes = hn.replace(/\|/g, '/'); }
        parts = ['Form: Home', 'Service: ' + dash(SERVICE[svc]), 'Frequency: ' + dash(one('frequency')), 'Bedrooms: ' + dash(get('bedrooms')),
          'Bathrooms: ' + dash(get('bathrooms')), 'Size: ' + dash(get('size')), 'Home empty: ' + dash(svc === 'move-in-out' ? get('empty') : ''),
          'Pets: ' + dash(get('pets')), 'Last cleaning: ' + dash(get('last')), 'Add-ons: ' + dash(addons.join(', '))];
      }
      var head = parts.join(' | ') + ' | Notes: ';
      details.value = head + dash(notes).slice(0, Math.max(1, 1000 - head.length));
      summary();
    }

    function summary() {
      var box = $('[data-summary]', form), txt = $('[data-summary-text]', form);
      if (!box || !txt) return;
      var zip = val('zip');
      var bits;
      if (kind === 'business') {
        bits = [SERVICE[one('service')], one('bsize'), val('restrooms') ? val('restrooms') + ' restrooms' : '', one('frequency'), zip ? 'ZIP ' + zip : ''];
      } else {
        var bd = val('bedrooms'), ba = val('bathrooms');
        bits = [SERVICE[one('service')], bd || ba ? (bd || '–') + ' bed / ' + (ba || '–') + ' bath' : '', one('frequency'), zip ? 'ZIP ' + zip : ''];
      }
      bits = bits.filter(Boolean);
      txt.textContent = bits.join(' · ');
      box.hidden = bits.length === 0;
      var ring = $('[data-ticket-ring]', form);
      if (ring) { var f = form.querySelector('[name="frequency"]:checked'); ring.innerHTML = miniRing(f ? Number(f.getAttribute('data-n')) : (kind === 'business' ? 52 : 26)); }
    }

    /* required answers the module does not know about: bedrooms, bathrooms, frequency, size, restrooms, names, company */
    var REQ = ['bedrooms', 'bathrooms', 'restrooms', 'bsize', 'frequency', 'first_name', 'last_name', 'company'];
    function showErr(name, on) {
      var e = form.querySelector('[data-err="' + name + '"]');
      if (e) e.hidden = !on;
      var field = form.querySelector('[name="' + name + '"]');
      if (!field) return;
      var box = field.closest('.count') || (field.type === 'radio' ? field.closest('.chips') : null);
      if (box) box.classList.toggle('is-invalid', on);
      else if (on) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    }
    function check(step) {
      if (!step) return true;
      var bad = null;
      REQ.forEach(function (name) {
        var el = step.querySelector('[name="' + name + '"]');
        if (!el || el.tagName === 'SELECT') return;
        var host = el.closest('[hidden]');
        if (host && host !== step && step.contains(host)) return;
        var ok = (el.type === 'radio') ? !!step.querySelector('[name="' + name + '"]:checked') : String(el.value || '').trim().length > 0;
        showErr(name, !ok);
        if (!ok && !bad) bad = el;
      });
      if (bad) {
        var target = bad.type === 'hidden' ? bad.closest('.count').querySelector('button[data-d="1"]') : bad;
        if (target) target.focus();
        return false;
      }
      return true;
    }
    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cs-next], button[type="submit"]');
      if (!b || !form.contains(b)) return;
      compose();
      if (!check(visibleStep())) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target || e.target.tagName !== 'INPUT') return;
      if (form.classList.contains('is-zipfirst') && e.target.name === 'zip') { e.preventDefault(); e.stopImmediatePropagation(); zipGo(); return; }
      compose();
      if (!check(visibleStep())) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    form.addEventListener('submit', function (e) {
      compose();
      if (!check(visibleStep())) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    form.addEventListener('input', function (e) {
      if (e.target && REQ.indexOf(e.target.name) > -1 && String(e.target.value || '').trim()) showErr(e.target.name, false);
      compose();
      if (isHero && e.target && e.target.name === 'zip') syncFinal();
    });

    form.addEventListener('change', function (e) {
      var t = e.target;
      if (!t) return;
      if (REQ.indexOf(t.name) > -1) showErr(t.name, false);
      if (t.name === 'service') {
        freqFor(one('service'));
        if (form === heroHome && stage) { stage.setKind('home'); stage.setService(one('service')); }
        if (form === heroBiz && stage) { stage.setKind('office'); stage.playVisit(100); }
      }
      if (form === heroHome && stage && (t.name === 'bedrooms' || t.name === 'bathrooms')) {
        var bd = Number(val('bedrooms')) || stage.plan.beds || 4, ba = Number(val('bathrooms')) || stage.plan.baths || 3;
        stage.setHome(bd, ba);
        caption('Your home · ' + (val('bedrooms') || bd) + ' bed / ' + (val('bathrooms') || ba) + ' bath');
      }
      if (form === heroBiz && stage && (t.name === 'restrooms' || t.name === 'bsize')) {
        var sz = form.querySelector('[name="bsize"]:checked');
        stage.setOffice(sz ? sz.getAttribute('data-size') : (stage.plan.size || 'm'), Number(val('restrooms')) || stage.plan.restrooms || 2);
        caption('Your space' + (val('restrooms') ? ' · ' + val('restrooms') + ' restrooms' : ''));
      }
      if (t.name === 'frequency' && isHero && stage) {
        var opt = form.querySelector('[name="frequency"]:checked');
        if (opt) {
          stage.setRhythm(Number(opt.getAttribute('data-n')), { soft: opt.hasAttribute('data-soft'), gold: kind !== 'business' });
          var rd = kind === 'business' ? [opt.value, 'your recurring schedule'] : (READ[opt.value] || READ['Every other week']);
          caption(null, rd[0], rd[1]);
          dialTo(opt.value, true);
        }
      }
      if (form === heroHome) syncFinal();
      compose();
    });

    /* step counter, 12 ticks (4 per step), done state */
    var now = $('[data-step-now]', form);
    var ticks = $$('[data-ticks] i', form);
    var of = Number(($('[data-ticks]', form) || { getAttribute: function () { return 3; } }).getAttribute('data-of') || 3);
    function sync() {
      var v = visibleStep();
      if (!v) return;
      var k = v.getAttribute('data-cs-step');
      var n = k === 'done' ? of : Number(k);
      if (now && /^\d$/.test(k)) now.textContent = k;
      var lit = k === 'done' ? 12 : Math.round(n * 12 / of);
      if (k === '1' && form.classList.contains('is-zipfirst')) lit = 2;
      ticks.forEach(function (t, i) { t.classList.toggle('on', i < lit); });
      form.classList.toggle('is-done', k === 'done');
      var micro = $('[data-micro]', form); if (micro) micro.hidden = k !== '1';
      if (k === 'done') done();
      compose();
    }
    function done() {
      var first = val('first_name');
      var fn = $('[data-first-name]', form); if (fn) fn.textContent = first ? ', ' + first : '';
      var f = form.querySelector('[name="frequency"]:checked') || form.querySelector('select[name="frequency"]');
      var n = 26;
      if (f && f.tagName === 'SELECT') n = ({ 'Weekly': 52, 'Every other week': 26, 'Custom': 26, 'Not sure yet': 26 })[f.value] || 1;
      else if (f) n = Number(f.getAttribute('data-n')) || 26;
      var ring = $('[data-done-ring]', form); if (ring) ring.innerHTML = miniRing(n, true);
      if (isHero && stage) stage.close();
    }
    if (typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(sync);
      stepEls.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['hidden'] }); });
    }
    /* phones: step 1 opens with the ZIP alone; its button reveals the services, then the module's own Next takes over.
       Same fields, same validation, same payload; a missing or short ZIP reports the same form_error the module would. */
    var zipBtn = $('[data-zip-go]', form);
    var zipPassed = false;
    function zipMode() {
      if (!zipBtn) return;
      var s1 = $('[data-cs-step="1"]', form);
      form.classList.toggle('is-zipfirst', mqMobile.matches && !zipPassed && !!s1 && !s1.hidden);
      sync();
    }
    function zipGo() {
      var zip = $('[name="zip"]', form), err = $('[data-cs-error-for="zip"]', form);
      zip.dispatchEvent(new Event('input', { bubbles: true })); /* the module counts the attempt as the start, as its own Next does */
      var v = String(zip.value || '').trim();
      var code = !v ? 'required' : (/^\d{5}$/.test(v) ? null : 'invalid');
      if (err && !err.id) err.id = form.id + '-zip-err';
      if (code) {
        if (err) {
          err.hidden = false;
          var ids = (zip.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== err.id; });
          ids.push(err.id);
          zip.setAttribute('aria-describedby', ids.join(' '));
        }
        zip.setAttribute('aria-invalid', 'true');
        zip.focus();
        document.dispatchEvent(new CustomEvent('cs:form_error', { detail: { form_id: form.getAttribute('data-cs-form'), step: 1, field: 'zip', error: code } }));
        return;
      }
      if (err) err.hidden = true;
      zip.removeAttribute('aria-invalid');
      zipPassed = true;
      zipMode();
      var hh = parseInt(getComputedStyle(doc).getPropertyValue('--hdr-h'), 10) || 64;
      var r = form.getBoundingClientRect();
      if (!doc.classList.contains('drawer-open') && (r.top < hh || r.top > window.innerHeight * 0.45)) window.scrollTo({ top: window.scrollY + r.top - hh - 12, behavior: reduce ? 'auto' : 'smooth' });
      var first = form.querySelector('[name="service"]:checked') || form.querySelector('[name="service"]');
      if (first) first.focus({ preventScroll: true });
    }
    if (zipBtn) {
      zipBtn.addEventListener('click', zipGo);
      if (mqMobile.addEventListener) mqMobile.addEventListener('change', zipMode);
      if (typeof MutationObserver !== 'undefined') new MutationObserver(zipMode).observe($('[data-cs-step="1"]', form), { attributes: true, attributeFilter: ['hidden'] });
    }
    var edit = $('[data-edit]', form);
    if (edit) edit.addEventListener('click', function () {
      var guard = 0;
      while (guard++ < 3) { var v = visibleStep(); if (!v || v.getAttribute('data-cs-step') === '1') break; var bk = $('[data-cs-back]', v); if (!bk) break; bk.click(); }
    });
    if (isFinal) form.addEventListener('change', function (e) { if (e.target && e.target.name === 'service') freqFor(one('service')); });
    freqFor(one('service'));
    zipMode();
    sync();
    form._compose = compose;
    form._freqFor = freqFor;
  }
  $$('form[data-cs-form]').forEach(setupForm);

  /* the sentence at the end starts from what the visitor already chose at the top (until they touch it) */
  var finalTouched = false;
  if (finalForm) {
    finalForm.addEventListener('input', function (e) { if (e.isTrusted) finalTouched = true; });
    finalForm.addEventListener('change', function (e) { if (e.isTrusted) finalTouched = true; });
  }
  function syncFinal() {
    if (!finalForm || !heroHome || finalTouched) return;
    var s = heroHome.querySelector('[name="service"]:checked');
    var z = heroHome.querySelector('[name="zip"]');
    var f = heroHome.querySelector('[name="frequency"]:checked');
    var fs = finalForm.querySelector('[name="service"]'), fz = finalForm.querySelector('[name="zip"]'), ff = finalForm.querySelector('[name="frequency"]');
    /* set values directly: a synthetic change event would count as the visitor starting this form */
    if (s && fs) { fs.value = s.value; if (finalForm._freqFor) finalForm._freqFor(s.value); }
    if (f && ff) { var o = ff.querySelector('option[value="' + f.value + '"]'); if (o && !o.disabled) ff.value = f.value; }
    if (z && fz && /^\d{5}$/.test(z.value)) fz.value = z.value;
    if (finalForm._compose) finalForm._compose();
  }

  /* ── tabs: home / business ── */
  var tabs = $$('[data-tab]');
  function selectTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
      if (on && focus) t.focus();
    });
    if (stage) {
      stage.setKind(name === 'business' ? 'office' : 'home');
      if (name === 'business') caption('An office · 2 restrooms', 'Weekly', 'your recurring schedule');
      else caption('4 bed / 3 bath', '26 visits', 'a year of every-other-week care');
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { if (t.getAttribute('aria-selected') !== 'true') selectTab(t.getAttribute('data-tab')); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(n.getAttribute('data-tab'), true);
    });
  });

  /* ── "How it works": the ring of twelve; the rhythm picked here goes to step 2 of the hero form ── */
  var dial = $('[data-dial]');
  var dialDots = $('[data-dial-dots]');
  function drawDial(n, soft, animate) {
    if (!dialDots) return;
    while (dialDots.firstChild) dialDots.removeChild(dialDots.firstChild);
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 - Math.PI / 2;
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (200 + 140 * Math.cos(a)).toFixed(1));
      c.setAttribute('cy', (200 + 140 * Math.sin(a)).toFixed(1));
      c.setAttribute('r', i === 0 ? 7.5 : n > 30 ? 3.4 : 4.4);
      c.setAttribute('class', 'dial__dot' + (i === 0 ? ' dial__dot--reset' : '') + (soft && i ? ' is-soft' : ''));
      if (animate && !reduce) { c.style.opacity = '0'; (function (node, d, s) { setTimeout(function () { node.style.opacity = ''; }, d); })(c, 120 + i * 34); }
      dialDots.appendChild(c);
    }
  }
  function dialTo(value, fromForm) {
    if (!dial) return;
    var btn = $('[data-dial-ctl] button[data-v="' + value + '"]', dial);
    if (!btn) return;
    $$('[data-dial-ctl] button', dial).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
    drawDial(Number(btn.getAttribute('data-n')), btn.hasAttribute('data-soft'), !fromForm);
    var rd = READ[value] || READ['Every other week'];
    var dn = $('[data-dial-n]', dial), dr = $('[data-dial-r]', dial);
    if (dn) dn.textContent = rd[0];
    if (dr) dr.textContent = value === 'Just the reset for now' ? 'one reset' : rd[1];
  }
  if (dial) {
    $('[data-dial-ctl]', dial).addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var v = b.getAttribute('data-v');
      dialTo(v, false);
      /* hand the rhythm to the hero form (weekly / every other week / custom only) */
      if (heroHome && v !== 'Just the reset for now') {
        var r = heroHome.querySelector('[name="frequency"][value="' + v + '"]');
        if (r && !r.closest('[hidden]') && !heroHome.querySelector('[name="frequency"]:checked')) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    });
    onceVisible(dial, function () { drawDial(26, false, true); }, '0px 0px -25% 0px');
  }

  /* ── services: the same model in miniature, each in its service's state; the visit plays once in view ── */
  $$('[data-mini]').forEach(function (cv) {
    if (!Stage) return;
    onceVisible(cv, function () {
      var svc = cv.getAttribute('data-mini');
      try {
        var s = new Stage(cv, { reduce: reduce, beds: svc === 'move-in-out' ? 3 : 4, baths: svc === 'move-in-out' ? 2 : 3, pad: 0.04, maxDpr: 2 });
        s.setRhythm(svc === 'move-in-out' ? 1 : 26, { instant: true, gold: svc !== 'move-in-out' });
        s.setService(svc);
      } catch (_e) { /* the card still reads without the drawing */ }
    }, '0px 0px -10% 0px', 0.2);
  });

  /* ── consistency: the three cards fan out, the ticks draw together ── */
  var deck = $('[data-deck]');
  if (deck) onceVisible(deck, function () { deck.classList.add('is-on'); }, '0px 0px -25% 0px');
  /* phones: the cards arrive one at a time with the scroll (visit 1, then 10, then 50) on a sticky stage */
  var deckCards = deck ? $$('.card', deck) : [];
  var deckStage = deck ? $('.deck__stage', deck) : null;
  var deckTick = false;
  function deckStep() {
    if (!deck || !deck.classList.contains('deck--seq')) return;
    var r = deck.getBoundingClientRect();
    var top = parseFloat(getComputedStyle(deckStage).top) || 0;
    var p = clamp((top - r.top) / Math.max(1, r.height - deckStage.offsetHeight), 0, 1);
    var k = Math.min(2, Math.floor(p * 3));
    if (deck.getAttribute('data-k') !== String(k)) deck.setAttribute('data-k', String(k));
    var seen = r.top < window.innerHeight * 0.75;
    deckCards.forEach(function (c, i) { c.classList.toggle('is-shown', seen && i <= k); });
  }
  function deckMode() {
    if (!deck) return;
    var on = mqMobile.matches && !reduce;
    deck.classList.toggle('deck--seq', on);
    if (on) deckStep(); else { deck.removeAttribute('data-k'); deckCards.forEach(function (c) { c.classList.add('is-shown'); }); }
  }
  if (deck) {
    deckMode();
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', deckMode);
    window.addEventListener('scroll', function () {
      if (deckTick) return;
      deckTick = true;
      requestAnimationFrame(function () { deckTick = false; deckStep(); });
    }, { passive: true });
  }

  /* ── trust: the clock hand walks through the visit; the light of the chapter warms with the scroll ── */
  var clock = $('[data-clock]');
  if (clock) {
    var g = $('.clock__ticks', clock);
    for (var m = 0; m < 12; m++) {
      var a = m / 12 * Math.PI * 2 - Math.PI / 2;
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', (100 + 74 * Math.cos(a)).toFixed(1)); ln.setAttribute('y1', (100 + 74 * Math.sin(a)).toFixed(1));
      ln.setAttribute('x2', (100 + (m % 3 ? 80 : 84) * Math.cos(a)).toFixed(1)); ln.setAttribute('y2', (100 + (m % 3 ? 80 : 84) * Math.sin(a)).toFixed(1));
      g.appendChild(ln);
    }
  }
  var visitItems = $$('.visit__i');
  var visitList = $('[data-visit]');
  /* phones and tablets: the clock rides in a sticky bar above the list, with the moment of the visit in words */
  var mqTrust = window.matchMedia('(max-width: 1023px)');
  var vbar = null;
  if (visitList && clock && !reduce) {
    vbar = document.createElement('li');
    vbar.className = 'visitbar';
    vbar.setAttribute('aria-hidden', 'true');
    vbar.innerHTML = $('svg', clock).outerHTML + '<span class="visitbar__n"></span><b class="visitbar__t"></b>';
    visitList.insertBefore(vbar, visitList.firstChild);
    var liveMode = function () { visitList.classList.toggle('visit--live', mqTrust.matches); };
    liveMode();
    if (mqTrust.addEventListener) mqTrust.addEventListener('change', liveMode);
  }
  function visitNow(i) {
    visitItems.forEach(function (x, k) { x.classList.toggle('is-now', k === i); });
    var deg = (i * 360 / visitItems.length) + 'deg';
    $$('[data-clock-hand]').forEach(function (h) { h.style.setProperty('--hand', deg); });
    if (vbar) {
      $('.visitbar__n', vbar).textContent = (i + 1) + ' / ' + visitItems.length;
      var h3 = $('h3', visitItems[i]);
      $('.visitbar__t', vbar).textContent = h3 ? h3.textContent : '';
    }
  }
  if (visitItems.length && hasIO) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        visitNow(visitItems.indexOf(e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    visitItems.forEach(function (x) { io2.observe(x); });
    visitNow(0);
  }
  var trust = $('#trust');
  var office = $('[data-office]');
  var walk = office ? $('.office__walk', office) : null;
  var scTick = false;
  function onScrollSections() {
    if (scTick) return;
    scTick = true;
    requestAnimationFrame(function () {
      scTick = false;
      var vh = window.innerHeight;
      if (trust) {
        var r = trust.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) trust.style.setProperty('--tp', clamp((vh - r.top) / (r.height + vh), 0, 1).toFixed(3));
      }
      if (walk) {
        var o = office.getBoundingClientRect();
        if (o.bottom > 0 && o.top < vh) walk.style.setProperty('--walk', clamp((vh - o.top) / (vh * 0.55 + o.height * 0.5), 0, 1).toFixed(3));
      }
    });
  }
  if (!reduce) { window.addEventListener('scroll', onScrollSections, { passive: true }); onScrollSections(); }

  /* ── the name: the twelve marks draw one by one around the numeral ── */
  var twelve = $('[data-twelve]');
  if (twelve) {
    var tg = $('[data-twelve-ticks]', twelve);
    var circ = document.createElementNS(NS, 'circle');
    circ.setAttribute('cx', '200'); circ.setAttribute('cy', '200'); circ.setAttribute('r', '170');
    tg.appendChild(circ);
    for (var t = 0; t < 12; t++) {
      var aa = t / 12 * Math.PI * 2 - Math.PI / 2;
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', (200 + 178 * Math.cos(aa)).toFixed(1)); l.setAttribute('y1', (200 + 178 * Math.sin(aa)).toFixed(1));
      l.setAttribute('x2', (200 + (t === 0 ? 200 : 194) * Math.cos(aa)).toFixed(1)); l.setAttribute('y2', (200 + (t === 0 ? 200 : 194) * Math.sin(aa)).toFixed(1));
      l.style.transitionDelay = (t * 90) + 'ms';
      tg.insertBefore(l, tg.firstChild && t === 0 ? tg.firstChild : null);
    }
    onceVisible(twelve, function () { twelve.classList.add('is-on'); }, '0px 0px -25% 0px');
  }

  /* ── map and office drawing ── */
  onceVisible($('[data-map]'), function (el) { el.classList.add('is-on'); }, '0px 0px -20% 0px');
  onceVisible(office, function (el) { el.classList.add('is-on'); }, '0px 0px -20% 0px');

  /* ── open now? (Atlanta time; hours Mon–Sat 8 AM–5 PM) ── */
  (function () {
    var els = $$('[data-open-status]');
    if (!els.length || typeof Intl === 'undefined') return;
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var get = function (ty) { var p = parts.filter(function (x) { return x.type === ty; })[0]; return p ? p.value : ''; };
      var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var d = days.indexOf(get('weekday')), h = parseInt(get('hour'), 10) % 24, mi = parseInt(get('minute'), 10);
      var tm = h + mi / 60;
      var hours = function (day) { return day >= 1 && day <= 6 ? [8, 17] : null; };
      var today = hours(d), open = !!(today && tm >= today[0] && tm < today[1]);
      var text;
      if (open) text = 'Open now · until 5 PM in Atlanta';
      else {
        var nd = d, label = '';
        for (var k = 0; k < 8; k++) {
          var hh = hours(nd);
          if (hh && (k > 0 || tm < hh[0])) { label = k === 0 ? 'today' : k === 1 ? 'tomorrow' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][nd]; break; }
          nd = (nd + 1) % 7;
        }
        text = 'Closed now · opens ' + label + ' at 8 AM';
      }
      els.forEach(function (el) { el.classList.toggle('is-open', open); var tx = $('[data-open-text]', el); if (tx) tx.textContent = text; });
    } catch (_e) { /* the static hours stay */ }
  })();

  /* ── every CTA leads to the hero form; a service picked elsewhere plays in the hero ── */
  function scrollToY(y) { window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  function goEstimate(opts) {
    opts = opts || {};
    if (!heroHome) { window.location.href = '/#estimate'; return; }
    selectTab(opts.business ? 'business' : 'home');
    var form = opts.business ? heroBiz : heroHome;
    var target = isDesktop() ? 0 : Math.max(0, ($('[data-qcard]') || form).getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(doc).getPropertyValue('--hdr-h'), 10) || 64) - 8);
    scrollToY(target);
    var onStep1 = !$('[data-cs-step="1"]', form).hidden;
    var wait = reduce ? 0 : Math.min(1200, 250 + window.scrollY / 5);
    hushUntil = Date.now() + wait + 700;
    setTimeout(function () {
      if (opts.service && onStep1) {
        var radio = form.querySelector('input[name="service"][value="' + opts.service + '"]');
        if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      var zip = $('input[name="zip"]', form);
      if (opts.zip && zip && onStep1) { zip.value = opts.zip; zip.dispatchEvent(new Event('input', { bubbles: true })); }
      if (onStep1 && zip) zip.focus({ preventScroll: true });
    }, wait);
  }
  $$('[data-service]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); goEstimate({ service: a.getAttribute('data-service') }); });
  });
  $$('[data-business]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); goEstimate({ business: true }); });
  });
  $$('[data-go-estimate]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (a.hasAttribute('data-menu-link')) return;
      e.preventDefault(); goEstimate({});
    });
  });
  var zc = $('[data-zipcheck]');
  if (zc) {
    var zin = $('input', zc);
    zin.addEventListener('input', function () { zin.value = zin.value.replace(/\D/g, '').slice(0, 5); });
    zc.addEventListener('submit', function (e) { e.preventDefault(); goEstimate({ zip: /^\d{5}$/.test(zin.value) ? zin.value : '' }); });
  }

  /* ── mobile bar: after the hero form, hidden while the final form is on screen ── */
  var mbar = $('[data-mbar]');
  var heroFormBox = $('[data-hero-form]');
  var finalBox = $('[data-final-form]');
  if (mbar && heroFormBox && hasIO) {
    var pastHero = false, finalOn = false;
    var paint = function () { mbar.classList.toggle('is-on', pastHero && !finalOn); };
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; });
      paint();
    }).observe(heroFormBox);
    if (finalBox) new IntersectionObserver(function (es) {
      es.forEach(function (e) { finalOn = e.isIntersecting; });
      paint();
    }, { threshold: 0.15 }).observe(finalBox);
  }


  /* ═════ the illustration drawer ═════
     The hero rests as text + form. Starting the form (tile, ZIP, tabs, any field) slides the house in: from the left
     on desktop, down from the top on phones. Scrolling away from the form, Esc, a click on the veil, focus leaving the
     form or the close button slide it out. The house keeps its state between openings. Focus is never trapped.
     Phones: the drawer is sized to the visual viewport, so it turns into a compact strip while the keyboard is up, and
     the field being edited (with its Next button) is kept in the band between the drawer and the keyboard. */
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var vv = window.visualViewport || null;
  var mdh = 0;
  function mobileSize() {
    if (mqDesk.matches) return;
    var h = vv ? vv.height : window.innerHeight;
    var kb = h < window.innerHeight * 0.78;
    doc.classList.toggle('kb-open', kb);
    mdh = kb ? Math.round(clamp(h * 0.3, 104, 168)) : Math.round(clamp(h * 0.4, 220, 360));
    doc.style.setProperty('--mdh', mdh + 'px');
    doc.style.setProperty('--vv-top', (vv ? Math.round(vv.offsetTop) : 0) + 'px');
  }
  function keepInView(el) {
    if (!drawerOpen || mqDesk.matches || !el || !heroCard.contains(el)) return;
    var row = el.closest('.qinline') || el.closest('.field') || el.closest('.tile') || el.closest('.count') || el;
    var r = row.getBoundingClientRect();
    var top = (vv ? vv.offsetTop : 0) + mdh + 10;
    var bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 10;
    var dy = 0;
    /* first choice: the whole card starts right under the drawer, if the edited row still fits above the keyboard */
    var card = heroCard.getBoundingClientRect();
    if (r.bottom - (card.top - top) <= bottom && r.top - (card.top - top) >= top) dy = card.top - top;
    else if (r.top < top) dy = r.top - top;
    else if (r.bottom > bottom) dy = Math.min(r.bottom - bottom, r.top - top);
    if (Math.abs(dy) < 2) return;
    hushUntil = Date.now() + 700;
    window.scrollBy({ top: dy, behavior: reduce ? 'auto' : 'smooth' });
  }
  var stageFig = $('[data-stage]');
  var heroCard = $('[data-qcard]');
  var drawerOn = false, drawerOpen = false, hushUntil = 0, quietUntil = 0, blurProbed = false;
  var veil = null;
  function drawerWidth() {
    if (!heroFormBox) return;
    var left = heroFormBox.getBoundingClientRect().left;
    var w = Math.min(window.innerWidth * 0.5, left - 24);
    doc.style.setProperty('--drawer-w', Math.max(320, Math.round(w)) + 'px');
  }
  function activeTab() { var t = $('[data-tab][aria-selected="true"]'); return t ? t.getAttribute('data-tab') : 'home'; }
  function openDrawer(e) {
    if (!drawerOn || drawerOpen || Date.now() < quietUntil) return;
    if (mqDesk.matches) drawerWidth(); else mobileSize();
    drawerOpen = true;
    doc.classList.add('drawer-open');
    /* blur budget: the first slide is timed; below ~40 fps the veil drops the blur for a solid tint */
    if (!blurProbed && !reduce) {
      blurProbed = true;
      var n = 0, t0 = performance.now();
      (function count(t) {
        n++;
        if (t - t0 < 700) requestAnimationFrame(count);
        else if (n / ((t - t0) / 1000) < 40) doc.classList.add('drawer-lite');
      })(t0);
    }
    var fresh = !stage;
    if (fresh) startStage(true);
    if (stage && fresh && activeTab() === 'business') {
      stage.setKind('office');
      caption('An office · 2 restrooms', 'Weekly', 'your recurring schedule');
    }
    if (stage && stage.introPending) {
      stage.introPending = false;
      /* the house builds once the slide has landed, so the two motions never compete for the same frames */
      setTimeout(function () { if (stage) stage.intro(); }, reduce ? 0 : 640);
    } else if (stage) stage.resize();
    var focusEl = (e && e.target && heroCard.contains(e.target)) ? e.target : document.activeElement;
    if (!mqDesk.matches) { setTimeout(function () { keepInView(focusEl); }, reduce ? 0 : 80); }
  }
  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    doc.classList.remove('drawer-open');
  }
  function drawerMode() {
    drawerOn = !!stageFig && !!heroCard;
    doc.classList.toggle('drawer-mode', drawerOn);
    if (!drawerOn) { closeDrawer(); if (!stage) startStage(); return; }
    if (drawerOpen) { if (mqDesk.matches) drawerWidth(); else mobileSize(); }
  }
  if (stageFig && heroCard) {
    veil = document.createElement('div');
    veil.className = 'drawer-veil';
    veil.setAttribute('aria-hidden', 'true');
    hero.insertBefore(veil, hero.firstChild);
    drawerMode();
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', drawerMode);
    ['pointerdown', 'focusin', 'input'].forEach(function (ev) { heroCard.addEventListener(ev, openDrawer); });
    veil.addEventListener('click', closeDrawer);
    $('[data-drawer-close]', stageFig).addEventListener('click', function () {
      closeDrawer();
      quietUntil = Date.now() + 400;
      var t = $('[data-tab][aria-selected="true"]');
      if (t) t.focus({ preventScroll: true });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerOpen && (!menu || menu.hidden)) closeDrawer();
    });
    document.addEventListener('focusin', function (e) {
      if (!drawerOpen) return;
      var t = e.target;
      if (heroCard.contains(t) || stageFig.contains(t)) return;
      closeDrawer();
    });
    window.addEventListener('scroll', function () {
      if (!drawerOpen || Date.now() < hushUntil) return;
      var r = heroCard.getBoundingClientRect();
      if (mqDesk.matches) {
        var hh = parseInt(getComputedStyle(doc).getPropertyValue('--hdr-h'), 10) || 84;
        if (r.bottom < hh + 160 || r.top > window.innerHeight - 120) closeDrawer();
      } else {
        var vh = vv ? vv.offsetTop + vv.height : window.innerHeight;
        if (r.bottom < mdh + 60 || r.top > vh - 60) closeDrawer();
      }
    }, { passive: true });
    window.addEventListener('resize', function () { if (drawerOpen) { if (mqDesk.matches) drawerWidth(); else mobileSize(); } });
    /* phones: the keyboard shrinks the visual viewport; the drawer follows and the edited field stays in view */
    var onViewport = function () {
      if (!drawerOpen || mqDesk.matches) return;
      mobileSize();
      var a = document.activeElement;
      if (a && heroCard.contains(a)) keepInView(a);
    };
    if (vv) { vv.addEventListener('resize', onViewport); vv.addEventListener('scroll', function () { if (drawerOpen && !mqDesk.matches) doc.style.setProperty('--vv-top', Math.round(vv.offsetTop) + 'px'); }); }
    heroCard.addEventListener('focusin', function (e) { if (drawerOpen && !mqDesk.matches) setTimeout(function () { keepInView(e.target); }, 60); });
  }


  /* ═════ V2: real work ═════ */

  /* videos: poster first; the clip is fetched near the viewport, plays only on screen, pauses off it.
     Reduced motion, Save-Data or a slow connection keep the poster. Every loop has a visible pause button. */
  (function () {
    var vids = $$('[data-vbg]');
    if (!vids.length) return;
    var conn = navigator.connection || {};
    var still = reduce || conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
    if (still || !hasIO) return;
    vids.forEach(function (box) {
      var v = $('video', box);
      var host = box.parentNode;
      var btn = $('[data-vpause]', host);
      var userPaused = false, onScreen = false;
      var play = function () {
        if (userPaused || !onScreen) return;
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () { /* autoplay refused: the poster stays */ });
      };
      v.addEventListener('playing', function () { box.classList.add('is-on'); });
      if (btn) {
        btn.hidden = false;
        btn.addEventListener('click', function () {
          userPaused = !userPaused;
          btn.setAttribute('aria-pressed', String(userPaused));
          var l = $('[data-vpause-label]', btn); if (l) l.textContent = userPaused ? 'Play video' : 'Pause video';
          if (userPaused) v.pause(); else play();
        });
      }
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting || v.getAttribute('src')) return;
          v.setAttribute('src', v.getAttribute('data-src'));
          v.load();
        });
      }, { rootMargin: '400px 0px' }).observe(host);
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          onScreen = e.isIntersecting;
          if (onScreen) play(); else v.pause();
        });
      }, { threshold: 0.12 }).observe(host);
    });
  })();

  /* before / after: a range input drives the line (keyboard and screen readers get the same control) */
  $$('[data-ba]').forEach(function (frame) {
    var range = $('[data-ba-range]', frame);
    if (!range) return;
    var set = function (v) { frame.style.setProperty('--ba', clamp(Number(v), 0, 100) + '%'); };
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);
  });

  /* full-screen photos: arrows, keys, swipe; Esc or a click outside closes and focus returns to the photo */
  (function () {
    var shots = $$('[data-lb]');
    if (!shots.length || typeof HTMLDialogElement === 'undefined') return;
    var dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Photos from recent jobs');
    var ic = function (id) { return '<svg class="ic" aria-hidden="true"><use href="' + ICONS + '#i-' + id + '"></use></svg>'; };
    dlg.innerHTML = '<div class="lb__stage"><img class="lb__img" alt=""></div><div class="lb__bar"><p class="lb__cap"></p><p class="lb__count"></p></div>' +
      '<button class="lb__btn lb__close" type="button" aria-label="Close photos">' + ic('close') + '</button>' +
      '<button class="lb__btn lb__prev" type="button" aria-label="Previous photo">' + ic('arrow-left') + '</button>' +
      '<button class="lb__btn lb__next" type="button" aria-label="Next photo">' + ic('arrow-right') + '</button>';
    document.body.appendChild(dlg);
    var img = $('.lb__img', dlg), cap = $('.lb__cap', dlg), count = $('.lb__count', dlg);
    var cur = 0, opener = null;
    var show = function (i) {
      cur = (i + shots.length) % shots.length;
      var s = shots[cur];
      img.src = s.getAttribute('data-src');
      var inner = $('img', s);
      img.alt = inner ? inner.alt : '';
      cap.textContent = s.getAttribute('data-cap') || '';
      count.textContent = (cur + 1) + ' / ' + shots.length;
    };
    shots.forEach(function (b, i) { b.addEventListener('click', function () { opener = b; show(i); dlg.showModal(); }); });
    $('.lb__close', dlg).addEventListener('click', function () { dlg.close(); });
    $('.lb__prev', dlg).addEventListener('click', function () { show(cur - 1); });
    $('.lb__next', dlg).addEventListener('click', function () { show(cur + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lb__stage')) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
    var sx = null;
    dlg.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    dlg.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var d = e.clientX - sx; sx = null;
      if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1));
    });
  })();

  /* ── mobile menu: focus trapped, Esc closes, focus returns to the button ── */
  var menu = $('[data-menu]');
  var toggle = $('[data-menu-toggle]');
  if (menu && toggle) {
    var main = $('#main'), footer = $('.ftr');
    var focusables = function () { return $$('a[href], button:not([disabled])', menu); };
    var open = function () {
      menu.hidden = false; doc.classList.add('menu-open'); toggle.setAttribute('aria-expanded', 'true');
      [main, footer, hdr].forEach(function (el) { if (el) el.inert = true; });
      document.body.style.overflow = 'hidden';
      var f = focusables(); if (f[1]) f[1].focus();
    };
    var close = function (back) {
      doc.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false');
      [main, footer, hdr].forEach(function (el) { if (el) el.inert = false; });
      document.body.style.overflow = '';
      menu.hidden = true;
      if (back !== false) toggle.focus();
    };
    toggle.addEventListener('click', open);
    $('[data-menu-close]', menu).addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) close(); });
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $$('[data-menu-link]', menu).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href') || '';
        var id = href.indexOf('#') > -1 ? href.slice(href.indexOf('#')) : '';
        close(false);
        if (a.hasAttribute('data-go-estimate')) { e.preventDefault(); goEstimate({}); return; }
        if (id && $(id)) { e.preventDefault(); $(id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
      });
    });
  }

})();
