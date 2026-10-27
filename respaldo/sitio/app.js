/* Página de lanzamiento · Chamarra Ligera Girasol (Claude for Business, Sesión 7, Actividad 1).
   Funciona sola: registra en Supabase y muestra el contador. Los correos los manda la tarea programada de Claude. */
(function () {
  "use strict";
  const CFG = window.LANZ_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Supabase ----------
  function encabezados(extra) {
    const h = Object.assign({ "Content-Type": "application/json", apikey: CFG.supabaseKey }, extra || {});
    if (CFG.supabaseKey && !CFG.supabaseKey.startsWith("sb_")) h.Authorization = "Bearer " + CFG.supabaseKey;
    return h;
  }
  const base = () => (CFG.supabaseUrl || "").replace(/\/$/, "");
  const listo = () => CFG.supabaseUrl && CFG.supabaseKey && !CFG.supabaseUrl.includes("TU-PROYECTO");

  async function contar() {
    if (!listo()) return null;
    try {
      const r = await fetch(base() + "/rest/v1/rpc/contar_interesados", { method: "POST", headers: encabezados(), body: "{}" });
      return r.ok ? Number(await r.json()) : null;
    } catch (e) { return null; }
  }
  async function registrar(datos) {
    const r = await fetch(base() + "/rest/v1/interesados", { method: "POST", headers: encabezados({ Prefer: "return=minimal" }), body: JSON.stringify(datos) });
    if (r.ok) return { ok: true };
    let info = {}; try { info = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (r.status === 409 || info.code === "23505") return { ok: false, mensaje: "Ya estás en la lista con ese correo. ¡Te avisamos!" };
    if (info.code === "23514") return { ok: false, mensaje: "Revisa tus datos: el correo o el WhatsApp no tienen el formato correcto." };
    return { ok: false, mensaje: "No pudimos registrarte en este momento. Intenta de nuevo en un minuto." };
  }

  // ---------- Contador animado ----------
  let mostrado = 0;
  function animarNumero(hasta) {
    const el = $("cuantos"); if (hasta == null) { el.textContent = "…"; return; }
    const desde = mostrado; mostrado = hasta;
    if (quieto || desde === hasta) { el.textContent = hasta.toLocaleString("es-MX"); return; }
    const t0 = performance.now(), dur = 900;
    (function paso(t) {
      const k = Math.min(1, (t - t0) / dur), v = Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - k, 3)));
      el.textContent = v.toLocaleString("es-MX"); if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  async function refrescar() { const n = await contar(); if (n != null) animarNumero(n); else if (!mostrado) $("lista").textContent = "Sé de las primeras personas en la lista"; }
  refrescar(); setInterval(() => { if (!document.hidden) refrescar(); }, 15000);

  // ---------- Cuenta regresiva ----------
  const meta = new Date(CFG.fechaLanzamiento || "2026-11-14T10:00:00-06:00").getTime();
  const dos = (n) => String(n).padStart(2, "0");
  function reloj() {
    let s = Math.max(0, Math.floor((meta - Date.now()) / 1000));
    if (s === 0) { document.querySelector(".reloj").innerHTML = '<div style="min-width:auto"><b>¡Ya llegó!</b><span>En tiendas y en línea</span></div>'; return false; }
    $("r-dias").textContent = dos(Math.floor(s / 86400)); s %= 86400;
    $("r-horas").textContent = dos(Math.floor(s / 3600)); s %= 3600;
    $("r-min").textContent = dos(Math.floor(s / 60)); $("r-seg").textContent = dos(s % 60);
    return true;
  }
  if (reloj()) { const id = setInterval(() => { if (!reloj()) clearInterval(id); }, 1000); }

  // ---------- Efecto 3D ----------
  const tarjeta = $("tarjeta3d"), escena = $("escena");
  function inclinar(x, y) { // x, y entre -1 y 1
    tarjeta.style.setProperty("--ry", (x * 12).toFixed(2) + "deg");
    tarjeta.style.setProperty("--rx", (-y * 10).toFixed(2) + "deg");
    tarjeta.style.setProperty("--gx", (50 + x * 40).toFixed(0) + "%");
    tarjeta.style.setProperty("--gy", (30 + y * 40).toFixed(0) + "%");
  }
  if (!quieto) {
    escena.addEventListener("pointermove", (e) => { const r = escena.getBoundingClientRect(); inclinar(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1); });
    escena.addEventListener("pointerleave", () => inclinar(0, 0));
    const mover = () => window.addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return; inclinar(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
    });
    // En iPhone el movimiento pide permiso, y solo se puede pedir con un toque.
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
      document.addEventListener("click", () => {
        DeviceOrientationEvent.requestPermission().then((r) => { if (r === "granted") mover(); }).catch(() => {});
      }, { once: true });
    } else { mover(); }
  }

  // ---------- Colores ----------
  document.querySelectorAll(".muestra").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".muestra").forEach((x) => { x.classList.remove("activa"); x.setAttribute("aria-checked", "false"); });
    b.classList.add("activa"); b.setAttribute("aria-checked", "true");
    const foto = $("foto"); foto.classList.add("cambiando");
    setTimeout(() => { foto.src = b.dataset.foto; foto.alt = "Chamarra Ligera Girasol color " + b.dataset.nombre.toLowerCase(); foto.classList.remove("cambiando"); }, 200);
    if (!quieto) document.getElementById("inicio").scrollIntoView({ behavior: "smooth" });
  }));

  // ---------- Aparecer al bajar ----------
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }), { threshold: .15 }) : null;
  document.querySelectorAll(".aparece").forEach((el) => io ? io.observe(el) : el.classList.add("visible"));

  // ---------- Registro ----------
  const forma = $("forma");
  forma.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const msg = $("mensaje"), btn = $("enviar");
    const nombre = $("nombre").value.trim().replace(/\s+/g, " ");
    const correo = $("correo").value.trim().toLowerCase();
    const whatsapp = $("whatsapp").value.trim();
    const opcion = (forma.querySelector('input[name="opcion"]:checked') || {}).value || null;
    const cuando = $("cuando").value;
    ["nombre", "correo", "whatsapp"].forEach((id) => $(id).removeAttribute("aria-invalid"));
    if (nombre.length < 2) { msg.textContent = "Escribe tu nombre."; $("nombre").setAttribute("aria-invalid", "true"); $("nombre").focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) { msg.textContent = "Revisa tu correo: le falta algo."; $("correo").setAttribute("aria-invalid", "true"); $("correo").focus(); return; }
    if (whatsapp && !/^[0-9 +()-]{8,20}$/.test(whatsapp)) { msg.textContent = "El WhatsApp solo lleva números, de 10 dígitos o más."; $("whatsapp").setAttribute("aria-invalid", "true"); $("whatsapp").focus(); return; }
    if (!listo()) { msg.textContent = "La página todavía no está conectada a la base de datos (config.js)."; return; }
    msg.textContent = ""; btn.disabled = true; btn.textContent = "Registrando…";
    try {
      const r = await registrar({ nombre, correo, whatsapp: whatsapp || null, opcion, cuando });
      if (!r.ok) { msg.textContent = r.mensaje; return; }
      forma.hidden = true; $("gracias").hidden = false;
      $("gracias-titulo").textContent = "¡Ya estás en la lista, " + nombre.split(" ")[0] + "!";
      $("gracias").scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "center" });
      confeti(); refrescar();
    } catch (e) { msg.textContent = "Sin conexión. Revisa tu internet e intenta de nuevo."; }
    finally { btn.disabled = false; btn.textContent = "Quiero que me avisen"; }
  });

  // ---------- Confeti de pétalos ----------
  function confeti() {
    if (quieto) return;
    const cv = $("confeti"), cx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.scale(dpr, dpr);
    const colores = ["#F6B400", "#FFD54A", "#4E6B3A", "#3B2A20", "#F1E4CC"];
    const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .55, vx: (Math.random() - .5) * 12, vy: -Math.random() * 14 - 6, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: colores[Math.floor(Math.random() * colores.length)] }));
    const t0 = performance.now();
    (function cuadro(t) {
      cx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.beginPath(); cx.ellipse(0, 0, p.r, p.r * .45, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(cuadro); else cx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }
})();
