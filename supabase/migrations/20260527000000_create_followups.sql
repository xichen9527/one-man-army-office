-- 跟进记录表
create table if not exists public.followups (
  id text default gen_random_uuid()::text primary key,
  customer_id text references public.customers(id) on delete cascade not null,
  user_id text not null,
  type text check (type in ('call','email','meeting','other')) not null default 'other',
  content text not null,
  contact text,
  created_at timestamptz default now() not null
);

create index if not exists idx_followups_customer_id on public.followups(customer_id);
create index if not exists idx_followups_user_id on public.followups(user_id);
create index if not exists idx_followups_created_at on public.followups(created_at desc);

alter table public.followups enable row level security;
create policy if not exists "Users can manage own followups" on public.followups
  for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

grant select, insert, update, delete on public.followups to authenticated;
grant usage, select on all sequences in schema public to authenticated;
