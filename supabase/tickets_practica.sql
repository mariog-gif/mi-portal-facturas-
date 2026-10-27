-- =====================================================================
-- Tickets de práctica de OCSO (los 12 del PDF tickets_OCSO.pdf)
-- Correr DESPUÉS de facturacion.sql. Es seguro volver a correrlo.
-- El ticket 217-0044390 es del 28/09/2026: sirve para probar el rechazo "fuera del mes".
-- =====================================================================
insert into public.tickets (folio, sucursal, cp_sucursal, fecha, total, forma_pago, conceptos) values
  ('104-0012457', 'OCSO UNIVERSIDAD · SUC 104', '20127', '2026-10-05 08:12', 86.00, '01', '[{"cantidad": 1, "descripcion": "Café americano 16 oz", "importe": 32.0}, {"cantidad": 1, "descripcion": "Sándwich de pavo", "importe": 54.0}]'::jsonb),
  ('104-0012583', 'OCSO UNIVERSIDAD · SUC 104', '20127', '2026-10-07 19:40', 588.00, '28', '[{"cantidad": 1, "descripcion": "Batería portátil 10000 mAh", "importe": 399.0}, {"cantidad": 1, "descripcion": "Cargador USB-C 1 m", "importe": 189.0}]'::jsonb),
  ('352-0008720', 'OCSO NORTE · SUC 352', '20126', '2026-10-08 17:26', 162.40, '28', '[{"cantidad": 1, "descripcion": "Crema corporal 400 ml", "importe": 89.9}, {"cantidad": 1, "descripcion": "Shampoo 400 ml", "importe": 72.5}]'::jsonb),
  ('217-0045102', 'OCSO CENTRO · SUC 217', '20000', '2026-10-09 13:05', 157.00, '04', '[{"cantidad": 1, "descripcion": "Ensalada de pollo", "importe": 79.0}, {"cantidad": 2, "descripcion": "Capuchino 12 oz", "importe": 78.0}]'::jsonb),
  ('217-0045230', 'OCSO CENTRO · SUC 217', '20000', '2026-10-12 10:22', 370.00, '01', '[{"cantidad": 2, "descripcion": "Pilas AA 4 pzas", "importe": 196.0}, {"cantidad": 3, "descripcion": "Cuaderno profesional 100 h", "importe": 174.0}]'::jsonb),
  ('352-0008891', 'OCSO NORTE · SUC 352', '20126', '2026-10-14 21:15', 227.30, '28', '[{"cantidad": 1, "descripcion": "Shampoo 400 ml", "importe": 72.5}, {"cantidad": 1, "descripcion": "Desodorante en barra", "importe": 64.9}, {"cantidad": 1, "descripcion": "Crema corporal 400 ml", "importe": 89.9}]'::jsonb),
  ('352-0008975', 'OCSO NORTE · SUC 352', '20126', '2026-10-16 07:55', 134.00, '01', '[{"cantidad": 2, "descripcion": "Café americano 16 oz", "importe": 64.0}, {"cantidad": 2, "descripcion": "Hot dog jumbo", "importe": 70.0}]'::jsonb),
  ('104-0012810', 'OCSO UNIVERSIDAD · SUC 104', '20127', '2026-10-19 16:30', 368.00, '04', '[{"cantidad": 1, "descripcion": "Paraguas plegable", "importe": 219.0}, {"cantidad": 1, "descripcion": "Audífonos alámbricos", "importe": 149.0}]'::jsonb),
  ('217-0045477', 'OCSO CENTRO · SUC 217', '20000', '2026-10-21 12:10', 347.00, '28', '[{"cantidad": 1, "descripcion": "Cable HDMI 2 m", "importe": 249.0}, {"cantidad": 1, "descripcion": "Pilas AA 4 pzas", "importe": 98.0}]'::jsonb),
  ('352-0009102', 'OCSO NORTE · SUC 352', '20126', '2026-10-22 09:03', 125.00, '01', '[{"cantidad": 1, "descripcion": "Capuchino 12 oz", "importe": 39.0}, {"cantidad": 1, "descripcion": "Sándwich de pavo", "importe": 54.0}, {"cantidad": 1, "descripcion": "Café americano 16 oz", "importe": 32.0}]'::jsonb),
  ('104-0013004', 'OCSO UNIVERSIDAD · SUC 104', '20127', '2026-10-23 18:47', 737.00, '04', '[{"cantidad": 1, "descripcion": "Batería portátil 10000 mAh", "importe": 399.0}, {"cantidad": 1, "descripcion": "Audífonos alámbricos", "importe": 149.0}, {"cantidad": 1, "descripcion": "Cargador USB-C 1 m", "importe": 189.0}]'::jsonb),
  ('217-0044390', 'OCSO CENTRO · SUC 217', '20000', '2026-09-28 11:34', 148.00, '01', '[{"cantidad": 2, "descripcion": "Cuaderno profesional 100 h", "importe": 116.0}, {"cantidad": 1, "descripcion": "Café americano 16 oz", "importe": 32.0}]'::jsonb)
on conflict (folio) do nothing;
