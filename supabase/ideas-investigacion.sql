-- IDEAS DE INVESTIGACIONES (panel → Web → Investigaciones → 💡 Ideas). No se publica: solo el equipo.
-- Pegar TODO en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.
-- Sale el cartel "Potential issue detected" por los "drop policy": es seguro, no borra nada.
create table if not exists public.ideas_investigacion (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(titulo) between 2 and 200),
  deporte        text,
  notas          text not null default '',
  links          text not null default '',
  encargado      text,
  estado         text not null default 'idea' check (estado in ('idea', 'investigando', 'lista', 'hecha')),
  creado_por     text not null default (auth.jwt() ->> 'email'),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.ideas_investigacion enable row level security;

drop policy if exists "miembros ven ideas" on public.ideas_investigacion;
create policy "miembros ven ideas" on public.ideas_investigacion
  for select to authenticated using (public.es_miembro());

drop policy if exists "miembros crean ideas" on public.ideas_investigacion;
create policy "miembros crean ideas" on public.ideas_investigacion
  for insert to authenticated with check (public.es_miembro());

drop policy if exists "miembros cambian ideas" on public.ideas_investigacion;
create policy "miembros cambian ideas" on public.ideas_investigacion
  for update to authenticated using (public.es_miembro()) with check (public.es_miembro());

drop policy if exists "miembros borran ideas" on public.ideas_investigacion;
create policy "miembros borran ideas" on public.ideas_investigacion
  for delete to authenticated using (public.es_miembro());

do $$ begin
  alter publication supabase_realtime add table public.ideas_investigacion;
exception when duplicate_object then null; end $$;
