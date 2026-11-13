-- Bitácora vehicular: tabla para guardar la bitácora de cada usuario.
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar → Run.

create table if not exists public.bitacoras (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos       jsonb not null,
  actualizado timestamptz not null default now()
);

-- Cada usuario solo puede ver y modificar su propia bitácora.
alter table public.bitacoras enable row level security;

drop policy if exists "Ver mi bitácora" on public.bitacoras;
create policy "Ver mi bitácora" on public.bitacoras
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Crear mi bitácora" on public.bitacoras;
create policy "Crear mi bitácora" on public.bitacoras
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar mi bitácora" on public.bitacoras;
create policy "Actualizar mi bitácora" on public.bitacoras
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Borrar mi bitácora" on public.bitacoras;
create policy "Borrar mi bitácora" on public.bitacoras
  for delete to authenticated using ((select auth.uid()) = user_id);
