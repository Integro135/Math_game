/* success-dandelion-wish.js — מסך הצלחה: מִשְׁאֶלֶת שֵׁן-אֲרִי 🌬️
   שן-ארי זוהרת (כדור של זרעים דקים עם מצנחונים) מתנדנדת ברוח; משב רוח עדין
   מסתלסל אליה ומפזר נצנצים, והזרעים ממריאים אחד-אחד, מסתחררים כלפי מעלה,
   וכל מצנחון הופך לכוכב מנצנץ שממלא את השמיים.
   בסופר: שתי שני-אריות, והזרעים מתאספים לקבוצת-כוכבים גדולה בצורת כוכב
   שנמתחת בקו זוהר, פועמת — ואז מנצנצת ונעלמת.
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
  function easeSine(x) { x = clamp01(x); return 0.5 - 0.5 * Math.cos(Math.PI * x); }
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
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function okHex(h, d) { return (typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h)) ? h : d; }

  window.SUCCESS.styles.push({
    name: 'dandelion-wish',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 4500 : 2700);
      var pal = opts.palette || {};
      var primary = okHex(pal.primary, '#C77DFF');
      var accent  = okHex(pal.accent, '#FFD27D');
      var glow    = okHex(pal.glow, '#7DC4FF');
      var textCol = pal.text || '#FFFFFF';
      var praise  = opts.praise || 'אַתְּ כּוֹכֶבֶת!';

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

      // soft glow sprites (offscreen, never attached to the DOM)
      function makeGlow(col) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(0.22, hexA(col, 0.5)); gr.addColorStop(1, hexA(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      }
      var STAR_COLS = ['#FFFFFF', accent, glow, mixHex(primary, '#FFFFFF', 0.35), '#FFF4C8'];
      var sprites = STAR_COLS.map(makeGlow);

      // ─── the dandelions ───
      var plants = isSuper
        ? [{ fx: 0.29, fy: 0.7, sc: 0.8, ph: 0.4, side: -1 }, { fx: 0.71, fy: 0.74, sc: 0.72, ph: 2.1, side: 1 }]
        : [{ fx: 0.5, fy: 0.6, sc: 1, ph: 0, side: 0 }];
      var d0 = isSuper ? 0.12 : 0.15, d1 = isSuper ? 0.36 : 0.44;     // detach window (fraction of dur)
      var seeds = [];
      plants.forEach(function (pl, pi) {
        var N = isSuper ? 54 : 80, list = [];
        for (var i = 0; i < N; i++) {
          var z = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - z * z), a = i * 2.39996323;
          var s = { pi: pi, vx: rr * Math.cos(a), vy: rr * Math.sin(a), vz: z, ph: rnd(0, TAU),
                    col: i % 5, size: rnd(0.8, 1.25), loops: rnd(0.7, 1.5) * (Math.random() < 0.5 ? -1 : 1),
                    amp: rnd(16, 42), push: rnd(60, 200), rate: rnd(3, 7), start: null, tx: 0, ty: 0 };
          s.key = s.vx - s.vy * 0.5 + rnd(-0.45, 0.45);           // wind from the left: the right/top leaves first
          list.push(s);
        }
        list.sort(function (a, b) { return b.key - a.key; });
        list.forEach(function (s, k) {
          s.dt = lerp(d0, d1, k / (list.length - 1)) * dur + rnd(-40, 40);
          s.fd = isSuper ? rnd(1050, 1250) : rnd(950, 1150);
        });
        pl.seeds = list;
        seeds = seeds.concat(list);
      });

      // targets: normal → scattered over the sky (fan out by angle); super → a five-point star outline
      if (!isSuper) {
        var pl0 = plants[0], N0 = pl0.seeds.length, tg = [];
        var guard = 0;
        while (tg.length < N0 && guard++ < 4000) {
          var tx = rnd(0.05, 0.95), ty = rnd(0.05, 0.56);
          var dx = (tx - 0.5) * 1.6, dy = (ty - 0.6) * 1.0;
          if (dx * dx + dy * dy < 0.035) continue;                    // keep clear of the flower head
          var ok = true;
          for (var q = 0; q < tg.length; q++) { var ex = tg[q].x - tx, ey = (tg[q].y - ty) * 1.4; if (ex * ex + ey * ey < 0.0035) { ok = false; break; } }
          if (ok || guard > 3000) tg.push({ x: tx, y: ty, a: Math.atan2(ty - 0.6, (tx - 0.5) * 1.6) });
        }
        tg.sort(function (a, b) { return a.a - b.a; });
        var bySeedAng = pl0.seeds.slice().sort(function (a, b) {
          var aa = Math.atan2(a.vy, a.vx), bb = Math.atan2(b.vy, b.vx);
          aa = aa > Math.PI / 2 ? aa - TAU : aa; bb = bb > Math.PI / 2 ? bb - TAU : bb;
          return aa - bb;
        });
        bySeedAng.forEach(function (s, k) { var tt = tg[Math.floor(k * tg.length / bySeedAng.length)]; s.tx = tt.x; s.ty = tt.y; });
      } else {
        // half outline: top outer vertex → bottom inner vertex (right side), mirrored for the left plant
        var RIN = 0.42, verts = [];
        for (var v = 0; v <= 5; v++) { var va = -Math.PI / 2 + v * Math.PI / 5, vr = v % 2 ? RIN : 1; verts.push([Math.cos(va) * vr, Math.sin(va) * vr]); }
        var segL = [], tot = 0;
        for (var sg = 0; sg < 5; sg++) { var l = Math.hypot(verts[sg + 1][0] - verts[sg][0], verts[sg + 1][1] - verts[sg][1]); segL.push(l); tot += l; }
        var halfPt = function (f) {
          var d = f * tot;
          for (var k = 0; k < 5; k++) { if (d <= segL[k] || k === 4) { var u = clamp01(d / segL[k]); return [lerp(verts[k][0], verts[k + 1][0], u), lerp(verts[k][1], verts[k + 1][1], u)]; } d -= segL[k]; }
          return verts[5];
        };
        plants.forEach(function (pl, pi) {
          var lst = pl.seeds.slice().sort(function (a, b) { return a.dt - b.dt; });
          lst.forEach(function (s, k) {
            var pt = halfPt((k + 0.5) / lst.length);
            s.tx = pi === 0 ? -pt[0] : pt[0]; s.ty = pt[1];
            s.ord = k / lst.length;
            s.loops *= 0.7;
          });
        });
      }

      // little background twinkles (dim, they let the sky feel deep)
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.75, tw: Math.random() * TAU, rate: 2 + Math.random() * 3, size: 0.7 + Math.random() * 1.3 });

      // wind swirls (gentle breaths that curl into the flower)
      var winds = [];
      var wN = isSuper ? 6 : 4;
      for (var w = 0; w < wN; w++)
        winds.push({ at: (isSuper ? 0.07 : 0.09) + w * (isSuper ? 0.045 : 0.05) + rnd(0, 0.02), dy: rnd(-0.55, 0.55), amp: rnd(0.04, 0.09), ph: rnd(0, TAU),
                     loop: rnd(0.16, 0.26), pl: isSuper ? w % 2 : 0, speed: rnd(0.85, 1.1) });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:' + (isSuper ? '10%' : '12%') + ';transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (isSuper ? 0.2 : 0.26);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(' + (isSuper ? '10%' : '12%') + ' + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── geometry helpers ───
      function gust(t) {
        var p = t / dur;
        var a = isSuper ? 0.08 : 0.1, b = isSuper ? 0.15 : 0.18, c = isSuper ? 0.38 : 0.48, d = isSuper ? 0.52 : 0.64;
        return easeSine((p - a) / (b - a)) * (1 - easeSine((p - c) / (d - c)));
      }
      function baseR() { return Math.min(W * 0.27, H * (isSuper ? 0.17 : 0.19)) * (isSuper && W < H ? 0.85 : 1); }
      function geo(pl, t) {
        var R = baseR() * pl.sc;
        var g = gust(t);
        var rise = easeOutBack(clamp01(t / (dur * (isSuper ? 0.1 : 0.13))));
        var off = (1 - rise) * H * 0.3;
        var bx = pl.fx * W + pl.side * W * 0.04, by = H + 8 * unit + off;
        var L = H + 8 * unit - pl.fy * H;
        var th = Math.sin(t * 0.0016 + pl.ph) * 0.035 + g * 0.075 + Math.sin(t * 0.011 + pl.ph) * 0.018 * g;
        return { bx: bx, by: by, hx: bx + Math.sin(th) * L, hy: by - Math.cos(th) * L, th: th, R: R, L: L };
      }
      function seedTip(s, G, t, flutter) {
        var c = Math.cos(G.th), sn = Math.sin(G.th);
        var j = flutter ? Math.sin(t * 0.02 + s.ph) * 0.05 * flutter : 0;
        var vx = s.vx + j * s.vy, vy = s.vy - j * s.vx;
        return { dx: vx * c - vy * sn, dy: vx * sn + vy * c };
      }
      function starCenter() { return { x: W * 0.5, y: H * 0.47, r: Math.min(W * 0.4, H * 0.225) }; }
      function targetPx(s) {
        if (!isSuper) return { x: s.tx * W, y: s.ty * H };
        var C = starCenter();
        return { x: C.x + s.tx * C.r, y: C.y + s.ty * C.r };
      }

      // ─── drawing ───
      function toothLeaf(x, y, ang, len, wid, flip) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (flip) ctx.scale(1, -1);
        var gr = ctx.createLinearGradient(0, -wid, 0, wid);
        gr.addColorStop(0, '#7FCB7A'); gr.addColorStop(0.5, '#4E9E55'); gr.addColorStop(1, '#2F7140');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(0, 0);
        var k, u, wv;
        for (k = 1; k <= 5; k++) {
          u = k / 6; wv = wid * Math.pow(Math.sin(Math.PI * Math.min(u * 1.1, 1)), 0.7);
          ctx.lineTo((u - 0.09) * len, -wv * 1.05); ctx.lineTo(u * len, -wv * 0.5);
        }
        ctx.quadraticCurveTo(len * 0.95, -wid * 0.25, len, 0);
        for (k = 5; k >= 1; k--) {
          u = k / 6; wv = wid * Math.pow(Math.sin(Math.PI * Math.min(u * 1.1, 1)), 0.7);
          ctx.lineTo(u * len, wv * 0.5); ctx.lineTo((u - 0.09) * len, wv * 1.05);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(220,255,210,.45)'; ctx.lineWidth = Math.max(1, wid * 0.1);
        ctx.beginPath(); ctx.moveTo(len * 0.02, 0); ctx.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.92, 0); ctx.stroke();
        ctx.restore();
      }

      function drawPlant(pl, t, alpha) {
        var G = geo(pl, t), R = G.R, hx = G.hx, hy = G.hy;
        var g = gust(t);
        ctx.save(); ctx.globalAlpha = alpha;
        // leaves at the base
        var lw = R * 0.24, ll = R * 1.5;
        toothLeaf(G.bx - R * 0.05, G.by, -Math.PI + 0.55 + Math.sin(t * 0.002 + pl.ph) * 0.03, ll, lw, true);
        toothLeaf(G.bx + R * 0.05, G.by, -0.55 + Math.sin(t * 0.0022 + pl.ph) * 0.03, ll * 0.9, lw, false);
        toothLeaf(G.bx, G.by, -Math.PI / 2 - 0.25, ll * 0.7, lw * 0.85, false);
        // stem (hollow, pale green, a soft highlight)
        var cxs = G.bx + Math.sin(G.th) * G.L * 0.18, cys = G.by - G.L * 0.55;
        var sw = Math.max(2.5, R * 0.065);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#3E7F48'; ctx.lineWidth = sw + 2 * unit;
        ctx.beginPath(); ctx.moveTo(G.bx, G.by); ctx.quadraticCurveTo(cxs, cys, hx, hy + R * 0.1); ctx.stroke();
        ctx.strokeStyle = '#8CCB82'; ctx.lineWidth = sw;
        ctx.beginPath(); ctx.moveTo(G.bx, G.by); ctx.quadraticCurveTo(cxs, cys, hx, hy + R * 0.1); ctx.stroke();
        ctx.strokeStyle = 'rgba(235,255,225,.55)'; ctx.lineWidth = sw * 0.3;
        ctx.beginPath(); ctx.moveTo(G.bx - sw * 0.2, G.by); ctx.quadraticCurveTo(cxs - sw * 0.2, cys, hx - sw * 0.2, hy + R * 0.12); ctx.stroke();

        // count remaining seeds → glow strength
        var left = 0;
        for (var i = 0; i < pl.seeds.length; i++) if (t < pl.seeds[i].dt) left++;
        var frac = left / pl.seeds.length;
        // soft halo behind the clock
        var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 1.55);
        hg.addColorStop(0, hexA('#FFFFFF', 0.16 * frac + 0.05));
        hg.addColorStop(0.45, hexA(glow, 0.2 * frac + 0.04));
        hg.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, R * 1.55, 0, TAU); ctx.fill();

        // sepals (curled-back bracts) under the head
        ctx.strokeStyle = '#5FA866'; ctx.lineWidth = Math.max(1.5, R * 0.035);
        for (var b = 0; b < 7; b++) {
          var ba = G.th + Math.PI / 2 + (b - 3) * 0.32;
          var sx = hx + Math.cos(ba) * R * 0.1, sy = hy + Math.sin(ba) * R * 0.1;
          ctx.beginPath(); ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + Math.cos(ba) * R * 0.22, sy + Math.sin(ba) * R * 0.1, sx + Math.cos(ba) * R * 0.2, sy + R * 0.28);
          ctx.stroke();
        }

        var hw = Math.max(0.6, R * 0.0085);
        function seedPass(front) {
          var fil = new Path2D(), hair = new Path2D(), knots = new Path2D();
          var any = false;
          for (var i = 0; i < pl.seeds.length; i++) {
            var s = pl.seeds[i];
            if (t >= s.dt) continue;
            if ((s.vz >= 0) !== front) continue;
            any = true;
            // a seed about to leave trembles a little more
            var pre = clamp01(1 - (s.dt - t) / 260);
            var d = seedTip(s, G, t, g + pre * 1.5);
            var az = Math.abs(s.vz);
            var tx = hx + d.dx * R, ty = hy + d.dy * R;
            fil.moveTo(hx + d.dx * R * 0.13, hy + d.dy * R * 0.13); fil.lineTo(tx, ty);
            var a0 = Math.atan2(d.dy, d.dx);
            var spread = lerp(2.0, TAU * 0.92, az * az), hl = R * 0.2 * (1 - 0.4 * az), nh = 9;
            for (var h = 0; h < nh; h++) {
              var ha = a0 + spread * (h / (nh - 1) - 0.5) + Math.sin(t * 0.03 + s.ph + h) * 0.08 * g;
              var ex = tx + Math.cos(ha) * hl, ey = ty + Math.sin(ha) * hl;
              hair.moveTo(tx, ty);
              hair.quadraticCurveTo(tx + Math.cos(ha) * hl * 0.6, ty + Math.sin(ha) * hl * 0.6 + hl * 0.06, ex, ey + hl * 0.08);
            }
            knots.moveTo(tx + hw * 1.6, ty); knots.arc(tx, ty, hw * 1.6, 0, TAU);
          }
          if (!any) return;
          ctx.strokeStyle = front ? 'rgba(255,255,255,.42)' : 'rgba(225,235,255,.18)'; ctx.lineWidth = hw * 0.8;
          ctx.stroke(fil);
          ctx.strokeStyle = front ? 'rgba(255,255,255,.85)' : 'rgba(225,235,255,.35)'; ctx.lineWidth = hw;
          ctx.stroke(hair);
          ctx.fillStyle = front ? 'rgba(255,255,255,.95)' : 'rgba(225,235,255,.45)';
          ctx.fill(knots);
        }
        seedPass(false);
        // the receptacle — a little domed disc, dotted where seeds sat
        var rr = R * 0.13;
        var rg = ctx.createRadialGradient(hx - rr * 0.3, hy - rr * 0.35, rr * 0.1, hx, hy, rr);
        rg.addColorStop(0, '#FFF2C9'); rg.addColorStop(0.6, '#D9B66E'); rg.addColorStop(1, '#9C7A3E');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, rr, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(110,80,35,.55)';
        for (var dd = 0; dd < 9; dd++) { var da = dd * 2.4, dr = rr * 0.62 * Math.sqrt((dd + 0.5) / 9); ctx.beginPath(); ctx.arc(hx + Math.cos(da) * dr, hy + Math.sin(da) * dr, rr * 0.09, 0, TAU); ctx.fill(); }
        seedPass(true);
        ctx.restore();
      }

      // a single drifting parachute seed (upright, umbrella of fine hairs)
      function drawChute(x, y, sz, rot, a) {
        if (a <= 0.01) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
        // achene
        ctx.fillStyle = '#D8B47A';
        ctx.beginPath(); ctx.ellipse(0, sz * 0.78, sz * 0.06, sz * 0.17, 0, 0, TAU); ctx.fill();
        // beak
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(0.6, sz * 0.025);
        ctx.beginPath(); ctx.moveTo(0, sz * 0.62); ctx.lineTo(0, -sz * 0.2); ctx.stroke();
        // pappus umbrella
        ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = Math.max(0.6, sz * 0.022);
        ctx.beginPath();
        var n = 13, L = sz * 0.62;
        for (var i = 0; i < n; i++) {
          var ha = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.7;
          var ex = Math.cos(ha) * L, ey = -sz * 0.2 + Math.sin(ha) * L * 0.75 + Math.abs(Math.cos(ha)) * L * 0.12;
          ctx.moveTo(0, -sz * 0.2);
          ctx.quadraticCurveTo(Math.cos(ha) * L * 0.55, -sz * 0.2 + Math.sin(ha) * L * 0.55, ex, ey);
        }
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        for (var j = 0; j < n; j += 2) {
          var ja = -Math.PI / 2 + (j / (n - 1) - 0.5) * 2.7;
          ctx.beginPath(); ctx.arc(Math.cos(ja) * L, -sz * 0.2 + Math.sin(ja) * L * 0.75 + Math.abs(Math.cos(ja)) * L * 0.12, Math.max(0.6, sz * 0.03), 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      function drawStar(x, y, r, ci, a, flare) {
        if (a <= 0.01 || r <= 0.2) return;
        var spr = sprites[ci % sprites.length], gs = r * 5.2;
        ctx.globalAlpha = a * 0.8;
        ctx.drawImage(spr, x - gs / 2, y - gs / 2, gs, gs);
        ctx.globalAlpha = a;
        ctx.fillStyle = mixHex(STAR_COLS[ci % STAR_COLS.length], '#FFFFFF', 0.55);
        sparkPath(ctx, x, y, r * (1.3 + (flare || 0)));
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, TAU); ctx.fill();
      }

      function drawWind(wd, t) {
        var q = (t - wd.at * dur) / 620 * wd.speed;
        if (q <= 0 || q >= 1.45) return;
        var pl = plants[wd.pl], G = geo(pl, t);
        var x0 = -0.08 * W, y0 = G.hy + wd.dy * G.R * 1.4;
        var x1 = G.hx - G.R * (0.9 + 0.3 * wd.dy), y1 = G.hy + wd.dy * G.R * 0.6;
        var rc = G.R * wd.loop * 1.8;
        var head = Math.min(q, 1), tail = Math.max(0, q - 0.42);
        var steps = 34, prevX = 0, prevY = 0;
        function pt(s) {
          if (s <= 0.78) {
            var u = s / 0.78;
            return [lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * Math.PI * 1.6 + wd.ph) * G.R * wd.amp * 4 * (1 - u * 0.6)];
          }
          var v = (s - 0.78) / 0.22, ang = v * TAU * 0.9;
          return [x1 + Math.sin(ang) * rc, y1 - (1 - Math.cos(ang)) * rc * (wd.dy > 0 ? -1 : 1)];
        }
        var fadeOut = clamp01((1.45 - q) / 0.45);
        ctx.lineCap = 'round';
        for (var i = 0; i <= steps; i++) {
          var s = lerp(tail, head, i / steps), P = pt(s);
          if (i > 0) {
            var k = i / steps;
            ctx.strokeStyle = hexA(glow, 0.22 * k * fadeOut);
            ctx.lineWidth = (2 + 7 * k) * unit;
            ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(P[0], P[1]); ctx.stroke();
            ctx.strokeStyle = hexA(mixHex(glow, '#FFFFFF', 0.6), 0.75 * k * fadeOut);
            ctx.lineWidth = (0.8 + 2.6 * k) * unit * 1.4;
            ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(P[0], P[1]); ctx.stroke();
            if (i % 7 === 0) {
              var tw = 0.5 + 0.5 * Math.sin(t * 0.02 + i + wd.ph);
              ctx.fillStyle = hexA(i % 14 === 0 ? accent : '#FFFFFF', 0.85 * k * fadeOut * tw);
              sparkPath(ctx, P[0] + Math.sin(i * 1.7) * 8 * unit, P[1] + Math.cos(i * 2.3) * 8 * unit, (3 + 4 * tw) * unit); ctx.fill();
            }
          }
          prevX = P[0]; prevY = P[1];
        }
      }

      function starOutline(C, frac) {
        // full ten-vertex star path, traced up to `frac` of its perimeter (from the top, both ways)
        var pts = [];
        for (var v = 0; v <= 10; v++) { var va = -Math.PI / 2 + v * Math.PI / 5, vr = v % 2 ? 0.42 : 1; pts.push([C.x + Math.cos(va) * vr * C.r, C.y + Math.sin(va) * vr * C.r]); }
        function half(sign) {
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          var f = frac * 5;
          for (var k = 0; k < 5; k++) {
            var a = sign > 0 ? pts[k] : pts[10 - k], b = sign > 0 ? pts[k + 1] : pts[9 - k];
            var u = clamp01(f - k);
            if (u <= 0) break;
            ctx.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u));
          }
          ctx.stroke();
        }
        half(1); half(-1);
        return pts;
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 300);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        for (var i = 0; i < bgStars.length; i++) {
          var b = bgStars[i], k = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t / 1000 * b.rate + b.tw));
          ctx.fillStyle = hexA('#FFFFFF', 0.5 * k * gFade * clamp01(t / 300));
          sparkPath(ctx, b.x * W, b.y * H, b.size * 2 * unit); ctx.fill();
        }

        ctx.save();
        ctx.globalAlpha = gFade;
        // super: the constellation's glow line + pulse (behind the stars)
        if (isSuper) {
          var C = starCenter();
          var lineIn = easeInOut((p - 0.56) / 0.14), lineOut = 1 - clamp01((p - 0.86) / 0.08);
          if (lineIn > 0 && lineOut > 0) {
            var pulse = Math.sin(clamp01((p - 0.7) / 0.16) * Math.PI);
            if (pulse > 0) {
              var fg = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, C.r);
              fg.addColorStop(0, hexA('#FFFFFF', 0.22 * pulse)); fg.addColorStop(0.5, hexA(accent, 0.16 * pulse)); fg.addColorStop(1, hexA(primary, 0.06 * pulse));
              ctx.fillStyle = fg;
              ctx.beginPath();
              for (var v = 0; v < 10; v++) { var va = -Math.PI / 2 + v * Math.PI / 5, vr = (v % 2 ? 0.42 : 1) * C.r; if (v) ctx.lineTo(C.x + Math.cos(va) * vr, C.y + Math.sin(va) * vr); else ctx.moveTo(C.x + Math.cos(va) * vr, C.y + Math.sin(va) * vr); }
              ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = gFade * lineOut;
            ctx.strokeStyle = hexA(accent, 0.28 + 0.25 * pulse); ctx.lineWidth = (7 + 6 * pulse) * unit;
            starOutline(C, lineIn);
            ctx.strokeStyle = hexA('#FFFFFF', 0.75); ctx.lineWidth = 1.8 * unit;
            starOutline(C, lineIn);
            ctx.globalAlpha = gFade;
          }
        }

        // the dandelions
        var plantA = isSuper ? lerp(1, 0.55, clamp01((p - 0.62) / 0.15)) : 1;
        for (var pi = 0; pi < plants.length; pi++) drawPlant(plants[pi], t, gFade * clamp01(t / 160) * plantA);
        ctx.globalAlpha = gFade;
        for (var wi = 0; wi < winds.length; wi++) drawWind(winds[wi], t);

        // the flying seeds → stars
        for (var si = 0; si < seeds.length; si++) {
          var s = seeds[si];
          if (t < s.dt) continue;
          var pl = plants[s.pi];
          if (!s.start) {
            var G = geo(pl, s.dt), d = seedTip(s, G, s.dt, 0);
            s.start = { x: G.hx + d.dx * G.R, y: G.hy + d.dy * G.R };
          }
          var e = clamp01((t - s.dt) / s.fd), ee = easeSine(e);
          var T = targetPx(s), P0 = s.start;
          var c1x = P0.x + s.push * unit * (isSuper ? 0.7 : 1), c1y = lerp(P0.y, T.y, 0.25) - 30 * unit;
          var bx = (1 - ee) * (1 - ee) * P0.x + 2 * (1 - ee) * ee * c1x + ee * ee * T.x;
          var by = (1 - ee) * (1 - ee) * P0.y + 2 * (1 - ee) * ee * c1y + ee * ee * T.y;
          var sa = s.loops * TAU * ee + s.ph, amp = s.amp * unit * Math.sin(Math.PI * e);
          var x = bx + Math.cos(sa) * amp, y = by + Math.sin(sa) * amp * 0.7;
          var after = Math.max(0, t - s.dt - s.fd) / 1000;
          if (!isSuper && after > 0) { y -= after * 10 * unit; x += Math.sin(after * 1.5 + s.ph) * 4 * unit * clamp01(after * 2); }
          var m = clamp01((e - 0.38) / 0.42);
          var sz = 26 * unit * s.size * lerp(1, 0.7, m) * clamp01(0.55 + e * 3);
          var rot = Math.sin(e * Math.PI * 3 + s.ph) * 0.35 + (1 - e) * 0.25;
          ctx.globalAlpha = gFade;
          drawChute(x, y, sz, rot, 1 - m);
          // star
          var tw = 0.72 + 0.38 * Math.sin(t / 1000 * s.rate + s.ph);
          var r = (isSuper ? 6.5 : 8) * unit * s.size * easeOutBack(m) * tw;
          if (!isSuper) { var wv = (p - 0.7) / 0.2 - s.tx * 0.5; if (wv > 0 && wv < 0.5) r *= 1 + 0.7 * Math.sin(wv / 0.5 * Math.PI); }
          var sa2 = m, flare = 0;
          if (isSuper) {
            var outAt = 0.84 + 0.09 * s.ord, oq = (p - outAt) / 0.07;
            if (oq > 0) {
              flare = Math.sin(clamp01(oq) * Math.PI) * 1.4;
              sa2 *= 1 - clamp01(oq);
              if (oq < 1) {     // tiny expanding twinkle ring
                ctx.globalAlpha = gFade * (1 - oq) * 0.6;
                ctx.strokeStyle = STAR_COLS[s.col]; ctx.lineWidth = 1.2 * unit;
                ctx.beginPath(); ctx.arc(x, y, r * (1 + oq * 3.5), 0, TAU); ctx.stroke();
              }
            } else {
              var pls = Math.sin(clamp01((p - 0.7) / 0.16) * Math.PI);
              r *= 1 + 0.25 * pls;
            }
          }
          drawStar(x, y, r, s.col, gFade * sa2, flare);
          ctx.globalAlpha = gFade;
        }

        // super finale: a soft burst in the heart of the constellation
        if (isSuper) {
          var C2 = starCenter(), bq = (p - 0.83) / 0.12;
          if (bq > 0 && bq < 1) {
            var ba = Math.sin(bq * Math.PI);
            ctx.globalAlpha = gFade * ba;
            var gs = C2.r * (0.6 + bq * 0.8);
            ctx.drawImage(sprites[1], C2.x - gs, C2.y - gs, gs * 2, gs * 2);
            for (var rk = 0; rk < 10; rk++) {
              var ra = rk / 10 * TAU + 0.3, rd = C2.r * (0.2 + bq * 0.9);
              ctx.fillStyle = rk % 2 ? accent : '#FFFFFF';
              sparkPath(ctx, C2.x + Math.cos(ra) * rd, C2.y + Math.sin(ra) * rd, (9 - 5 * bq) * unit); ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        var tp = clamp01((t - txtAt) / 340);
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
