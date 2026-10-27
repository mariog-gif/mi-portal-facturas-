# Página de lanzamiento con lista de interesados

Material de la **Actividad 1 de la Sesión 7** de *Claude for Business*.

El ejemplo es la **Chamarra Ligera Girasol** de Boutique El Girasol, una tienda **inventada**. Puedes usar tu propio producto: dile a Claude cuál es y con qué marca.

## Qué hay aquí

| Carpeta o archivo | Para qué |
|---|---|
| `CLAUDE.md` | Lo que Claude necesita saber para construir la página |
| `.claude/skills/marca-girasol/` | Skill con la marca y los datos del lanzamiento |
| `.claude/agents/revisor-seguridad.md` | Subagente que revisa la página antes del Pull Request; solo puede leer |
| `supabase/esquema.sql` | La tabla de interesados, sus permisos, el contador y el aviso a Claude |
| `supabase/tarea_correos.md` | El prompt de la tarea programada que manda los correos de bienvenida |
| `sitio/` | Lo que publica Netlify. Aquí construye Claude la página. Ya trae las fotos en `sitio/img/` |
| `respaldo/sitio/` | Una página terminada y probada, por si la tuya no queda |
| `netlify.toml` | Le dice a Netlify que publique la carpeta `sitio/` |

## Regla de oro con Netlify

Cada publicación de `main` gasta créditos del plan gratis. Los cambios se hacen en una rama y se revisan en la vista previa del Pull Request, que es gratis. Se fusiona una sola vez, cuando ya quedó.

## Portal de facturación OCSO (práctica)

`sitio/` ahora es el portal de facturación de OCSO: la persona escribe el folio y el total de su ticket (o lo escanea), captura sus datos fiscales y descarga su CFDI 4.0 de práctica en PDF y XML. Está pensado para usarse con una sola mano: los botones van abajo y los campos usan el teclado correcto.

| Archivo | Para qué |
|---|---|
| `.claude/skills/reglas-cfdi/` | Reglas del CFDI 4.0 que sigue el portal |
| `.claude/agents/revisor-fiscal.md` | Subagente que revisa el portal contra esas reglas; solo lee |
| `supabase/facturacion.sql` | Tablas `tickets` y `facturas`, permisos y las funciones `buscar_ticket` y `facturar_ticket` |
| `supabase/tickets_practica.sql` | Los 12 tickets de `tickets_OCSO.pdf` (el 217-0044390 es de septiembre: debe rechazarse por fuera del mes) |
| `sitio/cfdi.js`, `qr.js`, `pdf.js` | Reglas fiscales, código QR y PDF, sin librerías |

La página nunca lee las tablas: solo llama a las dos funciones con la llave publishable. Los datos de `esquema.sql` (lista de interesados) no se usan en este portal.
