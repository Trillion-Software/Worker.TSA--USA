/* Public configuration. These two values are NOT secrets:
   the anon (publishable) key is designed to be visible in the browser and is limited
   by the Row Level Security rules in supabase-setup.sql.
   NEVER paste here: the service_role key, the KPrimePay key, or the admin email. */
window.WTSA = {
  SUPABASE_URL: "https://hdhxxqydwctgneqenwia.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_bej-RVYlUPfH2qaWKMQC7g_BSO4WA6m",
  // Allowed payment page domains (sub-domains included). Must match the secret KPP_CHECKOUT_HOSTS on the server.
  CHECKOUT_HOSTS: ["kprimepay.com"]
};
