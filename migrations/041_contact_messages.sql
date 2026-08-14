-- Public contact submissions are written through the server API only.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contact_messages_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
  CONSTRAINT contact_messages_email_length CHECK (char_length(email) BETWEEN 3 AND 254),
  CONSTRAINT contact_messages_subject_length CHECK (char_length(subject) BETWEEN 3 AND 160),
  CONSTRAINT contact_messages_message_length CHECK (char_length(message) BETWEEN 10 AND 5000),
  CONSTRAINT contact_messages_status_check CHECK (status IN ('new', 'read', 'resolved', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created
  ON public.contact_messages(status, created_at DESC);

DROP TRIGGER IF EXISTS contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;

DROP POLICY IF EXISTS "Admins read contact messages" ON public.contact_messages;
CREATE POLICY "Admins read contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));

DROP POLICY IF EXISTS "Admins update contact messages" ON public.contact_messages;
CREATE POLICY "Admins update contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role IN ('admin', 'superadmin')
      AND user_roles.is_active = true
  ));