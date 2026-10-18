/* success-lighthouse-beam.js — מסך הצלחה: מִגְדַּלּוֹר 🗼
   מגדלור קטן ומחייך עם פסים בצבעי הסקין עומד על אי סלעים בין הגלים. המנורה
   נדלקת ואלומת אור רכה סורקת את שמי הלילה — וכל כוכב ולב שהאלומה נוגעת בו
   נדלק ומנצנץ. בסוף האלומה מצביעה למעלה והשבח זוהר. בסופר: שתי סריקות
   מלאות, סירת מפרש קטנה שטה על הגלים ופרץ נצנצים מהמנורה.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
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
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

  window.SUCCESS.styles.push({
    name: 'lighthouse-beam',
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

      var LIGHT = mixHex(accent, '#FFF6D0', 0.45);
      var STRIPE = primary, WHITE = '#FFF6EE', ROOF = mixHex(primary, '#2A1840', 0.35);
      var ROCK = mixHex(glow, '#2E2A44', 0.8);

      // faint background stars (normalised)
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 20); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.75, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.6 + Math.random() * 1.2 });
      // targets that LIGHT UP when the beam sweeps over them
      var targets = [];
      var nT = isSuper ? 30 : 20;
      for (var i = 0; i < nT; i++)
        targets.push({ nx: 0.05 + 0.9 * ((i + Math.random() * 0.8) / nT), ny: Math.random(), lit: -1,
                       kind: i % 3 === 1 ? 'heart' : 'star', r: rnd(11, 19),
                       col: [accent, '#FFFFFF', primary, '#FF8FC8', glow][i % 5], tw: Math.random() * TAU });
      // super: sparkle burst out of the lamp near the end
      var burst = [];
      if (isSuper) for (var b = 0; b < 44; b++) {
        var ba = rnd(0, TAU), bsp = rnd(220, 520);
        burst.push({ vx: Math.cos(ba) * bsp, vy: Math.sin(ba) * bsp, r: rnd(6, 13), col: [accent, '#FFFFFF', primary, glow][b % 4], kind: b % 3 ? 'spark' : 'star' });
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.42;
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

      // beam direction over time (canvas radians: -PI = left, -PI/2 = up, 0 = right)
      var A0 = -Math.PI + 0.2, A1 = -0.2, UP = -Math.PI / 2;
      function beamAng(p) {
        if (!isSuper) {
          if (p < 0.12) return A0;
          if (p < 0.6) return A0 + (A1 - A0) * easeInOut((p - 0.12) / 0.48);
          return A1 + (UP - A1) * easeInOut((p - 0.6) / 0.18);
        }
        if (p < 0.1) return A0;
        if (p < 0.4) return A0 + (A1 - A0) * easeInOut((p - 0.1) / 0.3);
        if (p < 0.68) return A1 + (A0 - A1) * easeInOut((p - 0.4) / 0.28);
        return A0 + (UP - A0) * easeInOut((p - 0.68) / 0.14);
      }

      function waves(wy, t) {
        for (var k = 0; k < 3; k++) {
          var yy = wy + k * 14 * unit, amp = (6 - k * 1.5) * unit, ph = t * (0.002 + k * 0.0007) + k * 1.7;
          var wg = ctx.createLinearGradient(0, yy - amp, 0, H);
          wg.addColorStop(0, hexA(mixHex(glow, '#1C3F8C', 0.3 + k * 0.2), 0.62 - k * 0.1));
          wg.addColorStop(1, hexA(mixHex(glow, '#0B1E4A', 0.6), 0.14));
          ctx.fillStyle = wg;
          ctx.beginPath(); ctx.moveTo(0, H);
          for (var xx = 0; xx <= W + 20; xx += 20) ctx.lineTo(xx, yy + Math.sin(xx * 0.018 + ph) * amp);
          ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
          if (k === 0) {
            ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.5 * unit; ctx.beginPath();
            for (var x2 = 0; x2 <= W + 20; x2 += 20) { var y2 = yy + Math.sin(x2 * 0.018 + ph) * amp; if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
            ctx.stroke();
          }
        }
      }

      function lighthouse(cx, baseY, S, lampOn, t) {
        var towerH = 3.3 * S, topY = baseY - towerH;
        var bw = 0.62 * S, tw = 0.42 * S;
        // tower body (clip → stripes)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - bw, baseY); ctx.lineTo(cx - tw, topY); ctx.lineTo(cx + tw, topY); ctx.lineTo(cx + bw, baseY); ctx.closePath();
        ctx.clip();
        ctx.fillStyle = WHITE; ctx.fillRect(cx - bw, topY, bw * 2, towerH);
        var bh = towerH / 5;
        ctx.fillStyle = STRIPE;
        for (var s = 1; s < 5; s += 2) ctx.fillRect(cx - bw, topY + s * bh, bw * 2, bh);
        ctx.fillStyle = 'rgba(40,20,60,.14)'; ctx.fillRect(cx + S * 0.16, topY, bw, towerH);
        ctx.restore();
        // little lit windows on the coloured stripes
        ctx.fillStyle = hexA('#FFE9A0', 0.55 + 0.45 * lampOn);
        [1, 3].forEach(function (s) {
          var wx = cx - S * 0.1, wy = topY + (s + 0.5) * bh;
          ctx.beginPath(); ctx.moveTo(wx - S * 0.09, wy + S * 0.14); ctx.lineTo(wx - S * 0.09, wy - S * 0.04);
          ctx.arc(wx, wy - S * 0.04, S * 0.09, Math.PI, 0); ctx.lineTo(wx + S * 0.09, wy + S * 0.14); ctx.closePath(); ctx.fill();
        });
        // door
        ctx.fillStyle = ROOF;
        ctx.beginPath(); ctx.moveTo(cx - S * 0.17, baseY); ctx.lineTo(cx - S * 0.17, baseY - S * 0.3);
        ctx.arc(cx, baseY - S * 0.3, S * 0.17, Math.PI, 0); ctx.lineTo(cx + S * 0.17, baseY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx + S * 0.09, baseY - S * 0.2, S * 0.03, 0, TAU); ctx.fill();
        // a friendly face on the middle white stripe
        var fy = topY + 2.5 * bh, blink = (t % 1700) < 110;
        ctx.fillStyle = '#2A1E3A';
        [-1, 1].forEach(function (d) {
          if (blink) { ctx.fillRect(cx + d * S * 0.17 - S * 0.06, fy - S * 0.07, S * 0.12, S * 0.025); return; }
          ctx.beginPath(); ctx.ellipse(cx + d * S * 0.17, fy - S * 0.07, S * 0.055, S * 0.075, 0, 0, TAU); ctx.fill();
        });
        if (!blink) {
          ctx.fillStyle = '#FFFFFF';
          [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.arc(cx + d * S * 0.17 + S * 0.02, fy - S * 0.1, S * 0.02, 0, TAU); ctx.fill(); });
          ctx.fillStyle = '#2A1E3A';
        }
        ctx.beginPath(); ctx.moveTo(cx - S * 0.11, fy + S * 0.04);
        ctx.quadraticCurveTo(cx, fy + S * 0.2, cx + S * 0.11, fy + S * 0.04); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6'; ctx.beginPath(); ctx.ellipse(cx, fy + S * 0.1, S * 0.045, S * 0.025, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,130,170,.55)';
        [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.ellipse(cx + d * S * 0.29, fy + S * 0.03, S * 0.07, S * 0.04, 0, 0, TAU); ctx.fill(); });
        // gallery + railing
        ctx.fillStyle = ROOF;
        ctx.fillRect(cx - S * 0.58, topY - S * 0.08, S * 1.16, S * 0.13);
        ctx.strokeStyle = ROOF; ctx.lineWidth = Math.max(1.5, S * 0.035);
        ctx.beginPath(); ctx.moveTo(cx - S * 0.55, topY - S * 0.3); ctx.lineTo(cx + S * 0.55, topY - S * 0.3); ctx.stroke();
        for (var r = -2; r <= 2; r++) { ctx.beginPath(); ctx.moveTo(cx + r * S * 0.26, topY - S * 0.08); ctx.lineTo(cx + r * S * 0.26, topY - S * 0.3); ctx.stroke(); }
        // lamp room (glass) + lamp
        var lrTop = topY - S * 0.78;
        ctx.fillStyle = hexA(LIGHT, 0.25 + 0.6 * lampOn);
        ctx.fillRect(cx - S * 0.34, lrTop, S * 0.68, S * 0.7);
        var lx = cx, ly = topY - S * 0.42;
        if (lampOn > 0) {
          var hg = ctx.createRadialGradient(lx, ly, 0, lx, ly, S * 1.3);
          hg.addColorStop(0, hexA(LIGHT, 0.55 * lampOn)); hg.addColorStop(1, hexA(LIGHT, 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lx, ly, S * 1.3, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = mixHex('#8C7A5A', '#FFFFFF', lampOn);
        ctx.beginPath(); ctx.arc(lx, ly, S * 0.17 * (1 + 0.08 * lampOn * Math.sin(t * 0.012)), 0, TAU); ctx.fill();
        ctx.strokeStyle = ROOF; ctx.lineWidth = Math.max(1.5, S * 0.04);
        ctx.strokeRect(cx - S * 0.34, lrTop, S * 0.68, S * 0.7);
        ctx.beginPath(); ctx.moveTo(cx - S * 0.12, lrTop); ctx.lineTo(cx - S * 0.12, lrTop + S * 0.7);
        ctx.moveTo(cx + S * 0.12, lrTop); ctx.lineTo(cx + S * 0.12, lrTop + S * 0.7); ctx.stroke();
        // roof + knob
        ctx.fillStyle = ROOF;
        ctx.beginPath(); ctx.moveTo(cx - S * 0.5, lrTop + S * 0.02); ctx.quadraticCurveTo(cx - S * 0.1, lrTop - S * 0.3, cx, lrTop - S * 0.55);
        ctx.quadraticCurveTo(cx + S * 0.1, lrTop - S * 0.3, cx + S * 0.5, lrTop + S * 0.02); ctx.closePath(); ctx.fill();
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, lrTop - S * 0.58, S * 0.09, 0, TAU); ctx.fill();
        return { lx: lx, ly: ly };
      }
      function rocks(cx, y, S) {
        var R = [[-1.35, 0.32, 0.5], [-0.75, 0.12, 0.62], [0, 0.05, 0.78], [0.8, 0.14, 0.6], [1.4, 0.34, 0.45]];
        ctx.fillStyle = ROCK;
        R.forEach(function (q) { ctx.beginPath(); ctx.arc(cx + q[0] * S, y + q[1] * S + S * 0.3, q[2] * S, 0, TAU); ctx.fill(); });
        ctx.strokeStyle = hexA(glow, 0.35); ctx.lineWidth = Math.max(1.5, S * 0.05);
        R.forEach(function (q) { ctx.beginPath(); ctx.arc(cx + q[0] * S, y + q[1] * S + S * 0.3, q[2] * S * 0.86, -2.4, -1.2); ctx.stroke(); });
      }
      function sailboat(x, y, S, t) {
        var tilt = Math.sin(t * 0.004) * 0.08;
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
        ctx.fillStyle = mixHex(primary, '#3A1E3A', 0.3);
        ctx.beginPath(); ctx.moveTo(-S * 0.6, -S * 0.05); ctx.lineTo(S * 0.6, -S * 0.05); ctx.lineTo(S * 0.42, S * 0.22); ctx.lineTo(-S * 0.42, S * 0.22); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#F2E6D8'; ctx.lineWidth = Math.max(1.5, S * 0.05);
        ctx.beginPath(); ctx.moveTo(0, -S * 0.05); ctx.lineTo(0, -S * 1.0); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(S * 0.04, -S * 0.95); ctx.lineTo(S * 0.52, -S * 0.15); ctx.lineTo(S * 0.04, -S * 0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.moveTo(-S * 0.04, -S * 0.8); ctx.lineTo(-S * 0.38, -S * 0.15); ctx.lineTo(-S * 0.04, -S * 0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6';
        ctx.beginPath(); ctx.moveTo(0, -S * 1.0); ctx.lineTo(S * 0.22, -S * 0.93); ctx.lineTo(0, -S * 0.86); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.save();
        ctx.globalAlpha = gFade;
        var S = Math.min(W * 0.17, H * 0.11);
        var cx = W * 0.5, waterY = H * 0.87, baseY = waterY - S * 0.18;
        var lampOn = clamp01((p - 0.03) / 0.08);
        var lx = cx, ly = baseY - 3.3 * S - S * 0.42;
        // faint stars
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * k).toFixed(3) + ')';
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2 * unit); ctx.fill();
        }
        // the beam — two translucent wedges (wide soft + narrow core)
        var ang = beamAng(p), beamA = clamp01((p - 0.08) / 0.06), hw = 0.13;
        if (beamA > 0) {
          var L = Math.sqrt(W * W + H * H);
          ctx.save(); ctx.translate(lx, ly); ctx.rotate(ang);
          var bg = ctx.createLinearGradient(0, 0, L * 0.9, 0);
          bg.addColorStop(0, hexA(LIGHT, 0.5 * beamA)); bg.addColorStop(1, hexA(LIGHT, 0));
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.moveTo(0, -S * 0.14); ctx.lineTo(L, -L * Math.tan(hw)); ctx.lineTo(L, L * Math.tan(hw)); ctx.lineTo(0, S * 0.14); ctx.closePath(); ctx.fill();
          var cg = ctx.createLinearGradient(0, 0, L * 0.7, 0);
          cg.addColorStop(0, 'rgba(255,255,255,' + (0.4 * beamA).toFixed(3) + ')'); cg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.moveTo(0, -S * 0.06); ctx.lineTo(L, -L * Math.tan(hw * 0.35)); ctx.lineTo(L, L * Math.tan(hw * 0.35)); ctx.lineTo(0, S * 0.06); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        // targets: dim until the beam finds them, then pop + twinkle
        var skyBot = ly - S * 0.9;
        for (var j = 0; j < targets.length; j++) {
          var tg = targets[j], tx = tg.nx * W, dc = Math.abs(tg.nx - 0.5);
          var yTop = dc < 0.27 ? H * 0.28 : H * 0.05, yBot = dc < 0.13 ? skyBot : H * 0.7;
          if (yBot < yTop + 10) yBot = yTop + 10;
          var ty = yTop + tg.ny * (yBot - yTop);
          if (tg.lit < 0 && beamA > 0.5 && Math.abs(angDiff(Math.atan2(ty - ly, tx - lx), ang)) < hw * 1.1) tg.lit = t;
          var rr = tg.r * unit * 1.3;
          if (tg.lit < 0) {
            ctx.fillStyle = 'rgba(255,255,255,.22)';
            ctx.beginPath(); ctx.arc(tx, ty, rr * 0.18, 0, TAU); ctx.fill();
            continue;
          }
          var lt = (t - tg.lit), q = clamp01(lt / 340), sc = easeOutBack(q) * (0.85 + 0.15 * Math.sin(t * 0.008 + tg.tw));
          if (lt < 500) {   // a little flash ring as it lights
            ctx.strokeStyle = hexA(tg.col, 0.8 * (1 - lt / 500)); ctx.lineWidth = 2 * unit;
            ctx.beginPath(); ctx.arc(tx, ty, rr * (0.6 + lt / 260), 0, TAU); ctx.stroke();
          }
          ctx.fillStyle = tg.col;
          if (tg.kind === 'star') starPath(ctx, tx, ty, rr * sc, rr * sc * 0.45, Math.sin(t * 0.002 + tg.tw) * 0.2);
          else heartPath(ctx, tx, ty, rr * sc * 0.75);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.6)';
          ctx.beginPath(); ctx.arc(tx - rr * 0.22 * sc, ty - rr * 0.25 * sc, rr * 0.13 * sc, 0, TAU); ctx.fill();
        }
        // islet, lighthouse, (super) sailboat, waves
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, waterY + 3 * unit); ctx.clip();
        rocks(cx, baseY, S);
        ctx.restore();
        lighthouse(cx, baseY, S, lampOn, t);
        if (isSuper) {
          var bq = clamp01((p - 0.12) / 0.88);
          var bx = W + S * 1.2 - bq * (W + S * 2.6), by = waterY + 2 * unit + Math.sin(t * 0.005) * 3 * unit;
          sailboat(bx, by, S * 0.8, t);
        }
        waves(waterY, t);
        // super: sparkle burst from the lamp as the beam points up
        if (isSuper) {
          var bt = (t - dur * 0.8) / 1000;
          if (bt > 0) for (var m = 0; m < burst.length; m++) {
            var pt = burst[m], px = lx + pt.vx * unit * bt, py = ly + pt.vy * unit * bt + 0.5 * 500 * unit * bt * bt;
            var fa = clamp01(1 - bt / 0.9); if (fa <= 0) continue;
            ctx.fillStyle = hexA(pt.col, fa);
            if (pt.kind === 'star') starPath(ctx, px, py, pt.r * unit * 1.3, pt.r * unit * 0.6, bt * 4); else sparkPath(ctx, px, py, pt.r * unit * 1.3);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        var tp = clamp01((t - txtAt) / 320);
        var glowUp = clamp01((p - (isSuper ? 0.8 : 0.76)) / 0.08);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004) + 0.05 * glowUp) : 0) + ')';
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
