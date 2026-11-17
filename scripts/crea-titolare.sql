-- Dopo aver creato il PRIMO utente da Supabase (Authentication > Users > Add user, "Auto confirm"),
-- eseguilo nel SQL Editor sostituendo l'email: diventa titolare (admin).
update public.profiles set ruolo = 'admin', nome = 'Titolare' where email = 'titolare@esempio.it';
