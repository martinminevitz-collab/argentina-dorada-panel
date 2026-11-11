-- =====================================================================
-- AGREGAR DATO A UN RESULTADO (panel → "+ Agregar dato")
-- Pegar TODO en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.
-- Va a salir el cartel "Potential issue detected" por el "drop policy" y el "delete":
-- es seguro, no borra nada de lo que ya tienen (ver explicación en el chat).
-- =====================================================================

-- 9) Datos que los compañeros agregan a un evento que ya está en el panel
create table if not exists public.eventos_agregados (
  id            uuid primary key default gen_random_uuid(),
  evento_id     text not null,
  evento_titulo text not null,
  tipo          text not null default 'dato' check (tipo in ('dato', 'correccion')),
  texto         text not null check (length(texto) between 2 and 2000),
  creado_por    text not null default (auth.jwt() ->> 'email'),
  creado_en     timestamptz not null default now()
);

alter table public.eventos_agregados enable row level security;

drop policy if exists "miembros ven agregados" on public.eventos_agregados;
create policy "miembros ven agregados" on public.eventos_agregados
  for select to authenticated using (public.es_miembro());

drop policy if exists "miembros crean agregados" on public.eventos_agregados;
create policy "miembros crean agregados" on public.eventos_agregados
  for insert to authenticated with check (public.es_miembro());

drop policy if exists "miembros borran agregados" on public.eventos_agregados;
create policy "miembros borran agregados" on public.eventos_agregados
  for delete to authenticated using (public.es_miembro());

do $$ begin
  alter publication supabase_realtime add table public.eventos_agregados;
exception when duplicate_object then null; end $$;

-- 10) Para el bot de GitHub: devuelve los datos SIN los mails. Borra los de más de 30 días.
create or replace function public.agregados_para_bot()
returns table (id uuid, evento_id text, evento_titulo text, tipo text, texto text, creado_en timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  delete from public.eventos_agregados ea where ea.creado_en < now() - interval '30 days';
  return query select ea.id, ea.evento_id, ea.evento_titulo, ea.tipo, ea.texto, ea.creado_en
               from public.eventos_agregados ea order by ea.creado_en;
end $$;
grant execute on function public.agregados_para_bot() to anon;
