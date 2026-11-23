/* Twelve Cleaning · the home model.
   A plan of the visitor's home drawn as a white architectural model (canvas 2D, orthographic projection),
   lit by a low sun with window light on the floors and ringed by the twelve marks of the year.
   The estimate form drives it: the service changes how the visit happens, bedrooms and bathrooms build the
   rooms, the rhythm fills the ring with the visits of a year. Frames are drawn only while something moves. */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  var WALL_H = 3.3;
  var WALL_T = 0.5;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }

  function hexRgb(hex) {
    var h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    if (!isFinite(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }

  /* colours come from the brand tokens on the page (brand/tokens.css) */
  function readTokens(el) {
    var cs = root.getComputedStyle ? root.getComputedStyle(el) : null;
    var g = function (name, fb) { var v = cs ? cs.getPropertyValue(name).trim() : ''; return hexRgb(v || fb); };
    return {
      navy: g('--tw-navy', '#1D3458'), night: g('--tw-night', '#0B1B33'), ink: g('--tw-ink', '#121A2B'),
      linen: g('--tw-linen', '#F8F6F0'), linen2: g('--tw-linen-2', '#F0EBE1'), white: g('--tw-white', '#FFFFFF'),
      gold: g('--tw-gold', '#B08A4E'), goldLight: g('--tw-gold-light', '#E2C88E'), line: g('--tw-line', '#E2DBCD')
    };
  }

  /* ───────────────────────── plans ───────────────────────── */

  function room(id, type, x, y, w, d) { return { id: id, type: type, x: x, y: y, w: w, d: d, clean: 0, base: 0 }; }
  var CARPET = { bed: 1, primary: 1, living: 1, hall: 1, open: 1, conf: 1 };

  /* a one-level home: kitchen, dining, living and entry on the left; a wing of bedrooms and baths along a hall */
  function homePlan(beds, baths) {
    beds = clamp(Math.round(beds || 4), 1, 6);
    baths = clamp(Number(baths) || 3, 1, 5.5);
    var full = Math.max(1, Math.floor(baths));
    var half = baths % 1 ? 1 : 0;
    var D = 34, HY0 = 15, HY1 = 19, X0 = 26;
    var rooms = [
      room('kitchen', 'kitchen', 0, 0, 15, 15), room('dining', 'dining', 15, 0, 11, 15),
      room('living', 'living', 0, 15, 17, 19), room('entry', 'entry', 17, 15, 9, 19)
    ];
    var back = [{ type: 'primary', w: 16 }, { type: 'pbath', w: 9 }];
    var front = [];
    if (half) front.push({ type: 'powder', w: 6 });
    var seq = [];
    var eb = beds - 1, ef = full - 1;
    while (eb > 0 || ef > 0) {
      if (eb > 0) { seq.push({ type: 'bed', w: 12 }); eb--; }
      if (eb > 0) { seq.push({ type: 'bed', w: 12 }); eb--; }
      if (ef > 0) { seq.push({ type: 'bath', w: 8 }); ef--; }
    }
    var bw = 25, fw = half ? 6 : 0;
    seq.forEach(function (it) {
      if (fw <= bw) { front.push(it); fw += it.w; } else { back.push(it); bw += it.w; }
    });
    if (!front.length || (front.length === 1 && front[0].type === 'powder')) { front.push({ type: 'utility', w: 9 }); fw += 9; }
    var W = Math.max(bw, fw);
    function place(row, y, d, total) {
      var x = X0;
      row.forEach(function (it, i) {
        var w = it.w + (i === row.length - 1 ? W - total : 0);
        var r = room(it.type + '-' + y + '-' + i, it.type, x, y, w, d);
        r.row = y === 0 ? 'back' : 'front';
        rooms.push(r);
        x += w;
      });
    }
    place(back, 0, HY0, bw);
    place(front, HY1, D - HY1, fw);
    rooms.push(room('hall', 'hall', X0, HY0, W, HY1 - HY0));
    var plan = { kind: 'home', rooms: rooms, W: X0 + W, D: D, beds: beds, baths: baths };
    plan.doors = [
      { x0: 15, y0: 1, x1: 15, y1: 14 },                 // kitchen · dining, open
      { x0: 3, y0: 15, x1: 13, y1: 15 },                 // kitchen · living, open
      { x0: 17, y0: 18, x1: 17, y1: 31 },                // living · entry, open
      { x0: 18, y0: 15, x1: 25, y1: 15 },                // dining · entry
      { x0: 26, y0: 15, x1: 26, y1: 19 },                // entry · hall
      { x0: 19, y0: 34, x1: 23, y1: 34, front: true }    // front door
    ];
    rooms.forEach(function (r) {
      if (r.type === 'pbath') plan.doors.push({ x0: r.x, y0: 4, x1: r.x, y1: 7 });
      else if (r.row === 'back' && r.type !== 'hall') plan.doors.push({ x0: r.x + 2, y0: HY0, x1: r.x + 5, y1: HY0 });
      else if (r.row === 'front') plan.doors.push({ x0: r.x + 2, y0: HY1, x1: r.x + (r.w > 6 ? 5 : 4), y1: HY1 });
    });
    plan.route = routeOf(rooms, ['primary', 'pbath', 'bed', 'bath', 'powder', 'utility', 'hall', 'kitchen', 'dining', 'living', 'entry']);
    finishPlan(plan);
    return plan;
  }

  /* an office: conference, breakroom and reception on the left; open workstations; restrooms along the back */
  function officePlan(size, restrooms) {
    var widths = { s: 24, m: 34, l: 46, xl: 58 };
    var ow = widths[size] || widths.m;
    restrooms = clamp(Math.round(restrooms || 2), 1, 10);
    var D = 30;
    var rooms = [room('conf', 'conf', 0, 0, 12, 12), room('break', 'break', 0, 12, 12, 8), room('reception', 'reception', 0, 20, 12, 10)];
    var rw = 5, shown = Math.min(restrooms, Math.max(1, Math.floor(ow / rw)));
    var stripW = shown * rw;
    var x = 12 + ow - stripW;
    for (var i = 0; i < shown; i++) { rooms.push(room('rr' + i, 'restroom', x + i * rw, 0, rw, 7)); }
    rooms.push(room('open', 'open', 12, 0, ow, D));
    var plan = { kind: 'office', rooms: rooms, W: 12 + ow, D: D, restrooms: restrooms };
    plan.doors = [
      { x0: 12, y0: 2, x1: 12, y1: 5 }, { x0: 12, y0: 13, x1: 12, y1: 19 }, { x0: 12, y0: 22, x1: 12, y1: 28 },
      { x0: 3, y0: 30, x1: 8, y1: 30, front: true }
    ];
    rooms.forEach(function (r) { if (r.type === 'restroom') plan.doors.push({ x0: r.x + 1, y0: 7, x1: r.x + 3, y1: 7 }); });
    plan.route = routeOf(rooms, ['restroom', 'break', 'conf', 'open', 'reception']);
    finishPlan(plan);
    return plan;
  }

  function routeOf(rooms, order) {
    var out = [];
    order.forEach(function (t) { rooms.forEach(function (r) { if (r.type === t) out.push(r); }); });
    return out;
  }

  /* walls from the room outlines on a unit grid: shared edges merge, doors cut, exterior runs get windows */
  function finishPlan(plan) {
    var H = {}, V = {};
    var add = function (map, k, r) { (map[k] = map[k] || []).push(r); };
    plan.rooms.forEach(function (r) {
      if (r.type === 'open') return;
      var x, y;
      for (x = r.x; x < r.x + r.w; x++) { add(H, x + ',' + r.y, r); add(H, x + ',' + (r.y + r.d), r); }
      for (y = r.y; y < r.y + r.d; y++) { add(V, r.x + ',' + y, r); add(V, (r.x + r.w) + ',' + y, r); }
    });
    if (plan.kind === 'office') {
      var o = plan.rooms.filter(function (r) { return r.type === 'open'; })[0];
      for (var ox = o.x; ox < o.x + o.w; ox++) { if (!H[ox + ',0']) add(H, ox + ',0', o); add(H, ox + ',' + plan.D, o); }
      for (var oy = 0; oy < plan.D; oy++) add(V, (o.x + o.w) + ',' + oy, o);
    }
    plan.doors.forEach(function (d) {
      var k;
      if (d.y0 === d.y1) { for (k = d.x0; k < d.x1; k++) delete H[k + ',' + d.y0]; }
      else { for (k = d.y0; k < d.y1; k++) delete V[d.x0 + ',' + k]; }
      if (d.front) plan.front = d;
    });
    var exterior = function (k, map, horiz) {
      var p = k.split(',').map(Number);
      if (horiz) return p[1] === 0 || p[1] === plan.D;
      return p[0] === 0 || p[0] === plan.W;
    };
    /* windows: the middle of each exterior run that belongs to one room */
    plan.windows = [];
    plan.rooms.forEach(function (r) {
      if (r.type === 'hall' || r.type === 'restroom' && plan.kind === 'office') return;
      var sides = [];
      if (r.y === 0) sides.push({ horiz: true, at: 0, a: r.x, b: r.x + r.w, n: [0, -1] });
      if (r.y + r.d === plan.D) sides.push({ horiz: true, at: plan.D, a: r.x, b: r.x + r.w, n: [0, 1] });
      if (r.x === 0) sides.push({ horiz: false, at: 0, a: r.y, b: r.y + r.d, n: [-1, 0] });
      if (r.x + r.w === plan.W) sides.push({ horiz: false, at: plan.W, a: r.y, b: r.y + r.d, n: [1, 0] });
      sides.forEach(function (s, si) {
        var len = s.b - s.a;
        if (len < 5 || (si > 0 && r.type !== 'living' && r.type !== 'primary' && r.type !== 'open')) return;
        var count = (r.type === 'living' || r.type === 'open') && len >= 16 ? 2 : 1;
        var wl = Math.min(r.type.indexOf('bath') > -1 || r.type === 'powder' || r.type === 'restroom' ? 2 : 4, len - 3);
        for (var c = 0; c < count; c++) {
          var mid = Math.round(s.a + len * (c + 1) / (count + 1));
          var a = mid - Math.floor(wl / 2), b = a + wl;
          var clash = plan.front && s.horiz && s.at === plan.front.y0 && b > plan.front.x0 && a < plan.front.x1;
          if (clash) continue;
          for (var k = a; k < b; k++) { if (s.horiz) delete H[k + ',' + s.at]; else delete V[s.at + ',' + k]; }
          plan.windows.push(s.horiz ? { x0: a, y0: s.at, x1: b, y1: s.at, n: s.n, room: r } : { x0: s.at, y0: a, x1: s.at, y1: b, n: s.n, room: r });
        }
      });
    });
    void exterior;
    /* merge unit edges into runs */
    var walls = [];
    var runs = function (map, horiz) {
      var byLine = {};
      Object.keys(map).forEach(function (k) {
        var p = k.split(',').map(Number);
        var line = horiz ? p[1] : p[0], pos = horiz ? p[0] : p[1];
        (byLine[line] = byLine[line] || []).push(pos);
      });
      Object.keys(byLine).forEach(function (line) {
        var ps = byLine[line].sort(function (a, b) { return a - b; });
        var s = ps[0], prev = ps[0];
        for (var i = 1; i <= ps.length; i++) {
          if (i < ps.length && ps[i] === prev + 1) { prev = ps[i]; continue; }
          var L = Number(line);
          /* split long runs so the painter's sort stays right next to furniture */
          for (var a = s; a <= prev; a += 4) {
            var b = Math.min(prev + 1, a + 4);
            walls.push(horiz
              ? { x: a - WALL_T / 2, y: L - WALL_T / 2, w: b - a + WALL_T, d: WALL_T, h: WALL_H, wall: true }
              : { x: L - WALL_T / 2, y: a - WALL_T / 2, w: WALL_T, d: b - a + WALL_T, h: WALL_H, wall: true });
          }
          if (i < ps.length) { s = ps[i]; prev = ps[i]; }
        }
      });
    };
    runs(H, true);
    runs(V, false);
    plan.walls = walls;
    plan.furniture = [];
    plan.decals = [];
    plan.rooms.forEach(function (r) { furnish(plan, r); });
  }

  /* furniture: low boxes, like a white architectural model; rugs are flat decals */
  function furnish(plan, r) {
    var F = plan.furniture, Dc = plan.decals;
    var box = function (x, y, w, d, h, kind) { F.push({ x: x, y: y, w: w, d: d, h: h, kind: kind || 'f', room: r }); };
    var rug = function (x, y, w, d) { Dc.push({ x: x, y: y, w: w, d: d, room: r }); };
    var cx = r.x + r.w / 2, back = r.row === 'front' ? r.y + r.d : r.y;
    var dir = r.row === 'front' ? -1 : 1; // into the room from the wall the bed leans on
    switch (r.type) {
      case 'primary':
      case 'bed': {
        var bw = r.type === 'primary' ? 6.2 : 5, bd = r.type === 'primary' ? 7 : 6.5;
        var by = dir > 0 ? back + 0.6 : back - 0.6 - bd;
        rug(cx - bw / 2 - 1.6, dir > 0 ? by + 2.4 : by - 1.4, bw + 3.2, bd);
        box(cx - bw / 2, by, bw, bd, 1.9, 'bed');
        box(cx - bw / 2, dir > 0 ? by : by + bd - 1.3, bw, 1.3, 2.4, 'pillow');
        box(cx - bw / 2 - 1.7, dir > 0 ? by : by + bd - 1.4, 1.3, 1.4, 1.6);
        box(cx + bw / 2 + 0.4, dir > 0 ? by : by + bd - 1.4, 1.3, 1.4, 1.6);
        if (r.w >= 12) box(r.x + 0.8, dir > 0 ? r.y + r.d - 2.2 : r.y + 0.6, 4.2, 1.6, 2.4);
        break;
      }
      case 'pbath':
      case 'bath':
      case 'powder':
      case 'restroom': {
        var ty = dir > 0 || r.type === 'restroom' ? r.y + 0.6 : r.y + r.d - 3.2;
        if (r.type === 'pbath') { box(r.x + 0.6, ty, 5, 2.6, 1.6, 'tub'); box(r.x + r.w - 3.4, r.y + r.d - 2.6, 2.8, 2.2, 1.2, 'shower'); box(r.x + 0.6, dir > 0 ? r.y + r.d - 2.3 : r.y + 0.6, 4.4, 1.6, 2.6); }
        else if (r.type === 'bath') { box(r.x + 0.6, ty, Math.min(5, r.w - 1.2), 2.6, 1.6, 'tub'); box(r.x + r.w - 2.4, dir > 0 ? r.y + r.d - 2.6 : r.y + 0.6, 1.8, 2, 1.3, 'wc'); box(r.x + 0.6, dir > 0 ? r.y + r.d - 2.3 : r.y + 0.8, 2.8, 1.6, 2.6); }
        else if (r.type === 'powder') { box(r.x + 0.6, r.y + r.d - 2.3, 2.6, 1.5, 2.6); box(r.x + r.w - 2.4, r.y + r.d - 2.6, 1.6, 2, 1.3, 'wc'); }
        else { box(r.x + 0.8, r.y + 0.6, 1.6, 2, 1.3, 'wc'); box(r.x + 2.8, r.y + r.d - 2, 1.8, 1.3, 2.4); }
        break;
      }
      case 'kitchen': {
        box(r.x + 0.4, r.y + 0.4, r.w - 0.8, 2, 3, 'counter');
        box(r.x + 0.4, r.y + 2.4, 2, r.d - 5, 3, 'counter');
        box(r.x + r.w - 3, r.y + 0.4, 2.6, 2.4, 5.2, 'fridge');
        box(r.x + 5, r.y + 6.6, 6.5, 3, 3, 'island');
        break;
      }
      case 'dining': {
        box(cx - 3.2, r.y + 5, 6.4, 3.6, 2.4, 'table');
        for (var c = 0; c < 3; c++) { box(cx - 3 + c * 2.3, r.y + 3.6, 1.3, 1.1, 1.5); box(cx - 3 + c * 2.3, r.y + 8.9, 1.3, 1.1, 1.5); }
        break;
      }
      case 'living': {
        rug(r.x + 2.5, r.y + 5.5, 11, 8.5);
        box(r.x + 2, r.y + r.d - 3.6, 9.5, 2.6, 2.2, 'sofa');
        box(r.x + 2, r.y + r.d - 8.6, 2.6, 5, 2.2, 'sofa');
        box(r.x + 6.4, r.y + 9, 4, 2.4, 1.3, 'table');
        box(r.x + 11.6, r.y + 7, 2.6, 2.6, 2.1);
        box(r.x + 3, r.y + 1.2, 7, 1.3, 1.9);
        break;
      }
      case 'entry': {
        rug(r.x + 2.5, r.y + 11, 4, 6);
        box(r.x + r.w - 1.8, r.y + 6, 1.3, 4.5, 2.6);
        break;
      }
      case 'hall': {
        rug(r.x + 3, r.y + 1, Math.max(4, r.w - 8), 2);
        break;
      }
      case 'utility': {
        box(r.x + 0.6, r.y + r.d - 2.8, 2.4, 2.4, 3); box(r.x + 3.2, r.y + r.d - 2.8, 2.4, 2.4, 3);
        break;
      }
      case 'conf': {
        box(r.x + 2.5, r.y + 3.5, 7, 4.5, 2.4, 'table');
        for (var k = 0; k < 3; k++) { box(r.x + 3 + k * 2.2, r.y + 2.2, 1.2, 1, 1.5); box(r.x + 3 + k * 2.2, r.y + 8.4, 1.2, 1, 1.5); }
        break;
      }
      case 'break': {
        box(r.x + 0.4, r.y + 0.4, r.w - 0.8, 1.8, 3, 'counter');
        box(r.x + 3, r.y + 3.4, 5, 2.4, 2.4, 'table');
        break;
      }
      case 'reception': {
        box(r.x + 2.5, r.y + 2.5, 6, 2, 3, 'counter');
        box(r.x + 1, r.y + r.d - 3, 6, 2, 1.9, 'sofa');
        break;
      }
      case 'open': {
        var x0 = r.x + 2, y0 = 10, cols = Math.max(1, Math.floor((r.w - 3) / 9)), rows = 2;
        for (var i = 0; i < cols; i++) {
          for (var j = 0; j < rows; j++) {
            var px = x0 + i * 9, py = y0 + j * 9.5;
            box(px, py, 6, 2.4, 2.5, 'desk'); box(px, py + 2.6, 6, 2.4, 2.5, 'desk');
            box(px + 1, py - 1.3, 1.2, 1.1, 1.5); box(px + 3.8, py - 1.3, 1.2, 1.1, 1.5);
            box(px + 1, py + 5.2, 1.2, 1.1, 1.5); box(px + 3.8, py + 5.2, 1.2, 1.1, 1.5);
          }
        }
        break;
      }
    }
  }

  /* ───────────────────────── the stage ───────────────────────── */

  function Stage(canvas, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.sh = document.createElement('canvas');
    this.shx = this.sh.getContext('2d');
    this.T = readTokens(canvas);
    this.reduce = !!opts.reduce;
    this.pad = opts.pad || 0.06;
    this.maxDpr = opts.maxDpr || 2;
    this.dark = !!opts.dark;
    this.yaw0 = opts.yaw != null ? opts.yaw : -0.5;
    this.elev = opts.elev != null ? opts.elev : 0.92;
    this.st = {
      yaw: this.yaw0, yawOff: 0, yawTarget: 0, elevOff: 0, elevTarget: 0,
      sun: opts.sun != null ? opts.sun : -2.3, sunAlt: 0.72,
      rise: 1, lift: 0, pass: -1, passN: 0, deep: 0, fresh: 0,
      ring: { n: 26, shown: 26, soft: 0, gold: 1, closed: 0 }
    };
    this.view = { s: 1, cx: 0, cy: 0, ox: 0, oy: 0 };
    this.tw = [];
    this.raf = 0;
    this.service = opts.service || 'recurring';
    this.setPlan(opts.kind === 'office' ? officePlan(opts.size, opts.restrooms) : homePlan(opts.beds, opts.baths), true);
    this.resize();
    var self = this;
    if (root.ResizeObserver) {
      this.ro = new root.ResizeObserver(function () { self.resize(); });
      this.ro.observe(canvas);
    }
  }

  Stage.plans = { home: homePlan, office: officePlan };

  Stage.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var dpr = Math.min(root.devicePixelRatio || 1, this.maxDpr);
    this.cw = r.width; this.ch = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr);
    this.cv.height = Math.round(r.height * dpr);
    this.sh.width = this.cv.width; this.sh.height = this.cv.height;
    this.fit(true);
    this.draw();
  };

  Stage.prototype.ringRadius = function () {
    var p = this.plan;
    return Math.max(p.D / 2 + 5, Math.sqrt(p.W * p.W + p.D * p.D) / 2 * 0.8 + 1.5);
  };

  /* fit the plan and its ring into the canvas (at the base yaw, so the parallax never re-fits) */
  Stage.prototype.fit = function (instant) {
    if (!this.cw) return;
    var p = this.plan, yaw = this.st.yaw, e = this.elev;
    var R = this.ringRadius();
    var cx = p.W / 2, cy = p.D / 2;
    var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    var ca = Math.cos(yaw), sa = Math.sin(yaw), se = Math.sin(e), ce = Math.cos(e);
    for (var i = 0; i < 48; i++) {
      var a = i / 48 * TAU;
      var x = Math.cos(a) * R, y = Math.sin(a) * R;
      var rx = x * ca - y * sa, ry = x * sa + y * ca;
      var sy0 = ry * se, sy1 = ry * se - 6 * ce;
      minx = Math.min(minx, rx); maxx = Math.max(maxx, rx);
      miny = Math.min(miny, sy0, sy1); maxy = Math.max(maxy, sy0);
    }
    [[0, 0], [p.W, 0], [p.W, p.D], [0, p.D]].forEach(function (c) {
      var x = c[0] - cx, y = c[1] - cy;
      var rx = x * ca - y * sa, ry = x * sa + y * ca;
      minx = Math.min(minx, rx); maxx = Math.max(maxx, rx);
      miny = Math.min(miny, ry * se - WALL_H * ce); maxy = Math.max(maxy, ry * se);
    });
    var padX = this.cw * this.pad, padY = this.ch * this.pad;
    var s = Math.min((this.cw - padX * 2) / (maxx - minx), (this.ch - padY * 2) / (maxy - miny));
    var target = { s: s, ox: this.cw / 2 - ((minx + maxx) / 2) * s, oy: this.ch / 2 - ((miny + maxy) / 2) * s, cx: cx, cy: cy };
    if (instant || this.reduce) { this.view = target; return; }
    this.tween(this.view, target, 520, 0, easeInOut);
  };

  Stage.prototype.project = function (x, y, z) {
    var v = this.view, st = this.st;
    var yaw = st.yaw + st.yawOff, e = this.elev + st.elevOff;
    var px = x - v.cx, py = y - v.cy;
    var ca = Math.cos(yaw), sa = Math.sin(yaw);
    var rx = px * ca - py * sa, ry = px * sa + py * ca;
    return [v.ox + rx * v.s, v.oy + (ry * Math.sin(e) - z * Math.cos(e)) * v.s, ry];
  };

  /* ── tweens: a tiny timeline; frames run only while something moves ── */
  Stage.prototype.tween = function (obj, to, dur, delay, ease, done) {
    var from = {};
    Object.keys(to).forEach(function (k) { from[k] = obj[k]; });
    this.tw = this.tw.filter(function (t) {
      if (t.obj !== obj) return true;
      Object.keys(to).forEach(function (k) { delete t.to[k]; });
      return Object.keys(t.to).length > 0;
    });
    this.tw.push({ obj: obj, from: from, to: to, t0: now() + (delay || 0), dur: dur, ease: ease || easeOut, done: done });
    this.kick();
  };
  Stage.prototype.kick = function () {
    if (this.raf) return;
    var self = this;
    this.raf = root.requestAnimationFrame(function step() {
      self.raf = 0;
      var t = now(), live = false;
      self.tw = self.tw.filter(function (w) {
        var k = (t - w.t0) / w.dur;
        if (k < 0) { live = true; return true; }
        var e = w.ease(clamp(k, 0, 1));
        Object.keys(w.to).forEach(function (key) { w.obj[key] = w.from[key] + (w.to[key] - w.from[key]) * e; });
        if (k >= 1) { if (w.done) w.done(); return false; }
        live = true;
        return true;
      });
      var st = self.st;
      var dy = st.yawTarget - st.yawOff, de = st.elevTarget - st.elevOff;
      if (Math.abs(dy) > 0.0004 || Math.abs(de) > 0.0004) { st.yawOff += dy * 0.08; st.elevOff += de * 0.08; live = true; }
      self.draw();
      if (live || self.tw.length) self.kick();
    });
  };

  /* ── API ── */
  Stage.prototype.setPlan = function (plan, instant) {
    var old = this.plan;
    this.plan = plan;
    if (old && old.fresh) plan.rooms.forEach(function (r) { r.clean = 1; });
    plan.fresh = old ? old.fresh : 0;
    this.fit(instant);
    if (instant || this.reduce) { this.st.rise = 1; this.draw(); return; }
    this.st.rise = 0;
    this.tween(this.st, { rise: 1 }, 900, 0, easeOut);
  };

  Stage.prototype.setHome = function (beds, baths) {
    var p = this.plan;
    if (p.kind === 'home' && p.beds === clamp(Math.round(beds || 4), 1, 6) && p.baths === clamp(Number(baths) || 3, 1, 5.5)) return;
    this.setPlan(homePlan(beds, baths));
    if (this.service === 'move-in-out') this.st.lift = 1;
  };
  Stage.prototype.setOffice = function (size, restrooms) {
    var p = this.plan;
    if (p.kind === 'office' && p.size === size && p.restrooms === clamp(Math.round(restrooms || 2), 1, 10)) return;
    var np = officePlan(size, restrooms);
    np.size = size;
    this.setPlan(np);
  };
  Stage.prototype.setKind = function (kind) {
    if (this.plan.kind === kind) return;
    this.plan.fresh = 0;
    this.st.lift = 0;
    var np = kind === 'office' ? officePlan('m', 2) : homePlan(4, 3);
    if (kind === 'office') np.size = 'm';
    this.setPlan(np);
    this.setRhythm(kind === 'office' ? 52 : 26, { soft: true, sweep: false });
  };

  /* the service changes how the visit happens */
  Stage.prototype.setService = function (svc) {
    this.service = svc || 'recurring';
    var st = this.st, self = this;
    var move = this.service === 'move-in-out';
    var deep = this.service === 'deep-reset';
    this.plan.fresh = 0;
    this.plan.rooms.forEach(function (r) { r.clean = 0; r.base = 0; });
    if (this.reduce) {
      st.lift = move ? 1 : 0; st.deep = deep ? 1 : 0;
      this.plan.fresh = 1; this.plan.rooms.forEach(function (r) { r.clean = 1; r.base = deep ? 1 : 0; });
      st.pass = -1; this.draw();
      return;
    }
    this.tween(st, { lift: move ? 1 : 0, deep: deep ? 1 : 0 }, move ? 900 : 400, 0, easeInOut);
    if (this.service === 'not-sure') { this.draw(); return; }
    this.playVisit(move ? 700 : 150);
  };

  /* one visit: the team works room by room in the order of the route */
  Stage.prototype.playVisit = function (delay) {
    var self = this, st = this.st, plan = this.plan;
    if (this.reduce) { plan.fresh = 1; plan.rooms.forEach(function (r) { r.clean = 1; }); this.draw(); return; }
    var n = plan.route.length;
    var deep = this.service === 'deep-reset';
    st.pass = 0;
    st.passN = n;
    this.tween(st, { pass: n + 1 }, (deep ? 230 : 160) * n + 500, delay || 0, function (t) { return t; }, function () {
      plan.fresh = 1;
      st.pass = -1;
    });
  };

  /* the rhythm: dots of a year around the home; a sweep of the sun marks the year going by */
  Stage.prototype.setRhythm = function (n, o) {
    o = o || {};
    var ring = this.st.ring, st = this.st;
    ring.n = Math.max(1, n | 0);
    ring.gold = o.gold === false ? 0 : 1;
    ring.closed = 0;
    if (this.reduce || o.instant) { ring.shown = ring.n; ring.soft = o.soft ? 1 : 0; this.draw(); return; }
    ring.shown = 0;
    this.tween(ring, { shown: ring.n, soft: o.soft ? 1 : 0 }, Math.min(2200, 420 + ring.n * 34), 120, function (t) { return t; });
    if (o.sweep !== false) {
      var s0 = st.sun;
      this.tween(st, { sun: s0 + TAU }, Math.min(2200, 420 + ring.n * 34), 120, easeInOut, function () { st.sun = s0; });
    }
  };

  /* confirmation: the ring of the plan closes */
  Stage.prototype.close = function () {
    var ring = this.st.ring;
    if (this.reduce) { ring.closed = 1; ring.shown = ring.n; this.draw(); return; }
    this.tween(ring, { closed: 1, shown: ring.n }, 1200, 0, easeInOut);
  };

  Stage.prototype.look = function (nx, ny) {
    if (this.reduce) return;
    this.st.yawTarget = clamp(nx, -1, 1) * 0.12;
    this.st.elevTarget = clamp(ny, -1, 1) * 0.05;
    this.kick();
  };
  Stage.prototype.setSun = function (a) {
    if (this.tw.some(function (t) { return t.to.sun != null; })) return;
    this.st.sun = a;
    this.draw();
  };
  Stage.prototype.intro = function () {
    if (this.reduce) { this.draw(); return; }
    this.st.rise = 0;
    this.tween(this.st, { rise: 1 }, 1100, 0, easeOut);
    this.setRhythm(this.st.ring.n, { sweep: true, soft: this.st.ring.soft > 0.5 });
    this.playVisit(650);
  };

  /* ───────────────────────── drawing ───────────────────────── */

  Stage.prototype.draw = function () {
    var ctx = this.ctx, dpr = this.dpr || 1;
    if (!this.cw) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);
    var T = this.T, st = this.st, plan = this.plan, self = this;
    var sunA = st.sun, alt = st.sunAlt;
    var L = [Math.cos(sunA) * Math.cos(alt), Math.sin(sunA) * Math.cos(alt), -Math.sin(alt)];
    var k = Math.cos(alt) / Math.sin(alt);
    var off = [-Math.cos(sunA) * k, -Math.sin(sunA) * k]; // shadow offset per unit of height (away from the sun)
    var P = function (x, y, z) { return self.project(x, y, z || 0); };
    var poly = function (pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
    var rect = function (x, y, w, d, z) { return [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)]; };
    var ink = this.dark ? T.linen : T.navy;

    this.drawRing(L);

    /* floors */
    plan.rooms.forEach(function (r) {
      var pts = rect(r.x, r.y, r.w, r.d, 0);
      poly(pts);
      var hard = !CARPET[r.type];
      ctx.fillStyle = rgba(r.type === 'hall' ? T.linen2 : hard ? T.white : mix(T.linen, T.white, 0.35), self.dark ? 0.96 : 1);
      ctx.fill();
    });

    /* rugs */
    plan.decals.forEach(function (d) {
      var a = 1 - st.lift;
      if (a <= 0.01) return;
      poly(rect(d.x, d.y, d.w, d.d, 0));
      ctx.fillStyle = rgba(T.linen2, 0.9 * a); ctx.fill();
      ctx.strokeStyle = rgba(T.navy, 0.1 * a); ctx.lineWidth = 0.6; ctx.stroke();
    });

    /* the visit: fresh vacuum lines on carpet, a pass of light on hard floors */
    var route = plan.route, n = route.length;
    route.forEach(function (r, i) {
      var t = st.pass >= 0 ? clamp(st.pass - i * (n > 1 ? 1 : 1), 0, 1) : (plan.fresh ? 1 : r.clean);
      if (st.pass >= 0 && t >= 1) r.clean = 1;
      if (st.pass >= 0 && t <= 0 && !plan.fresh) r.clean = 0;
      var shown = st.pass >= 0 ? t : (plan.fresh ? 1 : r.clean);
      if (shown <= 0) return;
      ctx.save();
      poly(rect(r.x, r.y, r.w, r.d, 0)); ctx.clip();
      if (CARPET[r.type]) {
        var band = 1.5, horiz = r.w >= r.d;
        var len = horiz ? r.w : r.d;
        var lim = len * easeOut(shown);
        for (var b = 0, j = 0; b < (horiz ? r.d : r.w); b += band, j++) {
          var pts = horiz ? rect(r.x, r.y + b, lim, band, 0) : rect(r.x + b, r.y, band, lim, 0);
          poly(pts);
          ctx.fillStyle = j % 2 ? rgba(T.navy, 0.045) : rgba(T.white, 0.7);
          ctx.fill();
        }
      } else {
        var mid = st.pass >= 0 && t > 0 && t < 1;
        poly(rect(r.x, r.y, r.w, r.d, 0));
        ctx.fillStyle = rgba(T.white, 0.6 * shown); ctx.fill();
        if (mid) {
          var g = (r.w + r.d) * t;
          var a0 = P(r.x + g - 4, r.y, 0), a1 = P(r.x + g + 1, r.y + 4, 0);
          var grd = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
          grd.addColorStop(0, rgba(T.goldLight, 0)); grd.addColorStop(0.5, rgba(T.goldLight, 0.55)); grd.addColorStop(1, rgba(T.goldLight, 0));
          poly([P(r.x + g - 6, r.y - 1, 0), P(r.x + g, r.y - 1, 0), P(r.x + g - r.d, r.y + r.d + 1, 0), P(r.x + g - 6 - r.d, r.y + r.d + 1, 0)]);
          ctx.fillStyle = grd; ctx.fill();
        }
      }
      ctx.restore();
    });

    /* window light on the floors */
    plan.windows.forEach(function (w) {
      var into = -(w.n[0] * off[0] + w.n[1] * off[1]);
      if (into <= 0.05) return;
      var z0 = 1.0, z1 = WALL_H + 2.2;
      var a = [w.x0 + off[0] * z0, w.y0 + off[1] * z0], b = [w.x1 + off[0] * z0, w.y1 + off[1] * z0];
      var c = [w.x1 + off[0] * z1, w.y1 + off[1] * z1], d = [w.x0 + off[0] * z1, w.y0 + off[1] * z1];
      var r = w.room;
      ctx.save();
      poly(rect(r.x, r.y, r.w, r.d, 0)); ctx.clip();
      poly([P(a[0], a[1]), P(b[0], b[1]), P(c[0], c[1]), P(d[0], d[1])]);
      ctx.fillStyle = rgba(T.goldLight, 0.34 * clamp(into * 1.4, 0, 1) * st.rise);
      ctx.fill();
      ctx.restore();
    });

    /* baseboards, traced in gold on a Deep Cleaning Reset */
    if (st.deep > 0.01) {
      route.forEach(function (r, i) {
        var t = st.pass >= 0 ? clamp((st.pass - i) * 1.2 - 0.2, 0, 1) : (plan.fresh ? 1 : r.clean);
        if (t <= 0) return;
        var i0 = 0.45;
        var pts = rect(r.x + i0, r.y + i0, r.w - i0 * 2, r.d - i0 * 2, 0);
        var per = 0, segs = [];
        for (var s = 0; s < 4; s++) { var p0 = pts[s], p1 = pts[(s + 1) % 4]; var l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); segs.push([p0, p1, l]); per += l; }
        var left = per * easeOut(t);
        ctx.beginPath();
        ctx.moveTo(segs[0][0][0], segs[0][0][1]);
        for (var q = 0; q < 4 && left > 0; q++) {
          var sg = segs[q], f = Math.min(1, left / sg[2]);
          ctx.lineTo(sg[0][0] + (sg[1][0] - sg[0][0]) * f, sg[0][1] + (sg[1][1] - sg[0][1]) * f);
          left -= sg[2];
        }
        ctx.strokeStyle = rgba(T.gold, 0.95 * st.deep); ctx.lineWidth = Math.max(1.2, self.view.s * 0.22); ctx.lineCap = 'round'; ctx.stroke();
      });
    }

    /* boxes: walls rise from the floor; furniture settles (or lifts out of a home that is moving) */
    var boxes = [];
    var W = plan.W;
    plan.walls.forEach(function (w) {
      var t = clamp(st.rise * 1.6 - ((w.x + w.y * 0.4) / (W + plan.D * 0.4)) * 0.6, 0, 1);
      if (t <= 0) return;
      boxes.push({ x: w.x, y: w.y, w: w.w, d: w.d, z: 0, h: w.h * easeOut(t), a: 1, wall: true });
    });
    plan.furniture.forEach(function (f, i) {
      var t = clamp(st.rise * 1.8 - 0.6 - (i % 7) * 0.03, 0, 1);
      var a = easeOut(t) * (1 - st.lift);
      if (a <= 0.02) return;
      var z = (1 - easeOut(t)) * 1.4 + st.lift * 5;
      boxes.push({ x: f.x, y: f.y, w: f.w, d: f.d, z: z, h: f.h, a: a, kind: f.kind });
    });

    /* shadows: all into one layer, laid down once (no dark overlaps) */
    var sx = this.shx;
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx.clearRect(0, 0, this.cw, this.ch);
    sx.fillStyle = rgba(this.dark ? T.night : T.navy, 1);
    boxes.forEach(function (b) {
      if (b.a < 0.5 || b.z > 0.6) return;
      var hh = b.h + b.z;
      var pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.d], [b.x, b.y + b.d]];
      var all = pts.concat(pts.map(function (p) { return [p[0] + off[0] * hh, p[1] + off[1] * hh]; }));
      var hull = convexHull(all).map(function (p) { return self.project(p[0], p[1], 0); });
      sx.beginPath(); sx.moveTo(hull[0][0], hull[0][1]);
      for (var i = 1; i < hull.length; i++) sx.lineTo(hull[i][0], hull[i][1]);
      sx.closePath(); sx.fill();
    });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = (this.dark ? 0.3 : 0.1) * st.rise;
    ctx.drawImage(this.sh, 0, 0);
    ctx.restore();

    /* painter's order: far to near */
    var yaw = st.yaw + st.yawOff, ca = Math.cos(yaw), sa = Math.sin(yaw);
    boxes.forEach(function (b) {
      var cx = b.x + b.w / 2 - self.view.cx, cy = b.y + b.d / 2 - self.view.cy;
      b.depth = cx * sa + cy * ca + (b.wall ? 0 : 0.01) + b.z * 0.02;
    });
    boxes.sort(function (a, b) { return a.depth - b.depth; });

    var faces = [
      { n: [0, -1], c: function (b) { return [[b.x + b.w, b.y], [b.x, b.y]]; } },
      { n: [1, 0], c: function (b) { return [[b.x + b.w, b.y + b.d], [b.x + b.w, b.y]]; } },
      { n: [0, 1], c: function (b) { return [[b.x, b.y + b.d], [b.x + b.w, b.y + b.d]]; } },
      { n: [-1, 0], c: function (b) { return [[b.x, b.y], [b.x, b.y + b.d]]; } }
    ];
    var topC = this.dark ? mix(T.night, T.white, 0.9) : T.white;
    var sideLit = this.dark ? mix(T.night, T.linen, 0.75) : mix(T.white, T.linen2, 0.5);
    var sideDark = this.dark ? mix(T.night, T.linen, 0.5) : mix(T.linen2, T.line, 0.9);
    boxes.forEach(function (b) {
      ctx.globalAlpha = b.a;
      faces.forEach(function (f) {
        var vis = f.n[0] * sa + f.n[1] * ca;
        if (vis <= 0) return;
        var e = f.c(b);
        var p0 = P(e[0][0], e[0][1], b.z), p1 = P(e[1][0], e[1][1], b.z), p2 = P(e[1][0], e[1][1], b.z + b.h), p3 = P(e[0][0], e[0][1], b.z + b.h);
        var lit = clamp(-(f.n[0] * L[0] + f.n[1] * L[1]) * 0.9 + 0.35, 0, 1);
        poly([p0, p1, p2, p3]);
        ctx.fillStyle = rgba(mix(sideDark, sideLit, lit), 1);
        ctx.fill();
      });
      var top = rect(b.x, b.y, b.w, b.d, b.z + b.h);
      poly(top);
      ctx.fillStyle = rgba(b.kind === 'pillow' ? mix(T.white, T.linen2, 0.2) : topC, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(ink, b.wall ? 0.42 : 0.26);
      ctx.lineWidth = b.wall ? 0.8 : 0.6;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    /* window glass: a fine line in the gap of each window */
    plan.windows.forEach(function (w) {
      var a = P(w.x0, w.y0, WALL_H * 0.55 * st.rise), b = P(w.x1, w.y1, WALL_H * 0.55 * st.rise);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = rgba(ink, 0.32); ctx.lineWidth = 0.9; ctx.stroke();
    });
    /* the threshold of the front door, in gold */
    if (plan.front) {
      var f0 = P(plan.front.x0, plan.front.y0, 0), f1 = P(plan.front.x1, plan.front.y1, 0);
      ctx.beginPath(); ctx.moveTo(f0[0], f0[1]); ctx.lineTo(f1[0], f1[1]);
      ctx.strokeStyle = rgba(T.gold, 0.9 * st.rise); ctx.lineWidth = Math.max(1.4, this.view.s * 0.35); ctx.lineCap = 'round'; ctx.stroke();
    }
  };

  /* the twelve marks on the ground, the visits of a year, the gold one at twelve o'clock */
  Stage.prototype.drawRing = function () {
    var ctx = this.ctx, T = this.T, ring = this.st.ring, self = this;
    var R = this.ringRadius();
    var cx = this.plan.W / 2, cy = this.plan.D / 2;
    var ink = this.dark ? T.linen : T.navy;
    var at = function (a, r) { return self.project(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0); };
    ctx.beginPath();
    for (var i = 0; i <= 96; i++) { var p = at(i / 96 * TAU, R); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    ctx.strokeStyle = rgba(ink, this.dark ? 0.22 : 0.16); ctx.lineWidth = 1; ctx.stroke();
    for (var m = 0; m < 12; m++) {
      var a = -Math.PI / 2 + m / 12 * TAU;
      var q0 = at(a, R + 1.4), q1 = at(a, R + (m % 3 === 0 ? 3.4 : 2.6));
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]);
      ctx.strokeStyle = rgba(T.gold, 0.95); ctx.lineWidth = m === 0 ? 2.2 : 1.4; ctx.lineCap = 'round'; ctx.stroke();
    }
    var n = ring.n, shown = ring.shown;
    var dot = n > 100 ? 1.25 : n > 30 ? 1.9 : 2.6;
    for (var d = 0; d < n; d++) {
      var vis = clamp(shown - d, 0, 1);
      if (vis <= 0) break;
      var ang = -Math.PI / 2 + d / n * TAU;
      var c = at(ang, R);
      var gold = d === 0 && ring.gold;
      ctx.beginPath();
      ctx.arc(c[0], c[1], (gold ? dot * 1.9 + 1.4 : dot) * (0.6 + 0.4 * vis), 0, TAU);
      ctx.fillStyle = gold ? rgba(T.gold, vis) : rgba(ink, vis * (1 - ring.soft * 0.62));
      ctx.fill();
    }
    if (ring.closed > 0) {
      ctx.beginPath();
      var end = ring.closed * 96;
      for (var j = 0; j <= end; j++) { var pp = at(-Math.PI / 2 + j / 96 * TAU, R); if (j) ctx.lineTo(pp[0], pp[1]); else ctx.moveTo(pp[0], pp[1]); }
      ctx.strokeStyle = rgba(T.gold, 0.95); ctx.lineWidth = 2; ctx.stroke();
    }
  };

  function convexHull(points) {
    var p = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [], upper = [], i;
    for (i = 0; i < p.length; i++) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 0) lower.pop(); lower.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p[i]) <= 0) upper.pop(); upper.push(p[i]); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }

  root.TwelveStage = Stage;
  if (typeof module !== 'undefined') module.exports = { homePlan: homePlan, officePlan: officePlan, convexHull: convexHull };
})(typeof window !== 'undefined' ? window : this);
