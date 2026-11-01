/* success-pinata-burst.js — מסך הצלחה: פִּינְיָאטָה 🎉
   פיניאטת כוכב צבעונית (חמש קרניים מנייר קרפ מצויץ, גדילים מתנופפים בקצוות,
   ופרצוף חמוד באמצע — מבט קדימה: שתי עיניים) יורדת על חבל ומתנדנדת. ניצוץ
   קסם קטן עף אליה ועושה לה "בּוּפּ" — היא מתנודדת ומצחקקת (פה פתוח אמיתי),
   רועדת מהתרגשות — ונפתחת בפיצוץ שמח: הקרניים עפות לצדדים ומשתחררים
   סוכריות עטופות, סוכריות על מקל, לבבות, סרטים מתפתלים וקונפטי שנופלים
   בכוח המשיכה — והשבח מופיע. בלי מקל ובלי מכות — רק בּוּפּ.
   בסופר: פיניאטת חמור (מבט צד: עין אחת, אוזניים ארוכות, רעמה וזנב גדילים)
   מקבלת שני בּוּפּים ומתפוצצת בפיצוץ גדול יותר — הרבה סוכריות עטופות,
   סרטים ארוכים שמתפרשים, ומטר קונפטי שממשיך לרדת מלמעלה.
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
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
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
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function heartPath(ctx, r) {         // centred heart, ~2r wide
    ctx.beginPath(); ctx.moveTo(0, r * 0.85);
    ctx.bezierCurveTo(-r * 1.25, -r * 0.05, -r * 0.65, -r * 1.05, 0, -r * 0.42);
    ctx.bezierCurveTo(r * 0.65, -r * 1.05, r * 1.25, -r * 0.05, 0, r * 0.85); ctx.closePath();
  }

  var CANDY = ['#FF4F7B', '#FFB13B', '#FFE14D', '#5BD66B', '#4FB8FF', '#A77BFF', '#FF7BD5', '#4FE0C8'];
  var CONE = [['#FF5FA2', '#FFD23F'], ['#FFD23F', '#4FC3F7'], ['#4FC3F7', '#7BE07B'], ['#7BE07B', '#B57BFF'], ['#B57BFF', '#FF5FA2']];
  var RAINBOW = ['#FF5F7E', '#FF9F43', '#FFD93F', '#6BDB6B', '#4FB8FF', '#A77BFF'];

  window.SUCCESS.styles.push({
    name: 'pinata-burst',
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
      var candyCols = CANDY.concat([accent, primary]);

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

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { drop: 0.1, boops: [0.17, 0.29], fly: 0.085, tremble: [0.35, 0.42], burst: 0.42, rain: [0.5, 0.86] }
        : { drop: 0.14, boops: [0.26], fly: 0.13, tremble: [0.35, 0.42], burst: 0.42, rain: null };
      function ms(f) { return f * dur; }
      var tBurst = ms(T.burst);

      // ─── particles (positions are analytic: drag k + gravity g, units of s) ───
      var candies = [], NC = isSuper ? 30 : 16;
      for (var c0 = 0; c0 < NC; c0++) {
        var kind = isSuper ? (c0 % 5 < 3 ? 'wrap' : c0 % 5 === 3 ? 'lolli' : 'heart') : ['wrap', 'lolli', 'heart'][c0 % 3];
        var ca = -Math.PI / 2 + rnd(-1.7, 1.7);
        candies.push({ kind: kind, a: ca, sp: rnd(1.6, isSuper ? 4.6 : 3.8), col: pick(candyCols), col2: pick(candyCols),
                       rot: rnd(0, TAU), spin: rnd(-5, 5), sz: rnd(0.85, 1.15), delay: rnd(0, 60) });
      }
      var ribbons = [], NR = isSuper ? 14 : 8;
      for (var r0 = 0; r0 < NR; r0++)
        ribbons.push({ a: -Math.PI / 2 + rnd(-1.9, 1.9), sp: rnd(1.4, 3.4), col: RAINBOW[r0 % RAINBOW.length], rot: rnd(0, TAU), spin: rnd(-2, 2),
                       len: isSuper ? rnd(1.1, 1.9) : rnd(0.6, 1.0), ph: rnd(0, TAU), wav: rnd(1, 1.6) });
      var confetti = [], NF = isSuper ? 120 : 70;
      for (var f0 = 0; f0 < NF; f0++)
        confetti.push({ a: rnd(0, TAU), sp: rnd(1, 5.5), col: f0 % 6 === 0 ? '#FFFFFF' : f0 % 5 === 0 ? accent : pick(candyCols.concat(RAINBOW)),
                        rot: rnd(0, TAU), spin: rnd(-8, 8), fl: rnd(6, 14), ph: rnd(0, TAU), w: rnd(0.7, 1.2), delay: rnd(0, 80) });
      var rain = [];
      if (isSuper) for (var q0 = 0; q0 < 70; q0++)
        rain.push({ x: Math.random(), at: ms(lerp(T.rain[0], T.rain[1], Math.random())), vy: rnd(0.22, 0.36), col: pick(candyCols.concat(RAINBOW)),
                    rot: rnd(0, TAU), spin: rnd(-6, 6), fl: rnd(6, 12), ph: rnd(0, TAU), sw: rnd(0.02, 0.05), candy: q0 % 7 === 0 });
      var pops = [];
      for (var p0 = 0; p0 < 12; p0++) pops.push({ a: p0 / 12 * TAU + rnd(-0.1, 0.1), sp: rnd(0.7, 1.3) });
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.7, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

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
      var txtAt = tBurst + 60;
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

      // ─── crepe-paper fringe fill (local units) ───
      function fringe(pathFn, x0, x1, y0, y1, bh, colsArr) {
        ctx.save(); pathFn(); ctx.clip();
        var n = Math.ceil((y1 - y0) / bh), r, y;
        for (r = 0; r < n; r++) { ctx.fillStyle = colsArr[r % colsArr.length]; ctx.fillRect(x0, y0 + r * bh, x1 - x0, bh + 0.004); }
        var tw = bh * 0.34;
        for (r = 0; r < n; r++) {
          var col = colsArr[r % colsArr.length], yb = y0 + (r + 1) * bh;
          ctx.fillStyle = col; ctx.strokeStyle = hexA(mixHex(col, '#000000', 0.35), 0.5); ctx.lineWidth = bh * 0.05;
          ctx.beginPath();
          for (var x = x0 + (r % 2) * tw * 0.5; x < x1; x += tw) { ctx.moveTo(x, yb - 0.005); ctx.lineTo(x + tw * 0.5, yb + bh * 0.42); ctx.lineTo(x + tw, yb - 0.005); }
          ctx.fill(); ctx.stroke();
        }
        var sg = ctx.createLinearGradient(x0, y0, x1, y1);
        sg.addColorStop(0, 'rgba(255,255,255,.26)'); sg.addColorStop(0.45, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(40,0,40,.28)');
        ctx.fillStyle = sg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.restore();
      }
      function ribbonStrip(len, w, col, phase, wav, amp) {   // wavy ribbon centred at origin along x
        var N = 12;
        ctx.beginPath();
        for (var i = 0; i <= N; i++) {
          var u = i / N, x = (u - 0.5) * len, y = Math.sin(u * TAU * wav + phase) * amp;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = w * 0.35; ctx.stroke();
      }

      // eyes/mouth helpers for a face looking at the viewer (star)
      function openMouth(cx, cy, w, h, lineCol) {   // a real gap: rosy inside, dark only at the throat, tongue at the bottom
        ctx.save();
        ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx, cy + h * 2, cx + w, cy); ctx.quadraticCurveTo(cx, cy + h * 0.25, cx - w, cy); ctx.closePath();
        ctx.fillStyle = '#C8406A'; ctx.fill();
        ctx.clip();
        ctx.fillStyle = '#4A0E22'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.35, w * 0.45, h * 0.28, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FF8FB0'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 1.15, w * 0.55, h * 0.4, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = lineCol; ctx.lineWidth = h * 0.22;
        ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx, cy + h * 2, cx + w, cy); ctx.quadraticCurveTo(cx, cy + h * 0.25, cx - w, cy); ctx.closePath(); ctx.stroke();
      }
      function eye(x, y, r, st) {
        if (st.giggle) {
          ctx.strokeStyle = '#3A1030'; ctx.lineWidth = r * 0.42;
          ctx.beginPath(); ctx.moveTo(x - r * 0.9, y + r * 0.25); ctx.quadraticCurveTo(x, y - r * 1.1, x + r * 0.9, y + r * 0.25); ctx.stroke();
          return;
        }
        var bl = st.blink == null ? 1 : st.blink, wide = st.wide ? 1.18 : 1;
        ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r * 0.95 * wide, r * 1.12 * wide * Math.max(0.08, bl), 0, 0, TAU); ctx.clip();
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
        ctx.fillStyle = '#2A1030'; ctx.beginPath(); ctx.arc(x + (st.lookX || 0) * r * 0.25, y + r * 0.12, r * 0.66, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(x + (st.lookX || 0) * r * 0.25 - r * 0.22, y - r * 0.15, r * 0.26, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + (st.lookX || 0) * r * 0.25 + r * 0.22, y + r * 0.35, r * 0.12, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#3A1030'; ctx.lineWidth = r * 0.18;
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.95 * wide, r * 1.12 * wide * Math.max(0.08, bl), 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }

      // ─── star piñata (local: origin = top tip / rope knot, units s) ───
      function drawStar(st, br) {           // br: break progress 0..1 or 0 when intact
        ctx.save(); ctx.translate(0, 1.25);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var k = 0; k < 5; k++) {
          var a = -Math.PI / 2 + k * TAU / 5;
          ctx.save();
          if (br > 0) {
            var e = easeOut(br);
            ctx.translate(Math.cos(a) * e * 1.6, Math.sin(a) * e * 1.6 + br * br * 1.2);
            ctx.rotate((k % 2 ? 1 : -1) * e * 1.4);
            ctx.globalAlpha *= 1 - clamp01((br - 0.45) / 0.55);
          }
          ctx.rotate(a + Math.PI / 2);
          var cp = function () { ctx.beginPath(); ctx.moveTo(-0.36, -0.28); ctx.lineTo(0, -1.25); ctx.lineTo(0.36, -0.28); ctx.closePath(); };
          var pair = CONE[k];
          fringe(cp, -0.4, 0.4, -1.3, -0.2, 0.15, [pair[0], pair[1], pair[0], '#FFFFFF', pair[0], pair[1], pair[0], pair[1]]);
          cp(); ctx.strokeStyle = hexA(mixHex(pair[0], '#000000', 0.45), 0.8); ctx.lineWidth = 0.03; ctx.stroke();
          // tassel streamers out of the tip
          for (var ts = 0; ts < 3; ts++) {
            ctx.save(); ctx.translate(0, -1.24); ctx.rotate(-Math.PI / 2 + (ts - 1) * 0.42 + Math.sin(st.t * 0.006 + k + ts) * 0.12);
            ctx.translate(0.16, 0);
            ribbonStrip(0.32, 0.06, RAINBOW[(k + ts * 2) % RAINBOW.length], st.t * 0.012 + ts + k, 1.2, 0.03);
            ctx.restore();
          }
          ctx.restore();
        }
        // centre body with the face
        ctx.save();
        if (br > 0) { var pe = easeOut(br); ctx.scale(1 + pe * 0.6, 1 + pe * 0.6); ctx.globalAlpha *= 1 - clamp01(br / 0.4); }
        var cpath = function () { ctx.beginPath(); ctx.arc(0, 0, 0.56, 0, TAU); };
        fringe(cpath, -0.6, 0.6, -0.62, 0.62, 0.155, ['#FF7BC0', mixHex(primary, '#FFFFFF', 0.25), '#FF7BC0', '#FFE36B']);
        cpath(); ctx.strokeStyle = 'rgba(120,20,70,.7)'; ctx.lineWidth = 0.03; ctx.stroke();
        // face plate so the face reads cleanly over the fringe
        ctx.fillStyle = 'rgba(255,240,248,.92)';
        ctx.beginPath(); ctx.ellipse(0, 0.04, 0.4, 0.33, 0, 0, TAU); ctx.fill();
        eye(-0.15, -0.04, 0.085, st); eye(0.15, -0.04, 0.085, st);
        ctx.fillStyle = 'rgba(255,110,150,' + (st.giggle || st.wide ? 0.75 : 0.5) + ')';
        ctx.beginPath(); ctx.ellipse(-0.27, 0.1, 0.07, 0.04, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.27, 0.1, 0.07, 0.04, 0, 0, TAU); ctx.fill();
        if (st.giggle || st.wide) openMouth(0, 0.12, st.wide ? 0.07 : 0.1, 0.065, '#3A1030');
        else { ctx.strokeStyle = '#3A1030'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(-0.09, 0.12); ctx.quadraticCurveTo(0, 0.2, 0.09, 0.12); ctx.stroke(); }
        ctx.restore();
        ctx.restore();
      }

      // ─── donkey piñata, side view facing right (local: origin = rope knot on the back, units s) ───
      var DHEAD = ['#C9B4FF', '#B9A2F5', '#C9B4FF', '#D9C9FF'];
      function part(br, dx, dy, rot, fadeAt) {
        if (br <= 0) return;
        var e = easeOut(br);
        ctx.translate(dx * e, dy * e + br * br * 1.4); ctx.rotate(rot * e);
        ctx.globalAlpha *= 1 - clamp01((br - fadeAt) / (1 - fadeAt));
      }
      function leg(x, far) {
        var lp = function () { rrect(ctx, x - 0.12, 0.62, 0.24, 0.92, 0.1); };
        fringe(lp, x - 0.14, x + 0.14, 0.62, 1.54, 0.15, far ? ['#D45A8A', '#D9A53A', '#D45A8A', '#4A9BD0'] : ['#FF7BAA', '#FFD04A', '#FF7BAA', '#5FC0FF']);
        if (far) { ctx.fillStyle = 'rgba(30,0,40,.3)'; lp(); ctx.fill(); }
        lp(); ctx.strokeStyle = 'rgba(90,20,60,.6)'; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.fillStyle = far ? '#4A2C24' : '#6B4436'; rrect(ctx, x - 0.135, 1.48, 0.27, 0.15, 0.05); ctx.fill();
      }
      function ear(bx, by, tx, ty, far) {
        var mx = (bx + tx) / 2, my = (by + ty) / 2, nx = -(ty - by), ny = tx - bx, L = Math.sqrt(nx * nx + ny * ny); nx /= L; ny /= L;
        ctx.fillStyle = far ? '#9E88DA' : '#C9B4FF';
        ctx.beginPath(); ctx.moveTo(bx - nx * 0.1, by - ny * 0.1);
        ctx.quadraticCurveTo(mx - nx * 0.17, my - ny * 0.17, tx, ty);
        ctx.quadraticCurveTo(mx + nx * 0.17, my + ny * 0.17, bx + nx * 0.1, by + ny * 0.1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(70,30,110,.6)'; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.fillStyle = far ? '#D07AA6' : '#FFA6CF';
        ctx.beginPath(); ctx.moveTo(lerp(bx, tx, 0.15), lerp(by, ty, 0.15));
        ctx.quadraticCurveTo(mx - nx * 0.08, my - ny * 0.08, lerp(bx, tx, 0.85), lerp(by, ty, 0.85));
        ctx.quadraticCurveTo(mx + nx * 0.08, my + ny * 0.08, lerp(bx, tx, 0.15), lerp(by, ty, 0.15)); ctx.closePath(); ctx.fill();
      }
      function drawDonkey(st, br) {
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        // tail (behind)
        ctx.save(); part(br, -1.4, 0.2, -1.2, 0.15);
        ctx.strokeStyle = '#B9A2F5'; ctx.lineWidth = 0.07;
        var sw = Math.sin(st.t * 0.007) * 0.08;
        ctx.beginPath(); ctx.moveTo(-0.9, 0.3); ctx.quadraticCurveTo(-1.18, 0.32 + sw, -1.2 + sw, 0.66); ctx.stroke();
        for (var tl = 0; tl < 4; tl++) {
          ctx.save(); ctx.translate(-1.2 + sw, 0.7); ctx.rotate(Math.PI / 2 + (tl - 1.5) * 0.28 + sw);
          ctx.translate(0.18, 0); ribbonStrip(0.36, 0.06, RAINBOW[tl + 1], st.t * 0.012 + tl, 1.1, 0.03); ctx.restore();
        }
        ctx.restore();
        // far legs
        ctx.save(); part(br, 0, 1.2, 0.6, 0.1); leg(-0.47, true); leg(0.78, true); ctx.restore();
        // neck + head group
        ctx.save(); part(br, 1.4, -1.0, 0.9, 0.3);
        ear(1.02, -0.72, 0.7, -1.2, true);
        var np = function () { ctx.beginPath(); ctx.moveTo(0.3, 0.3); ctx.lineTo(0.84, -0.5); ctx.lineTo(1.34, -0.34); ctx.lineTo(1.0, 0.45); ctx.closePath(); };
        fringe(np, 0.28, 1.36, -0.55, 0.45, 0.15, RAINBOW.slice().reverse());
        // mane tufts along the back of the neck
        for (var mn = 0; mn < 6; mn++) {
          var u = mn / 5, mxx = lerp(0.97, 0.47, u), myy = lerp(-0.62, 0.2, u);
          ctx.fillStyle = RAINBOW[mn % RAINBOW.length];
          ctx.beginPath(); ctx.moveTo(mxx + 0.06, myy - 0.02); ctx.lineTo(mxx - 0.16, myy - 0.1 + Math.sin(st.t * 0.01 + mn) * 0.02); ctx.lineTo(mxx - 0.02, myy + 0.1); ctx.closePath(); ctx.fill();
        }
        var hp = function () { ctx.beginPath(); ctx.ellipse(1.2, -0.56, 0.36, 0.29, -0.25, 0, TAU); };
        fringe(hp, 0.82, 1.6, -0.88, -0.24, 0.13, DHEAD);
        hp(); ctx.strokeStyle = 'rgba(70,30,110,.55)'; ctx.lineWidth = 0.025; ctx.stroke();
        var sp = function () { ctx.beginPath(); ctx.ellipse(1.56, -0.4, 0.27, 0.2, 0.18, 0, TAU); };
        fringe(sp, 1.28, 1.85, -0.62, -0.18, 0.11, ['#F3E8FF', '#FFFFFF']);
        sp(); ctx.stroke();
        ear(1.14, -0.78, 0.92, -1.27, false);
        // ONE eye (side view)
        eye(1.24, -0.62, 0.075, st);
        ctx.strokeStyle = '#3A1030'; ctx.lineWidth = 0.02;
        if (!st.giggle) { ctx.beginPath(); ctx.moveTo(1.16, -0.7); ctx.lineTo(1.11, -0.75); ctx.moveTo(1.19, -0.72); ctx.lineTo(1.16, -0.78); ctx.stroke(); }
        ctx.fillStyle = '#7A3A6A'; ctx.beginPath(); ctx.ellipse(1.74, -0.46, 0.028, 0.018, 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,110,150,' + (st.giggle || st.wide ? 0.75 : 0.5) + ')';
        ctx.beginPath(); ctx.ellipse(1.4, -0.45, 0.07, 0.04, 0.1, 0, TAU); ctx.fill();
        if (st.giggle || st.wide) openMouth(1.64, -0.31, st.wide ? 0.07 : 0.1, 0.055, '#3A1030');
        else { ctx.strokeStyle = '#3A1030'; ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(1.54, -0.3); ctx.quadraticCurveTo(1.65, -0.24, 1.75, -0.31); ctx.stroke(); }
        ctx.restore();
        // body
        ctx.save(); part(br, 0, -0.2, 0, 0);
        if (br > 0) { var pe = easeOut(br); ctx.translate(0, 0.45); ctx.scale(1 + pe * 0.3, 1 + pe * 0.3); ctx.translate(0, -0.45); }
        var bp = function () { rrect(ctx, -0.95, 0.02, 1.9, 0.86, 0.38); };
        fringe(bp, -0.97, 0.97, 0.0, 0.9, 0.15, RAINBOW);
        bp(); ctx.strokeStyle = 'rgba(90,20,60,.6)'; ctx.lineWidth = 0.03; ctx.stroke();
        ctx.restore();
        // near legs
        ctx.save(); part(br, 0, 1.2, -0.6, 0.1); leg(-0.7, false); leg(0.55, false); ctx.restore();
      }

      // boop sparkle (a magic glint, no stick)
      function drawGlint(x, y, r, rot) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
        g.addColorStop(0, hexA('#FFFFFF', 0.8)); g.addColorStop(0.35, hexA(accent, 0.4)); g.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = '#FFFFFF'; sparkPath(ctx, 0, 0, r); ctx.fill();
        ctx.rotate(Math.PI / 4); ctx.fillStyle = hexA(accent, 0.9); sparkPath(ctx, 0, 0, r * 0.55); ctx.fill();
        ctx.restore();
      }

      function drawCandy(c, kind, col, col2) {
        ctx.lineJoin = 'round';
        if (kind === 'wrap') {
          ctx.fillStyle = col2;
          ctx.beginPath(); ctx.moveTo(-c * 0.7, 0); ctx.lineTo(-c * 1.5, -c * 0.6); ctx.quadraticCurveTo(-c * 1.3, 0, -c * 1.5, c * 0.6); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(c * 0.7, 0); ctx.lineTo(c * 1.5, -c * 0.6); ctx.quadraticCurveTo(c * 1.3, 0, c * 1.5, c * 0.6); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = c * 0.08;
          ctx.beginPath(); ctx.moveTo(-c * 0.8, 0); ctx.lineTo(-c * 1.35, -c * 0.32); ctx.moveTo(c * 0.8, 0); ctx.lineTo(c * 1.35, c * 0.32); ctx.stroke();
          ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, c, c * 0.68, 0, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = c * 0.2;
          for (var sx = -2; sx <= 2; sx++) { ctx.beginPath(); ctx.moveTo(sx * c * 0.5 - c * 0.4, c); ctx.lineTo(sx * c * 0.5 + c * 0.4, -c); ctx.stroke(); }
          ctx.restore();
          ctx.strokeStyle = hexA(mixHex(col, '#000000', 0.4), 0.8); ctx.lineWidth = c * 0.08;
          ctx.beginPath(); ctx.ellipse(0, 0, c, c * 0.68, 0, 0, TAU); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-c * 0.35, -c * 0.32, c * 0.25, c * 0.1, -0.3, 0, TAU); ctx.fill();
        } else if (kind === 'lolli') {
          ctx.fillStyle = '#F4F0FA'; rrect(ctx, -c * 0.09, 0, c * 0.18, c * 2.1, c * 0.08); ctx.fill();
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, c, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = c * 0.17;
          ctx.beginPath();
          for (var i = 0; i <= 40; i++) { var aa = i / 40 * TAU * 2.4, rr = c * 0.9 * i / 40; if (i) ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else ctx.moveTo(0, 0); }
          ctx.stroke();
          ctx.strokeStyle = hexA(mixHex(col, '#000000', 0.4), 0.8); ctx.lineWidth = c * 0.08;
          ctx.beginPath(); ctx.arc(0, 0, c, 0, TAU); ctx.stroke();
        } else {
          ctx.fillStyle = col; heartPath(ctx, c * 1.05); ctx.fill();
          ctx.strokeStyle = hexA(mixHex(col, '#000000', 0.4), 0.8); ctx.lineWidth = c * 0.08; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-c * 0.4, -c * 0.3, c * 0.18, c * 0.1, -0.6, 0, TAU); ctx.fill();
        }
      }
      function dragPos(x0, y0, vx, vy, k, g, tt) {
        var f = (1 - Math.exp(-k * tt)) / k;
        return { x: x0 + vx * f, y: y0 + vy * f + (g / k) * (tt - f) };
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        // geometry
        var s, ax, attachY, cOff;
        if (isSuper) { s = Math.min(W * 0.25, H * 0.17); ax = W / 2 - 0.3 * s; attachY = H * 0.43; cOff = { x: 0.35, y: 0.45 }; }
        else { s = Math.min(W * 0.25, H * 0.17); ax = W / 2; attachY = H * 0.5 - 1.25 * s; cOff = { x: 0, y: 1.25 }; }
        var anchorY = -H * 0.06;
        var Lr = attachY - anchorY;
        var dq = clamp01(t / ms(T.drop));
        var Ld = lerp(Lr - H * 0.75, Lr, easeOutBack(dq));

        // swing + boops
        var th = 0.2 * Math.exp(-t / 900) * Math.sin(t * 0.0065 + 0.6) * (dq > 0.3 ? 1 : 0.3);
        var wob = 0, sqx = 1, sqy = 1, giggle = false;
        for (var bi = 0; bi < T.boops.length; bi++) {
          var tb = ms(T.boops[bi]), dir = bi % 2 ? -1 : 1, de = t - tb;
          if (de > 0) {
            var env = Math.exp(-de / 420);
            th += -dir * 0.16 * Math.exp(-de / 800) * Math.sin(de * 0.0075);
            wob += -dir * 0.14 * env * Math.sin(de * 0.03);
            sqx += 0.09 * env * Math.sin(de * 0.04); sqy -= 0.09 * env * Math.sin(de * 0.04);
            if (de < 600) giggle = true;
          }
        }
        var trq = clamp01((t - ms(T.tremble[0])) / (ms(T.tremble[1]) - ms(T.tremble[0])));
        var wide = trq > 0 && t < tBurst;
        if (wide) { wob += Math.sin(t * 0.09) * 0.045 * trq; sqx += 0.05 * trq; sqy += 0.05 * trq; giggle = false; }
        var blinkQ = (t - ms(T.drop) - 120) / 150, blink = blinkQ > 0 && blinkQ < 1 ? Math.abs(Math.cos(blinkQ * Math.PI)) : 1;

        // world helpers
        var cth = Math.cos(th), sth = Math.sin(th);
        function toWorld(lx, ly) {          // piñata-local (units s, origin knot) → screen, ignoring wobble
          var px = lx * s, py = Ld + ly * s;
          return { x: ax - py * sth + px * cth, y: anchorY + py * cth + px * sth };
        }
        var C = toWorld(cOff.x, cOff.y);

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], kk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * kk);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }

        var br = t > tBurst ? clamp01((t - tBurst) / (isSuper ? 600 : 700)) : 0;
        // glow behind the piñata (brightens while it trembles)
        var gA = (0.22 + 0.35 * trq) * (1 - br);
        if (gA > 0.01) {
          var gg = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, s * 2.2);
          gg.addColorStop(0, hexA(glow, gA)); gg.addColorStop(0.5, hexA(primary, gA * 0.4)); gg.addColorStop(1, hexA(primary, 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(C.x, C.y, s * 2.2, 0, TAU); ctx.fill();
        }

        // rope (pulls back up after the burst)
        var ropeUp = t > tBurst ? easeInOut((t - tBurst) / 450) : 0;
        var ropeLen = Ld * (1 - ropeUp) - (br > 0 ? s * 0.05 : 0);
        if (ropeLen > 0) {
          ctx.save(); ctx.translate(ax, anchorY); ctx.rotate(th);
          ctx.strokeStyle = '#8A6A3A'; ctx.lineWidth = Math.max(2, 5 * unit);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ropeLen); ctx.stroke();
          ctx.strokeStyle = '#E8C98A'; ctx.lineWidth = Math.max(1, 2.6 * unit);
          ctx.setLineDash([6 * unit + 2, 5 * unit + 2]);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ropeLen); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // the piñata
        if (br < 1) {
          ctx.save();
          ctx.translate(ax, anchorY); ctx.rotate(th); ctx.translate(0, Ld);
          ctx.rotate(wob); ctx.scale(s * sqx, s * sqy);
          var st = { t: t, giggle: giggle, wide: wide, blink: blink, lookX: 0 };
          if (isSuper) drawDonkey(st, br); else drawStar(st, br);
          // rope knot
          if (br === 0) {
            ctx.fillStyle = '#C9A262'; ctx.beginPath(); ctx.arc(0, 0.02, 0.06, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#8A6A3A'; ctx.lineWidth = 0.02; ctx.stroke();
          }
          ctx.restore();
        }

        // boop glints flying in + the boop sparkle ring
        for (var gi = 0; gi < T.boops.length; gi++) {
          var tbo = ms(T.boops[gi]), dr = gi % 2 ? -1 : 1, fl0 = tbo - ms(T.fly);
          var hit = isSuper ? toWorld(dr > 0 ? -0.95 : 0.95, 0.45) : toWorld(-dr * 0.95, 1.25);
          if (t > fl0 && t < tbo) {
            var fq = easeInOut((t - fl0) / (tbo - fl0));
            var sxp = lerp(hit.x - dr * s * 2.6, hit.x, fq), syp = lerp(hit.y - s * 1.2, hit.y, fq) - Math.sin(Math.PI * fq) * s * 0.6;
            for (var tr = 1; tr <= 5; tr++) {
              var fq2 = easeInOut((t - tr * 28 - fl0) / (tbo - fl0)); if (fq2 <= 0) continue;
              ctx.fillStyle = hexA(tr % 2 ? accent : '#FFFFFF', 0.6 * (1 - tr / 6));
              sparkPath(ctx, lerp(hit.x - dr * s * 2.6, hit.x, fq2), lerp(hit.y - s * 1.2, hit.y, fq2) - Math.sin(Math.PI * fq2) * s * 0.6, s * 0.06 * (1 - tr / 7)); ctx.fill();
            }
            drawGlint(sxp, syp, s * 0.13, t * 0.01);
          }
          var bq = (t - tbo) / 480;
          if (bq > 0 && bq < 1) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = hexA(accent, 0.8 * (1 - bq)); ctx.lineWidth = Math.max(1.5, 4 * unit * (1 - bq));
            ctx.beginPath(); ctx.arc(hit.x, hit.y, s * (0.12 + 0.55 * easeOut(bq)), 0, TAU); ctx.stroke();
            for (var bk = 0; bk < 8; bk++) {
              var ba = bk / 8 * TAU + 0.2, brr = s * (0.15 + 0.7 * easeOut(bq));
              ctx.fillStyle = hexA(bk % 2 ? '#FFFFFF' : accent, 1 - bq);
              sparkPath(ctx, hit.x + Math.cos(ba) * brr, hit.y + Math.sin(ba) * brr, s * 0.07 * (1 - bq * 0.5)); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }

        // ─── the burst ───
        var bt = (t - tBurst) / 1000;
        if (bt > 0) {
          var BC = C;
          var fl = bt / 0.5;
          if (fl < 1) {
            var fg = ctx.createRadialGradient(BC.x, BC.y, 0, BC.x, BC.y, s * 2.6);
            fg.addColorStop(0, hexA('#FFF6D8', 0.8 * (1 - fl))); fg.addColorStop(0.4, hexA(accent, 0.35 * (1 - fl))); fg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(BC.x, BC.y, s * 2.6, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            for (var pk = 0; pk < pops.length; pk++) {
              var P = pops[pk], pr = s * (0.3 + 1.9 * easeOut(fl) * P.sp);
              ctx.fillStyle = hexA(pk % 2 ? '#FFFFFF' : accent, 1 - fl);
              sparkPath(ctx, BC.x + Math.cos(P.a) * pr, BC.y + Math.sin(P.a) * pr, s * 0.1 * (1 - fl * 0.6)); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // confetti
          for (var ci = 0; ci < confetti.length; ci++) {
            var Q = confetti[ci], qt = bt - Q.delay / 1000;
            if (qt <= 0) continue;
            var qp = dragPos(BC.x, BC.y, Math.cos(Q.a) * Q.sp * s, Math.sin(Q.a) * Q.sp * s - s * 1.2, 2.0, 2.6 * s, qt);
            if (qp.y > H + 20) continue;
            ctx.save(); ctx.translate(qp.x + Math.sin(qt * 3 + Q.ph) * s * 0.12, qp.y); ctx.rotate(Q.rot + Q.spin * qt);
            ctx.scale(1, Math.cos(qt * Q.fl + Q.ph));
            ctx.fillStyle = Q.col; ctx.fillRect(-0.05 * s * Q.w, -0.028 * s, 0.1 * s * Q.w, 0.056 * s);
            ctx.restore();
          }
          // ribbons / streamers
          for (var ri = 0; ri < ribbons.length; ri++) {
            var Rb = ribbons[ri];
            var rp = dragPos(BC.x, BC.y, Math.cos(Rb.a) * Rb.sp * s, Math.sin(Rb.a) * Rb.sp * s - s * 0.8, 2.2, 2.2 * s, bt);
            if (rp.y > H + s * 2) continue;
            var unf = isSuper ? lerp(0.25, 1, easeOut(bt / 0.6)) : lerp(0.4, 1, easeOut(bt / 0.3));
            ctx.save(); ctx.translate(rp.x, rp.y); ctx.rotate(Rb.rot + Rb.spin * bt);
            ribbonStrip(Rb.len * s * unf, s * (isSuper ? 0.075 : 0.065), Rb.col, Rb.ph + bt * 7, Rb.wav, s * 0.09);
            ctx.restore();
          }
          // candies
          for (var cj = 0; cj < candies.length; cj++) {
            var K = candies[cj], kt = bt - K.delay / 1000;
            if (kt <= 0) continue;
            var kp = dragPos(BC.x, BC.y, Math.cos(K.a) * K.sp * s, Math.sin(K.a) * K.sp * s - s * 0.6, 1.0, 5.5 * s, kt);
            if (kp.y > H + s) continue;
            var kc = s * (isSuper ? 0.19 : 0.17) * K.sz * (kt < 0.1 ? 0.4 + 6 * kt : 1);
            ctx.save(); ctx.translate(kp.x, kp.y); ctx.rotate(K.rot + K.spin * kt);
            drawCandy(kc, K.kind, K.col, K.col2);
            ctx.restore();
          }
        }
        // super: confetti + candy rain from the top
        for (var qi = 0; qi < rain.length; qi++) {
          var Rn = rain[qi], rt = (t - Rn.at) / 1000;
          if (rt <= 0) continue;
          var ry = -20 + rt * Rn.vy * H * 1.6, rx = Rn.x * W + Math.sin(rt * 2.5 + Rn.ph) * Rn.sw * W;
          if (ry > H + 30) continue;
          ctx.save(); ctx.translate(rx, ry); ctx.rotate(Rn.rot + Rn.spin * rt);
          if (Rn.candy) drawCandy(s * 0.14, 'wrap', Rn.col, accent);
          else { ctx.scale(1, Math.cos(rt * Rn.fl + Rn.ph)); ctx.fillStyle = Rn.col; ctx.fillRect(-0.05 * s, -0.028 * s, 0.1 * s, 0.056 * s); }
          ctx.restore();
        }

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
