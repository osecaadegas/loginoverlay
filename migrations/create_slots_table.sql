-- Create slots table
CREATE TABLE IF NOT EXISTS public.slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON public.slots
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow insert/update/delete for authenticated users (for admin operations)
CREATE POLICY "Allow all operations for authenticated users"
  ON public.slots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index on provider for faster filtering
CREATE INDEX IF NOT EXISTS idx_slots_provider ON public.slots(provider);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_slots_name ON public.slots(name);

-- Add comment to table
COMMENT ON TABLE public.slots IS 'Stores all available slot games with their images and providers';
