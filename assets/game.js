/* Toy-plane mini game. Loaded on demand from the footer button; nothing runs until then.
   One input: hold (finger, mouse, Space, arrow up) to climb, let go to sink. Dodge storm clouds, catch magnets.
   Plane colours are sampled from photos of the real print. After 60 points the sky turns to night and the
   nose and windows glow, like the glow-in-the-dark parts of the real toy. */
(function () {
  var PAL = { blue: '#0f4c9e', blueD: '#0b3470', red: '#d9402c', redD: '#a92a1f', white: '#f4f6fb', cream: '#ebe9e0', black: '#17171a', glow: '#c9ffd9' };
  var KEY = 'ml-plane-best';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KX = 1, KY = 1, PS = 1, root, cv, ctx, W, H, dpr, raf = 0, last = 0, opener, open = false;
  var state, y, vy, hold, score, dist, magnets, objs, spawnIn, best = 0, stars = [], pops = [], bgClouds = [], bob = 0;

  function load() { try { best = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { best = 0; } }
  function save() { try { localStorage.setItem(KEY, String(best)); } catch (e) {} }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function lerpCol(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(mix(A[0], B[0], t)) + ',' + Math.round(mix(A[1], B[1], t)) + ',' + Math.round(mix(A[2], B[2], t)) + ')'; }
  function night() { return Math.min(1, Math.max(0, (score - 55) / 30)); }

  /* ---------- the plane, drawn from the photos: cream nose, blue band, red + blue body with round windows,
     red tail base, blue fin, white wing and stabiliser, red engine under the wing, black wheels ---------- */
  function drawPlane(c, px, py, tilt, s, glowT) {
    c.save(); c.translate(px, py); c.rotate(tilt); c.scale(-s, s);   // drawn nose-left, mirrored so the nose points the way it flies (right)
    var glow = glowT > 0;
    // wheels (under everything)
    for (var k = 0; k < 2; k++) { var wx = k ? 24 : -40; c.fillStyle = PAL.black; c.beginPath(); c.arc(wx, 25, 7.5, 0, 7); c.fill(); c.fillStyle = PAL.white; c.beginPath(); c.arc(wx, 25, 2.8, 0, 7); c.fill(); }
    // tail fin: big rounded paddle, like the printed one
    c.fillStyle = PAL.blue; c.beginPath(); c.moveTo(30, -15); c.bezierCurveTo(34, -36, 48, -50, 62, -47); c.bezierCurveTo(68, -38, 62, -20, 54, -9); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(36, -18); c.bezierCurveTo(40, -34, 50, -44, 60, -44); c.bezierCurveTo(52, -38, 46, -28, 44, -16); c.closePath(); c.fill();
    // chubby fuselage with the toy's colour sections
    c.save();
    c.beginPath(); c.moveTo(-56, 0); c.bezierCurveTo(-56, -17, -40, -22, -22, -22); c.lineTo(28, -18); c.quadraticCurveTo(54, -14, 58, -4); c.lineTo(58, 5); c.quadraticCurveTo(52, 15, 30, 18); c.lineTo(-22, 22); c.bezierCurveTo(-40, 22, -56, 17, -56, 0); c.closePath(); c.clip();
    c.fillStyle = PAL.cream; c.fillRect(-62, -26, 20, 52);                 // cream nose
    c.fillStyle = PAL.blue; c.fillRect(-44, -26, 17, 52);                  // blue band
    c.fillStyle = PAL.red; c.fillRect(-28, -26, 31, 52);                   // red section
    c.fillStyle = PAL.blue; c.fillRect(2, -26, 36, 52);                    // blue section
    c.fillStyle = PAL.red; c.fillRect(37, -26, 24, 52);                    // red tail base
    c.fillStyle = PAL.black; c.fillRect(-2, 12, 64, 12);                   // dark belly
    c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(-62, -22, 124, 6);   // light along the top
    c.restore();
    // white stabiliser under the red tail base, in front of the body, sticking out at the back
    c.fillStyle = PAL.white; c.beginPath(); c.ellipse(51, 12, 19, 6.2, 0.12, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.10)'; c.beginPath(); c.ellipse(52, 14.5, 16, 3.4, 0.12, 0, 7); c.fill();
    // cockpit window in the cream nose (glows at night)
    if (glow) { c.shadowColor = PAL.glow; c.shadowBlur = 18 * glowT; c.fillStyle = 'rgba(201,255,217,' + (0.6 + 0.4 * glowT) + ')'; } else c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath(); c.ellipse(-48, -4, 9, 11, 0, 0, 7); c.fill(); c.shadowBlur = 0;
    // round cabin windows
    var wins = [[-17, -5, PAL.redD], [-5, -5, PAL.redD], [11, -4, PAL.blueD], [22, -4, PAL.blueD], [33, -4, PAL.blueD]];
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      if (glow) { c.shadowColor = PAL.glow; c.shadowBlur = 12 * glowT; c.fillStyle = 'rgba(201,255,217,' + (0.55 + 0.45 * glowT) + ')'; } else c.fillStyle = w[2];
      c.beginPath(); c.arc(w[0], w[1], 4.2, 0, 7); c.fill(); c.shadowBlur = 0;
    }
    // red engine under the wing, cream cap at the front
    c.fillStyle = PAL.red; c.fillRect(-24, 20, 18, 14); c.fillStyle = PAL.redD; c.fillRect(-24, 30, 18, 4);
    c.fillStyle = PAL.cream; c.beginPath(); c.ellipse(-24, 27, 3.6, 7, 0, 0, 7); c.fill();
    // big white wing in front
    c.fillStyle = PAL.white; c.beginPath(); c.ellipse(-2, 13, 33, 12.5, 0.05, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.09)'; c.beginPath(); c.ellipse(-1, 18, 28, 6, 0.05, 0, 7); c.fill();
    c.restore();
  }

  function cloud(c, o, n) {
    var col = lerpCol('#8593a8', '#2b3652', n), dark = lerpCol('#5d6b82', '#1c2540', n);
    for (var i = 0; i < o.puffs.length; i++) { var p = o.puffs[i]; c.fillStyle = i % 2 ? dark : col; c.beginPath(); c.arc(o.x + p[0], o.y + p[1], p[2], 0, 7); c.fill(); }
  }
  function magnet(c, o, t) {
    var bob = reduce ? 0 : Math.sin(t * 4 + o.x * 0.03) * 2;
    c.save(); c.translate(o.x, o.y + bob); c.lineWidth = 7; c.lineCap = 'butt';
    c.strokeStyle = PAL.red; c.beginPath(); c.arc(0, 0, 9, Math.PI, 0, false); c.lineTo(9, 8); c.moveTo(-9, 0); c.lineTo(-9, 8); c.stroke();
    c.strokeStyle = '#dfe3ea'; c.beginPath(); c.moveTo(-9, 8); c.lineTo(-9, 13); c.moveTo(9, 8); c.lineTo(9, 13); c.stroke();
    c.restore();
  }

  /* ---------- game logic ---------- */
  function reset() {
    state = 'ready'; y = H / 2; vy = 0; hold = false; score = 0; dist = 0; magnets = 0; objs = []; pops = []; spawnIn = 1.7; bob = 0;
  }
  function spawn() {
    var cs = Math.max(0.65, Math.min(1, W / 900)), r = rnd(24, 38) * cs, cy = rnd(36, H - 36), puffs = [[0, 0, r], [r * 0.9, r * 0.25, r * 0.8], [-r * 0.85, r * 0.3, r * 0.7], [r * 0.15, -r * 0.55, r * 0.65]];
    objs.push({ k: 'c', x: W + 100, y: cy, r: r * 1.05, puffs: puffs });
    if (Math.random() < 0.7) {
      var my = cy + (Math.random() < 0.5 ? -1 : 1) * rnd(r + 70 * KY, r + 130 * KY); if (my < 34 || my > H - 34) my = cy > H / 2 ? 40 : H - 40;
      objs.push({ k: 'm', x: W + 100 + rnd(130, 260) * KX, y: my, r: 15 });
    }
    spawnIn = Math.max(0.55, rnd(0.95, 1.5) - Math.min(score, 120) / 300);
  }
  function update(dt) {
    var sp = (200 + Math.min(score, 160) * 1.5) * KX;
    if (state === 'ready') { bob += dt; return; }
    if (state !== 'play') return;
    dist += sp * dt;
    vy += (hold ? -1250 : 820) * KY * dt; vy = Math.max(-330 * KY, Math.min(380 * KY, vy)); y += vy * dt;
    var lim = 34 * PS; if (y < lim) { y = lim; vy = 0; } if (y > H - lim) { y = H - lim; vy = 0; }
    spawnIn -= dt; if (spawnIn <= 0) spawn();
    var px = Math.max(60 * PS, W * 0.2);
    for (var i = objs.length - 1; i >= 0; i--) {
      var o = objs[i]; o.x -= sp * dt;
      if (o.x < -160) { objs.splice(i, 1); continue; }
      var dx = o.x - px, dy = o.y - y;
      if (o.k === 'c' && dx * dx + dy * dy < Math.pow(o.r * 0.8 + 19 * PS, 2)) return gameOver();
      if (o.k === 'm' && dx * dx + dy * dy < Math.pow(o.r + 24 * PS, 2)) { objs.splice(i, 1); magnets++; pops.push({ x: o.x, y: o.y, t: 0 }); }
    }
    score = Math.floor(dist / 45) + magnets * 10;
    for (var j = pops.length - 1; j >= 0; j--) { pops[j].t += dt; if (pops[j].t > 0.6) pops.splice(j, 1); }
    if (!reduce) for (var b = 0; b < bgClouds.length; b++) { var g = bgClouds[b]; g.x -= sp * g.v * dt; if (g.x < -g.w) { g.x = W + g.w; g.y = rnd(20, H - 60); } }
  }
  function gameOver() {
    state = 'over'; lastOverAt = performance.now(); if (score > best) { best = score; save(); }
  }

  /* ---------- drawing ---------- */
  function draw(t) {
    var n = night(), c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, lerpCol('#4a98dc', '#07122b', n)); g.addColorStop(1, lerpCol('#cbe8ff', '#16305a', n));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (n > 0) { c.fillStyle = 'rgba(255,255,255,' + (0.8 * n) + ')'; for (var s = 0; s < stars.length; s++) c.fillRect(stars[s][0] * W, stars[s][1] * H, stars[s][2], stars[s][2]); }
    // soft background wisps
    c.fillStyle = 'rgba(255,255,255,' + (0.35 * (1 - n) + 0.05) + ')';
    for (var b = 0; b < bgClouds.length; b++) { var bc = bgClouds[b]; c.beginPath(); c.ellipse(bc.x, bc.y, bc.w, bc.w * 0.18, 0, 0, 7); c.fill(); }
    for (var i = 0; i < objs.length; i++) { var o = objs[i]; if (o.k === 'c') cloud(c, o, n); else magnet(c, o, t / 1000); }
    var px = Math.max(60 * PS, W * 0.2), py = y + (state === 'ready' && !reduce ? Math.sin(bob * 2) * 6 : 0);
    var tilt = state === 'over' ? 0.5 : Math.max(-0.35, Math.min(0.35, vy / 900));
    drawPlane(c, px, py, tilt, PS, n > 0.25 ? n : 0);
    for (var q = 0; q < pops.length; q++) { var p = pops[q]; c.fillStyle = 'rgba(255,255,255,' + (1 - p.t / 0.6) + ')'; c.font = '700 14px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('+10', p.x, p.y - 14 - p.t * 40); }
    // HUD
    c.textAlign = 'left'; c.fillStyle = n > 0.5 ? '#fff' : '#0b2a4d'; c.font = '700 20px system-ui,sans-serif'; c.fillText(String(score), 16, 30);
    c.textAlign = 'right'; c.font = '600 13px system-ui,sans-serif'; c.fillText('Best ' + best, W - 16, 28);
    if (state === 'ready' || state === 'over') {
      c.fillStyle = 'rgba(8,14,28,.55)'; c.fillRect(0, 0, W, H);
      c.textAlign = 'center'; c.fillStyle = '#fff';
      c.font = '700 ' + (W < 480 ? 24 : 30) + 'px system-ui,sans-serif';
      c.fillText(state === 'ready' ? 'Fly the toy plane' : 'Score ' + score, W / 2, H / 2 - 22);
      c.font = '500 ' + (W < 480 ? 14 : 16) + 'px system-ui,sans-serif'; c.fillStyle = 'rgba(255,255,255,.85)';
      c.fillText(state === 'ready' ? (W < 480 ? 'Hold to climb, let go to sink.' : 'Hold to climb, let go to sink. Dodge the storm clouds, catch the magnets.') : (score >= best && score > 0 ? 'New best! ' : 'Best ' + best + '. ') + 'Tap or press Space to fly again.', W / 2, H / 2 + 10);
      if (state === 'ready') { if (W < 480) c.fillText('Dodge the clouds, catch the magnets.', W / 2, H / 2 + 32); c.fillText(W < 480 ? 'At 60 points it gets dark and the plane glows.' : 'At 60 points the night comes, and the nose and windows glow.', W / 2, H / 2 + (W < 480 ? 54 : 36)); }
    }
  }
  function frame(t) {
    if (!open) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min((t - last) / 1000, 0.033); last = t;
    update(dt); draw(t);
  }

  /* ---------- overlay ---------- */
  function size() {
    var r = cv.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    KX = Math.max(0.42, Math.min(1.1, W / 900)); KY = Math.max(0.75, Math.min(1.2, H / 560)); PS = Math.max(0.95, Math.min(1.35, W / 480));
    if (y > H - 26) y = H - 26;
  }
  function press(e) { if (e && e.cancelable) e.preventDefault(); if (state === 'ready' || state === 'over') { if (state === 'over' && performance.now() - lastOverAt < 350) return; var keep = best; reset(); best = keep; state = 'play'; } hold = true; }
  var lastOverAt = 0;
  function release() { hold = false; }
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); if (!e.repeat) press(); }
  }
  function onKeyUp(e) { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') release(); }
  function onVis() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; hold = false; } else if (open && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function onResize() { size(); }

  function openGame(from) {
    if (open) return;
    open = true; opener = from || document.activeElement; load();
    root = document.createElement('div'); root.className = 'pg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Toy plane game');
    root.innerHTML = '<div class="pg-panel"><canvas class="pg-cv" aria-label="Game area. Hold to climb, release to sink."></canvas><button type="button" class="pg-x" aria-label="Close game">Close</button></div>';
    document.body.appendChild(root); document.documentElement.classList.add('pg-open');
    cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
    stars = []; for (var i = 0; i < 46; i++) stars.push([Math.random(), Math.random() * 0.8, Math.random() < 0.2 ? 2 : 1]);
    size(); bgClouds = []; for (var k = 0; k < 6; k++) bgClouds.push({ x: rnd(0, W), y: rnd(20, H - 60), w: rnd(40, 90), v: rnd(0.15, 0.35) });
    reset();
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); press(e); });
    cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
    root.querySelector('.pg-x').addEventListener('click', close);
    root.addEventListener('pointerdown', function (e) { if (e.target === root) close(); });
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis); addEventListener('resize', onResize);
    root.querySelector('.pg-x').focus({ preventScroll: true });
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function close() {
    if (!open) return;
    open = false; cancelAnimationFrame(raf); raf = 0;
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', onResize);
    if (root) root.remove(); document.documentElement.classList.remove('pg-open');
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  window.PlaneGame = { open: openGame, close: close };
})();
