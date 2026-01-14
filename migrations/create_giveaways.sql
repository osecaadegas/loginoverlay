-- Create giveaways table
CREATE TABLE IF NOT EXISTS giveaways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    ticket_cost INTEGER DEFAULT 0,
    allow_multiple_tickets BOOLEAN DEFAULT false,
    max_winners INTEGER DEFAULT 1,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    winners_drawn BOOLEAN DEFAULT false,
    drawn_at TIMESTAMP WITH TIME ZONE
);

-- Create giveaway entries table
CREATE TABLE IF NOT EXISTS giveaway_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    tickets_count INTEGER DEFAULT 1,
    total_cost INTEGER DEFAULT 0,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(giveaway_id, user_id)
);

-- Create giveaway winners table
CREATE TABLE IF NOT EXISTS giveaway_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_winners ENABLE ROW LEVEL SECURITY;

-- Policies for giveaways
CREATE POLICY "Anyone can view active giveaways"
    ON giveaways FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage giveaways"
    ON giveaways FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policies for giveaway_entries
CREATE POLICY "Users can view all entries"
    ON giveaway_entries FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own entries"
    ON giveaway_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
    ON giveaway_entries FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for giveaway_winners
CREATE POLICY "Anyone can view winners"
    ON giveaway_winners FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage winners"
    ON giveaway_winners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Create indexes
CREATE INDEX idx_giveaways_active ON giveaways(is_active, ends_at);
CREATE INDEX idx_giveaway_entries_giveaway ON giveaway_entries(giveaway_id);
CREATE INDEX idx_giveaway_entries_user ON giveaway_entries(user_id);
CREATE INDEX idx_giveaway_winners_giveaway ON giveaway_winners(giveaway_id);
