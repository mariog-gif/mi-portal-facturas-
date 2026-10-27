// Portal de facturación OCSO (práctica). Solo usa RPC de Supabase con fetch: nunca lee las tablas.
(function () {
  'use strict';
  var C = window.CFDI, CFG = window.CONFIG;
  var $ = function (id) { return document.getElementById(id); };

  // Perfiles de práctica: RFC de prueba que publica el SAT (de mis_datos_fiscales.md)
  var PERFILES_PRACTICA = [
    { etiqueta: 'Yo (práctica)', rfc: 'XOJI740919U48', nombre: 'INGRID XODAR JIMENEZ', regimen: '612', uso: 'G03', cp: '76028', correo: 'tu-correo@ejemplo.com' },
    { etiqueta: 'Mi empresa (práctica)', rfc: 'URE180429TM6', nombre: 'UNIVERSIDAD ROBOTICA ESPAÑOLA', regimen: '601', uso: 'G03', cp: '86991', correo: 'compras@ejemplo.com' }
  ];

  var MENSAJES = {
    no_existe: 'No encontramos ese ticket. Revisa que el folio y el total estén igual que en tu ticket.',
    ya_facturado: 'Este ticket ya fue facturado. Cada ticket se factura una sola vez.',
    fuera_de_mes: 'Este ticket es de un mes anterior. Solo se factura dentro del mes de la compra.',
    rfc_generico: 'Ese RFC es genérico. Necesitas tu RFC de la Constancia de Situación Fiscal.',
    rfc_invalido: 'Revisa tu RFC.',
    nombre_invalido: 'Revisa tu nombre o razón social.',
    nombre_con_regimen: 'Quita "S.A. de C.V." o similar del nombre.',
    cp_invalido: 'Revisa tu código postal fiscal.',
    regimen_invalido: 'Ese régimen no corresponde a tu RFC.',
    uso_invalido: 'Ese uso del CFDI no se puede con tu régimen.',
    correo_invalido: 'Revisa tu correo.',
    datos_incompletos: 'Faltan datos. Revisa el formulario.',
    red: 'No pudimos conectar. Revisa tu internet e inténtalo de nuevo.'
  };

  var estado = { ticket: null, factura: null, receptor: null, tocados: {} };

  // ---------- Utilidades ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'texto') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function guardar(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ } }
  function leer(clave, defecto) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; } }

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fechaCorta(iso) {
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    return m ? Number(m[3]) + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[1] + ', ' + m[4] + ':' + m[5] : '';
  }

  function ir(paso) {
    ['paso1', 'paso2', 'paso3'].forEach(function (id) { $(id).hidden = id !== paso; });
    window.scrollTo(0, 0);
    var t = $(paso).querySelector('h1'); if (t) t.focus({ preventScroll: true });
  }

  function rpc(nombre, cuerpo) {
    return fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: { apikey: CFG.SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }

  function mostrarError(id, texto, arreglo) {
    var el = $(id), clave = texto + '|' + (arreglo ? 1 : 0);
    if (el.dataset.clave === clave && !el.hidden === !!texto) return;   // sin cambios: no se redibuja (si no, se pierde el toque en "Quitarlo")
    el.dataset.clave = clave; el.textContent = '';
    if (!texto) { el.hidden = true; return; }
    el.appendChild(document.createTextNode(texto));
    if (arreglo) {
      var b = h('button', { type: 'button', texto: 'Quitarlo' });
      b.addEventListener('click', function () { $('nombre').value = C.quitarSocietario($('nombre').value); validar(true); });
      el.appendChild(b);
    }
    el.hidden = false;
  }

  // ---------- Paso 1: ticket ----------
  var folio = $('folio'), total = $('total');

  function leerQR(texto) {
    var p = String(texto).split('|');
    return p.length >= 4 && p[0] === 'OCSO' ? { folio: p[1], total: p[3] } : null;
  }
  folio.addEventListener('input', function () {
    var qr = leerQR(folio.value);
    if (qr) { folio.value = qr.folio; total.value = qr.total; return; }
    var d = folio.value.replace(/\D/g, '').slice(0, 10);
    folio.value = d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d;
  });
  total.addEventListener('input', function () { total.value = total.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); });

  $('form-ticket').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = parseFloat(total.value);
    if (!/^\d{3}-\d{7}$/.test(folio.value)) return errorTicket('El folio tiene 3 números, un guion y 7 números. Ejemplo: 104-0012457.', folio);
    if (!(t > 0)) return errorTicket('Escribe el total del ticket. Ejemplo: 86.00.', total);
    errorTicket('');
    var b = $('buscar'); b.disabled = true; b.textContent = 'Buscando…';
    rpc('buscar_ticket', { p_folio: folio.value, p_total: t }).then(function (r) {
      if (r.estado !== 'ok') return errorTicket(MENSAJES[r.estado] || MENSAJES.no_existe);
      estado.ticket = r.ticket;
      pintarResumen(); ir('paso2');
    }).catch(function () { errorTicket(MENSAJES.red); }).then(function () { b.disabled = false; b.textContent = 'Buscar mi ticket'; });
  });
  function errorTicket(texto, campo) {
    mostrarError('error-ticket', texto);
    [folio, total].forEach(function (c) { c.setAttribute('aria-invalid', campo === c ? 'true' : 'false'); });
    if (campo) campo.focus();
  }

  // Escáner: solo en navegadores que lo permiten (Chrome en Android, por ejemplo)
  var flujo = null, escaneando = false;
  if ('BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) $('escanear').hidden = false;
  $('escanear').addEventListener('click', function () {
    var detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (f) {
      flujo = f; escaneando = true;
      $('video').srcObject = f; $('video').play();
      $('escaner').showModal();
      (function ciclo() {
        if (!escaneando) return;
        detector.detect($('video')).then(function (cs) {
          var qr = cs.length && leerQR(cs[0].rawValue);
          if (qr) { folio.value = qr.folio; total.value = qr.total; cerrarEscaner(); $('form-ticket').requestSubmit(); return; }
          setTimeout(ciclo, 250);
        }).catch(function () { setTimeout(ciclo, 400); });
      })();
    }).catch(function () { errorTicket('No pudimos abrir la cámara. Escribe el folio y el total.'); });
  });
  function cerrarEscaner() {
    escaneando = false;
    if (flujo) flujo.getTracks().forEach(function (t) { t.stop(); });
    flujo = null; if ($('escaner').open) $('escaner').close();
  }
  $('cerrar-escaner').addEventListener('click', cerrarEscaner);
  $('escaner').addEventListener('close', cerrarEscaner);

  // ---------- Paso 2: datos fiscales ----------
  function pintarResumen() {
    var t = estado.ticket, el = $('resumen'); el.textContent = '';
    el.appendChild(h('div', { class: 'meta', texto: t.sucursal + ' · ' + fechaCorta(t.fecha) + ' · Folio ' + t.folio }));
    t.conceptos.forEach(function (c) {
      el.appendChild(h('div', { class: 'fila-t' }, h('span', { texto: c.cantidad + ' × ' + c.descripcion }), h('span', { texto: C.pesos(C.aCentavos(c.importe)) })));
    });
    el.appendChild(h('div', { class: 'fila-t total' }, h('span', { texto: 'Total' }), h('span', { texto: C.pesos(C.aCentavos(t.total)) })));
  }

  function pintarPerfiles() {
    var cont = $('perfiles'); cont.textContent = '';
    var lista = [];
    var propio = leer('ocso_perfil', null);
    if (propio) lista.push(Object.assign({ etiqueta: 'Mis datos' }, propio));
    PERFILES_PRACTICA.forEach(function (p) { lista.push(p); });
    lista.forEach(function (p) {
      var b = h('button', { type: 'button', texto: p.etiqueta });
      b.addEventListener('click', function () { llenar(p); });
      cont.appendChild(b);
    });
  }

  function llenar(p) {
    $('rfc').value = p.rfc || ''; $('nombre').value = p.nombre || ''; $('cp').value = p.cp || ''; $('correo').value = p.correo || '';
    actualizarRegimen(p.regimen); actualizarUso(p.uso);
    estado.tocados = { rfc: 1, nombre: 1, cp: 1, regimen: 1, uso: 1, correo: 1 };
    validar(false);
  }

  function opciones(sel, lista, elegido, vacio) {
    sel.textContent = '';
    sel.appendChild(h('option', { value: '', texto: vacio }));
    lista.forEach(function (o) { sel.appendChild(h('option', { value: o[0], texto: o[0] + ' · ' + o[1] })); });
    sel.value = lista.some(function (o) { return o[0] === elegido; }) ? elegido : '';
  }
  function actualizarRegimen(elegido) {
    var tipo = C.rfcTipo($('rfc').value);
    var sel = $('regimen');
    if (!tipo) { opciones(sel, [], '', 'Primero escribe tu RFC'); sel.disabled = true; }
    else { sel.disabled = false; opciones(sel, C.regimenesPara(tipo), elegido === undefined ? sel.value : elegido, 'Elige tu régimen'); }
    actualizarUso();
  }
  function actualizarUso(elegido) {
    var reg = $('regimen').value, sel = $('uso');
    if (!reg) { opciones(sel, [], '', 'Primero elige tu régimen'); sel.disabled = true; return; }
    sel.disabled = false;
    var lista = C.usosPara(reg);
    var previo = elegido === undefined ? sel.value : elegido;
    opciones(sel, lista, previo, 'Elige el uso');
    if (!sel.value) sel.value = lista.some(function (u) { return u[0] === 'G03'; }) ? 'G03' : lista[0][0];
  }

  function datosFormulario() {
    return { rfc: $('rfc').value.trim().toUpperCase(), nombre: C.nombreLimpio($('nombre').value), cp: $('cp').value.trim(),
      regimen: $('regimen').value, uso: $('uso').value, correo: $('correo').value.trim() };
  }

  // Muestra el primer error de los campos que la persona ya tocó (o de todos, si va a enviar)
  function validar(todos) {
    var d = datosFormulario(), e = C.validarReceptor(d), campo = e && e.campo;
    ['rfc', 'nombre', 'cp', 'regimen', 'uso', 'correo'].forEach(function (c) {
      var activo = e && e.campo === c && (todos || estado.tocados[c]);
      mostrarError('error-' + c, activo ? e.texto : '', activo && e.arreglo);
      $(c).setAttribute('aria-invalid', activo ? 'true' : 'false');
    });
    var tipo = C.rfcTipo(d.rfc);
    $('pista-rfc').textContent = tipo === 'moral' ? 'RFC de persona moral (empresa)' : tipo === 'fisica' ? 'RFC de persona física' : '';
    return e ? campo : null;
  }

  $('rfc').addEventListener('input', function () {
    var v = $('rfc').value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '');
    $('rfc').value = v; actualizarRegimen(); estado.tocados.rfc = v.length >= 12; validar(false);
  });
  $('nombre').addEventListener('input', function () { $('nombre').value = $('nombre').value.toUpperCase(); validar(false); });
  $('cp').addEventListener('input', function () { $('cp').value = $('cp').value.replace(/\D/g, '').slice(0, 5); estado.tocados.cp = $('cp').value.length === 5; validar(false); });
  $('regimen').addEventListener('change', function () { estado.tocados.regimen = 1; actualizarUso(); validar(false); });
  $('uso').addEventListener('change', function () { estado.tocados.uso = 1; validar(false); });
  ['rfc', 'nombre', 'cp', 'correo'].forEach(function (c) { $(c).addEventListener('blur', function () { estado.tocados[c] = 1; validar(false); }); });

  $('atras').addEventListener('click', function () { ir('paso1'); });

  $('form-fiscal').addEventListener('submit', function (e) {
    e.preventDefault();
    var campo = validar(true);
    if (campo) { $(campo).focus(); return; }
    var d = datosFormulario(), dl = $('datos-confirmar'), t = estado.ticket;
    dl.textContent = '';
    var reg = C.REGIMENES.filter(function (r) { return r[0] === d.regimen; })[0];
    var uso = C.USOS.filter(function (u) { return u[0] === d.uso; })[0];
    [['Ticket', t.folio + ' · ' + C.pesos(C.aCentavos(t.total))], ['RFC', d.rfc], ['Nombre', d.nombre], ['Código postal', d.cp],
      ['Régimen', d.regimen + ' · ' + reg[1]], ['Uso del CFDI', d.uso + ' · ' + uso[1]]].forEach(function (par) {
      dl.appendChild(h('div', {}, h('dt', { texto: par[0] }), h('dd', { texto: par[1] })));
    });
    mostrarError('error-confirmar', '');
    $('confirmar').showModal();
  });
  $('corregir').addEventListener('click', function () { $('confirmar').close(); });

  $('si-facturar').addEventListener('click', function () {
    var d = datosFormulario(), t = estado.ticket, b = $('si-facturar');
    b.disabled = true; b.textContent = 'Facturando…';
    rpc('facturar_ticket', { p_folio: t.folio, p_total: t.total, p_rfc: d.rfc, p_nombre: d.nombre, p_regimen: d.regimen, p_uso: d.uso, p_cp: d.cp, p_correo: d.correo || null })
      .then(function (r) {
        if (r.estado !== 'ok') {
          if (r.estado === 'ya_facturado' || r.estado === 'fuera_de_mes' || r.estado === 'no_existe') {
            $('confirmar').close(); errorTicket(MENSAJES[r.estado]); ir('paso1'); return;
          }
          mostrarError('error-confirmar', MENSAJES[r.estado] || 'No pudimos facturar. Revisa tus datos.'); return;
        }
        estado.factura = r.factura; estado.receptor = d;
        if ($('guardar').checked) guardar('ocso_perfil', d);
        var hechas = leer('ocso_facturas', []);
        hechas.unshift({ ticket: r.ticket, factura: r.factura, receptor: d });
        guardar('ocso_facturas', hechas.slice(0, 10));
        $('confirmar').close(); pintarExito(r.ticket, r.factura, d); ir('paso3');
      })
      .catch(function () { mostrarError('error-confirmar', MENSAJES.red); })
      .then(function () { b.disabled = false; b.textContent = 'Sí, facturar'; });
  });

  // ---------- Paso 3: listo ----------
  function pintarExito(t, f, d) {
    var dl = $('datos-factura'); dl.textContent = '';
    [['Serie y folio', f.serie + '-' + f.folio], ['Folio fiscal (UUID)', f.uuid], ['Total', C.pesos(C.aCentavos(t.total))], ['Receptor', d.nombre + ' · ' + d.rfc]].forEach(function (par) {
      dl.appendChild(h('div', {}, h('dt', { texto: par[0] }), h('dd', { texto: par[1] })));
    });
    estado.ticket = t; estado.factura = f; estado.receptor = d;
    $('compartir').hidden = !(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.pdf', { type: 'application/pdf' })] }));
  }

  function archivos(t, f, d) {
    var base = 'Factura_' + f.serie + '-' + f.folio;
    return { pdf: new File([window.PDFCFDI.generar(t, f, d)], base + '.pdf', { type: 'application/pdf' }),
      xml: new File([C.xml(t, f, d)], base + '.xml', { type: 'application/xml' }) };
  }
  function bajar(archivo) {
    var url = URL.createObjectURL(archivo), a = h('a', { href: url, download: archivo.name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  $('bajar-pdf').addEventListener('click', function () { bajar(archivos(estado.ticket, estado.factura, estado.receptor).pdf); });
  $('bajar-xml').addEventListener('click', function () { bajar(archivos(estado.ticket, estado.factura, estado.receptor).xml); });
  $('compartir').addEventListener('click', function () {
    var a = archivos(estado.ticket, estado.factura, estado.receptor);
    navigator.share({ files: [a.pdf, a.xml], title: 'Factura de práctica OCSO' }).catch(function () { /* la persona canceló */ });
  });
  $('otro').addEventListener('click', function () {
    folio.value = ''; total.value = ''; errorTicket(''); pintarHechas(); ir('paso1');
  });

  // Facturas hechas en este celular (se guardan solo aquí, no en el servidor)
  function pintarHechas() {
    var hechas = leer('ocso_facturas', []), ul = $('lista-hechas'); ul.textContent = '';
    $('hechas').hidden = !hechas.length;
    hechas.forEach(function (x) {
      var li = h('li', {}, h('strong', { texto: x.factura.serie + '-' + x.factura.folio + ' · ' + C.pesos(C.aCentavos(x.ticket.total)) }),
        h('span', { texto: 'Ticket ' + x.ticket.folio + ' · ' + x.receptor.nombre }));
      var acc = h('div', { class: 'acciones' });
      [['PDF', 'pdf'], ['XML', 'xml']].forEach(function (par) {
        var b = h('button', { type: 'button', texto: 'Descargar ' + par[0] });
        b.addEventListener('click', function () { bajar(archivos(x.ticket, x.factura, x.receptor)[par[1]]); });
        acc.appendChild(b);
      });
      li.appendChild(acc); ul.appendChild(li);
    });
  }

  actualizarRegimen(''); pintarPerfiles(); pintarHechas();
})();
