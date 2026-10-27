(function () {
  "use strict";
  var C = window.CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Efecto 3D ---------- */
  var escenario = $("escenario"), tarjeta = $("tarjeta3d"), pista = $("pista3d");
  var MAX = 14;
  function inclinar(x, y) { // x, y entre -1 y 1
    tarjeta.style.transform = "rotateY(" + (x * MAX).toFixed(1) + "deg) rotateX(" + (-y * MAX).toFixed(1) + "deg)";
  }
  function limpiar(n) { return Math.max(-1, Math.min(1, n)); }
  if (!reducir) {
    window.addEventListener("mousemove", function (e) {
      inclinar(limpiar((e.clientX / innerWidth - .5) * 2), limpiar((e.clientY / innerHeight - .5) * 2));
    });
    var activo = false;
    function alMover(e) {
      if (e.gamma == null) return;
      inclinar(limpiar(e.gamma / 30), limpiar((e.beta - 45) / 30));
    }
    function activar() {
      if (activo) return; activo = true;
      window.addEventListener("deviceorientation", alMover);
    }
    var DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      // iPhone: el permiso se pide con el primer toque
      pista.hidden = false; pista.textContent = "Toca la pantalla y mueve tu celular para verla de lado";
      var pedir = function () {
        DOE.requestPermission().then(function (r) {
          if (r === "granted") { activar(); pista.textContent = "Mueve tu celular para verla de lado"; }
          else pista.hidden = true;
        }).catch(function () { pista.hidden = true; });
      };
      window.addEventListener("touchend", pedir, { once: true });
    } else if (DOE && "ontouchstart" in window) {
      activar(); pista.hidden = false;
    }
  }

  /* ---------- Cuenta regresiva ---------- */
  var meta = new Date(C.LANZAMIENTO).getTime();
  function dos(n) { return String(n).padStart(2, "0"); }
  function tic() {
    var s = Math.max(0, Math.floor((meta - Date.now()) / 1000));
    $("cd-d").textContent = Math.floor(s / 86400);
    $("cd-h").textContent = dos(Math.floor(s % 86400 / 3600));
    $("cd-m").textContent = dos(Math.floor(s % 3600 / 60));
    $("cd-s").textContent = dos(s % 60);
  }
  tic(); setInterval(tic, 1000);

  /* ---------- Supabase ---------- */
  var cabeceras = { "apikey": C.SUPABASE_KEY, "Content-Type": "application/json" };
  var total = null;
  function pintar() { if (total != null) $("nLista").textContent = total.toLocaleString("es-MX"); }
  function contar() {
    return fetch(C.SUPABASE_URL + "/rest/v1/rpc/contar_interesados", {
      method: "POST", headers: cabeceras, body: "{}"
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (n) { if (typeof n === "number") { total = n; pintar(); } })
      .catch(function () { if (total == null) $("nLista").textContent = "varias"; });
  }
  contar();
  setInterval(function () { if (!document.hidden) contar(); }, 15000);

  /* ---------- Colores ---------- */
  var botones = document.querySelectorAll("#colores button");
  function elegirColor(b) {
    botones.forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
    [$("fotoColor"), $("fotoPortada")].forEach(function (img) {
      img.src = b.dataset.foto; img.alt = b.dataset.alt;
    });
    $("selColor").value = b.dataset.color;
  }
  botones.forEach(function (b) { b.addEventListener("click", function () { elegirColor(b); }); });
  $("selColor").addEventListener("change", function () {
    botones.forEach(function (b) { if (b.dataset.color === $("selColor").value) elegirColor(b); });
  });

  /* ---------- Registro ---------- */
  var forma = $("forma"), msg = $("mensaje");
  function error(t) { msg.className = "mensaje"; msg.textContent = t; }
  forma.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(forma);
    var nombre = (d.get("nombre") || "").trim(), correo = (d.get("correo") || "").trim();
    var wa = (d.get("whatsapp") || "").trim(), talla = d.get("talla"), color = d.get("color"), cuando = d.get("cuando");
    if (nombre.length < 2) return error("Escribe tu nombre.");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) return error("Revisa tu correo, parece que le falta algo.");
    if (wa && !/^[0-9 +()-]{8,20}$/.test(wa)) return error("Tu WhatsApp solo puede llevar números, espacios, + y ( ) -.");
    if (!talla) return error("Elige tu talla.");
    if (!cuando) return error("Cuéntanos cuándo piensas comprar.");
    var cuerpo = {
      nombre: nombre, correo: correo, whatsapp: wa || null,
      opcion: talla + " · " + color, cuando: cuando
    };
    var btn = $("enviar"); btn.disabled = true; error("");
    fetch(C.SUPABASE_URL + "/rest/v1/interesados", {
      method: "POST",
      headers: Object.assign({ "Prefer": "return=minimal" }, cabeceras),
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      if (r.ok) return exito();
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 409 || j.code === "23505") error("Ya estás en la lista con ese correo.");
        else error("No pudimos apuntarte. Intenta de nuevo en un momento.");
      });
    }).catch(function () {
      error("No hay conexión. Revisa tu internet e intenta de nuevo.");
    }).then(function () { btn.disabled = false; });
  });

  function exito() {
    forma.hidden = true; $("exito").hidden = false;
    $("exito").scrollIntoView({ block: "center", behavior: reducir ? "auto" : "smooth" });
    if (total != null) { total += 1; pintar(); }
    festejo();
    setTimeout(contar, 1500);
  }

  /* ---------- Festejo ---------- */
  function festejo() {
    if (reducir) return;
    var cv = $("confeti"), cx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    var cols = ["#F6B400", "#4E6B3A", "#3B2A20", "#F1E4CC", "#FFD966"];
    var ps = [];
    for (var i = 0; i < 120; i++) ps.push({
      x: innerWidth / 2, y: innerHeight * .6, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cols[i % cols.length]
    });
    var t0 = performance.now();
    (function cuadro(t) {
      cx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(function (p) {
        p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += p.va;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c;
        cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); cx.restore();
      });
      if (t - t0 < 3000) requestAnimationFrame(cuadro); else cx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }
})();
