# Página de lanzamiento con lista de interesados

Este repositorio es el material de la Actividad 1 de la Sesión 7 de Claude for Business.
El ejemplo es la **Chamarra Ligera Girasol** de Boutique El Girasol (tienda inventada). La marca y los datos del producto están en la Skill `marca-girasol`. Si la persona trae su propio producto, usa sus datos y su marca, y conserva todo lo demás.

## Qué se construye

Una página de lanzamiento de un producto, primero para celular, que impresione:

1. **Portada:** el producto en grande con efecto 3D (se inclina con el mouse o al mover el celular; en iPhone, pide el permiso de movimiento con `DeviceOrientationEvent.requestPermission()` al primer toque; respeta `prefers-reduced-motion`), el nombre, una frase y el botón "Quiero que me avisen".
2. **Cuenta regresiva** al lanzamiento, en vivo.
3. **Contador de la lista:** "Ya somos N en la lista", que se actualiza solo cada 15 segundos con la función `contar_interesados`.
4. **Por qué te va a gustar:** 3 o 4 beneficios con íconos.
5. **Colores:** al tocar un color cambia la foto del producto.
6. **Registro:** nombre, correo, WhatsApp (opcional), la opción (talla, en el ejemplo) y "¿Cuándo piensas comprar?" (Este mes · En los próximos 3 meses · Solo estoy viendo). Al registrarse: una animación de festejo, "Te mandamos un correo de bienvenida en unos minutos" y el contador sube.
7. **Preguntas frecuentes** y el **aviso de privacidad** corto.

Nada de reseñas ni testimonios inventados.

## Reglas de la casa

- Todo el sitio vive en `sitio/`: `index.html`, `estilos.css`, `app.js`, `config.js` y las fotos en `sitio/img/`. HTML, CSS y JavaScript sin compilar. **No uses** frameworks, `npm` ni pasos de compilación. Solo las letras de Google Fonts que diga la Skill de marca.
- La página pesa poco: fotos en `.webp`, sin videos. Netlify cobra créditos por cada GB que se descarga.
- **Supabase** con `fetch`, sin librerías:
  - Registrar: `POST https://<proyecto>.supabase.co/rest/v1/interesados` con encabezados `apikey`, `Content-Type: application/json` y `Prefer: return=minimal`, y solo las columnas `nombre`, `correo`, `whatsapp`, `opcion`, `cuando`.
  - Contador: `POST /rest/v1/rpc/contar_interesados`.
  - Con una llave `sb_publishable_...` no mandes `Authorization`.
  - Si el correo ya está registrado, la base responde `409` (código `23505`): dile "Ya estás en la lista con ese correo".
- **Seguridad:** solo la llave *publishable* va en `sitio/config.js`. Nunca la secreta (`sb_secret_...`) ni la `service_role`. La página **nunca** lee la tabla `interesados`: el público solo puede registrarse y ver el número.
- La columna `estado_correo` (`pendiente`, `enviado`, `invalido`, `rebotado`, sin acento) la llena la tarea programada de Claude, no la página.
- Textos en español de México, con la voz de la marca. Sin guiones largos.

## La base de datos

- `supabase/esquema.sql` crea la tabla, sus permisos, el contador y el aviso a Claude. Se corre una vez con el conector de Supabase en el proyecto que diga la persona.
- `supabase/tarea_correos.md` trae el prompt de la tarea programada que manda los correos de bienvenida y cómo conectarla.
- El asesor de seguridad de Supabase avisa que el público puede ejecutar `contar_interesados`. Es a propósito: solo regresa el número.

## Cómo se trabaja

- Cada cambio va en una rama y se revisa en la vista previa del Pull Request. **Nunca** directo en `main`: cada publicación de `main` en Netlify gasta créditos.
- Antes de abrir el Pull Request, pide al subagente `revisor-seguridad` que revise.
- `respaldo/sitio/` es una página terminada y probada. **No** la copies ni la leas para construir, salvo que la persona lo pida ("usa el respaldo").
