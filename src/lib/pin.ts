import { supabase } from './supabase';

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getStoredHash(): Promise<string | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'pin_hash')
    .single();
  return data?.value ?? null;
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await supabase.from('app_settings').upsert({ key: 'pin_hash', value: hash });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getStoredHash();
  if (!stored) return true; // no PIN set yet — first-time setup
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function createResetToken(): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(10).padStart(3, '0'))
    .join('')
    .slice(0, 6);
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  await supabase.from('app_settings').upsert({ key: 'reset_token', value: token });
  await supabase.from('app_settings').upsert({ key: 'reset_token_expires', value: expires });
  return token;
}

export async function verifyResetToken(token: string): Promise<boolean> {
  const { data: tokenRow } = await supabase
    .from('app_settings').select('value').eq('key', 'reset_token').single();
  const { data: expiryRow } = await supabase
    .from('app_settings').select('value').eq('key', 'reset_token_expires').single();
  if (!tokenRow || !expiryRow) return false;
  if (new Date() > new Date(expiryRow.value)) return false;
  return token.trim() === tokenRow.value;
}

export async function clearResetToken(): Promise<void> {
  await supabase.from('app_settings').delete().eq('key', 'reset_token');
  await supabase.from('app_settings').delete().eq('key', 'reset_token_expires');
}
