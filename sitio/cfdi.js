// Reglas del CFDI 4.0 para facturar un ticket (Skill reglas-cfdi). Factura de práctica, sin validez fiscal.
(function (root) {
  'use strict';

  var EMISOR = { rfc: 'EKU9003173C9', nombre: 'OCSO TIENDAS DE PRACTICA', regimen: '601' };

  // Tabla 2: clave, nombre, aplica a persona física, aplica a persona moral
  var REGIMENES = [
    ['601', 'General de Ley Personas Morales', 0, 1],
    ['603', 'Personas Morales con Fines no Lucrativos', 0, 1],
    ['605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 1, 0],
    ['606', 'Arrendamiento', 1, 0],
    ['608', 'Demás ingresos', 1, 0],
    ['611', 'Ingresos por Dividendos', 1, 0],
    ['612', 'Personas Físicas con Actividades Empresariales y Profesionales', 1, 0],
    ['614', 'Ingresos por intereses', 1, 0],
    ['616', 'Sin obligaciones fiscales', 1, 0],
    ['620', 'Sociedades Cooperativas de Producción', 0, 1],
    ['621', 'Incorporación Fiscal', 1, 0],
    ['622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', 0, 1],
    ['623', 'Opcional para Grupos de Sociedades', 0, 1],
    ['624', 'Coordinados', 0, 1],
    ['625', 'Plataformas Tecnológicas', 1, 0],
    ['626', 'Régimen Simplificado de Confianza (RESICO)', 1, 1]
  ];
  // Tabla 3: G01 y G03 solo con estos regímenes (no con 605, 608, 611, 614 ni 616); S01 sirve con todos
  var CON_GASTOS = ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626'];
  var USOS = [
    ['G01', 'Adquisición de mercancías'],
    ['G03', 'Gastos en general'],
    ['S01', 'Sin efectos fiscales']
  ];
  var FORMAS_PAGO = { '01': 'Efectivo', '04': 'Tarjeta de crédito', '28': 'Tarjeta de débito' };
  var GENERICOS = ['XAXX010101000', 'XEXX010101000'];
  var FECHA_RFC = '[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])';
  var RE_MORAL = new RegExp('^[A-ZÑ&]{3}' + FECHA_RFC + '[A-Z0-9]{3}$');
  var RE_FISICA = new RegExp('^[A-ZÑ&]{4}' + FECHA_RFC + '[A-Z0-9]{3}$');
  var RE_SOCIETARIO = /(^| )(SA DE CV|SAPI DE CV|SAB DE CV|S DE RL DE CV|S DE RL|SPR DE RL|SAS|SRL|SC|AC|SA)$/;

  function rfcTipo(rfc) {
    rfc = String(rfc || '').trim().toUpperCase();
    if (GENERICOS.indexOf(rfc) >= 0) return null;
    if (RE_MORAL.test(rfc)) return 'moral';
    if (RE_FISICA.test(rfc)) return 'fisica';
    return null;
  }

  function regimenesPara(tipo) {
    return REGIMENES.filter(function (r) { return tipo === 'moral' ? r[3] : tipo === 'fisica' ? r[2] : true; });
  }

  function usosPara(regimen) {
    return USOS.filter(function (u) { return u[0] === 'S01' || CON_GASTOS.indexOf(regimen) >= 0; });
  }

  function nombreLimpio(n) { return String(n || '').toUpperCase().replace(/\s+/g, ' ').trim(); }

  // "S. A. de C. V." se compara sin puntos y con las siglas juntas: "SA DE CV"
  function sinPuntos(n) {
    var s = nombreLimpio(n).replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.replace(/(^| )((?:[A-ZÑ] )+[A-ZÑ])(?= |$)/g, function (_, antes, siglas) { return antes + siglas.replace(/ /g, ''); });
  }
  function tieneSocietario(n) {
    return RE_SOCIETARIO.test(sinPuntos(n));
  }

  // Quita "S.A. de C.V." y similares del final del nombre
  function quitarSocietario(n) {
    var s = nombreLimpio(n);
    var sin = sinPuntos(n);
    var m = sin.match(RE_SOCIETARIO);
    if (!m) return s;
    return sin.slice(0, sin.length - m[0].length).trim();
  }

  // Devuelve un texto de error o '' si todo está bien
  function validarReceptor(d) {
    var rfc = String(d.rfc || '').trim().toUpperCase();
    if (GENERICOS.indexOf(rfc) >= 0) return { campo: 'rfc', texto: 'Ese RFC es genérico. Necesitas tu RFC de la Constancia de Situación Fiscal.' };
    var tipo = rfcTipo(rfc);
    if (!tipo) return { campo: 'rfc', texto: 'Revisa tu RFC: 12 caracteres si es empresa, 13 si eres persona física, con una fecha válida.' };
    var nombre = nombreLimpio(d.nombre);
    if (nombre.length < 2) return { campo: 'nombre', texto: 'Escribe tu nombre o razón social como viene en tu Constancia.' };
    if (tieneSocietario(nombre)) return { campo: 'nombre', texto: 'Quita "S.A. de C.V." o similar: desde el CFDI 4.0 el nombre va sin el régimen societario.', arreglo: 'nombre' };
    if (!/^[0-9]{5}$/.test(String(d.cp || ''))) return { campo: 'cp', texto: 'El código postal fiscal tiene 5 números.' };
    if (!regimenesPara(tipo).some(function (r) { return r[0] === d.regimen; })) return { campo: 'regimen', texto: 'Elige el régimen fiscal que viene en tu Constancia.' };
    if (!usosPara(d.regimen).some(function (u) { return u[0] === d.uso; })) return { campo: 'uso', texto: 'Con tu régimen solo puedes usar "Sin efectos fiscales" (S01).' };
    var correo = String(d.correo || '').trim();
    if (correo && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) return { campo: 'correo', texto: 'Revisa tu correo.' };
    return null;
  }

  // ---------- Dinero en centavos enteros, sin errores de punto flotante ----------
  function aCentavos(x) { return Math.round(Number(x) * 100); }
  function fmt(c) {
    var s = String(Math.abs(c)).padStart(3, '0');
    return (c < 0 ? '-' : '') + s.slice(0, -2) + '.' + s.slice(-2);
  }
  function pesos(c) { return '$' + fmt(c).replace(/\B(?=(\d{3})+(?=\.))/g, ','); }

  // Precio con IVA incluido: base = importe ÷ 1.16 redondeado a 2 decimales (mitad hacia arriba); IVA = importe − base
  function desglosar(ticket) {
    var conceptos = ticket.conceptos.map(function (c) {
      var imp = aCentavos(c.importe);
      var base = Math.floor((imp * 100 * 2 + 116) / 232);
      return { cantidad: c.cantidad, descripcion: c.descripcion, importe: imp, base: base, iva: imp - base };
    });
    var subtotal = 0, iva = 0;
    conceptos.forEach(function (c) { subtotal += c.base; iva += c.iva; });
    return { conceptos: conceptos, subtotal: subtotal, iva: iva, total: subtotal + iva };
  }

  // ---------- Importe con letra ----------
  var U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
    'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO',
    'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  var D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  var C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function menorMil(n) {
    if (n === 100) return 'CIEN';
    var partes = [];
    if (n >= 100) partes.push(C[Math.floor(n / 100)]);
    var r = n % 100;
    if (r > 0 && r < 30) partes.push(U[r]);
    else if (r >= 30) partes.push(D[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : ''));
    return partes.join(' ');
  }
  function enLetras(n) {
    if (n === 0) return 'CERO';
    var partes = [];
    var mill = Math.floor(n / 1000000), resto = n % 1000000;
    if (mill) partes.push(mill === 1 ? 'UN MILLÓN' : menorMil(mill) + ' MILLONES');
    var miles = Math.floor(resto / 1000), unidades = resto % 1000;
    if (miles) partes.push(miles === 1 ? 'MIL' : menorMil(miles) + ' MIL');
    if (unidades) partes.push(menorMil(unidades));
    return partes.join(' ') + (mill && !resto ? ' DE' : '');
  }
  function importeConLetra(centavos) {
    var p = Math.floor(centavos / 100), c = centavos % 100;
    return enLetras(p) + (p === 1 ? ' PESO ' : ' PESOS ') + String(c).padStart(2, '0') + '/100 M.N.';
  }

  // ---------- XML del CFDI 4.0 ----------
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function valorUnitario(c) { return (c.importe / 100 / 1.16 / c.cantidad).toFixed(6); }
  var CLAVE_PROD = '01010101', CLAVE_UNIDAD = 'H87';

  function xml(ticket, factura, receptor) {
    var d = desglosar(ticket);
    var fecha = String(factura.fecha).slice(0, 19);
    var folio = String(factura.folio);
    var out = [];
    out.push('<?xml version="1.0" encoding="UTF-8"?>');
    out.push('<!-- FACTURA DE PRACTICA DE UN CURSO. NO TIENE VALIDEZ FISCAL. -->');
    out.push('<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"');
    out.push('  Version="4.0" Serie="' + esc(factura.serie) + '" Folio="' + esc(folio) + '" Fecha="' + fecha + '" Sello="PRACTICA-SIN-VALIDEZ"');
    out.push('  FormaPago="' + esc(ticket.forma_pago) + '" NoCertificado="00000000000000000000" Certificado="PRACTICA" SubTotal="' + fmt(d.subtotal) + '"');
    out.push('  Moneda="MXN" Total="' + fmt(d.total) + '" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="' + esc(ticket.cp_sucursal) + '">');
    out.push('  <cfdi:Emisor Rfc="' + EMISOR.rfc + '" Nombre="' + EMISOR.nombre + '" RegimenFiscal="' + EMISOR.regimen + '"/>');
    out.push('  <cfdi:Receptor Rfc="' + esc(receptor.rfc) + '" Nombre="' + esc(receptor.nombre) + '" DomicilioFiscalReceptor="' + esc(receptor.cp) + '"');
    out.push('    RegimenFiscalReceptor="' + esc(receptor.regimen) + '" UsoCFDI="' + esc(receptor.uso) + '"/>');
    out.push('  <cfdi:Conceptos>');
    d.conceptos.forEach(function (c) {
      out.push('    <cfdi:Concepto ClaveProdServ="' + CLAVE_PROD + '" Cantidad="' + c.cantidad + '" ClaveUnidad="' + CLAVE_UNIDAD + '" Unidad="Pieza"');
      out.push('      Descripcion="' + esc(c.descripcion) + '" ValorUnitario="' + valorUnitario(c) + '" Importe="' + fmt(c.base) + '" ObjetoImp="02">');
      out.push('      <cfdi:Impuestos><cfdi:Traslados>');
      out.push('        <cfdi:Traslado Base="' + fmt(c.base) + '" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="' + fmt(c.iva) + '"/>');
      out.push('      </cfdi:Traslados></cfdi:Impuestos>');
      out.push('    </cfdi:Concepto>');
    });
    out.push('  </cfdi:Conceptos>');
    out.push('  <cfdi:Impuestos TotalImpuestosTrasladados="' + fmt(d.iva) + '"><cfdi:Traslados>');
    out.push('    <cfdi:Traslado Base="' + fmt(d.subtotal) + '" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="' + fmt(d.iva) + '"/>');
    out.push('  </cfdi:Traslados></cfdi:Impuestos>');
    out.push('  <cfdi:Complemento>');
    out.push('    <tfd:TimbreFiscalDigital Version="1.1" UUID="' + esc(factura.uuid) + '" FechaTimbrado="' + fecha + '" RfcProvCertif="PRACTICA"');
    out.push('      SelloCFD="PRACTICA-SIN-VALIDEZ" NoCertificadoSAT="00000000000000000000" SelloSAT="PRACTICA-SIN-VALIDEZ"/>');
    out.push('  </cfdi:Complemento>');
    out.push('</cfdi:Comprobante>');
    return out.join('\n') + '\n';
  }

  function cadenaOriginal(ticket, factura, receptor) {
    var d = desglosar(ticket);
    var p = ['4.0', factura.serie, factura.folio, String(factura.fecha).slice(0, 19), ticket.forma_pago, '00000000000000000000',
      fmt(d.subtotal), 'MXN', fmt(d.total), 'I', '01', 'PUE', ticket.cp_sucursal,
      EMISOR.rfc, EMISOR.nombre, EMISOR.regimen,
      receptor.rfc, receptor.nombre, receptor.cp, receptor.regimen, receptor.uso];
    d.conceptos.forEach(function (c) {
      p.push(CLAVE_PROD, c.cantidad, CLAVE_UNIDAD, 'Pieza', c.descripcion, valorUnitario(c), fmt(c.base), '02', fmt(c.base), '002', 'Tasa', '0.160000', fmt(c.iva));
    });
    p.push(fmt(d.subtotal), '002', 'Tasa', '0.160000', fmt(d.iva), fmt(d.iva));
    return '||' + p.join('|') + '||';
  }

  var api = {
    EMISOR: EMISOR, REGIMENES: REGIMENES, USOS: USOS, FORMAS_PAGO: FORMAS_PAGO,
    rfcTipo: rfcTipo, regimenesPara: regimenesPara, usosPara: usosPara,
    nombreLimpio: nombreLimpio, tieneSocietario: tieneSocietario, quitarSocietario: quitarSocietario,
    validarReceptor: validarReceptor, desglosar: desglosar, fmt: fmt, pesos: pesos, aCentavos: aCentavos,
    importeConLetra: importeConLetra, xml: xml, cadenaOriginal: cadenaOriginal, valorUnitario: valorUnitario
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CFDI = api;
})(typeof window !== 'undefined' ? window : this);
