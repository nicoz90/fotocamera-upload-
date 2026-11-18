-- =====================================================================
-- LUPI GOMME - Magazzino gomme
-- Schema completo: tabelle, RLS, funzioni, viste, storage.
-- Eseguire una sola volta nel SQL Editor di Supabase (progetto in regione UE).
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------- Tipi ----------
create type ruolo_utente as enum ('admin', 'dipendente');
create type stagione_gomma as enum ('estiva', 'invernale', 'quattro_stagioni');
create type tipo_gomma as enum ('nuova', 'usata', 'deposito');
create type motivo_movimento as enum (
  'arrivo_merce', 'montata', 'venduta', 'reso', 'spostamento', 'inventario', 'ritiro_deposito'
);

-- ---------- Profili (1:1 con auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  ruolo ruolo_utente not null default 'dipendente',
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funzioni di controllo usate da tutte le policy
create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and attivo);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and attivo and ruolo = 'admin');
$$;

-- ---------- Gomme ----------
create table public.tyres (
  id uuid primary key default gen_random_uuid(),
  larghezza smallint not null check (larghezza between 100 and 400),
  serie smallint not null check (serie between 20 and 100),
  diametro numeric(3,1) not null check (diametro between 10 and 24),
  -- chiave di ricerca: "205/55 R16" -> "2055516", "215/75 R17.5" -> "21575175"
  size_key text generated always as (
    larghezza::text || serie::text || replace(trim(trailing '.' from trim(trailing '0' from diametro::text)), '.', '')
  ) stored,
  indice_carico text,
  codice_velocita text,
  marca text not null,
  modello text,
  stagione stagione_gomma not null default 'estiva',
  tipo tipo_gomma not null default 'nuova',
  dot_settimana smallint check (dot_settimana between 1 and 53),
  dot_anno smallint check (dot_anno between 1990 and 2100),
  battistrada_mm numeric(3,1) check (battistrada_mm between 0 and 20),
  runflat boolean not null default false,
  xl boolean not null default false,
  ean text check (ean ~ '^[0-9]{8,14}$'),
  quantita integer not null default 0 check (quantita >= 0),
  scaffale text check (scaffale ~ '^[A-Z0-9]{1,4}$'),
  ripiano text check (ripiano ~ '^[A-Z0-9]{1,4}$'),
  posto text check (posto ~ '^[A-Z0-9]{1,4}$'),
  posizione text generated always as (
    scaffale || coalesce('-' || ripiano, '') || coalesce('-' || posto, '')
  ) stored,
  prezzo_vendita numeric(10,2) check (prezzo_vendita >= 0),
  foto_path text,
  note text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tyres_size_key_idx on public.tyres (size_key text_pattern_ops);
create index tyres_ean_idx on public.tyres (ean);
create index tyres_scaffale_idx on public.tyres (scaffale, ripiano, posto);
create index tyres_marca_trgm on public.tyres using gin (marca gin_trgm_ops);

-- Prezzo d'acquisto in tabella separata: la RLS lo rende visibile solo all'admin.
create table public.tyre_costs (
  tyre_id uuid primary key references public.tyres(id) on delete cascade,
  prezzo_acquisto numeric(10,2) not null check (prezzo_acquisto >= 0)
);

-- ---------- Movimenti (storico) ----------
create table public.movements (
  id bigint generated always as identity primary key,
  tyre_id uuid references public.tyres(id) on delete set null,
  descrizione text not null,           -- copia di misura/marca/modello: resta leggibile anche se la gomma viene cancellata
  delta integer not null,
  quantita_dopo integer not null,
  motivo motivo_movimento not null,
  da_posizione text,
  a_posizione text,
  note text,
  user_id uuid references auth.users(id) on delete set null,
  user_nome text,
  created_at timestamptz not null default now()
);
create index movements_created_idx on public.movements (created_at desc);
create index movements_tyre_idx on public.movements (tyre_id, created_at desc);

-- ---------- Depositi stagionali clienti ----------
-- Solo i dati necessari (GDPR): targa, nome, telefono. Niente indirizzo, CF, email.
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  tyre_id uuid not null unique references public.tyres(id) on delete cascade,
  targa text not null check (targa ~ '^[A-Z0-9]{4,10}$'),
  cliente_nome text not null,
  telefono text check (telefono ~ '^[0-9+ ]{6,20}$'),
  data_deposito date not null default current_date,
  con_cerchi boolean not null default false,
  data_ritiro date,
  note text,
  created_at timestamptz not null default now()
);
create index deposits_targa_idx on public.deposits (targa);
create index deposits_nome_trgm on public.deposits using gin (cliente_nome gin_trgm_ops);

-- ---------- Impostazioni e soglie ----------
create table public.impostazioni (
  id smallint primary key default 1 check (id = 1),
  dot_anni smallint not null default 5 check (dot_anni between 1 and 15),
  mesi_conservazione_depositi smallint not null default 12 check (mesi_conservazione_depositi between 1 and 120)
);
insert into public.impostazioni (id) values (1);

create table public.soglie (
  size_key text primary key,
  larghezza smallint not null,
  serie smallint not null,
  diametro numeric(3,1) not null,
  min_qty integer not null check (min_qty >= 1)
);

-- ---------- Trigger su gomme ----------
create or replace function public.descrivi_gomma(t public.tyres)
returns text language sql immutable as $$
  select t.larghezza || '/' || t.serie || ' R' || trim(trailing '.' from trim(trailing '0' from t.diametro::text))
         || ' ' || t.marca || coalesce(' ' || t.modello, '');
$$;

create or replace function public.nome_utente()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(nome, ''), email) from public.profiles where id = auth.uid();
$$;

create or replace function public.tyres_before_write()
returns trigger language plpgsql as $$
begin
  new.marca := initcap(trim(new.marca));
  new.scaffale := upper(nullif(trim(new.scaffale), ''));
  new.ripiano := upper(nullif(trim(new.ripiano), ''));
  new.posto := upper(nullif(trim(new.posto), ''));
  new.codice_velocita := upper(nullif(trim(new.codice_velocita), ''));
  new.ean := nullif(trim(new.ean), '');
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;

create trigger tyres_before_write before insert or update on public.tyres
  for each row execute function public.tyres_before_write();

-- Carico iniziale e spostamenti finiscono nello storico in automatico
create or replace function public.tyres_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.quantita > 0 then
    insert into public.movements (tyre_id, descrizione, delta, quantita_dopo, motivo, a_posizione, user_id, user_nome)
    values (new.id, public.descrivi_gomma(new), new.quantita, new.quantita,
            case when new.tipo = 'deposito' then 'arrivo_merce' else 'inventario' end::motivo_movimento,
            new.posizione, auth.uid(), public.nome_utente());
  elsif tg_op = 'UPDATE' and new.posizione is distinct from old.posizione then
    insert into public.movements (tyre_id, descrizione, delta, quantita_dopo, motivo, da_posizione, a_posizione, user_id, user_nome)
    values (new.id, public.descrivi_gomma(new), 0, new.quantita, 'spostamento',
            old.posizione, new.posizione, auth.uid(), public.nome_utente());
  end if;
  return new;
end $$;

create trigger tyres_after_write after insert or update on public.tyres
  for each row execute function public.tyres_after_write();

-- ---------- Carico / scarico (unico modo per cambiare la quantità) ----------
create or replace function public.muovi_stock(
  p_tyre uuid, p_delta integer, p_motivo motivo_movimento, p_note text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare
  t public.tyres;
begin
  if not public.is_active() then raise exception 'Utente non autorizzato'; end if;
  if p_delta = 0 or abs(p_delta) > 1000 then raise exception 'Quantità non valida'; end if;
  if p_motivo = 'spostamento' then raise exception 'Per spostare cambia la posizione'; end if;

  select * into t from public.tyres where id = p_tyre for update;
  if not found then raise exception 'Gomma non trovata'; end if;
  if t.quantita + p_delta < 0 then
    raise exception 'Ne restano solo %', t.quantita;
  end if;

  update public.tyres set quantita = quantita + p_delta where id = p_tyre returning * into t;

  insert into public.movements (tyre_id, descrizione, delta, quantita_dopo, motivo, da_posizione, note, user_id, user_nome)
  values (t.id, public.descrivi_gomma(t), p_delta, t.quantita, p_motivo, t.posizione,
          nullif(trim(p_note), ''), auth.uid(), public.nome_utente());
  return t.quantita;
end $$;

-- Ritiro deposito: scarica le gomme e chiude il deposito in un colpo solo
create or replace function public.ritira_deposito(p_deposit uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.deposits;
  q integer;
begin
  if not public.is_active() then raise exception 'Utente non autorizzato'; end if;
  select * into d from public.deposits where id = p_deposit for update;
  if not found then raise exception 'Deposito non trovato'; end if;
  if d.data_ritiro is not null then raise exception 'Deposito già ritirato'; end if;
  select quantita into q from public.tyres where id = d.tyre_id;
  if q > 0 then perform public.muovi_stock(d.tyre_id, -q, 'ritiro_deposito', 'Ritiro ' || d.targa); end if;
  update public.deposits set data_ritiro = current_date where id = p_deposit;
end $$;

-- GDPR: cancella i depositi ritirati da più di N mesi (impostazioni)
create or replace function public.pulisci_depositi_ritirati()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
  mesi smallint;
begin
  if not public.is_admin() then raise exception 'Solo il titolare'; end if;
  select mesi_conservazione_depositi into mesi from public.impostazioni where id = 1;
  with del as (
    delete from public.tyres t using public.deposits d
    where d.tyre_id = t.id and d.data_ritiro is not null
      and d.data_ritiro < current_date - make_interval(months => mesi)
    returning t.id
  ) select count(*) into n from del;
  return n;
end $$;

-- ---------- Viste avvisi (security_invoker: rispettano la RLS) ----------
create view public.v_scorte_basse with (security_invoker = true) as
select s.size_key, s.larghezza, s.serie, s.diametro, s.min_qty,
       coalesce(sum(t.quantita) filter (where t.tipo in ('nuova', 'usata')), 0)::int as disponibili
from public.soglie s
left join public.tyres t on t.size_key = s.size_key
group by s.size_key, s.larghezza, s.serie, s.diametro, s.min_qty
having coalesce(sum(t.quantita) filter (where t.tipo in ('nuova', 'usata')), 0) < s.min_qty;

create view public.v_dot_vecchi with (security_invoker = true) as
select t.*,
       (make_date(t.dot_anno, 1, 1) + ((coalesce(t.dot_settimana, 1) - 1) * 7))::date as data_produzione
from public.tyres t, public.impostazioni i
where t.quantita > 0
  and t.tipo <> 'deposito'
  and t.dot_anno is not null
  and make_date(t.dot_anno, 1, 1) + ((coalesce(t.dot_settimana, 1) - 1) * 7)
      < current_date - make_interval(years => i.dot_anni);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.tyres enable row level security;
alter table public.tyre_costs enable row level security;
alter table public.movements enable row level security;
alter table public.deposits enable row level security;
alter table public.impostazioni enable row level security;
alter table public.soglie enable row level security;

-- profili: ognuno vede il proprio, l'admin vede tutti. Le modifiche passano dal server (service role).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- gomme: tutti gli utenti attivi leggono, creano e modificano; solo l'admin cancella
create policy tyres_select on public.tyres for select to authenticated using (public.is_active());
create policy tyres_insert on public.tyres for insert to authenticated with check (public.is_active());
create policy tyres_update on public.tyres for update to authenticated
  using (public.is_active()) with check (public.is_active());
create policy tyres_delete on public.tyres for delete to authenticated using (public.is_admin());

-- La quantità si cambia SOLO con muovi_stock(): niente update diretto della colonna
revoke update on public.tyres from authenticated, anon;
grant update (larghezza, serie, diametro, indice_carico, codice_velocita, marca, modello, stagione, tipo,
              dot_settimana, dot_anno, battistrada_mm, runflat, xl, ean, scaffale, ripiano, posto,
              prezzo_vendita, foto_path, note)
  on public.tyres to authenticated;

-- prezzo d'acquisto: solo admin, in tutto
create policy costs_admin on public.tyre_costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- movimenti: storico visibile solo all'admin; si scrivono solo tramite funzioni/trigger
create policy movements_select on public.movements for select to authenticated using (public.is_admin());
create policy movements_delete on public.movements for delete to authenticated using (public.is_admin());
revoke insert, update on public.movements from authenticated, anon;

-- depositi
create policy deposits_select on public.deposits for select to authenticated using (public.is_active());
create policy deposits_insert on public.deposits for insert to authenticated with check (public.is_active());
create policy deposits_update on public.deposits for update to authenticated
  using (public.is_active()) with check (public.is_active());
create policy deposits_delete on public.deposits for delete to authenticated using (public.is_admin());

-- impostazioni e soglie: leggono tutti gli attivi, modifica solo admin
create policy imp_select on public.impostazioni for select to authenticated using (public.is_active());
create policy imp_update on public.impostazioni for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy soglie_select on public.soglie for select to authenticated using (public.is_active());
create policy soglie_write on public.soglie for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Nessun accesso anonimo a nulla
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.is_active(), public.is_admin(), public.muovi_stock(uuid, integer, motivo_movimento, text),
  public.ritira_deposito(uuid), public.pulisci_depositi_ritirati(), public.descrivi_gomma(public.tyres),
  public.nome_utente() to authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ---------- Storage foto (bucket privato) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-gomme', 'foto-gomme', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy foto_select on storage.objects for select to authenticated
  using (bucket_id = 'foto-gomme' and public.is_active());
create policy foto_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-gomme' and public.is_active());
create policy foto_update on storage.objects for update to authenticated
  using (bucket_id = 'foto-gomme' and public.is_active());
create policy foto_delete on storage.objects for delete to authenticated
  using (bucket_id = 'foto-gomme' and public.is_admin());

-- ---------- Nuovo deposito: gomma + cliente in un'unica transazione ----------
-- security invoker: valgono RLS e permessi dell'utente che la chiama
create or replace function public.crea_deposito(p_gomma jsonb, p_cliente jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  g public.tyres;
  c public.deposits;
  v_tyre uuid;
  v_dep uuid;
begin
  g := jsonb_populate_record(null::public.tyres, p_gomma);
  c := jsonb_populate_record(null::public.deposits, p_cliente);
  insert into public.tyres (larghezza, serie, diametro, indice_carico, codice_velocita, marca, modello, stagione, tipo,
                            dot_settimana, dot_anno, battistrada_mm, runflat, xl, quantita, scaffale, ripiano, posto, note)
  values (g.larghezza, g.serie, g.diametro, g.indice_carico, g.codice_velocita, g.marca, g.modello,
          coalesce(g.stagione, 'estiva'), 'deposito', g.dot_settimana, g.dot_anno, g.battistrada_mm,
          coalesce(g.runflat, false), coalesce(g.xl, false), coalesce(g.quantita, 4), g.scaffale, g.ripiano, g.posto, g.note)
  returning id into v_tyre;
  insert into public.deposits (tyre_id, targa, cliente_nome, telefono, data_deposito, con_cerchi, note)
  values (v_tyre, c.targa, c.cliente_nome, c.telefono, coalesce(c.data_deposito, current_date),
          coalesce(c.con_cerchi, false), c.note)
  returning id into v_dep;
  return v_dep;
end $$;
grant execute on function public.crea_deposito(jsonb, jsonb) to authenticated;

-- ---------- Permessi espliciti (progetti Supabase recenti non li danno in automatico) ----------
grant usage on schema public to authenticated, service_role;

-- Server (solo API lato server: Primo avvio e gestione account)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Utenti collegati: permessi minimi, poi filtra la RLS
grant select on public.profiles to authenticated;
grant select, insert, delete on public.tyres to authenticated;          -- update: solo colonne, già concesso (quantità esclusa)
grant select, insert, update, delete on public.tyre_costs to authenticated;
grant select, delete on public.movements to authenticated;              -- i movimenti si scrivono solo dalle funzioni
grant select, insert, update, delete on public.deposits to authenticated;
grant select, update on public.impostazioni to authenticated;
grant select, insert, update, delete on public.soglie to authenticated;
grant select on public.v_scorte_basse, public.v_dot_vecchi to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Nessun accesso anonimo
revoke all on all tables in schema public from anon;
