// Escribe la representación impresa (PDF) del CFDI de práctica, sin librerías. Hoja carta.
(function (root) {
  'use strict';
  var C = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./cfdi.js') : root.CFDI;
  var QR = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./qr.js') : root.QR;

  // Anchos de Helvetica y Helvetica-Bold (milésimas de em) para los códigos 32 a 255
  var ANCHOS = { r: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,552,400,549,333,333,333,576,537,333,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,549,611,556,556,556,556,500,556,500], b: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,552,400,549,333,333,333,576,556,333,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,549,611,611,611,611,611,556,611,556] };
  var NEGRO = '0.106 0.106 0.106', GRIS = '0.4 0.4 0.4', LINEA = '0.8 0.8 0.78', FONDO = '0.94 0.93 0.9';

  function latin1(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      o += String.fromCharCode(c < 256 ? c : (c === 8211 || c === 8212) ? 45 : 63);
    }
    return o;
  }
  function ancho(s, tam, neg) {
    var t = ANCHOS[neg ? 'b' : 'r'], w = 0;
    s = latin1(s);
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); w += c >= 32 ? t[c - 32] : 0; }
    return w * tam / 1000;
  }
  function esc(s) { return latin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function n(x) { return (Math.round(x * 100) / 100).toString(); }

  // Parte un texto en renglones que caben en `max` puntos; corta palabras muy largas (sellos, cadena original)
  function renglones(texto, max, tam, neg) {
    var out = [], actual = '';
    String(texto).split(' ').forEach(function (pal) {
      var prueba = actual ? actual + ' ' + pal : pal;
      if (ancho(prueba, tam, neg) <= max) { actual = prueba; return; }
      if (actual) out.push(actual);
      actual = '';
      while (ancho(pal, tam, neg) > max) {
        var k = pal.length;
        while (k > 1 && ancho(pal.slice(0, k), tam, neg) > max) k--;
        out.push(pal.slice(0, k)); pal = pal.slice(k);
      }
      actual = pal;
    });
    if (actual) out.push(actual);
    return out;
  }

  function generar(ticket, factura, receptor) {
    var d = C.desglosar(ticket), fecha = String(factura.fecha).slice(0, 19).replace('T', ' ');
    var W = 612, H = 792, M = 40, op = [];
    function color(c, trazo) { op.push(c + (trazo ? ' RG' : ' rg')); }
    function texto(x, y, s, o) {
      o = o || {};
      var tam = o.tam || 9, w = ancho(s, tam, o.neg);
      if (o.der) x -= w; else if (o.centro) x -= w / 2;
      color(o.color || NEGRO);
      op.push('BT /' + (o.neg ? 'F2' : 'F1') + ' ' + n(tam) + ' Tf ' + n(x) + ' ' + n(H - y) + ' Td (' + esc(s) + ') Tj ET');
    }
    function bloque(x, y, s, max, o) {
      var tam = (o && o.tam) || 9, lh = tam * 1.3;
      renglones(s, max, tam, o && o.neg).forEach(function (r, i) { texto(x, y + i * lh, r, o); });
      return renglones(s, max, tam, o && o.neg).length * lh;
    }
    function rect(x, y, w, h, relleno) { color(relleno); op.push(n(x) + ' ' + n(H - y - h) + ' ' + n(w) + ' ' + n(h) + ' re f'); }
    function linea(y) { color(LINEA, true); op.push('0.6 w ' + M + ' ' + n(H - y) + ' m ' + (W - M) + ' ' + n(H - y) + ' l S'); }

    // Marca de agua
    color('0.93 0.93 0.93');
    var ang = 35 * Math.PI / 180;
    var marca = 'SIN VALIDEZ FISCAL · PRÁCTICA', tamMarca = 400 / (ancho(marca, 100, true) / 100 * Math.cos(ang));
    op.push('q ' + n(Math.cos(ang)) + ' ' + n(Math.sin(ang)) + ' ' + n(-Math.sin(ang)) + ' ' + n(Math.cos(ang)) + ' 100 300 cm');
    op.push('BT /F2 ' + n(tamMarca) + ' Tf 0 0 Td (' + esc(marca) + ') Tj ET Q');

    // Emisor y datos del comprobante
    texto(M, 58, C.EMISOR.nombre, { tam: 15, neg: true });
    texto(M, 74, 'RFC ' + C.EMISOR.rfc, { tam: 9 });
    texto(M, 87, 'Régimen fiscal: 601 General de Ley Personas Morales', { tam: 9 });
    texto(M, 100, 'Lugar de expedición: ' + ticket.cp_sucursal + ' · ' + ticket.sucursal, { tam: 9 });
    texto(W - M, 58, 'FACTURA · CFDI 4.0 (PRÁCTICA)', { tam: 11, neg: true, der: true });
    texto(W - M, 74, 'Serie y folio: ' + factura.serie + '-' + factura.folio, { tam: 9, der: true });
    texto(W - M, 87, 'Fecha de emisión: ' + fecha, { tam: 9, der: true });
    texto(W - M, 100, 'Ticket de origen: ' + ticket.folio, { tam: 9, der: true });
    texto(M, 122, 'Folio fiscal (UUID): ' + factura.uuid, { tam: 8.5, neg: true });
    linea(134);

    // Receptor
    texto(M, 152, 'RECEPTOR', { tam: 8, neg: true, color: GRIS });
    texto(M, 166, receptor.nombre, { tam: 11, neg: true });
    texto(M, 181, 'RFC ' + receptor.rfc + '   ·   Código postal fiscal ' + receptor.cp, { tam: 9 });
    var reg = C.REGIMENES.filter(function (r) { return r[0] === receptor.regimen; })[0];
    var uso = C.USOS.filter(function (u) { return u[0] === receptor.uso; })[0];
    texto(M, 194, 'Régimen fiscal: ' + receptor.regimen + ' ' + (reg ? reg[1] : ''), { tam: 9 });
    texto(M, 207, 'Uso del CFDI: ' + receptor.uso + ' ' + (uso ? uso[1] : ''), { tam: 9 });
    texto(W - M, 166, 'Forma de pago: ' + ticket.forma_pago + ' ' + C.FORMAS_PAGO[ticket.forma_pago], { tam: 9, der: true });
    texto(W - M, 179, 'Método de pago: PUE (una sola exhibición)', { tam: 9, der: true });
    texto(W - M, 192, 'Moneda: MXN   ·   Exportación: 01', { tam: 9, der: true });
    texto(W - M, 205, 'Tipo de comprobante: I Ingreso', { tam: 9, der: true });
    linea(220);

    // Conceptos
    var y = 232, cx = { cant: M + 4, clave: M + 40, uni: M + 108, desc: M + 164, vu: W - M - 90, imp: W - M - 4 };
    rect(M, y - 10, W - 2 * M, 16, FONDO);
    texto(cx.cant, y + 2, 'Cant.', { tam: 8, neg: true });
    texto(cx.clave, y + 2, 'Clave', { tam: 8, neg: true });
    texto(cx.uni, y + 2, 'Unidad', { tam: 8, neg: true });
    texto(cx.desc, y + 2, 'Descripción', { tam: 8, neg: true });
    texto(cx.vu, y + 2, 'V. unitario', { tam: 8, neg: true, der: true });
    texto(cx.imp, y + 2, 'Importe', { tam: 8, neg: true, der: true });
    y += 20;
    d.conceptos.forEach(function (c) {
      var alto = bloque(cx.desc, y + 8, c.descripcion, cx.vu - cx.desc - 50, { tam: 9 });
      texto(cx.cant, y + 8, String(c.cantidad), { tam: 9 });
      texto(cx.clave, y + 8, '01010101', { tam: 9 });
      texto(cx.uni, y + 8, 'H87 Pieza', { tam: 9 });
      texto(cx.vu, y + 8, '$' + C.valorUnitario(c), { tam: 9, der: true });
      texto(cx.imp, y + 8, C.pesos(c.base), { tam: 9, der: true });
      texto(cx.desc, y + 8 + alto, 'IVA 16%: ' + C.pesos(c.iva) + '   ·   Objeto de impuesto 02', { tam: 7.5, color: GRIS });
      y += alto + 24;
      linea(y - 10);
    });

    // Totales
    y += 6;
    texto(W - M - 110, y, 'Subtotal', { tam: 9, der: true }); texto(W - M - 4, y, C.pesos(d.subtotal), { tam: 9, der: true });
    texto(W - M - 110, y + 15, 'IVA 16%', { tam: 9, der: true }); texto(W - M - 4, y + 15, C.pesos(d.iva), { tam: 9, der: true });
    rect(W - M - 190, y + 24, 190, 22, FONDO);
    texto(W - M - 110, y + 39, 'TOTAL', { tam: 11, neg: true, der: true }); texto(W - M - 4, y + 39, C.pesos(d.total), { tam: 11, neg: true, der: true });
    texto(M, y, 'Importe con letra', { tam: 8, neg: true, color: GRIS });
    bloque(M, y + 14, C.importeConLetra(d.total), 300, { tam: 10, neg: true });
    y += 70;
    linea(y - 14);

    // QR, sellos y cadena original
    var qr = QR.codificar('CFDI-PRACTICA-SIN-VALIDEZ|' + factura.uuid + '|' + C.EMISOR.rfc + '|' + receptor.rfc + '|' + C.fmt(d.total));
    var mod = 3.4, qz = 4, lado = (qr.size + 2 * qz) * mod, qy = y + 6;
    color('0 0 0');
    for (var r = 0; r < qr.size; r++) for (var c2 = 0; c2 < qr.size; c2++)
      if (qr.modulos[r][c2]) op.push(n(M + (c2 + qz) * mod) + ' ' + n(H - (qy + (r + qz) * mod) - mod) + ' ' + n(mod) + ' ' + n(mod) + ' re f');
    var tx = M + lado + 16, tw = W - M - tx;
    var yy = qy + 4;
    texto(tx, yy + 6, 'Sello digital del CFDI', { tam: 7.5, neg: true, color: GRIS });
    yy += bloque(tx, yy + 17, 'PRACTICA-SIN-VALIDEZ', tw, { tam: 7 }) + 12;
    texto(tx, yy + 6, 'Sello del SAT', { tam: 7.5, neg: true, color: GRIS });
    yy += bloque(tx, yy + 17, 'PRACTICA-SIN-VALIDEZ', tw, { tam: 7 }) + 12;
    texto(tx, yy + 6, 'Certificado del emisor / del SAT', { tam: 7.5, neg: true, color: GRIS });
    yy += bloque(tx, yy + 17, '00000000000000000000 / 00000000000000000000', tw, { tam: 7 }) + 12;
    texto(tx, yy + 6, 'Cadena original del complemento de certificación digital', { tam: 7.5, neg: true, color: GRIS });
    bloque(tx, yy + 17, C.cadenaOriginal(ticket, factura, receptor), tw, { tam: 6.5 });

    // Leyenda
    var pie = Math.max(qy + lado, yy + 80) + 24;
    linea(pie - 12);
    texto(W / 2, pie + 2, 'Representación de práctica de un CFDI generada para un curso. No tiene validez fiscal.', { tam: 8.5, neg: true, centro: true });

    // Arma el archivo
    var contenido = op.join('\n');
    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
      '<< /Length ' + contenido.length + ' >>\nstream\n' + contenido + '\nendstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Title (' + esc('Factura de práctica ' + factura.serie + '-' + factura.folio) + ') /Producer (Portal de facturación OCSO de práctica) >>'
    ];
    var pdf = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = pdf.length;
    pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { pdf += String(o).padStart(10, '0') + ' 00000 n \n'; });
    pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 7 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    var bytes = new Uint8Array(pdf.length);
    for (var i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
    return bytes;
  }

  var api = { generar: generar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PDFCFDI = api;
})(typeof window !== 'undefined' ? window : this);
