/* Public configuration. These two values are NOT secrets:
   the anon (publishable) key is designed to be visible in the browser and is limited
   by the Row Level Security rules in supabase-setup.sql.
   NEVER paste here: the service_role key, the KPrimePay key, or the admin email. */
window.WTSA = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY"
};
