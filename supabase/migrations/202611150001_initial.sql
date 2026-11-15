-- FindIt v1. Apply once with Supabase SQL Editor or `supabase db push`.
-- Public clients can read their own records, but workflow mutations go through
-- narrowly scoped RPCs. This protects prices, roles, and state transitions.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  role text not null default 'buyer' check (role in ('buyer', 'admin')),
  created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name) values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Student'), 100));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  title text not null check (char_length(trim(title)) between 3 and 120),
  category text not null check (category in ('Electronics','Study essentials','Clothing & accessories','Room & living','Other')),
  details text not null check (char_length(trim(details)) between 10 and 3000),
  condition text not null check (condition in ('new','used','either')),
  budget numeric(12,2) not null check (budget > 0 and budget <= 10000000),
  difficulty text not null check (char_length(trim(difficulty)) between 5 and 1000),
  needed_by date,
  readiness text not null check (readiness in ('ready','comparing','researching')),
  location text not null check (char_length(trim(location)) between 2 and 120),
  contact text not null check (char_length(trim(contact)) between 3 and 120),
  image_path text,
  status text not null default 'submitted' check (status in ('submitted','awaiting_confirmation','sourcing','offer_sent','matched','closed')),
  confirmed_at timestamptz,
  close_reason text,
  created_at timestamptz not null default now()
);
create index requests_buyer_created on public.requests(buyer_id, created_at desc);
create index requests_status_created on public.requests(status, created_at desc);

create function public.can_access_request(p_request uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.requests where id = p_request and (buyer_id = auth.uid() or public.is_admin()));
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index messages_request_created on public.messages(request_id, created_at);
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id),
  item text not null check (char_length(trim(item)) between 3 and 120),
  details text not null check (char_length(trim(details)) between 10 and 3000),
  total numeric(12,2) not null check (total > 0 and total <= 10000000),
  fulfillment text not null check (char_length(trim(fulfillment)) between 5 and 1000),
  terms text not null check (char_length(trim(terms)) between 5 and 2000),
  expires_at timestamptz not null,
  image_path text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now()
);
create index offers_request on public.offers(request_id);
create unique index one_pending_offer on public.offers(request_id) where status = 'pending';
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers(id),
  request_id uuid not null unique references public.requests(id),
  status text not null default 'accepted' check (status in ('accepted','arranging','ready','completed','cancelled')),
  payment text not null default 'unpaid' check (payment in ('unpaid','pending_verification','paid','refunded')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create table public.sourcing_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  cost numeric(12,2) not null check (cost >= 0 and cost <= 10000000),
  created_at timestamptz not null default now()
);
create index sourcing_notes_request on public.sourcing_notes(request_id);
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  created_at timestamptz not null default now()
);
create index activity_request on public.activity_log(request_id, created_at);

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.deals enable row level security;
alter table public.sourcing_notes enable row level security;
alter table public.activity_log enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy requests_read on public.requests for select to authenticated using (buyer_id = auth.uid() or public.is_admin());
create policy requests_insert on public.requests for insert to authenticated with check (
  buyer_id = auth.uid() and (image_path is null or split_part(image_path, '/', 1) = auth.uid()::text)
);
create policy messages_read on public.messages for select to authenticated using (public.can_access_request(request_id));
create policy messages_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.can_access_request(request_id));
create policy offers_read on public.offers for select to authenticated using (public.can_access_request(request_id));
create policy deals_read on public.deals for select to authenticated using (public.can_access_request(request_id));
create policy notes_admin on public.sourcing_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy log_admin on public.activity_log for select to authenticated using (public.is_admin());

revoke all on public.profiles, public.requests, public.messages, public.offers, public.deals, public.sourcing_notes, public.activity_log from anon, authenticated;
grant select on public.profiles, public.requests, public.messages, public.offers, public.deals, public.sourcing_notes, public.activity_log to authenticated;
-- Column grants prevent setting status, confirmation, timestamps, and owner on behalf of another buyer.
grant insert(buyer_id,title,category,details,condition,budget,difficulty,needed_by,readiness,location,contact,image_path) on public.requests to authenticated;
grant insert(request_id,sender_id,body) on public.messages to authenticated;
grant insert(request_id,body,cost) on public.sourcing_notes to authenticated;

create function public.set_request_status(p_request uuid, p_status text, p_reason text default null) returns void language plpgsql security definer set search_path = '' as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or not public.can_access_request(p_request) then raise exception 'Request unavailable'; end if;
  if r.status in ('matched','closed') then raise exception 'This request can no longer be changed'; end if;
  if p_status not in ('closed','sourcing','awaiting_confirmation') or p_status is null then raise exception 'Unsupported status'; end if;
  if not public.is_admin() and p_status <> 'closed' then raise exception 'Admin access required'; end if;
  if p_status = 'closed' and (coalesce(char_length(trim(p_reason)),0) < 1 or char_length(p_reason) > 1000) then raise exception 'Provide a closure reason, up to 1000 characters'; end if;
  update public.offers set status = 'withdrawn' where request_id = p_request and status = 'pending';
  update public.requests set status = p_status, close_reason = case when p_status = 'closed' then p_reason else null end where id = p_request;
  insert into public.activity_log(request_id,actor_id,action) values (p_request, auth.uid(), 'request:' || p_status);
end; $$;

create function public.confirm_interest(p_request uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or r.buyer_id <> auth.uid() or auth.uid() is null then raise exception 'Request unavailable'; end if;
  if r.status <> 'awaiting_confirmation' then raise exception 'Confirmation is not needed'; end if;
  update public.requests set confirmed_at = now(), status = 'sourcing' where id = p_request;
  insert into public.activity_log(request_id,actor_id,action) values (p_request, auth.uid(), 'interest_confirmed');
end; $$;

create function public.create_offer(p_request uuid, p_offer jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.requests; offer_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into r from public.requests where id = p_request for update;
  if not found or r.status in ('closed','matched') then raise exception 'Request is no longer open'; end if;
  if (p_offer->>'expires_at')::timestamptz <= now() then raise exception 'Offer expiry must be in the future'; end if;
  if p_offer->>'image_path' is not null and split_part(p_offer->>'image_path','/',1) <> auth.uid()::text then raise exception 'Invalid image owner'; end if;
  update public.offers set status = 'withdrawn' where request_id = p_request and status = 'pending';
  insert into public.offers(request_id,item,details,total,fulfillment,terms,expires_at,image_path)
  values(p_request,p_offer->>'item',p_offer->>'details',(p_offer->>'total')::numeric,p_offer->>'fulfillment',p_offer->>'terms',(p_offer->>'expires_at')::timestamptz,p_offer->>'image_path') returning id into offer_id;
  update public.requests set status = 'offer_sent' where id = p_request;
  insert into public.activity_log(request_id,actor_id,action) values(p_request,auth.uid(),'offer_sent');
  return offer_id;
end; $$;

-- Lock the parent request first in every workflow. Concurrent accepts/cancels
-- serialize here; unique deal constraints provide a second line of defense.
create function public.respond_offer(p_offer uuid, p_accept boolean) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.requests; o public.offers; deal_id uuid;
begin
  select * into o from public.offers where id = p_offer;
  if not found then raise exception 'Offer unavailable'; end if;
  select * into r from public.requests where id = o.request_id for update;
  if r.buyer_id <> auth.uid() or auth.uid() is null then raise exception 'Offer unavailable'; end if;
  select * into o from public.offers where id = p_offer for update;
  if p_accept is null then raise exception 'Choose accept or decline'; end if;
  if o.status = 'accepted' and p_accept then select id into deal_id from public.deals where offer_id = p_offer; return deal_id; end if;
  if r.status <> 'offer_sent' or o.status <> 'pending' or o.expires_at <= now() then raise exception 'Offer expired or no longer available'; end if;
  update public.offers set status = case when p_accept then 'accepted' else 'declined' end where id = p_offer;
  update public.requests set status = case when p_accept then 'matched' else 'sourcing' end where id = r.id;
  if p_accept then insert into public.deals(offer_id,request_id) values(p_offer,r.id) returning id into deal_id; end if;
  insert into public.activity_log(request_id,actor_id,action) values(r.id,auth.uid(),case when p_accept then 'offer_accepted' else 'offer_declined' end);
  return deal_id;
end; $$;

create function public.update_deal(p_deal uuid, p_status text, p_payment text, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare d public.deals;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into d from public.deals where id = p_deal for update;
  if not found then raise exception 'Deal unavailable'; end if;
  if d.status in ('completed','cancelled') and p_status <> d.status then raise exception 'Finished deals cannot be reopened'; end if;
  if p_status = 'completed' and p_payment <> 'paid' then raise exception 'Verify payment before completion'; end if;
  if p_status in ('completed','cancelled') and coalesce(char_length(trim(p_note)),0) = 0 then raise exception 'Record delivery confirmation or the cancellation reason'; end if;
  update public.deals set status = p_status, payment = p_payment, note = p_note where id = p_deal;
  insert into public.activity_log(request_id,actor_id,action) values(d.request_id,auth.uid(),'deal:' || p_status || '/payment:' || p_payment);
end; $$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.is_admin(), public.can_access_request(uuid), public.set_request_status(uuid,text,text), public.confirm_interest(uuid), public.create_offer(uuid,jsonb), public.respond_offer(uuid,boolean), public.update_deal(uuid,text,text,text) from public;
grant execute on function public.is_admin(), public.can_access_request(uuid), public.set_request_status(uuid,text,text), public.confirm_interest(uuid), public.create_offer(uuid,jsonb), public.respond_offer(uuid,boolean), public.update_deal(uuid,text,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('request-images','request-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy images_upload on storage.objects for insert to authenticated with check (bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy images_read on storage.objects for select to authenticated using (
  bucket_id = 'request-images' and (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_admin()
    or exists(select 1 from public.requests r where r.image_path = name and r.buyer_id = auth.uid())
    or exists(select 1 from public.offers o join public.requests r on r.id = o.request_id where o.image_path = name and r.buyer_id = auth.uid())
  )
);
create policy images_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text
  and not exists(select 1 from public.requests where image_path = name)
  and not exists(select 1 from public.offers where image_path = name)
);
commit;
