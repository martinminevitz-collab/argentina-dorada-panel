-- =====================================================================
-- ACREDITACIONES (panel → pestaña "📍 Bs. As." → "🙋 Voy a pedir")
-- Pegar TODO en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.
-- Va a salir el cartel "Potential issue detected" por los "drop policy":
-- es seguro, solo reemplaza los permisos de esta tabla nueva. No borra nada.
-- =====================================================================

-- 11) Pedidos de acreditación: uno por pedido (puede haber varios por evento).
--     estado: armando (se buscan sumados) → pedida → confirmada / rechazada
create table if not exists public.acreditaciones (
  id            uuid primary key default gen_random_uuid(),
  evento_id     text not null,
  evento_titulo text not null,
  estado        text not null default 'armando' check (estado in ('armando', 'pedida', 'confirmada', 'rechazada')),
  personas      text[] not null default '{}',
  contacto      text,
  nota          text,
  creado_por    text not null default (auth.jwt() ->> 'email'),
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.acreditaciones enable row level security;

drop policy if exists "miembros ven acreditaciones" on public.acreditaciones;
create policy "miembros ven acreditaciones" on public.acreditaciones
  for select to authenticated using (public.es_miembro());

drop policy if exists "miembros crean acreditaciones" on public.acreditaciones;
create policy "miembros crean acreditaciones" on public.acreditaciones
  for insert to authenticated with check (public.es_miembro());

drop policy if exists "miembros cambian acreditaciones" on public.acreditaciones;
create policy "miembros cambian acreditaciones" on public.acreditaciones
  for update to authenticated using (public.es_miembro()) with check (public.es_miembro());

drop policy if exists "miembros borran acreditaciones" on public.acreditaciones;
create policy "miembros borran acreditaciones" on public.acreditaciones
  for delete to authenticated using (public.es_miembro());

do $$ begin
  alter publication supabase_realtime add table public.acreditaciones;
exception when duplicate_object then null; end $$;
