import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://TU-PROYECTO.supabase.co",
  "TU_PUBLIC_ANON_KEY"
);
