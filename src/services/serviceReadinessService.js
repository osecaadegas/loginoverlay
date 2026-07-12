import { supabase } from '../config/supabaseClient';

export async function checkAllServiceReadiness({ details, selectedTools, widgets, signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Sign in again to check service readiness.');
  const response = await fetch('/api/service-readiness', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal,
    body: JSON.stringify({
      action: 'check_all',
      details,
      selectedTools,
      widgets: (widgets || []).map(widget => ({
        id: widget.id,
        widget_type: widget.widget_type,
        config: widget.config || {},
      })),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Readiness checks could not be completed.');
  return payload;
}