/* rabsrabi.com — behaviour. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = 'islam.muhammed.rabiul@gmail.com';
  var root = document.documentElement;

  /* ---------- toast ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* ---------- theme: auto (system) → light → dark ---------- */
  var themeBtn = $('#themeBtn');
  var ICONS = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
  var metas = $$('meta[name="theme-color"]');
  var metaOrig = metas.map(function (m) { return m.getAttribute('content'); });
  function getMode() {
    var a = root.getAttribute('data-theme');
    return a === 'light' || a === 'dark' ? a : 'auto';
  }
  function setMode(mode, silent) {
    if (mode === 'auto') {
      root.removeAttribute('data-theme');
      try { localStorage.removeItem('theme'); } catch (e) {}
      metas.forEach(function (m, i) { m.setAttribute('content', metaOrig[i]); });
    } else {
      root.setAttribute('data-theme', mode);
      try { localStorage.setItem('theme', mode); } catch (e) {}
      metas.forEach(function (m) { m.setAttribute('content', mode === 'dark' ? '#080d17' : '#f5f7fa'); });
    }
    if (themeBtn) {
      themeBtn.innerHTML = ICONS[mode];
      themeBtn.setAttribute('aria-label', 'Theme: ' + mode + ' (click to change)');
      themeBtn.title = 'Theme: ' + mode;
    }
    document.dispatchEvent(new Event('themechange'));
    if (!silent) toast('Theme: ' + (mode === 'auto' ? 'auto (follows your system)' : mode));
  }
  setMode(getMode(), true);
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var order = ['auto', 'light', 'dark'];
    setMode(order[(order.indexOf(getMode()) + 1) % 3]);
  });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var onMq = function () { document.dispatchEvent(new Event('themechange')); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- nav ---------- */
  var nav = $('#nav'), links = $('#links'), menuBtn = $('#menuBtn');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#links a').forEach(function (a) {
    a.addEventListener('click', function () { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); });
  });
  if ('IntersectionObserver' in window) {
    var secs = $$('main section[id]');
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          $$('#links a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- reveal on scroll + counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-dec') || 0);
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    var t0 = performance.now(), dur = 1300;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } });
    }, { threshold: .12 });
    $$('.rv').forEach(function (el) { rv.observe(el); });
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); } });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) { co.observe(el); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
    $$('[data-count]').forEach(animateCount);
  }

  /* ---------- typed role ---------- */
  var typed = $('#typed');
  var ROLES = ['Network & Telecom Engineer', 'ISP Operations Leader', 'MikroTik MTCRE Certified', '5G Massive MIMO Researcher', 'Team Builder & Mentor'];
  if (typed && !reduce) {
    var ri = 0, ci = ROLES[0].length, del = true;
    var tick = function () {
      var wait = del ? 28 : 55;
      if (del) { ci--; } else { ci++; }
      typed.textContent = ROLES[ri].slice(0, ci);
      if (del && ci === 0) { del = false; ri = (ri + 1) % ROLES.length; }
      else if (!del && ci === ROLES[ri].length) { del = true; wait = 1800; }
      setTimeout(tick, wait);
    };
    setTimeout(tick, 2400); // let the first role sit for a moment
  }

  /* ---------- portrait fallback ---------- */
  (function () {
    var p = $('#portrait'), img = p && $('img', p);
    if (!img) return;
    function bad() { p.classList.add('noimg'); }
    img.addEventListener('error', bad);
    if (img.complete && img.naturalWidth === 0) bad();
  })();

  /* ---------- live "ping" to this site ---------- */
  var pingEl = $('#ping');
  function ping(cb) {
    var t0 = performance.now();
    fetch('/favicon.svg?p=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function () { var ms = Math.round(performance.now() - t0); if (pingEl) pingEl.textContent = '· ping ' + ms + ' ms'; if (cb) cb(ms); })
      .catch(function () { if (pingEl) pingEl.textContent = '· ping n/a'; if (cb) cb(null); });
  }
  ping();
  setInterval(function () { if (!document.hidden) ping(); }, 12000);

  /* ---------- hero: living network canvas ---------- */
  (function () {
    var cv = $('#net'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    var nodes = [], packets = [], mouse = { x: -999, y: -999 };
    var col = { a: '#2dd4bf', l: '#334', n: '#889' };
    var running = true, last = 0, spawn = 0;

    function readColors() {
      var cs = getComputedStyle(root);
      col.a = cs.getPropertyValue('--accent').trim() || col.a;
      col.l = cs.getPropertyValue('--muted').trim() || col.l;
    }
    function resize() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(18, Math.min(72, Math.round(W * H / 15000)));
      nodes = [];
      for (var i = 0; i < n; i++) nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 1.6 + Math.random() * 1.8
      });
      packets = [];
      if (reduce) draw(0);
    }
    var LINK = 150;
    function links() {
      var out = [];
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) out.push([i, j, d]);
      }
      return out;
    }
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var i, ls;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx * dt * .06; n.y += n.vy * dt * .06;
        if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
      }
      ls = links();
      ctx.lineWidth = 1;
      ls.forEach(function (l) {
        ctx.globalAlpha = (1 - l[2] / LINK) * .35; ctx.strokeStyle = col.l;
        ctx.beginPath(); ctx.moveTo(nodes[l[0]].x, nodes[l[0]].y); ctx.lineTo(nodes[l[1]].x, nodes[l[1]].y); ctx.stroke();
      });
      // pointer links
      for (i = 0; i < nodes.length; i++) {
        var dx = nodes[i].x - mouse.x, dy = nodes[i].y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 170) {
          ctx.globalAlpha = (1 - d / 170) * .8; ctx.strokeStyle = col.a;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      // packets
      if (!reduce) {
        spawn -= dt;
        if (spawn <= 0 && ls.length) { var L = ls[(Math.random() * ls.length) | 0]; packets.push({ a: L[0], b: L[1], p: 0, s: .0016 + Math.random() * .002 }); spawn = 260; }
        packets = packets.filter(function (k) { k.p += k.s * dt; return k.p < 1; });
        ctx.fillStyle = col.a;
        packets.forEach(function (k) {
          var A = nodes[k.a], B = nodes[k.b];
          ctx.globalAlpha = .95; ctx.beginPath(); ctx.arc(A.x + (B.x - A.x) * k.p, A.y + (B.y - A.y) * k.p, 2.6, 0, 6.283); ctx.fill();
        });
      }
      ctx.fillStyle = col.l; ctx.globalAlpha = .7;
      nodes.forEach(function (n) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    function loop(ts) {
      if (!running) return;
      var dt = Math.min(48, ts - last || 16); last = ts;
      draw(dt);
      requestAnimationFrame(loop);
    }
    readColors(); resize();
    document.addEventListener('themechange', function () { readColors(); if (reduce) draw(0); });
    window.addEventListener('resize', resize);
    var hero = cv.parentElement;
    hero.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    if (!reduce) {
      var start = function () { if (!running) { running = true; last = 0; requestAnimationFrame(loop); } };
      var stop = function () { running = false; };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es[0].isIntersecting && !document.hidden ? start() : stop(); }).observe(hero);
      document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
      requestAnimationFrame(loop);
    }
  })();

  /* ---------- lab tabs ---------- */
  (function () {
    var tabs = $$('.tabs [role="tab"]');
    function show(t) {
      tabs.forEach(function (b) {
        var on = b === t;
        b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
        var p = $('#' + b.getAttribute('aria-controls'));
        p.classList.toggle('on', on); p.hidden = !on;
      });
    }
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { show(b); });
      b.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (j < 0) return;
        var t = tabs[(j + tabs.length) % tabs.length]; show(t); t.focus(); e.preventDefault();
      });
    });
    window.showLabTab = function (id) { var t = $('#tab-' + id); if (t) show(t); };
  })();

  /* ---------- lab: reviewed MATLAB scheduler simulator ---------- */
  (function () {
    if (!window.Lab || !$('#gantt')) return;
    var Lab = window.Lab;
    var st = { K: 20, M: 16, P: [30, 40, 30], A: .7, B: .3, Runs: 100, seed: 20261115, sel: 'priority' };
    var latest = null;
    var NAMES = ['Voice/Video', 'Text', 'Data'];
    var NS = 'http://www.w3.org/2000/svg';
    var els = { K: $('#K'), M: $('#M'), Runs: $('#Runs'), P0: $('#P0'), P1: $('#P1'), P2: $('#P2'), A: $('#A'), B: $('#B') };

    function fmt(n) { return Number(n).toFixed(2); }
    function withCI(value, ci, percent) {
      var v = percent ? value * 100 : value, c = percent ? ci * 100 : ci;
      return fmt(v) + ' ± ' + fmt(c) + (percent ? '%' : '');
    }
    function render() {
      $('#vK').textContent = st.K;
      $('#vA').textContent = st.A.toFixed(2);
      $('#vB').textContent = st.B.toFixed(2);
      var pTotal = st.P.reduce(function (a, b) { return a + b; }, 0);
      if (!Number.isFinite(pTotal) || pTotal <= 0 || st.P.some(function (p) { return !Number.isFinite(p) || p < 0; })) {
        latest = null;
        $('#simMeta').textContent = 'Enter non-negative service weights with a combined total greater than zero.';
        $('#resultGrid').innerHTML = '<p class="err" role="alert">The service-class weights must have a positive total.</p>';
        $('#gantt').innerHTML = '';
        $('#gtitle').textContent = 'No simulation to display';
        return;
      }
      var normalised = st.P.map(function (p) { return 100 * p / pTotal; });
      var cfg = {
        numUsers: st.K, numAntennas: st.M, numRuns: st.Runs, seed: st.seed,
        alpha: st.A, beta: st.B, serviceProbabilities: st.P.map(function (p) { return p / pTotal; })
      };
      try {
        latest = Lab.compare(cfg);
      } catch (error) {
        $('#resultGrid').innerHTML = '<p class="err" role="alert">Simulation error: ' + String(error.message || error) + '</p>';
        $('#gantt').innerHTML = '';
        $('#gtitle').textContent = 'Simulation could not complete';
        return;
      }
      drawCell(latest.users);
      $('#simMeta').textContent = 'K=' + st.K + ' · M=' + st.M + ' · 500 m cell · 10 MHz · ' + st.Runs + ' runs · mix ' + normalised.map(function (n) { return n.toFixed(0); }).join('/') +
        ' · α ' + st.A.toFixed(2) + ' · β ' + st.B.toFixed(2) + ' · seed ' + st.seed;
      var keys = Lab.ALGOS.map(function (a) { return a.key; });
      var noContention = keys.every(function (key) { return latest.results[key].awt < 1e-6; });
      $('#simCI').innerHTML = 'Means ± 95% normal-approximation confidence intervals (1.96 × sample SD / √N) over ' + st.Runs +
        ' independent runs. Each run shares one generated user/channel scenario across all five algorithms. Select a scheduler card to inspect its first-run antenna timeline.' +
        (noContention ? '<br><strong>Little or no queueing in this configuration:</strong> the available antennas are keeping up with arrivals, so scheduler results can be very similar. Try increasing K or reducing M to create more contention.' : '');


      var best = {
        awt: Math.min.apply(null, keys.map(function (k) { return latest.results[k].awt; })),
        att: Math.min.apply(null, keys.map(function (k) { return latest.results[k].att; })),
        jain: Math.max.apply(null, keys.map(function (k) { return latest.results[k].jain; })),
        util: Math.max.apply(null, keys.map(function (k) { return latest.results[k].util; }))
      };
      function cls(v, b) { return Math.abs(v - b) < 1e-9 ? ' class="best"' : ''; }
      var resultGrid = $('#resultGrid'), html = '';
      Lab.ALGOS.forEach(function (a) {
        var r = latest.results[a.key];
        html += '<button type="button" class="result-card" data-k="' + a.key + '" aria-pressed="' + (a.key === st.sel) + '">' +
          '<span class="result-card-head"><strong>' + a.label + '</strong><small>' + (a.key === st.sel ? 'Selected' : 'View timeline') + '</small></span>' +
          '<dl class="result-metrics">' +
            '<div><dt>Mean waiting</dt><dd' + cls(r.awt, best.awt) + '>' + withCI(r.awt, r.awtCI, false) + ' ms</dd></div>' +
            '<div><dt>Mean turnaround</dt><dd' + cls(r.att, best.att) + '>' + withCI(r.att, r.attCI, false) + ' ms</dd></div>' +
            '<div><dt>Jain fairness</dt><dd' + cls(r.jain, best.jain) + '>' + withCI(r.jain, r.jainCI, false) + '</dd></div>' +
            '<div><dt>Resource utilisation</dt><dd' + cls(r.util, best.util) + '>' + withCI(r.util, r.utilCI, true) + '</dd></div>' +
          '</dl></button>';
      });
      resultGrid.innerHTML = html;
      $$('button[data-k]', resultGrid).forEach(function (b) {
        b.addEventListener('click', function () { st.sel = b.getAttribute('data-k'); showSelected(); });
      });
      showSelected();
    }

    function showSelected() {
      if (!latest) return;
      var resultGrid = $('#resultGrid');
      $$('button[data-k]', resultGrid).forEach(function (button) {
        var active = button.getAttribute('data-k') === st.sel;
        button.setAttribute('aria-pressed', String(!!active));
        var hint = $('.result-card-head small', button);
        if (hint) hint.textContent = active ? 'Selected' : 'View timeline';
      });
      var representative = latest.sample.results[st.sel];
      if (!representative) return;
      var gmax = Math.max.apply(null, Lab.ALGOS.map(function (a) { return latest.sample.results[a.key].makespan; }));
      drawGantt(representative, gmax);
      var selected = Lab.ALGOS.filter(function (a) { return a.key === st.sel; })[0];
      $('#gtitle').innerHTML = '<span>First run: <b style="color:var(--ink)">' + selected.label + '</b> · ' + representative.segs.length +
        ' service slices · makespan ' + representative.makespan.toFixed(1) + ' ms</span>';
    }

    function el(name, attrs, parent) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }

    function drawCell(users) {
      var svg = $('#cell'); svg.innerHTML = '';
      [25, 50, 75, 100].forEach(function (r) { el('circle', { 'class': 'ring', cx: 0, cy: 0, r: r }, svg); });
      el('rect', { x: -4, y: -4, width: 8, height: 8, rx: 2, fill: 'var(--accent)' }, svg);
      var scale = 100 / Lab.CELL_RADIUS;
      users.forEach(function (u) {
        var c = el('circle', {
          'class': 't' + u.service_type + 'f', cx: (u.x_m * scale).toFixed(1), cy: (u.y_m * scale).toFixed(1),
          r: (2 + u.work_ms / 7).toFixed(1), 'fill-opacity': .85
        }, svg);
        var t = el('title', {}, c);
        t.textContent = 'User ' + (u.id + 1) + ' · ' + NAMES[u.service_type] + ' · ' + Math.round(u.distance_m) +
          ' m · workload ' + u.work_ms.toFixed(2) + ' ms · rate factor ' + u.rateFactor.toFixed(2);
      });
    }

    function drawGantt(res, tmax) {
      var svg = $('#gantt'); svg.innerHTML = '';
      var M = st.M, W = 1000, L = 46, R = 12, T = 8;
      var lane = Math.max(10, Math.min(22, Math.floor(920 / M)));
      var H = T + M * lane + 28;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      var steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200], step = 5;
      for (var i = 0; i < steps.length; i++) { step = steps[i]; if (tmax / step <= 10) break; }
      var x = function (t) { return L + (t / Math.max(tmax, 1e-9)) * (W - L - R); };
      for (var t = 0; t <= tmax + 1e-9; t += step) {
        el('line', { 'class': 'grid', x1: x(t), x2: x(t), y1: T, y2: T + M * lane }, svg);
        var tx = el('text', { x: x(t), y: T + M * lane + 16, 'text-anchor': 'middle' }, svg); tx.textContent = t.toFixed(t < 10 && step < 1 ? 1 : 0);
      }
      for (i = 0; i < M; i++) {
        var lt = el('text', { x: L - 7, y: T + i * lane + lane / 2 + 3, 'text-anchor': 'end' }, svg);
        lt.textContent = 'A' + (i + 1);
      }
      res.segs.forEach(function (seg) {
        var rect = el('rect', {
          'class': 't' + seg.type + 'f', x: x(seg.start).toFixed(2), y: T + seg.lane * lane + 1,
          width: Math.max(1.2, x(seg.end) - x(seg.start)).toFixed(2), height: lane - 2, rx: 2,
          stroke: 'var(--bg)', 'stroke-width': .65
        }, svg);
        var title = el('title', {}, rect);
        title.textContent = 'User ' + (seg.id + 1) + ' · ' + NAMES[seg.type] + ' · ' + seg.start.toFixed(2) + '–' + seg.end.toFixed(2) + ' ms';
      });
    }

    els.K.addEventListener('input', function () { st.K = +els.K.value; render(); });
    els.M.addEventListener('change', function () { st.M = +els.M.value; render(); });
    els.Runs.addEventListener('change', function () { st.Runs = +els.Runs.value; render(); });
    ['P0', 'P1', 'P2'].forEach(function (id, ix) {
      els[id].addEventListener('change', function () { st.P[ix] = els[id].value === '' ? NaN : +els[id].value; render(); });
      els[id].addEventListener('input', function () { st.P[ix] = els[id].value === '' ? NaN : +els[id].value; });
    });
    [els.P0, els.P1, els.P2].forEach(function (el) { el.addEventListener('blur', render); });
    els.A.addEventListener('input', function () { st.A = +els.A.value; render(); });
    els.B.addEventListener('input', function () { st.B = +els.B.value; render(); });
    $('#reroll').addEventListener('click', function () { st.seed = (Math.random() * 0xFFFFFFFF) >>> 0; render(); });
    render();
  })();

  /* ---------- lab: subnet calculator ---------- */
  (function () {
    if (!window.Lab || !$('#subOut')) return;
    var Lab = window.Lab, ip = $('#ip'), cidr = $('#cidr'), split = $('#split');
    function kv(l, v) { return '<div class="kv"><small>' + l + '</small><code>' + v + '</code></div>'; }
    function run() {
      var info = Lab.subnetInfo(ip.value, cidr.value), out = $('#subOut'), tbl = $('#splitTable');
      if (info.error) { out.innerHTML = '<p class="err" role="alert">' + info.error + '</p>'; tbl.innerHTML = ''; return; }
      var bits = '';
      for (var i = 0; i < 32; i++) {
        bits += (i && i % 8 === 0 ? '.' : '') + '<span class="' + (i < info.cidr ? 'net' : 'host') + '">' + info.ipBin[i] + '</span>';
      }
      out.innerHTML = '<div class="sub-grid">' +
        kv('Network', info.network + '/' + info.cidr) + kv('Netmask', info.mask) + kv('Wildcard', info.wildcard) +
        kv('Broadcast', info.broadcast) + kv('First host', info.first) + kv('Last host', info.last) +
        kv('Usable hosts', info.usable.toLocaleString('en-US')) + kv('Total addresses', info.total.toLocaleString('en-US')) + kv('Address type', info.kind) +
        '</div><div class="bits" aria-label="Binary form of the address"><span class="net">network bits</span> / <span class="host">host bits</span><br>' + bits + '</div>';

      var ns = +split.value;
      if (info.cidr >= 32) { tbl.innerHTML = '<tr><td>A /32 can\'t be split further.</td></tr>'; return; }
      if (!(ns > info.cidr && ns <= 32)) { tbl.innerHTML = '<tr><td>Choose a prefix longer than /' + info.cidr + ' (up to /32).</td></tr>'; return; }
      var rows = Lab.splitSubnet(ip.value, info.cidr, ns, 64);
      var h = '<thead><tr><th>#</th><th>Subnet</th><th>Usable range</th><th>Hosts</th></tr></thead><tbody>';
      rows.forEach(function (r, i) {
        h += '<tr><td>' + (i + 1) + '</td><td>' + r.network + '/' + r.cidr + '</td><td>' + r.first + ' – ' + r.last + '</td><td>' + r.usable.toLocaleString('en-US') + '</td></tr>';
      });
      h += '</tbody>';
      if (rows.totalCount > rows.length) h += '<tfoot><tr><td colspan="4">Showing the first ' + rows.length + ' of ' + rows.totalCount.toLocaleString('en-US') + ' subnets.</td></tr></tfoot>';
      tbl.innerHTML = h;
    }
    [ip, cidr, split].forEach(function (e) { e.addEventListener('input', run); });
    $('#subForm').addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  })();

  /* ---------- contact ---------- */
  function copyEmail() {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = EMAIL; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Email copied'); } catch (e) { toast(EMAIL); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(EMAIL).then(function () { toast('Email copied'); }, fallback);
    else fallback();
  }
  function mailto(name, from, msg) {
    var subject = 'Hello from rabsrabi.com' + (name ? ' — ' + name : '');
    var body = (msg || '') + (name || from ? '\n\n— ' + [name, from].filter(Boolean).join(' · ') : '');
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  var cb = $('#copyMail'); if (cb) cb.addEventListener('click', copyEmail);
  var cf = $('#cf');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('#cm').value.trim();
    if (!msg) { toast('Write a short message first'); $('#cm').focus(); return; }
    mailto($('#cn').value.trim(), $('#ce').value.trim(), msg);
  });

  var resumeRequestForm = $('#resumeRequestForm');
  if (resumeRequestForm) resumeRequestForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#rn').value.trim();
    var company = $('#rc').value.trim();
    var from = $('#re').value.trim();
    var role = $('#rr').value.trim();
    if (!name || !company || !from) {
      toast('Please add your name, company and work email');
      (!name ? $('#rn') : !company ? $('#rc') : $('#re')).focus();
      return;
    }
    if (!$('#re').checkValidity()) {
      toast('Please enter a valid email address');
      $('#re').focus();
      return;
    }
    var subject = 'Résumé request — ' + company;
    var body = 'Hello Rabiul,\n\nI would like to request a copy of your current résumé.' +
      (role ? '\n\nRole / opportunity: ' + role : '') +
      '\n\nMy details:\nName: ' + name + '\nCompany: ' + company + '\nWork email: ' + from +
      '\n\nThank you.';
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });

  /* ---------- command palette ---------- */
  var palBg = $('#palBg'), palIn = $('#palIn'), palList = $('#palList'), palBtn = $('#palBtn');
  var prevFocus = null, shown = [], sel = 0;
  function go(id) { var t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  var CMDS = [
    { t: 'Go to Home', k: 'home top start landing', h: '#top', f: function () { go('top'); } },
    { t: 'Go to About', k: 'about bio profile summary intro education degree bsc cse iub at iubat university', h: '#about', f: function () { go('about'); } },
    { t: 'Go to Experience', k: 'experience work jobs career timeline link3 technologies amber it operations senior support engineer zonal branch in charge network telecommunications ccna rhce rhcsa training', h: '#experience', f: function () { go('experience'); } },
    { t: 'Go to Projects', k: 'projects work vpn bank police network enterprise bangladesh police ific sonali bank modern food storage probashi kollyan', h: '#projects', f: function () { go('projects'); } },
    { t: 'Open the Scheduler Lab', k: 'lab play sim simulation scheduler algorithm 5g mimo massive mimo wireless compare priority multilevel rr round robin pf proportional fair max ci fairness throughput delay antenna users channel path loss service queue event driven snr spectral efficiency rate factor shadowing workload monte carlo confidence interval' , h: '#lab', f: function () { window.showLabTab && showLabTab('sim'); go('lab'); } },
    { t: 'Re-run scheduler comparison', k: 'lab rerun random users refresh simulate run again', h: 'lab action', f: function () { go('lab'); var b = $('#reroll'); if (b) b.click(); } },
    { t: 'Open the Subnet calculator', k: 'lab cidr ip ipv4 network subnet mask wildcard split calculator', h: '#lab', f: function () { window.showLabTab && showLabTab('sub'); go('lab'); } },
    { t: 'Go to Thesis Research', k: 'thesis paper research massive mimo 5g 6g iot network security algorithms scheduling wireless communications telecommunications ai machine learning resource allocation qos quality of service radio resource management matlab', h: '#research', f: function () { go('research'); } },
    { t: 'Go to Toolbox', k: 'skills tools technology tech stack certifications mikrotik mtcre mtcna cisco huawei ubiquiti cambium bgp ospf vlan stp gpon olt fttx routing switching tcp ip lan wan vpn gre eoip pptp dns dhcp firewall ids ips linux wireshark nms gns3 packet tracer winbox unms fiber optic microwave ptp ptmp rhce rhcsa', h: '#skills', f: function () { go('skills'); } },
    { t: 'Go to Contact', k: 'hire reach message contact email', h: '#contact', f: function () { go('contact'); } },
    { t: 'Request my résumé', k: 'recruiter resume résumé cv curriculum vitae hiring job application download copy request', h: '#contact', f: function () { go('contact'); setTimeout(function () { var field = $('#rn'); if (field) field.focus(); }, 450); } },
    { t: 'Open GitHub profile', k: 'github source code repositories repo portfolio', h: 'github.com', f: function () { window.open('https://github.com/rabsrabi26', '_blank', 'noopener'); } },
    { t: 'Open MATLAB simulation repository', k: 'github matlab mimo scheduler simulation code thesis source files', h: 'MIMO-Scheduling-Simulation', f: function () { window.open('https://github.com/rabsrabi26/MIMO-Scheduling-Simulation', '_blank', 'noopener'); } },
    { t: 'Open LinkedIn profile', k: 'linkedin professional social profile', h: 'linkedin.com', f: function () { window.open('https://www.linkedin.com/in/rabsrabi26', '_blank', 'noopener'); } },
    { t: 'Copy email address', k: 'mail email clipboard copy contact', h: 'action', f: copyEmail },
    { t: 'Write me an email', k: 'contact mailto message send compose mail', h: 'action', f: function () { mailto('', '', ''); } },
    { t: 'Theme: Auto (follow system)', k: 'light dark mode system automatic', h: 'theme', f: function () { setMode('auto'); } },
    { t: 'Theme: Light', k: 'day bright white', h: 'theme', f: function () { setMode('light'); } },
    { t: 'Theme: Dark', k: 'night black', h: 'theme', f: function () { setMode('dark'); } },
    { t: 'Ping this server', k: 'latency network test speed response time', h: 'ping', f: function () { toast('pinging rabsrabi.com …'); ping(function (ms) { toast(ms == null ? 'ping failed (are you offline?)' : 'reply from rabsrabi.com: time=' + ms + ' ms'); }); } },
    { t: 'Show me the 404 page', k: 'error missing not found page', h: 'page', f: function () { window.location.href = '/404.html'; } },
    { t: 'sudo hire rabiul', k: 'easter egg root job recruiter opportunity', h: '🔑', f: function () { toast('[sudo] permission granted. Opening mail…'); setTimeout(function () { mailto('', '', 'Hi Rabiul, I would like to talk about an opportunity.'); }, 900); } },
    { t: 'Back to top', k: 'scroll home start', h: '#top', f: function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } }
  ];
  function normaliseSearch(value) {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();
  }
  function commandScore(command, tokens) {
    var title = normaliseSearch(command.t), keywords = normaliseSearch(command.k), hint = normaliseSearch(command.h), score = 0;
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (title === token) score += 10;
      else if (title.indexOf(token) === 0) score += 7;
      else if (title.indexOf(token) > -1) score += 5;
      else if (keywords.indexOf(token) > -1) score += 2;
      else if (hint.indexOf(token) > -1) score += 1;
      else return -1;
    }
    return score;
  }
  function paint() {
    if (!shown.length) {
      palList.innerHTML = '<li class="empty">No match. Try “MikroTik”, “5G”, “résumé”, “VPN” or “subnet”.</li>';
      palIn.removeAttribute('aria-activedescendant');
      return;
    }
    palList.innerHTML = '';
    shown.forEach(function (c, i) {
      var li = document.createElement('li');
      li.id = 'pal-option-' + i;
      li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel));
      if (i === sel) li.className = 'sel';
      var a = document.createElement('span'); a.textContent = c.t;
      var b = document.createElement('small'); b.textContent = c.h;
      li.appendChild(a); li.appendChild(b);
      li.addEventListener('mousemove', function () { if (sel !== i) { sel = i; paint(); } });
      li.addEventListener('click', function () { run(c); });
      palList.appendChild(li);
    });
    palIn.setAttribute('aria-activedescendant', 'pal-option-' + sel);
    var selected = $('li.sel', palList);
    if (selected && selected.scrollIntoView) selected.scrollIntoView({ block: 'nearest' });
  }
  function filter() {
    var tokens = normaliseSearch(palIn.value).split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      shown = CMDS.slice();
    } else {
      shown = CMDS.map(function (command) {
        return { command: command, score: commandScore(command, tokens) };
      }).filter(function (item) { return item.score >= 0; })
        .sort(function (a, b) { return b.score - a.score || a.command.t.localeCompare(b.command.t); })
        .map(function (item) { return item.command; });
    }
    sel = 0; paint();
  }
  function openPal() { prevFocus = document.activeElement; palBg.classList.add('open'); if (palBtn) palBtn.setAttribute('aria-expanded', 'true'); palIn.setAttribute('aria-expanded', 'true'); palIn.value = ''; filter(); palIn.focus(); }
  function closePal() { palBg.classList.remove('open'); if (palBtn) palBtn.setAttribute('aria-expanded', 'false'); palIn.setAttribute('aria-expanded', 'false'); if (prevFocus && prevFocus.focus) prevFocus.focus(); }
  function run(c) { closePal(); setTimeout(c.f, 60); }
  if (palBg) {
    palIn.addEventListener('input', filter);
    palBg.addEventListener('mousedown', function (e) { if (e.target === palBg) closePal(); });
    palIn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && shown.length) { sel = (sel + 1) % shown.length; paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp' && shown.length) { sel = (sel - 1 + shown.length) % shown.length; paint(); e.preventDefault(); }
      else if (e.key === 'Home' && shown.length) { sel = 0; paint(); e.preventDefault(); }
      else if (e.key === 'End' && shown.length) { sel = shown.length - 1; paint(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (shown[sel]) run(shown[sel]); e.preventDefault(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    if (palBtn) palBtn.addEventListener('click', openPal);
    document.addEventListener('keydown', function (e) {
      var open = palBg.classList.contains('open');
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open ? closePal() : openPal(); }
      else if (e.key === 'Escape' && open) closePal();
      else if (e.key === '/' && !open && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') && !(document.activeElement && document.activeElement.isContentEditable)) { e.preventDefault(); openPal(); }
    });
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) { var kb = $('kbd', palBtn); if (kb) kb.textContent = '⌘ K'; }
  }

  /* ---------- misc ---------- */
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
  if (window.console && console.log) console.log('%c> hello, fellow network person 👋\n%cTry Ctrl+K, or type "sudo hire rabiul" in the command palette.', 'font:700 14px monospace;color:#2dd4bf', 'font:12px monospace');
})();
