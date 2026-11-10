-- =====================================================================
-- BASE COMPARTIDA – Panel Argentina Dorada
-- Pegar TODO esto en Supabase → SQL Editor → New query → Run.
-- Se puede correr más de una vez sin romper nada.
-- =====================================================================

-- 1) Quiénes pueden entrar al panel (un mail por persona)
create table if not exists public.miembros (
  email   text primary key,
  nombre  text,
  creado  timestamptz not null default now()
);

-- 2) Qué eventos ya se publicaron (lo que marca el botón "Publicado")
--    version = cómo estaba el evento cuando se marcó. Si el agente le agrega algo,
--    el panel lo muestra con "Novedades".
create table if not exists public.publicados (
  evento_id   text primary key,
  version     text,
  titulo      text,
  marcado_por text not null default (auth.jwt() ->> 'email'),
  marcado_en  timestamptz not null default now()
);

-- 3) Candado: nadie ve ni toca nada si no está en "miembros"
alter table public.miembros   enable row level security;
alter table public.publicados enable row level security;

create or replace function public.es_miembro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

drop policy if exists "miembros ven miembros" on public.miembros;
create policy "miembros ven miembros" on public.miembros
  for select to authenticated using (public.es_miembro());

drop policy if exists "miembros ven publicados" on public.publicados;
create policy "miembros ven publicados" on public.publicados
  for select to authenticated using (public.es_miembro());

drop policy if exists "miembros marcan publicados" on public.publicados;
create policy "miembros marcan publicados" on public.publicados
  for insert to authenticated with check (public.es_miembro());

drop policy if exists "miembros cambian publicados" on public.publicados;
create policy "miembros cambian publicados" on public.publicados
  for update to authenticated using (public.es_miembro()) with check (public.es_miembro());

drop policy if exists "miembros desmarcan publicados" on public.publicados;
create policy "miembros desmarcan publicados" on public.publicados
  for delete to authenticated using (public.es_miembro());

-- 4) Para que el panel se entere al instante cuando otro marca algo
do $$ begin
  alter publication supabase_realtime add table public.publicados;
exception when duplicate_object then null; end $$;

-- 5) Mantener la base despierta: el plan gratis "duerme" la base si pasa 1 semana sin uso.
--    Un bot de GitHub llama a esta función cada día.
create or replace function public.ping() returns text language sql security definer as $$ select 'ok'::text $$;
grant execute on function public.ping() to anon;

-- =====================================================================
-- 6) AGREGAR PERSONAS: cambiá el mail y corré solo esta línea (una por persona)
-- insert into public.miembros (email, nombre) values ('mail@ejemplo.com', 'Nombre') on conflict do nothing;
-- =====================================================================
