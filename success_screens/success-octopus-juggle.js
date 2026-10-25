/* success-octopus-juggle.js — מסך הצלחה: תְּמָנוּן לַהֲטוּטָן 🐙
   תמנון תינוק עגול וחייכני (עיניים גדולות, סומק, שמונה זרועות מסולסלות עם
   כפתורי יניקה) צף למעלה ומלהטט בכוכבים זוהרים, בועות ולבבות קטנים בדפוס
   "מפל" קלאסי — ואז זורק את כולם למעלה אל מזרקת נצנצים ומנופף לשלום בזרוע.
   בסופר: יותר חפצים בקצב מהיר, בועות קשת, וכל החפצים הופכים לטבעת כוכבים.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255, g = Math.round(g1 + (g2 - g1) * t) & 255, b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  function starPath(ctx, x, y, rOut, rIn, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? rIn : rOut, a = rot + (i / 10) * TAU - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    ctx.closePath();
  }

  var BODY = '#FF8DB8', BODY_D = '#E2588F', BODY_L = '#FFD3E4', SUCK = '#FFEAF2', SUCK_D = '#F4A3C4', INK = '#2A1433';
  var HEART = '#FF5E9A';

  window.SUCCESS.styles.push({
    name: 'octopus-juggle',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 4500 : 2700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(primary)) primary = '#C77DFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(accent)) accent = '#FFD27D';
      if (!/^#[0-9a-fA-F]{6}$/.test(glow)) glow = '#7DC4FF';
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';
      var GOLD = mixHex('#FFD84A', accent, 0.35);
      var BOW = mixHex('#B57BFF', primary, 0.45);

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── timeline (ms) ───
      var N = isSuper ? 5 : 3;                    // juggled items (odd → true cascade)
      var BEAT = isSuper ? 165 : 215;             // one throw per beat, hands alternate
      var DW = 0.6, FL = N - DW;                  // dwell / flight in beats
      var T_RISE = dur * (isSuper ? 0.1 : 0.13);
      var T_JUG = T_RISE + 40;
      var T_TOSS = dur * 0.55;
      var FLY = isSuper ? 420 : 340;
      var STAG = isSuper ? 45 : 55;
      var T_LAST = T_TOSS + FLY + (N - 1) * STAG;
      var T_WAVE = T_TOSS + FLY + 40;
      var PLIFE = isSuper ? 1100 : 760;

      var KINDS = isSuper ? ['star', 'heart', 'bubble', 'star', 'heart'] : ['star', 'heart', 'bubble'];
      var items = KINDS.map(function (k, i) {
        return { kind: k, col: k === 'heart' ? (i % 2 ? HEART : mixHex(primary, HEART, 0.5)) : k === 'star' ? GOLD : glow,
                 rot: rnd(-0.3, 0.3), spin: rnd(-3, 3), ax: rnd(-0.18, 0.18), ay: rnd(-0.12, 0.12),
                 burst: T_TOSS + FLY + i * STAG };
      });
      // fountain particles (analytic; positions relative to the apex, in R units)
      var parts = [];
      items.forEach(function (it, i) {
        var n = isSuper ? 20 : 14;
        for (var j = 0; j < n; j++) {
          var a = -Math.PI / 2 + rnd(-1.25, 1.25), sp = rnd(1.5, 3.2);
          parts.push({ at: it.burst, vx: Math.cos(a) * sp, vy: Math.max(-2.7, Math.sin(a) * sp), ax: it.ax, ay: it.ay,
                       kind: ['spark', 'star', 'heart', 'dot', 'spark'][j % 5], sz: rnd(0.08, 0.15),
                       col: [GOLD, '#FFFFFF', '#FF8FC0', glow, primary][(j + i) % 5], ph: rnd(0, TAU), life: PLIFE * rnd(0.75, 1) });
        }
      });
      // super: the items become a ring of stars
      var ring = [];
      if (isSuper) for (var rg = 0; rg < 12; rg++) ring.push({ a: rg / 12 * TAU, at: T_LAST + 40 + rg * 30, col: rg % 3 === 1 ? '#FFFFFF' : rg % 3 === 2 ? mixHex(GOLD, '#FF9EC8', 0.5) : GOLD });
      // rising bubbles (rainbow in super)
      var bubs = [];
      for (var b = 0; b < (isSuper ? 22 : 10); b++)
        bubs.push({ x: b < 4 ? rnd(-0.6, 0.6) : rnd(-1, 1), from: b < 4 ? 'oct' : 'floor', at: b < 4 ? rnd(0.02, 0.12) * dur : rnd(0.05, 0.7) * dur,
                    sp: rnd(0.12, 0.22), r: rnd(5, 13), ph: rnd(0, TAU), rainbow: isSuper && b % 2 === 0 });
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 36 : 24); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.8, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });
      // the six walking tentacles: base x (R units), outward angle, length, curl direction
      var legs = [
        { bx: -0.72, sp: 1.0, len: 1.3, cd: 1, ph: 0.0 }, { bx: -0.46, sp: 0.62, len: 1.5, cd: 1, ph: 1.3 },
        { bx: -0.16, sp: 0.22, len: 1.45, cd: 1, ph: 2.6 }, { bx: 0.16, sp: -0.22, len: 1.45, cd: -1, ph: 3.9 },
        { bx: 0.46, sp: -0.62, len: 1.5, cd: -1, ph: 5.2 }, { bx: 0.72, sp: -1.0, len: 1.3, cd: -1, ph: 0.7 }
      ];


      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.3;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing helpers ───
      // a tapered tentacle along a centerline, suckers on one edge
      function tentacle(pts, w0, w1, suckSide, suckFrom) {
        var n = pts.length, Lp = [], Rp = [], nrm = [];
        for (var k = 0; k < n; k++) {
          var a = pts[Math.max(0, k - 1)], c = pts[Math.min(n - 1, k + 1)];
          var dx = c.x - a.x, dy = c.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          var nx = -dy / d, ny = dx / d, w = lerp(w0, w1, k / (n - 1)) / 2;
          nrm.push({ x: nx, y: ny, w: w });
          Lp.push(pts[k].x + nx * w, pts[k].y + ny * w); Rp.push(pts[k].x - nx * w, pts[k].y - ny * w);
        }
        ctx.fillStyle = BODY;
        ctx.beginPath(); ctx.moveTo(Lp[0], Lp[1]);
        for (var i = 2; i < Lp.length; i += 2) ctx.lineTo(Lp[i], Lp[i + 1]);
        for (var j = Rp.length - 2; j >= 0; j -= 2) ctx.lineTo(Rp[j], Rp[j + 1]);
        ctx.closePath(); ctx.fill();
        var tip = pts[n - 1];
        ctx.beginPath(); ctx.arc(tip.x, tip.y, w1 / 2, 0, TAU); ctx.fill();
        // soft shading on the sucker side, sheen on the other
        ctx.strokeStyle = hexA(BODY_D, 0.55); ctx.lineWidth = Math.max(1, w0 * 0.16);
        ctx.beginPath();
        for (var s = 0; s < n; s++) { var px = pts[s].x - nrm[s].x * nrm[s].w * suckSide * -0.7, py = pts[s].y - nrm[s].y * nrm[s].w * suckSide * -0.7; if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = Math.max(1, w0 * 0.14);
        ctx.beginPath();
        for (var h = 0; h < n * 0.8; h++) { var qx = pts[h].x - nrm[h].x * nrm[h].w * suckSide * 0.45, qy = pts[h].y - nrm[h].y * nrm[h].w * suckSide * 0.45; if (h === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy); }
        ctx.stroke();
        for (var m = Math.floor(n * suckFrom); m < n - 1; m++) {
          var sw = nrm[m].w, sx = pts[m].x + nrm[m].x * sw * suckSide * 0.62, sy = pts[m].y + nrm[m].y * sw * suckSide * 0.62;
          ctx.fillStyle = SUCK_D; ctx.beginPath(); ctx.arc(sx, sy, sw * 0.42, 0, TAU); ctx.fill();
          ctx.fillStyle = SUCK; ctx.beginPath(); ctx.arc(sx, sy, sw * 0.3, 0, TAU); ctx.fill();
        }
      }
      function curlPts(bx, by, a0, len, cd, ph, wig, t) {
        var pts = [{ x: bx, y: by }], n = 16, seg = len / n, a = a0, x = bx, y = by;
        for (var k = 1; k <= n; k++) {
          var u = k / n;
          a += cd * (0.03 + 0.62 * u * u * u) + Math.sin(t * 0.005 + ph + u * 3) * wig * 0.07 * u;
          x += Math.cos(a) * seg; y += Math.sin(a) * seg;
          pts.push({ x: x, y: y });
        }
        return pts;
      }
      // juggling arm: bezier from the body to the "hand", ending in a little cradling curl
      function armPts(bx, by, hx, hy, s, R) {
        var cx = (bx + hx) / 2 + s * R * 0.6, cy = (by + hy) / 2 + R * 0.35;
        var pts = [], n = 14;
        for (var k = 0; k <= n; k++) {
          var u = k / n, iu = 1 - u;
          pts.push({ x: iu * iu * bx + 2 * iu * u * cx + u * u * hx, y: iu * iu * by + 2 * iu * u * cy + u * u * hy });
        }
        var e = pts[n], pr = pts[n - 1], a = Math.atan2(e.y - pr.y, e.x - pr.x), x = e.x, y = e.y;
        for (var c = 0; c < 6; c++) { a += -s * 0.5; x += Math.cos(a) * R * 0.06; y += Math.sin(a) * R * 0.06; pts.push({ x: x, y: y }); }
        return pts;
      }
      function drawItem(it, x, y, r, rot, alpha) {
        if (alpha <= 0 || r <= 0) return;
        ctx.save(); ctx.globalAlpha *= alpha;
        var gc = it.kind === 'star' ? GOLD : it.kind === 'heart' ? it.col : glow;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.3);
        g.addColorStop(0, hexA(gc, 0.55)); g.addColorStop(1, hexA(gc, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, TAU); ctx.fill();
        ctx.translate(x, y); ctx.rotate(rot);
        if (it.kind === 'star') {
          var sg = ctx.createLinearGradient(0, -r, 0, r);
          sg.addColorStop(0, '#FFF6C4'); sg.addColorStop(1, GOLD);
          ctx.fillStyle = sg; ctx.strokeStyle = sg; ctx.lineWidth = r * 0.22; ctx.lineJoin = 'round';
          starPath(ctx, 0, 0, r * 1.15, r * 0.55, 0); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#5A3A10';
          ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.05, r * 0.09, 0, TAU); ctx.arc(r * 0.24, -r * 0.05, r * 0.09, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#5A3A10'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.16, 0.25, Math.PI - 0.25); ctx.stroke();
          ctx.fillStyle = 'rgba(255,140,170,.6)';
          ctx.beginPath(); ctx.arc(-r * 0.42, r * 0.14, r * 0.09, 0, TAU); ctx.arc(r * 0.42, r * 0.14, r * 0.09, 0, TAU); ctx.fill();
        } else if (it.kind === 'heart') {
          var hg = ctx.createLinearGradient(0, -r, 0, r);
          hg.addColorStop(0, mixHex(it.col, '#FFFFFF', 0.35)); hg.addColorStop(1, it.col);
          heartPath(ctx, 0, 0, r * 0.95); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = r * 0.16; ctx.stroke(); ctx.fillStyle = hg; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.4, r * 0.2, r * 0.13, -0.6, 0, TAU); ctx.fill();
        } else {
          drawBubble(0, 0, r * 1.1, it.rainbow || isSuper, 1);
        }
        ctx.restore();
      }
      function drawBubble(x, y, r, rainbow, a) {
        ctx.fillStyle = hexA(glow, 0.14 * a);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (rainbow) {
          var rg2 = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
          ['#FF7FBF', '#FFC86E', '#FFF27A', '#7DF0A8', '#7DC4FF', '#B98CFF'].forEach(function (c, i) { rg2.addColorStop(i / 5, hexA(c, 0.85 * a)); });
          ctx.strokeStyle = rg2; ctx.lineWidth = Math.max(1.5, r * 0.14);
        } else { ctx.strokeStyle = 'rgba(255,255,255,' + (0.75 * a).toFixed(3) + ')'; ctx.lineWidth = Math.max(1.2, r * 0.09); }
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.4, r * 0.24, r * 0.14, -0.7, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + r * 0.42, y + r * 0.36, r * 0.08, 0, TAU); ctx.fill();
      }
      function drawHead(hx, hy, R, look, happy, blink, t) {
        // skirt where tentacles meet
        ctx.fillStyle = BODY;
        ctx.beginPath(); ctx.ellipse(hx, hy + R * 0.6, R * 0.86, R * 0.3, 0, 0, TAU); ctx.fill();
        var g = ctx.createRadialGradient(hx - R * 0.3, hy - R * 0.45, R * 0.08, hx, hy, R * 1.25);
        g.addColorStop(0, BODY_L); g.addColorStop(0.45, BODY); g.addColorStop(1, BODY_D);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(hx, hy - R * 0.05, R, R * 0.93, 0, 0, TAU); ctx.fill();
        // gloss + freckle spots
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.ellipse(hx - R * 0.42, hy - R * 0.55, R * 0.2, R * 0.11, -0.6, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath(); ctx.arc(hx - R * 0.15, hy - R * 0.72, R * 0.06, 0, TAU); ctx.fill();
        ctx.fillStyle = hexA(BODY_D, 0.35);
        [[0.08, -0.62, 0.07], [0.3, -0.78, 0.05], [-0.62, -0.25, 0.06], [0.66, -0.3, 0.05]].forEach(function (d) { ctx.beginPath(); ctx.arc(hx + d[0] * R, hy + d[1] * R, d[2] * R, 0, TAU); ctx.fill(); });
        // bow
        var bx = hx + R * 0.52, by = hy - R * 0.78;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(0.35 + Math.sin(t * 0.006) * 0.05);
        ctx.fillStyle = BOW;
        [-1, 1].forEach(function (s) {
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(s * R * 0.2, -R * 0.2, s * R * 0.36, -R * 0.08, s * R * 0.34, R * 0.06);
          ctx.bezierCurveTo(s * R * 0.3, R * 0.2, s * R * 0.12, R * 0.12, 0, 0); ctx.closePath(); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath(); ctx.ellipse(-R * 0.2, -R * 0.06, R * 0.06, R * 0.03, -0.5, 0, TAU); ctx.ellipse(R * 0.2, -R * 0.06, R * 0.06, R * 0.03, 0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = mixHex(BOW, '#000000', 0.15);
        ctx.beginPath(); ctx.arc(0, 0, R * 0.08, 0, TAU); ctx.fill();
        ctx.restore();
        // eyes (front view: two big ones)
        var ey = hy + R * 0.06;
        [-1, 1].forEach(function (s) {
          var ex = hx + s * R * 0.37;
          if (happy) {
            ctx.strokeStyle = INK; ctx.lineWidth = R * 0.075; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(ex, ey + R * 0.08, R * 0.16, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex + s * R * 0.15, ey - R * 0.0); ctx.lineTo(ex + s * R * 0.24, ey - R * 0.07); ctx.stroke();
            return;
          }
          var ry = R * 0.29 * blink;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.25, Math.max(0.5, ry), 0, 0, TAU); ctx.fill();
          if (blink > 0.3) {
            ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.25, ry, 0, 0, TAU); ctx.clip();
            var ix = ex + look.x * R * 0.07, iy = ey + look.y * R * 0.07 + R * 0.02;
            var ig = ctx.createRadialGradient(ix, iy + R * 0.08, R * 0.02, ix, iy, R * 0.21);
            ig.addColorStop(0, '#6A3F95'); ig.addColorStop(1, INK);
            ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, R * 0.2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(ix - R * 0.07, iy - R * 0.08, R * 0.075, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(ix + R * 0.08, iy + R * 0.07, R * 0.035, 0, TAU); ctx.fill();
            ctx.restore();
          }
          // two little lashes on the outer corner
          ctx.strokeStyle = INK; ctx.lineWidth = R * 0.04; ctx.lineCap = 'round';
          for (var l = 0; l < 2; l++) {
            var la = -Math.PI / 2 + s * (0.85 + l * 0.38);
            var lx = ex + Math.cos(la) * R * 0.25, ly = ey + Math.sin(la) * ry;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(la) * R * 0.09, ly + Math.sin(la) * R * 0.09); ctx.stroke();
          }
        });
        // blush
        ctx.fillStyle = 'rgba(255,80,140,.42)';
        [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(hx + s * R * 0.66, hy + R * 0.34, R * 0.15, R * 0.085, 0, 0, TAU); ctx.fill(); });
        // open smile: a real opening, darker toward the top/back, tongue at the bottom
        var mx = hx, my = hy + R * 0.38, mw = R * (happy ? 0.17 : 0.14), mh = R * (happy ? 0.2 : 0.15);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(mx - mw, my); ctx.quadraticCurveTo(mx, my + R * 0.04, mx + mw, my);
        ctx.quadraticCurveTo(mx + mw * 0.9, my + mh * 1.25, mx, my + mh * 1.25); ctx.quadraticCurveTo(mx - mw * 0.9, my + mh * 1.25, mx - mw, my); ctx.closePath();
        var mg = ctx.createLinearGradient(0, my, 0, my + mh * 1.25);
        mg.addColorStop(0, '#5A1430'); mg.addColorStop(0.5, '#A8325E'); mg.addColorStop(1, '#C94473');
        ctx.fillStyle = mg; ctx.fill(); ctx.clip();
        ctx.fillStyle = '#FF8FB0';
        ctx.beginPath(); ctx.ellipse(mx, my + mh * 1.2, mw * 0.7, mh * 0.55, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = hexA(BODY_D, 0.9); ctx.lineWidth = R * 0.035; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mx - mw - R * 0.03, my - R * 0.02); ctx.quadraticCurveTo(mx - mw, my, mx - mw + R * 0.01, my + R * 0.01); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx + mw + R * 0.03, my - R * 0.02); ctx.quadraticCurveTo(mx + mw, my, mx + mw - R * 0.01, my + R * 0.01); ctx.stroke();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        var cF = 1; cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.75 * k * cF);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = cF;

        var R = Math.min(W * 0.19, H * 0.12);
        var hx = W * 0.5;
        var restY = H * (W < H ? 0.6 : 0.62);
        var riseE = easeOutBack(clamp01(t / T_RISE));
        var hy = restY + (1 - riseE) * H * 0.62 + Math.sin(t * 0.005) * R * 0.06;
        var handY = hy + R * 0.12, IN = R * 1.12, OUT = R * 1.85, PEAK = R * (isSuper ? 2.5 : 2.25);
        var apX = hx, apY = restY - R * 2.05;
        var ir = R * 0.27;

        // rising bubbles (behind)
        for (var bi = 0; bi < bubs.length; bi++) {
          var bb = bubs[bi], bt = (t - bb.at) / 1000;
          if (bt <= 0) continue;
          var by0 = bb.from === 'oct' ? hy + R * 0.3 : H * 1.02;
          var byy = by0 - bt * bb.sp * H;
          var bxx = (bb.from === 'oct' ? hx + bb.x * R : hx + bb.x * W * 0.48) + Math.sin(bt * 4 + bb.ph) * 8 * unit;
          if (byy < -20) continue;
          var ba = clamp01(bt * 4) * clamp01((byy - H * 0.05) / (H * 0.2));
          drawBubble(bxx, byy, bb.r * unit * 1.4, bb.rainbow, ba);
        }

        // ─── hands: rest → juggling cascade → toss up → wave / relax ───
        var u = (t - T_JUG) / BEAT;
        var jugB = easeOut(clamp01((t - T_JUG + 160) / 160));
        var upB = easeOut(clamp01((t - (T_TOSS - 70)) / 150));
        var wvB = easeInOut(clamp01((t - T_WAVE) / 260));
        function loopHand(h, uu) {
          var s = h === 0 ? -1 : 1;
          var psi = (((uu - h) % 2) + 2) % 2 / 2, cut = 1 - DW / 2, x, y;
          if (psi < cut) { var e = easeInOut(psi / cut); x = lerp(IN, OUT, e); y = handY - Math.sin(Math.PI * e) * R * 0.22; }
          else { var e2 = (psi - cut) / (1 - cut); x = lerp(OUT, IN, e2); y = handY + Math.sin(Math.PI * e2) * R * 0.3; }
          return { x: hx + s * x, y: y };
        }
        function handPos(h) {
          var s = h === 0 ? -1 : 1;
          var rest = { x: hx + s * R * 1.5, y: hy + R * 0.75 + Math.sin(t * 0.006 + h) * R * 0.05 };
          var lp = loopHand(h, u);
          var x = lerp(rest.x, lp.x, jugB), y = lerp(rest.y, lp.y, jugB);
          x = lerp(x, hx + s * R * 1.05, upB); y = lerp(y, hy - R * 0.95, upB);
          if (h === 1) {
            var wv = Math.sin((t - T_WAVE) * 0.016);
            x = lerp(x, hx + R * 1.6 + wv * R * 0.28, wvB); y = lerp(y, hy - R * 1.25 - Math.abs(wv) * R * 0.08, wvB);
          } else { x = lerp(x, rest.x, wvB); y = lerp(y, rest.y, wvB); }
          return { x: x, y: y };
        }
        var H0 = handPos(0), H1 = handPos(1);
        function ballPos(i, uu) {
          var v = uu - i;
          if (v < 0) { var hp = i % 2 === 0 ? H0 : H1; return { x: hp.x + (i >= 2 ? (i % 2 ? -1 : 1) * ir * 0.9 : 0), y: hp.y - (i >= 2 ? ir * 0.5 : 0), air: false }; }
          var kk = Math.floor(v / N), f = v - kk * N, from = (i + kk * N) % 2, sf = from === 0 ? -1 : 1;
          if (f < FL) {
            var q = f / FL;
            return { x: hx + lerp(sf * IN, -sf * OUT, q), y: handY - PEAK * 4 * q * (1 - q), air: true };
          }
          var hq = loopHand(1 - from, uu);
          return { x: hq.x, y: hq.y, air: false };
        }

        // ─── octopus: legs, arms, head ───
        var wig = 1 + (1 - clamp01(t / T_RISE)) * 2;
        for (var li = 0; li < legs.length; li++) {
          var lg = legs[li];
          var a0 = Math.PI / 2 + lg.sp + Math.sin(t * 0.004 + lg.ph) * 0.1;
          var pts = curlPts(hx + lg.bx * R, hy + R * 0.62, a0, lg.len * R, lg.cd, lg.ph, wig, t);
          tentacle(pts, R * 0.3, R * 0.08, -lg.cd, 0.35);
        }
        tentacle(armPts(hx - R * 0.7, hy + R * 0.45, H0.x, H0.y, -1, R), R * 0.3, R * 0.1, 1, 0.3);
        tentacle(armPts(hx + R * 0.7, hy + R * 0.45, H1.x, H1.y, 1, R), R * 0.3, R * 0.1, -1, 0.3);

        // eyes follow the juggled items
        var lookX = 0, lookY = -0.6, nAir = 0;
        var happy = t > T_LAST + 60;
        var blinkT = (t - dur * 0.36) / 140, blink = blinkT > 0 && blinkT < 1 ? Math.abs(Math.cos(blinkT * Math.PI)) : 1;
        var bposes = [];
        if (t >= T_JUG - 200 && t < T_TOSS) {
          for (var ib = 0; ib < N; ib++) { var bp0 = ballPos(ib, u); bposes.push(bp0); if (bp0.air) { lookX += (bp0.x - hx) / (R * 2); lookY += (bp0.y - hy) / (R * 2.5); nAir++; } }
          if (nAir) { lookX /= nAir; lookY = lookY / (nAir + 1); }
        }
        if (t >= T_TOSS) { lookX = 0; lookY = -1; }
        var ll = Math.sqrt(lookX * lookX + lookY * lookY); if (ll > 1) { lookX /= ll; lookY /= ll; }
        drawHead(hx, hy, R, { x: lookX, y: lookY }, happy, blink, t);

        // ─── juggled items ───
        var popIn = easeOutBack(clamp01((t - (T_JUG - 240)) / 260));
        if (t < T_TOSS) {
          for (var j = 0; j < bposes.length; j++) {
            var it = items[j], bp = bposes[j];
            drawItem(it, bp.x, bp.y - ir * 0.9, ir * popIn, it.rot + Math.sin(t * 0.004 + j) * 0.3 + (bp.air ? t * 0.001 * it.spin : 0), 1);
          }
        } else {
          var uT = (T_TOSS - T_JUG) / BEAT;
          for (var j2 = 0; j2 < N; j2++) {
            var it2 = items[j2];
            if (!it2.p0) it2.p0 = ballPos(j2, uT);
            var q2 = clamp01((t - T_TOSS - j2 * STAG) / FLY);
            if (q2 >= 1) continue;
            var e3 = easeOut(q2);
            var ix = lerp(it2.p0.x, apX + it2.ax * R, e3), iy = lerp(it2.p0.y - ir * 0.9, apY + it2.ay * R, e3) - Math.sin(Math.PI * q2) * R * 0.35;
            drawItem(it2, ix, iy, ir * (1 + 0.25 * q2), it2.rot + t * 0.004 * it2.spin, 1);
          }
        }

        // ─── fountain bursts ───
        ctx.globalCompositeOperation = 'lighter';
        for (var bj = 0; bj < N; bj++) {
          var fq = (t - items[bj].burst) / 380;
          if (fq <= 0 || fq >= 1) continue;
          var fx = apX + items[bj].ax * R, fy = apY + items[bj].ay * R;
          var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * (0.4 + fq * 1.1));
          var fk = (1 - fq) * (1 - fq);
          fg.addColorStop(0, hexA('#FFFFFF', 0.7 * fk)); fg.addColorStop(0.4, hexA(GOLD, 0.45 * fk)); fg.addColorStop(1, hexA(GOLD, 0));
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, R * (0.4 + fq * 1.1), 0, TAU); ctx.fill();
          ctx.strokeStyle = hexA('#FFFFFF', 0.6 * fk * fk); ctx.lineWidth = 2.5 * unit;
          ctx.beginPath(); ctx.arc(fx, fy, R * (0.2 + fq * 0.9), 0, TAU); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        var grav = 5.6;
        for (var pi = 0; pi < parts.length; pi++) {
          var pp = parts[pi], pt = (t - pp.at) / 1000;
          if (pt <= 0 || pt * 1000 > pp.life) continue;
          var px = apX + (pp.ax + pp.vx * pt) * R + Math.sin(pt * 6 + pp.ph) * R * 0.04;
          var py = apY + (pp.ay + pp.vy * pt + 0.5 * grav * pt * pt) * R;
          var pa = clamp01(pt * 10) * clamp01((pp.life / 1000 - pt) / 0.3);
          var tw = 0.75 + 0.25 * Math.sin(pt * 22 + pp.ph);
          var pr = pp.sz * R * tw;
          ctx.globalAlpha = cF * pa;
          ctx.fillStyle = pp.col;
          if (pp.kind === 'spark') { sparkPath(ctx, px, py, pr * 1.6); ctx.fill(); }
          else if (pp.kind === 'star') { starPath(ctx, px, py, pr * 1.2, pr * 0.55, pt * 3 + pp.ph); ctx.fill(); }
          else if (pp.kind === 'heart') { heartPath(ctx, px, py, pr); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(px, py, pr * 0.6, 0, TAU); ctx.fill(); }
        }
        ctx.globalAlpha = cF;

        // ─── super: ring of stars around the octopus ───
        if (isSuper) {
          var RR = Math.min(R * 2.3, W * 0.45);
          var rcx = hx, rcy = hy - R * 0.05, spin = Math.max(0, t - T_LAST) * 0.0005;
          var ringA = clamp01((t - T_LAST - 300) / 400);
          if (ringA > 0) {
            ctx.strokeStyle = hexA(GOLD, 0.35 * ringA); ctx.lineWidth = 3 * unit;
            ctx.beginPath(); ctx.arc(rcx, rcy, RR, 0, TAU); ctx.stroke();
            ctx.strokeStyle = hexA('#FFFFFF', 0.18 * ringA); ctx.lineWidth = 9 * unit;
            ctx.beginPath(); ctx.arc(rcx, rcy, RR, 0, TAU); ctx.stroke();
          }
          for (var r1 = 0; r1 < ring.length; r1++) {
            var rs = ring[r1], rq = clamp01((t - rs.at) / 520);
            if (rq <= 0) continue;
            var re = easeOutBack(rq), ang = rs.a + spin - Math.PI / 2;
            var tx2 = rcx + Math.cos(ang) * RR, ty2 = rcy + Math.sin(ang) * RR;
            var sx2 = lerp(apX, tx2, re), sy2 = lerp(apY, ty2, re);
            var srr = R * (0.17 + 0.025 * Math.sin(t * 0.01 + r1)) * (0.5 + 0.5 * clamp01(rq * 2));
            var sg2 = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, srr * 2.6);
            sg2.addColorStop(0, hexA(GOLD, 0.6)); sg2.addColorStop(1, hexA(GOLD, 0));
            ctx.fillStyle = sg2; ctx.beginPath(); ctx.arc(sx2, sy2, srr * 2.6, 0, TAU); ctx.fill();
            ctx.fillStyle = rs.col; ctx.strokeStyle = rs.col; ctx.lineWidth = srr * 0.25;
            starPath(ctx, sx2, sy2, srr, srr * 0.5, spin * 2 + r1); ctx.fill(); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq > 0 ? easeOutBack(pq) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        killed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
