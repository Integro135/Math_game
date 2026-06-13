/* success-electric-orb.js — מסך הצלחה: כדור חשמל
   כדור אנרגיה נטען במרכז — גדל, פועם, וקשתות חשמל מתפצחות סביבו —
   ואז משתחרר: טבעת חשמל מתרחבת, ברקים רדיאליים לכל הכיוונים וגשם
   ניצוצות. בסופר: פריקה כפולה ויותר ברקים. שונה מסופת הברקים:
   שם המכות יורדות מהשמיים, כאן האנרגיה נטענת ומשתחררת מהמרכז.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function genBolt(x1, y1, x2, y2, disp, out) {
    if (disp < 7) { out.push(x1, y1, x2, y2); return; }
    var mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    var my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp;
    genBolt(x1, y1, mx, my, disp * 0.55, out);
    genBolt(mx, my, x2, y2, disp * 0.55, out);
  }

  window.SUCCESS.styles.push({
    name: 'electric-orb',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      var praise  = opts.praise || 'אֵיזֶה כֹּחַ!';

      var W = root.clientWidth || window.innerWidth;
      var H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);

      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var cx = W / 2, cy = H * 0.40;
      var unit = Math.min(W, H) / 800;
      var maxR = Math.min(W, H) * (isSuper ? 0.46 : 0.38);
      var tD = dur * 0.42;                                     // רגע הפריקה
      var discharges = isSuper ? [tD, tD + 700] : [tD];

      // ─── ברקים רדיאליים לכל פריקה ───
      var radials = [];
      for (var di = 0; di < discharges.length; di++) {
        var NB = (isSuper ? 13 : 8) - di * 4;
        var bolts = [];
        for (var bi = 0; bi < NB; bi++) {
          var ang = (bi / NB) * 6.2832 + Math.random() * 0.5;
          var len = maxR * (0.65 + Math.random() * 0.45) * (di ? 0.6 : 1);
          var segs = [];
          genBolt(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len, len * 0.3, segs);
          bolts.push(segs);
        }
        radials.push({ at: discharges[di], bolts: bolts, scale: di ? 0.6 : 1 });
      }

      // ניצוצות פריקה
      var sparks = [];
      var NS = isSuper ? 64 : 40;
      for (var si = 0; si < NS; si++) {
        var sang = Math.random() * 6.2832;
        sparks.push({
          ca: Math.cos(sang), sa: Math.sin(sang),
          speed: 0.25 + Math.pow(Math.random(), 1.5) * 0.75,
          life: dur * 0.45 * (0.6 + Math.random() * 0.4),
          r: (0.9 + Math.random() * 1.8) * unit,
          color: si % 3 === 0 ? accent : si % 3 === 1 ? glow : '#FFFFFF'
        });
      }

      // קשתות התפצחות סביב הכדור (נוצרות תוך כדי, נשמרות עם born)
      var crackles = [];

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:67%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = tD + 100;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:79%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      function drawSegs(segs, alpha, coreW) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = hexA(glow, 0.30 * alpha);
        ctx.lineWidth = coreW * 3.5;
        ctx.beginPath();
        for (var k = 0; k < segs.length; k += 4) {
          ctx.moveTo(segs[k], segs[k + 1]);
          ctx.lineTo(segs[k + 2], segs[k + 3]);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(245,250,255,' + 0.95 * alpha + ')';
        ctx.lineWidth = coreW;
        ctx.beginPath();
        for (var m = 0; m < segs.length; m += 4) {
          ctx.moveTo(segs[m], segs[m + 1]);
          ctx.lineTo(segs[m + 2], segs[m + 3]);
        }
        ctx.stroke();
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        var charge = clamp01(t / tD);
        var orbR = (8 + 18 * charge) * unit *
                   (t < tD ? 1 + 0.10 * charge * Math.sin(t * 0.02 * (1 + 2 * charge))
                           : 0.65 + 0.08 * Math.sin(t * 0.015));

        // קשתות התפצחות — נוצרות בקצב שעולה עם הטעינה, וגם קצת אחרי הפריקה
        var rate = t < tD ? 0.10 + 0.40 * charge : 0.12;
        if (Math.random() < rate && crackles.length < 10) {
          var ca = Math.random() * 6.2832;
          var cb = ca + (Math.random() - 0.5) * 1.4;
          var r1 = orbR * 1.1, r2 = orbR * (2.0 + Math.random() * 1.2);
          var csegs = [];
          genBolt(cx + Math.cos(ca) * r1, cy + Math.sin(ca) * r1,
                  cx + Math.cos(cb) * r2, cy + Math.sin(cb) * r2,
                  18 * unit, csegs);
          crackles.push({ segs: csegs, born: t, life: 110 + Math.random() * 80 });
        }
        for (var ci = crackles.length - 1; ci >= 0; ci--) {
          var cr = crackles[ci];
          var cq = (t - cr.born) / cr.life;
          if (cq >= 1) { crackles.splice(ci, 1); continue; }
          drawSegs(cr.segs, (1 - cq) * 0.8 * gFade, 1.1);
        }

        // הכדור עצמו
        var og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 5);
        og.addColorStop(0, 'rgba(255,255,255,' + (0.55 + 0.40 * charge) * gFade + ')');
        og.addColorStop(0.3, hexA(glow, (0.30 + 0.35 * charge) * gFade));
        og.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(cx, cy, orbR * 5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + 0.95 * gFade + ')';
        ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, 6.2832); ctx.fill();

        // ─── פריקות ───
        for (var ri = 0; ri < radials.length; ri++) {
          var rd = radials[ri];
          var te = t - rd.at;
          if (te < 0) continue;

          // ברקים רדיאליים (חיים 400ms)
          if (te <= 400) {
            var ra = Math.pow(1 - te / 400, 1.3) * (0.75 + 0.25 * Math.sin(te * 0.09)) * gFade;
            for (var rb = 0; rb < rd.bolts.length; rb++) drawSegs(rd.bolts[rb], ra, 1.5);
          }
          // טבעת חשמל מתרחבת
          var rq = clamp01(te / (dur * 0.5));
          if (rq < 1) {
            var rr = maxR * 1.15 * rd.scale * easeOutCubic(rq);
            var rga = (1 - rq) * gFade;
            ctx.strokeStyle = hexA(glow, 0.25 * rga);
            ctx.lineWidth = (10 * (1 - rq) + 3) * unit;
            ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.stroke();
            ctx.strokeStyle = 'rgba(245,250,255,' + 0.7 * rga + ')';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.stroke();
          }
          // הבזק רך
          var fa = (ri ? 0.18 : 0.32) * Math.exp(-te / 160) * gFade;
          if (fa > 0.01) {
            var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
            fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')');
            fg.addColorStop(0.4, hexA(glow, fa * 0.5));
            fg.addColorStop(1, hexA(glow, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
          }
        }

        // ניצוצות הפריקה הראשונה
        var teS = t - tD;
        if (teS > 0) {
          for (var pi = 0; pi < sparks.length; pi++) {
            var sp = sparks[pi];
            var sq = clamp01(teS / sp.life);
            if (sq >= 1) continue;
            var sd = sp.speed * maxR * easeOutCubic(sq);
            ctx.fillStyle = hexA(sp.color, (1 - sq) * 0.9 * gFade);
            ctx.beginPath();
            ctx.arc(cx + sp.ca * sd, cy + sp.sa * sd, sp.r * (1 - sq * 0.5), 0, 6.2832);
            ctx.fill();
          }
        }

        // ─── טקסט ───
        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * gFade);
        }

        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        if (killed) return;
        killed = true;
        cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
