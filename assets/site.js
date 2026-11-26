(function () {
  /* email address is assembled here, so it is not sitting in the page source for scrapers */
  [].forEach.call(document.querySelectorAll('a.mail'), function (a) {
    var addr = a.dataset.u + '@' + a.dataset.d;
    a.href = 'mailto:' + addr;
    if (a.classList.contains('show')) a.textContent = addr;
  });
  /* mouse: the hovered picture grows in place but is kept inside the window */
  document.addEventListener('mouseover', function (e) {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    var f = e.target.closest && e.target.closest('.pfig.zoom');
    if (!f || f.contains(e.relatedTarget)) return;
    var r = f.getBoundingClientRect();
    var s = Math.min(1.9, (innerWidth - 32) / r.width, (innerHeight - 96) / r.height);
    var w = r.width * s, h = r.height * s, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var left = Math.min(Math.max(cx - w / 2, 16), innerWidth - 16 - w), top = Math.min(Math.max(cy - h / 2, 72), innerHeight - 16 - h);
    f.style.setProperty('--zs', s.toFixed(3));
    f.style.setProperty('--zx', (left + w / 2 - cx).toFixed(1) + 'px');
    f.style.setProperty('--zy', (top + h / 2 - cy).toFixed(1) + 'px');
  });
  /* touch screens: tap a small picture to see it large, tap again to close */
  document.addEventListener('click', function (e) {
    var img = e.target.closest && e.target.closest('.pfig.zoom img');
    if (!img || matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    var lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', img.alt || 'Picture');
    var big = document.createElement('img'); big.src = img.currentSrc || img.src; big.alt = img.alt;
    lb.appendChild(big); document.body.appendChild(lb);
    var close = function () { lb.remove(); document.removeEventListener('keydown', esc); };
    var esc = function (ev) { if (ev.key === 'Escape') close(); };
    lb.addEventListener('click', close); document.addEventListener('keydown', esc);
  });

  /* ---- flashlight: mouse only, rAF-throttled ---- */
  var raf = 0;
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || raf) return;
    var band = e.target.closest && e.target.closest('.band');
    if (!band) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var b = band.getBoundingClientRect();
      band.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      band.style.setProperty('--my', (e.clientY - b.top) + 'px');
    });
  });

  /* ---- phase in: reveal each .rv once it enters the viewport ---- */
  var els = [].slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (e) { io.observe(e); });
  } else els.forEach(function (e) { e.classList.add('in'); });

  /* ---- Projects dropdown: hover (mouse), click/tap, keyboard, Escape, click outside ---- */
  var dd = document.querySelector('.dd');
  if (dd) {
    var btn = dd.querySelector('.ddbtn'), menu = dd.querySelector('.ddmenu'), t = 0;
    var set = function (open) {
      clearTimeout(t);
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      if (!open) { pinned = false; byHover = false; }
    };
    var byHover = false, pinned = false;
    btn.addEventListener('click', function () {
      if (byHover) { byHover = false; pinned = true; return; }   /* the hover already opened it: a click keeps it open */
      pinned = false; set(menu.hidden);
    });
    dd.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover)').matches && menu.hidden) { byHover = true; set(true); } else clearTimeout(t); });
    dd.addEventListener('mouseleave', function () { if (matchMedia('(hover:hover)').matches && !pinned) { byHover = false; t = setTimeout(function () { set(false); }, 160); } });
    document.addEventListener('click', function (e) { if (!dd.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
    dd.addEventListener('focusout', function (e) { if (!dd.contains(e.relatedTarget)) set(false); });
  }

  /* ---- CV: tap a skill, matching roles and projects light up (and stay visible) ---- */
  var targets = [].slice.call(document.querySelectorAll('[data-t]'));
  var chips = [].slice.call(document.querySelectorAll('button.chip'));
  var bar = document.getElementById('litbar');
  if (!chips.length) return;
  chips.forEach(function (b) {
    b.dataset.n = targets.filter(function (t) { return t.dataset.t.split(' ').indexOf(b.dataset.k) > -1; }).length;
  });
  var cur = null;
  function show(k, label) {
    cur = k;
    [].forEach.call(document.querySelectorAll('button.chip'), function (x) { x.setAttribute('aria-pressed', String(x.dataset.k === k)); });
    var hits = [];
    targets.forEach(function (t) {
      var hit = k && t.dataset.t.split(' ').indexOf(k) > -1;
      t.classList.toggle('dim', !!k && !hit);
      t.classList.toggle('hit', !!hit);
      if (hit) hits.push(t);
    });
    if (bar) {
      bar.hidden = !k;
      if (k) {
        document.getElementById('litname').textContent = label;
        document.getElementById('litcount').textContent = hits.length ? 'used in ' + hits.length + (hits.length === 1 ? ' place' : ' places') : 'general skill, not tied to one role';
      }
    }
    if (k && hits.length) {
      var r = hits[0].getBoundingClientRect();
      var small = matchMedia('(max-width:900px)').matches;
      if (small || r.top < 90 || r.top > innerHeight - 120) hits[0].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button.chip');
    if (b) { show(cur === b.dataset.k ? null : b.dataset.k, b.dataset.l || b.textContent); return; }
    if (e.target.id === 'litclear') show(null);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) show(null); });
  document.addEventListener('click', function (e) { var g = e.target.closest && e.target.closest('[data-go]'); if (g) { var t = document.getElementById(g.dataset.go); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });

  /* the skills column sticks only if it fits on screen, so it never needs its own scrollbar */
  var side = document.querySelector('.cvside, .vc-skills');
  if (side) {
    var fit = function () { side.classList.toggle('fit', side.offsetHeight <= innerHeight - 110); };
    fit(); addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }
})();

/* ---- footer plane button: loads the mini game only when someone clicks it ---- */
(function () {
  var btn = document.getElementById('plane-btn');
  if (!btn) return;
  var src = (document.currentScript && document.currentScript.src) || '';
  var v = (src.match(/\?v=([a-z0-9]+)/) || [])[1];
  var loading = false;
  btn.addEventListener('click', function () {
    if (window.PlaneGame) { window.PlaneGame.open(btn); return; }
    if (loading) return; loading = true;
    var s = document.createElement('script');
    s.src = 'assets/game.js' + (v ? '?v=' + v : '');
    s.onload = function () { loading = false; window.PlaneGame.open(btn); };
    s.onerror = function () { loading = false; };
    document.head.appendChild(s);
  });
})();

/* ---- easter egg: when all six pages have been read to the end, a TOUCHDOWN banner appears once ---- */
(function () {
  var PAGES = ['index', 'cv', 'careerway', 'manga-tracker', 'fantasy-alert', '3d-printing'];
  var SEEN = 'ml-seen', DONE = 'ml-touchdown';
  var slug = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function seen() { try { return JSON.parse(get(SEEN) || '[]').filter(function (x) { return PAGES.indexOf(x) > -1; }); } catch (e) { return []; } }
  function show() {
    if (document.querySelector('.td')) return;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var el = document.createElement('div'); el.className = 'td'; el.setAttribute('role', 'status');
    el.innerHTML = '<b class="td-h">TOUCHDOWN</b><span class="td-n">MATTHIAS LOBINGER</span><span class="td-s">You read every page. Thanks for stopping by.</span>';
    if (!reduce) {
      var cols = ['#d9402c', '#0f4c9e', '#f4f6fb', '#4fd1b5'];
      for (var i = 0; i < 34; i++) { var c = document.createElement('i'); c.className = 'td-c'; c.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;background:' + cols[i % 4] + ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;animation-duration:' + (1.3 + Math.random() * 1.1).toFixed(2) + 's;transform:rotate(' + Math.round(Math.random() * 180) + 'deg)'; el.appendChild(c); }
    }
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    var close = function () { el.classList.remove('in'); setTimeout(function () { el.remove(); }, 400); };
    el.addEventListener('click', close); setTimeout(close, 7000);
  }
  if (location.hash === '#touchdown') { show(); return; }       // preview link, does not count
  if (get(DONE)) return;
  var footer = document.querySelector('footer');
  if (!footer || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    var s = seen(); if (s.indexOf(slug) < 0) { s.push(slug); set(SEEN, JSON.stringify(s)); }
    if (s.length >= PAGES.length && !get(DONE)) { set(DONE, '1'); setTimeout(show, 600); }
  }, { threshold: 0.6 });
  io.observe(footer);
})();
