import { supabase } from '../config/supabaseClient';

export async function manageStreamElementsConnection(values = {}, method = 'POST') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in again before managing StreamElements.');
  const response = await fetch('/api/chat-commands?cmd=se-connection', {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(values) }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'StreamElements connection failed.');
  if (method !== 'GET' && !values.test_only) window.dispatchEvent(new Event('streamelements-connection-changed'));
  return result;
}
