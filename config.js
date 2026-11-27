/* Public configuration. These two values are NOT secrets:
   the anon (publishable) key is designed to be visible in the browser and is limited
   by the Row Level Security rules in supabase-setup.sql.
   NEVER paste here: the service_role key, the KPrimePay key, or the admin email. */
window.WTSA = {
  SUPABASE_URL: "https://itoxlyhezcimedxirfto.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "sb_publishable_0unHzlzekUp4yX461PZhaQ_blRcMrCD",
  // Allowed payment page domains (sub-domains included). Must match the secret KPP_CHECKOUT_HOSTS on the server.
  CHECKOUT_HOSTS: ["kprimepay.com"]
};
