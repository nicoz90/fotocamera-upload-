-- =====================================================================
-- Permessi espliciti sulle tabelle.
-- I progetti Supabase recenti NON concedono più permessi automatici sulle
-- tabelle nuove: senza queste righe nemmeno il server (service_role) le legge.
-- La sicurezza resta alla Row Level Security: qui si apre solo "la porta",
-- le policy RLS decidono chi vede quali righe.
-- Si può rieseguire senza problemi.
-- =====================================================================

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
