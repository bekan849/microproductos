import { createEmpresaClient } from './empresa-client';
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const supabaseSystem = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);
export const supabaseAdmin = createEmpresaClient(supabaseSystem);
