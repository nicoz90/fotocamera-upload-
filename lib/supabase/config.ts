// Indirizzo del progetto Supabase e chiave "publishable".
// Sono valori PUBBLICI per natura: finiscono comunque nel browser di chi apre l'app.
// La protezione dei dati è nella Row Level Security del database, non qui.
// La chiave segreta (SUPABASE_SERVICE_ROLE_KEY) NON va mai scritta nel codice.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ohyfjvaguqbnnllwadgn.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_CkY-v8vYPX3YM2VQ3P9y3Q_8tPNqybo";
