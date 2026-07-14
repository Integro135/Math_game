/* build-jigglypuff.js — inject the pen's exact SVG geometry into jigglypuff.js.
   Reads the <svg> INNER content from jigglypuff.html (avoids hand-transcribing
   the long path data), collapses inter-tag whitespace, and swaps it into the
   `var SVG = '<svg ...>…</svg>'` line of jigglypuff.js (idempotent — the wrapper
   tag / viewBox / animations stay owned by jigglypuff.js).
       node build-jigglypuff.js
*/
'use strict';
var fs = require('fs');
var path = require('path');
var dir = __dirname;

var html = fs.readFileSync(path.join(dir, 'jigglypuff.html'), 'utf8');
var m = html.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i);
if (!m) throw new Error('no <svg> found in jigglypuff.html');

var inner = m[1]
  .replace(/\s+/g, ' ')   // newlines + indentation → single spaces (safe for path data)
  .replace(/>\s+</g, '><') // drop whitespace strictly between tags
  .trim();

var modPath = path.join(dir, 'jigglypuff.js');
var mod = fs.readFileSync(modPath, 'utf8');
var before = mod;
mod = mod.replace(/(var SVG = '<svg\b[^>]*>)[\s\S]*?(<\/svg>';)/,
  function (_, open, close) { return open + inner + close; });
if (mod === before) throw new Error('SVG placeholder line not found in jigglypuff.js');

fs.writeFileSync(modPath, mod);
console.log('injected', inner.length, 'chars of SVG inner content into jigglypuff.js');
