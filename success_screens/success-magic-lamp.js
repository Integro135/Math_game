/* success-magic-lamp.js — מסך הצלחה: מְנוֹרַת קֶסֶם 🪔
   מנורת קסם זהובה מתנדנדת כאילו מישהי שפשפה אותה, ומהפיה שלה מתפתל עשן
   סגול-קסום בספירלה למעלה — ובראשו נוצר כוכב זוהר גדול. בסופר: העשן יוצר
   שלושה כוכבים ומפזר נצנצים בכל צבעי הקשת.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF). קריא מעל הכיסוי הכהה של המארח. */
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

  window.SUCCESS.styles.push({
    name: 'magic-lamp',
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
      var praise  = opts.praise || 'מִשְׁאָלָה הִתְגַּשְּׁמָה!';

      var W = root.clientWidth || window.innerWidth || 342;
      var H = root.clientHeight || window.innerHeight || 455;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(W * DPR));
      cv.height = Math.max(1, Math.round(H * DPR));
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;

      // twinkling backdrop stars (shared by every scene)
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 40 : 26); bs++)
        bgStars.push({ x: Math.random() * W, y: Math.random() * H, tw: Math.random() * TAU,
                       rate: 2 + Math.random() * 4, size: (0.8 + Math.random() * 1.6) * unit,
                       color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });
      function drawBgStars(t, a) {
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.75 * k * a);
          sparkPath(ctx, s.x, s.y, s.size * 2.2); ctx.fill();
        }
      }

      var t = 0, p = 0, gFade = 1;                   // per-frame values — shared with scene helpers
      // ═══ SCENE ═══
      var lx = W * 0.46, ly = H * 0.8, LS = Math.min(W, H) * 0.14;
      var gold = mixHex(accent, '#FFD54F', 0.5), goldD = mixHex(gold, '#7A4A10', 0.45), goldL = mixHex(gold, '#FFFFFF', 0.45);
      var tipX = lx + LS * 1.75, tipY = ly - LS * 0.6;
      var targets = isSuper ? [[W * 0.5, H * 0.42], [W * 0.3, H * 0.5], [W * 0.7, H * 0.5]] : [[W * 0.52, H * 0.44]];
      var smoke = [];
      for (var i = 0; i < (isSuper ? 70 : 44); i++) {
        var tg = targets[i % targets.length];
        smoke.push({ born: 0.18 + i / (isSuper ? 70 : 44) * 0.36, tx: tg[0], ty: tg[1], ph: Math.random() * TAU, r: rnd(12, 26) * unit,
                     col: i % 3 === 0 ? glow : i % 3 === 1 ? primary : mixHex(primary, '#FFFFFF', 0.4) });
      }
      var RAINBOW = ['#FF7EB3', '#FFB86B', '#FFE66D', '#8EE59B', '#7DC4FF', '#C77DFF'];
      var glits = [];
      for (var i = 0; i < (isSuper ? 36 : 16); i++) glits.push({ a: Math.random() * TAU, sp: rnd(0.4, 1), s: rnd(4, 9) * unit, col: isSuper ? RAINBOW[i % 6] : (i % 2 ? accent : '#FFFFFF'), k: i % targets.length });
      function lamp(wig) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(wig);
        ctx.fillStyle = goldD; ctx.beginPath(); ctx.ellipse(0, LS * 0.55, LS * 0.55, LS * 0.14, 0, 0, TAU); ctx.fill();          // foot
        ctx.fillRect(-LS * 0.18, LS * 0.3, LS * 0.36, LS * 0.25);
        ctx.strokeStyle = gold; ctx.lineWidth = LS * 0.14;                                                                       // handle
        ctx.beginPath(); ctx.arc(-LS * 1.05, -LS * 0.05, LS * 0.35, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = gold;                                                                                                   // spout
        ctx.beginPath(); ctx.moveTo(LS * 0.6, -LS * 0.2); ctx.quadraticCurveTo(LS * 1.3, -LS * 0.1, LS * 1.75, -LS * 0.6);
        ctx.lineTo(LS * 1.85, -LS * 0.5); ctx.quadraticCurveTo(LS * 1.3, LS * 0.25, LS * 0.6, LS * 0.2); ctx.closePath(); ctx.fill();
        var bg = ctx.createLinearGradient(0, -LS * 0.5, 0, LS * 0.4);                                                           // body
        bg.addColorStop(0, goldL); bg.addColorStop(0.5, gold); bg.addColorStop(1, goldD);
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, LS * 1.05, LS * 0.46, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(0, -LS * 0.38, LS * 0.36, Math.PI, TAU); ctx.fill();                      // lid
        ctx.fillStyle = goldL; ctx.beginPath(); ctx.arc(0, -LS * 0.78, LS * 0.1, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA('#FFFFFF', 0.5); ctx.lineWidth = LS * 0.05;
        ctx.beginPath(); ctx.ellipse(-LS * 0.35, -LS * 0.12, LS * 0.3, LS * 0.1, -0.3, Math.PI, TAU); ctx.stroke();
        ctx.fillStyle = hexA(primary, 1); heartPath(ctx, LS * 0.1, LS * 0.05, LS * 0.13); ctx.fill();                          // a little jewel
        ctx.restore();
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.4)';
      root.appendChild(txt);
      var txtAt = dur * 0.4;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 9%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.4)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        t = now - t0;
        p = clamp01(t / dur);
        gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        drawBgStars(t, gFade);
        ctx.save();
        var inA = easeOutBack(clamp01(p / 0.12));
        var wig = p < 0.22 ? Math.sin(t * 0.04) * 0.09 * clamp01(p / 0.05) : 0;
        ctx.globalAlpha = gFade;
        ctx.save(); ctx.translate(lx, ly); ctx.scale(inA, inA); ctx.translate(-lx, -ly); lamp(wig); ctx.restore();
        // the smoke: each puff spirals from the spout up to its star
        for (var i = 0; i < smoke.length; i++) {
          var sm = smoke[i], q = clamp01((p - sm.born) / 0.3); if (q <= 0) continue;
          var e = easeInOut(q);
          var x = tipX + (sm.tx - tipX) * e + Math.sin(e * TAU * 1.2 + sm.ph) * 40 * unit * (1 - e);
          var y = tipY + (sm.ty - tipY) * e;
          var a = 0.34 * (q < 0.85 ? 1 : (1 - q) / 0.15);
          ctx.fillStyle = hexA(sm.col, a); ctx.beginPath(); ctx.arc(x, y, sm.r * (0.5 + e), 0, TAU); ctx.fill();
        }
        // the star(s) the smoke becomes
        for (var k = 0; k < targets.length; k++) {
          var sg = clamp01((p - 0.48 - k * 0.05) / 0.12); if (sg <= 0) continue;
          var sx = targets[k][0], sy = targets[k][1], R = (k ? 44 : 66) * unit * easeOutBack(sg) * (1 + 0.05 * Math.sin(t * 0.008));
          var hl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 2.4);
          hl.addColorStop(0, hexA(accent, 0.5)); hl.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(sx, sy, R * 2.4, 0, TAU); ctx.fill();
          ctx.fillStyle = accent; starPath(ctx, sx, sy, R, R * 0.45, t * 0.0008); ctx.fill();
          ctx.fillStyle = hexA('#FFFFFF', 0.55); starPath(ctx, sx - R * 0.14, sy - R * 0.14, R * 0.36, R * 0.16, t * 0.0008); ctx.fill();
          var gp = clamp01((p - 0.55 - k * 0.05) / 0.4);
          for (var i = 0; i < glits.length; i++) {
            var gl = glits[i]; if (gl.k !== k || gp <= 0) continue;
            var d = easeOut(gp) * 150 * unit * gl.sp;
            ctx.fillStyle = hexA(gl.col, 1 - gp); sparkPath(ctx, sx + Math.cos(gl.a) * d, sy + Math.sin(gl.a) * d, gl.s); ctx.fill();
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
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
