// Generador de código QR (modo bytes, corrección M, versiones 1 a 10). Sin librerías.
(function (root) {
  'use strict';

  // versión: [códigos de corrección por bloque, [[bloques, códigos de datos], ...]]
  var BLOQUES = {
    1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]],
    6: [16, [[4, 27]]], 7: [18, [[4, 31]]], 8: [22, [[2, 38], [2, 39]]], 9: [22, [[3, 36], [2, 37]]], 10: [26, [[4, 43], [1, 44]]]
  };
  var ALINEACION = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

  var EXP = [], LOG = [];
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

  function generador(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var s = g.concat([0]);
      for (var j = 0; j < g.length; j++) s[j + 1] ^= mul(g[j], EXP[i]);
      g = s;
    }
    return g;
  }
  function residuo(datos, n) {
    var g = generador(n), r = datos.concat(new Array(n).fill(0));
    for (var i = 0; i < datos.length; i++) {
      var f = r[i];
      if (f) for (var j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], f);
    }
    return r.slice(datos.length);
  }

  function utf8(texto) {
    var b = unescape(encodeURIComponent(texto)), out = [];
    for (var i = 0; i < b.length; i++) out.push(b.charCodeAt(i));
    return out;
  }

  function codigos(bytes) {
    var v, info, total;
    for (v = 1; v <= 10; v++) {
      info = BLOQUES[v];
      total = info[1].reduce(function (a, b) { return a + b[0] * b[1]; }, 0);
      if (4 + (v < 10 ? 8 : 16) + 8 * bytes.length <= total * 8) break;
    }
    if (v > 10) throw new Error('Texto demasiado largo para el QR');
    var bits = [];
    function poner(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    poner(4, 4); poner(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(function (b) { poner(b, 8); });
    poner(0, Math.min(4, total * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    var datos = [];
    for (var i = 0; i < bits.length; i += 8) {
      var x = 0; for (var k = 0; k < 8; k++) x = (x << 1) | bits[i + k]; datos.push(x);
    }
    for (var p = 0xEC; datos.length < total; p ^= 0xEC ^ 0x11) datos.push(p);
    var bloques = [], pos = 0;
    info[1].forEach(function (g) {
      for (var j = 0; j < g[0]; j++) { var d = datos.slice(pos, pos + g[1]); pos += g[1]; bloques.push({ d: d, e: residuo(d, info[0]) }); }
    });
    var out = [], maxD = Math.max.apply(null, bloques.map(function (b) { return b.d.length; }));
    for (i = 0; i < maxD; i++) bloques.forEach(function (b) { if (i < b.d.length) out.push(b.d[i]); });
    for (i = 0; i < info[0]; i++) bloques.forEach(function (b) { out.push(b.e[i]); });
    return { version: v, palabras: out };
  }

  function codificar(texto) {
    var c = codigos(utf8(texto)), v = c.version, size = 17 + 4 * v;
    var m = [], fn = [];
    for (var y = 0; y < size; y++) { m.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function poner(x, y, oscuro) { m[y][x] = !!oscuro; fn[y][x] = true; }

    for (var i = 0; i < size; i++) { poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c0) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var xx = c0[0] + dx, yy = c0[1] + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) { var d = Math.max(Math.abs(dx), Math.abs(dy)); poner(xx, yy, d !== 2 && d !== 4); }
      }
    });
    var al = ALINEACION[v];
    al.forEach(function (ax, a) {
      al.forEach(function (ay, b) {
        if ((a === 0 && b === 0) || (a === 0 && b === al.length - 1) || (a === al.length - 1 && b === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) poner(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });

    function formato(mascara) {
      var data = mascara, rem = data;       // nivel M = 00
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = ((data << 10) | rem) ^ 0x5412;
      function b(i) { return ((bits >>> i) & 1) !== 0; }
      for (i = 0; i <= 5; i++) poner(8, i, b(i));
      poner(8, 7, b(6)); poner(8, 8, b(7)); poner(7, 8, b(8));
      for (i = 9; i < 15; i++) poner(14 - i, 8, b(i));
      for (i = 0; i < 8; i++) poner(size - 1 - i, 8, b(i));
      for (i = 8; i < 15; i++) poner(8, size - 15 + i, b(i));
      poner(8, size - 8, true);
    }
    formato(0);
    if (v >= 7) {
      var rem = v;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (v << 12) | rem;
      for (i = 0; i < 18; i++) {
        var o = ((vb >>> i) & 1) !== 0, a = size - 11 + (i % 3), b2 = Math.floor(i / 3);
        poner(a, b2, o); poner(b2, a, o);
      }
    }

    var k = 0, nbits = c.palabras.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var j = 0; j < 2; j++) {
        var x = right - j, arriba = ((right + 1) & 2) === 0, yy2 = arriba ? size - 1 - vert : vert;
        if (!fn[yy2][x] && k < nbits) { m[yy2][x] = ((c.palabras[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0; k++; }
      }
    }

    function mascara(n, x, y) {
      switch (n) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return (x * y) % 2 + (x * y) % 3 === 0;
        case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
        default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
      }
    }
    function aplicar(n) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!fn[y][x] && mascara(n, x, y)) m[y][x] = !m[y][x]; }

    function penalizacion() {
      var p = 0, y, x, run, oscuros = 0;
      function linea(get) {
        var cadena = '', runC = 1;
        for (var i = 0; i < size; i++) {
          cadena += get(i) ? '1' : '0';
          if (i > 0 && get(i) === get(i - 1)) { runC++; if (runC === 5) p += 3; else if (runC > 5) p++; } else runC = 1;
        }
        var re = /(?=(10111010000|00001011101))/g;
        while (re.exec(cadena)) { p += 40; re.lastIndex++; }
      }
      for (y = 0; y < size; y++) linea(function (i) { return m[y][i]; });
      for (x = 0; x < size; x++) linea(function (i) { return m[i][x]; });
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++)
        if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (m[y][x]) oscuros++;
      var total = size * size;
      p += (Math.ceil(Math.abs(oscuros * 20 - total * 10) / total) - 1) * 10;
      return p;
    }

    var mejor = 0, mejorP = Infinity;
    for (var n = 0; n < 8; n++) {
      aplicar(n); formato(n);
      var pen = penalizacion();
      if (pen < mejorP) { mejorP = pen; mejor = n; }
      aplicar(n);
    }
    aplicar(mejor); formato(mejor);
    return { size: size, modulos: m };
  }

  var api = { codificar: codificar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QR = api;
})(typeof window !== 'undefined' ? window : this);
