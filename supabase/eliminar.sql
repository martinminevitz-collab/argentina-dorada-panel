-- =====================================================================
-- ELIMINAR EVENTO (panel → "🗑 Eliminar")
-- Pegar TODO en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.
-- Va a salir el cartel "Potential issue detected" por el "drop constraint":
-- es seguro, solo cambia la regla de qué tipos de dato se aceptan. No borra nada.
-- =====================================================================

-- Los "+ Agregar dato" ahora aceptan un tercer tipo: 'eliminar'
alter table public.eventos_agregados drop constraint if exists eventos_agregados_tipo_check;
alter table public.eventos_agregados add constraint eventos_agregados_tipo_check
  check (tipo in ('dato', 'correccion', 'eliminar'));
