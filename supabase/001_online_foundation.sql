-- ConcurseiroOS — online foundation for a single authenticated user.
-- Run this script once in the Supabase SQL editor.

create table if not exists public.user_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision >= 1),
  device_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_snapshots enable row level security;

revoke all on public.user_snapshots from anon;
grant select, insert, update, delete on public.user_snapshots to authenticated;

drop policy if exists "user_snapshots_select_own" on public.user_snapshots;
create policy "user_snapshots_select_own"
on public.user_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_snapshots_insert_own" on public.user_snapshots;
create policy "user_snapshots_insert_own"
on public.user_snapshots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "user_snapshots_update_own" on public.user_snapshots;
create policy "user_snapshots_update_own"
on public.user_snapshots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_snapshots_delete_own" on public.user_snapshots;
create policy "user_snapshots_delete_own"
on public.user_snapshots
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Atomic optimistic-concurrency write. A stale device cannot overwrite a newer revision.
create or replace function public.save_user_snapshot(
  p_expected_revision bigint,
  p_snapshot jsonb,
  p_device_id text
)
returns public.user_snapshots
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.user_snapshots%rowtype;
  v_saved public.user_snapshots%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_current
  from public.user_snapshots
  where user_id = v_user_id
  for update;

  if not found then
    if coalesce(p_expected_revision, 0) <> 0 then
      raise exception 'REVISION_CONFLICT';
    end if;

    insert into public.user_snapshots (
      user_id,
      snapshot,
      revision,
      device_id,
      updated_at
    ) values (
      v_user_id,
      p_snapshot,
      1,
      p_device_id,
      now()
    )
    returning * into v_saved;

    return v_saved;
  end if;

  if v_current.revision <> p_expected_revision then
    raise exception 'REVISION_CONFLICT';
  end if;

  update public.user_snapshots
  set
    snapshot = p_snapshot,
    revision = v_current.revision + 1,
    device_id = p_device_id,
    updated_at = now()
  where user_id = v_user_id
  returning * into v_saved;

  return v_saved;
end;
$$;

revoke all on function public.save_user_snapshot(bigint, jsonb, text) from public;
grant execute on function public.save_user_snapshot(bigint, jsonb, text) to authenticated;

-- Private bucket. Files are never public and must live under auth.uid()/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-study-materials',
  'private-study-materials',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "private_materials_select_own" on storage.objects;
create policy "private_materials_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-study-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "private_materials_insert_own" on storage.objects;
create policy "private_materials_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-study-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "private_materials_update_own" on storage.objects;
create policy "private_materials_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private-study-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'private-study-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "private_materials_delete_own" on storage.objects;
create policy "private_materials_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private-study-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
