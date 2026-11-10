-- =====================================================================
-- CREAR EVENTO A MANO (panel → "+ Crear evento")
-- Pegar TODO esto en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.
-- =====================================================================

-- 7) Eventos que cargan los compañeros desde el panel
create table if not exists public.eventos_manuales (
  id          uuid primary key default gen_random_uuid(),
  seccion     text not null check (seccion in ('resultados', 'agenda')),
  estado      text not null default 'en_curso' check (estado in ('publicable', 'en_curso', 'mas_info', 'agenda')),
  deporte     text,
  titulo      text not null check (length(titulo) between 3 and 200),
  fechas      text,
  lugar       text,
  detalle     text check (length(detalle) <= 5000),
  link        text,
  creado_por  text not null default (auth.jwt() ->> 'email'),
  creado_en   timestamptz not null default now()
);

alter table public.eventos_manuales enable row level security;

drop policy if exists "miembros ven manuales" on public.eventos_manuales;
create policy "miembros ven manuales" on public.eventos_manuales
  for select to authenticated using (public.es_miembro());

drop policy if exists "miembros crean manuales" on public.eventos_manuales;
create policy "miembros crean manuales" on public.eventos_manuales
  for insert to authenticated with check (public.es_miembro());

drop policy if exists "miembros borran manuales" on public.eventos_manuales;
create policy "miembros borran manuales" on public.eventos_manuales
  for delete to authenticated using (public.es_miembro());

do $$ begin
  alter publication supabase_realtime add table public.eventos_manuales;
exception when duplicate_object then null; end $$;

-- 8) Para el bot de GitHub: devuelve los eventos SIN los mails de quién los cargó.
--    De paso borra los que tienen más de 60 días (para que la base no crezca sin fin).
create or replace function public.eventos_manuales_para_bot()
returns table (id uuid, seccion text, estado text, deporte text, titulo text, fechas text,
               lugar text, detalle text, link text, creado_en timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  delete from public.eventos_manuales em where em.creado_en < now() - interval '60 days';
  return query select em.id, em.seccion, em.estado, em.deporte, em.titulo, em.fechas, em.lugar,
                      em.detalle, em.link, em.creado_en
               from public.eventos_manuales em order by em.creado_en;
end $$;
grant execute on function public.eventos_manuales_para_bot() to anon;
