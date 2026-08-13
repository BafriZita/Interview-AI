import { createClient } from '@supabase/supabase-js';
import { env } from '../src/config/env.js';
import ws from 'ws';

const supabaseUrl = env.supabase.url;

// Admin client (server-only) uses the secret/service-role key when available
export const supabaseAdmin = supabaseUrl && env.supabase.serviceRoleKey
  ? createClient(supabaseUrl, env.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws },
    })
  : null;

// Non-admin client (anon/publishable key) used for user-facing auth calls
export const supabase = supabaseUrl && env.supabase.anonKey
  ? createClient(supabaseUrl, env.supabase.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws },
    })
  : null;

export async function testSupabaseConnection() {
  if (!supabaseAdmin) {
    return { ok: false, message: 'Supabase admin client is not configured.' };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return { ok: false, message: 'Supabase API reachable, but the admin request failed.', details: error.message };
    }
    return { ok: true, message: 'Supabase connection successful.', details: `auth.users total: ${data?.total ?? data?.users?.length ?? 0}` };
  } catch (error) {
    return { ok: false, message: 'Supabase connection test failed.', details: error.message };
  }
}
