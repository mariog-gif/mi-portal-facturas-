-- =====================================================================
-- Portal de facturación OCSO (práctica) · tablas, permisos y funciones
-- Se corre una sola vez en el proyecto de Supabase. Es seguro volver a correrlo.
-- Los CFDI de práctica NO tienen validez fiscal.
-- =====================================================================

-- ---------- Tickets de la tienda (los carga la tienda, nunca la página) ----------
create table if not exists public.tickets (
  folio text primary key check (folio ~ '^[0-9]{3}-[0-9]{7}$'),
  sucursal text not null,
  cp_sucursal text not null check (cp_sucursal ~ '^[0-9]{5}$'),
  fecha timestamp not null,                         -- hora de México
  total numeric(10,2) not null check (total > 0),
  forma_pago text not null check (forma_pago in ('01', '04', '28')),   -- efectivo, crédito, débito
  conceptos jsonb not null                          -- [{cantidad, descripcion, importe}] con IVA incluido
);

-- ---------- Facturas emitidas: un ticket solo se factura una vez ----------
create table if not exists public.facturas (
  id bigint generated always as identity primary key,
  folio bigint generated always as identity (start with 1) unique,
  folio_ticket text not null unique references public.tickets (folio),
  uuid uuid not null default gen_random_uuid(),
  fecha timestamp not null,
  rfc text not null,
  nombre text not null,
  regimen text not null,
  uso text not null,
  cp text not null,
  correo text
);

alter table public.tickets enable row level security;
alter table public.facturas enable row level security;
revoke all on public.tickets from anon, authenticated;
revoke all on public.facturas from anon, authenticated;
-- Sin políticas para el público: la página no puede leer ni escribir estas tablas directamente.

-- ---------- Buscar un ticket: pide folio Y total, y no regresa nada si no coinciden ----------
create or replace function public.buscar_ticket(p_folio text, p_total numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.tickets; ahora timestamp := (now() at time zone 'America/Mexico_City');
begin
  select * into t from public.tickets where folio = upper(trim(p_folio)) and total = p_total;
  if not found then return jsonb_build_object('estado', 'no_existe'); end if;
  if exists (select 1 from public.facturas where folio_ticket = t.folio) then
    return jsonb_build_object('estado', 'ya_facturado');
  end if;
  if date_trunc('month', t.fecha) <> date_trunc('month', ahora) then
    return jsonb_build_object('estado', 'fuera_de_mes');
  end if;
  return jsonb_build_object('estado', 'ok', 'ticket', to_jsonb(t));
end $$;

-- ---------- Facturar: valida los datos fiscales y marca el ticket como facturado ----------
create or replace function public.facturar_ticket(
  p_folio text, p_total numeric, p_rfc text, p_nombre text,
  p_regimen text, p_uso text, p_cp text, p_correo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t public.tickets; f public.facturas;
  ahora timestamp := date_trunc('second', now() at time zone 'America/Mexico_City');
  rfc text := upper(trim(p_rfc));
  nombre text := upper(regexp_replace(trim(p_nombre), '\s+', ' ', 'g'));
  limpio text;
  moral boolean;
  regimenes_fisica text[] := array['605','606','608','611','612','614','616','621','625','626'];
  regimenes_moral text[] := array['601','603','620','622','623','624','626'];
  regimenes_g text[] := array['601','603','606','612','620','621','622','623','624','625','626'];
begin
  if p_folio is null or p_total is null or p_rfc is null or p_nombre is null or p_regimen is null or p_uso is null or p_cp is null then
    return jsonb_build_object('estado', 'datos_incompletos');
  end if;
  -- "S. A. de C. V." se compara sin puntos y con las siglas juntas: "SA DE CV"
  limpio := trim(regexp_replace(regexp_replace(nombre, '[.,]', ' ', 'g'), '\s+', ' ', 'g'));
  declare palabra text; salida text := ''; siglas text := '';
  begin
    foreach palabra in array string_to_array(limpio, ' ') loop
      if char_length(palabra) = 1 then siglas := siglas || palabra;
      else
        if siglas <> '' then salida := salida || siglas || ' '; siglas := ''; end if;
        salida := salida || palabra || ' ';
      end if;
    end loop;
    limpio := trim(salida || siglas);
  end;
  -- RFC: 12 (moral) o 13 (física), fecha real, y que no sea genérico
  if rfc in ('XAXX010101000', 'XEXX010101000') then return jsonb_build_object('estado', 'rfc_generico'); end if;
  if rfc ~ '^[A-ZÑ&]{3}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$' then moral := true;
  elsif rfc ~ '^[A-ZÑ&]{4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$' then moral := false;
  else return jsonb_build_object('estado', 'rfc_invalido'); end if;
  -- Nombre: sin el régimen societario (CFDI 4.0)
  if char_length(nombre) < 2 or char_length(nombre) > 254 then return jsonb_build_object('estado', 'nombre_invalido'); end if;
  if limpio ~ '(^| )(SA DE CV|SAPI DE CV|SAB DE CV|S DE RL DE CV|S DE RL|SAS|SC|AC|SA|SRL|SPR DE RL)$' then
    return jsonb_build_object('estado', 'nombre_con_regimen');
  end if;
  if p_cp !~ '^[0-9]{5}$' then return jsonb_build_object('estado', 'cp_invalido'); end if;
  -- Régimen según el tipo de RFC, y uso del CFDI permitido para ese régimen
  if not (p_regimen = any (case when moral then regimenes_moral else regimenes_fisica end)) then
    return jsonb_build_object('estado', 'regimen_invalido');
  end if;
  if p_uso not in ('G01', 'G03', 'S01') then return jsonb_build_object('estado', 'uso_invalido'); end if;
  if p_uso <> 'S01' and not (p_regimen = any (regimenes_g)) then return jsonb_build_object('estado', 'uso_invalido'); end if;
  if p_correo is not null and trim(p_correo) <> '' and (char_length(p_correo) > 120 or p_correo !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$') then
    return jsonb_build_object('estado', 'correo_invalido');
  end if;

  select * into t from public.tickets where folio = upper(trim(p_folio)) and total = p_total for update;
  if not found then return jsonb_build_object('estado', 'no_existe'); end if;
  if exists (select 1 from public.facturas where folio_ticket = t.folio) then
    return jsonb_build_object('estado', 'ya_facturado');
  end if;
  if date_trunc('month', t.fecha) <> date_trunc('month', ahora) then
    return jsonb_build_object('estado', 'fuera_de_mes');
  end if;

  begin
    insert into public.facturas (folio_ticket, fecha, rfc, nombre, regimen, uso, cp, correo)
    values (t.folio, ahora, rfc, nombre, p_regimen, p_uso, p_cp, nullif(trim(p_correo), ''))
    returning * into f;
  exception when unique_violation then
    return jsonb_build_object('estado', 'ya_facturado');
  end;

  return jsonb_build_object('estado', 'ok', 'ticket', to_jsonb(t),
    'factura', jsonb_build_object('serie', 'OCSO', 'folio', f.folio, 'uuid', upper(f.uuid::text), 'fecha', f.fecha));
end $$;

revoke execute on function public.buscar_ticket(text, numeric) from public;
revoke execute on function public.facturar_ticket(text, numeric, text, text, text, text, text, text) from public;
grant execute on function public.buscar_ticket(text, numeric) to anon;
grant execute on function public.facturar_ticket(text, numeric, text, text, text, text, text, text) to anon;

-- Solo la página (anon) las usa; las personas con sesión no tienen por qué.
revoke execute on function public.buscar_ticket(text, numeric) from authenticated;
revoke execute on function public.facturar_ticket(text, numeric, text, text, text, text, text, text) from authenticated;
