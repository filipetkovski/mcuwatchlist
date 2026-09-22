create table public.invite_tokens (
  token      text primary key,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at    timestamptz,
  used_by    uuid references public.users(id) on delete set null
);

alter table public.invite_tokens enable row level security;
revoke all on public.invite_tokens from anon, authenticated;
