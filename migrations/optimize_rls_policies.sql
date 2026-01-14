-- =====================================================
-- RLS Policy Performance Optimization
-- =====================================================
-- This migration wraps all auth.uid() calls with (select auth.uid())
-- to prevent per-row re-evaluation and significantly improve query performance.
--
-- BACKUP RECOMMENDED: Test in development first!
-- Generated: 2026-01-13
-- Total Policies: 106

-- =====================================================
-- casino_offers (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete casino offers" ON public.casino_offers;
CREATE POLICY "Admins can delete casino offers" ON public.casino_offers
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

DROP POLICY IF EXISTS "Admins can insert casino offers" ON public.casino_offers;
CREATE POLICY "Admins can insert casino offers" ON public.casino_offers
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

DROP POLICY IF EXISTS "Admins can update casino offers" ON public.casino_offers;
CREATE POLICY "Admins can update casino offers" ON public.casino_offers
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

DROP POLICY IF EXISTS "Admins can view all casino offers" ON public.casino_offers;
CREATE POLICY "Admins can view all casino offers" ON public.casino_offers
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

-- =====================================================
-- daily_sessions (3 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own daily sessions" ON public.daily_sessions;
CREATE POLICY "Users can insert own daily sessions" ON public.daily_sessions
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own daily sessions" ON public.daily_sessions;
CREATE POLICY "Users can update own daily sessions" ON public.daily_sessions
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own daily sessions" ON public.daily_sessions;
CREATE POLICY "Users can view own daily sessions" ON public.daily_sessions
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- daily_wheel_prizes (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage wheel prizes" ON public.daily_wheel_prizes;
CREATE POLICY "Admins can manage wheel prizes" ON public.daily_wheel_prizes
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

-- =====================================================
-- daily_wheel_spins (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all spins" ON public.daily_wheel_spins;
CREATE POLICY "Admins can view all spins" ON public.daily_wheel_spins
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

DROP POLICY IF EXISTS "Users can claim their spins" ON public.daily_wheel_spins;
CREATE POLICY "Users can claim their spins" ON public.daily_wheel_spins
    FOR UPDATE
    USING ((select auth.uid()) = user_id AND claimed = false)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can record their spins" ON public.daily_wheel_spins;
CREATE POLICY "Users can record their spins" ON public.daily_wheel_spins
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own spins" ON public.daily_wheel_spins;
CREATE POLICY "Users can view their own spins" ON public.daily_wheel_spins
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- game_leaderboard (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert their own leaderboard entry" ON public.game_leaderboard;
CREATE POLICY "Users can insert their own leaderboard entry" ON public.game_leaderboard
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own leaderboard entry" ON public.game_leaderboard;
CREATE POLICY "Users can update their own leaderboard entry" ON public.game_leaderboard
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- game_sessions (3 policies)
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all game sessions" ON public.game_sessions;
CREATE POLICY "Admins can view all game sessions" ON public.game_sessions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])
    ));

DROP POLICY IF EXISTS "Users can insert their own game sessions" ON public.game_sessions;
CREATE POLICY "Users can insert their own game sessions" ON public.game_sessions
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;
CREATE POLICY "Users can view their own game sessions" ON public.game_sessions
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- game_stats (3 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert their own game stats" ON public.game_stats;
CREATE POLICY "Users can insert their own game stats" ON public.game_stats
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own game stats" ON public.game_stats;
CREATE POLICY "Users can update their own game stats" ON public.game_stats
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own game stats" ON public.game_stats;
CREATE POLICY "Users can view their own game stats" ON public.game_stats
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- giveaway_entries (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can create their own entries" ON public.giveaway_entries;
CREATE POLICY "Users can create their own entries" ON public.giveaway_entries
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own entries" ON public.giveaway_entries;
CREATE POLICY "Users can update their own entries" ON public.giveaway_entries
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- giveaway_winners (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage winners" ON public.giveaway_winners;
CREATE POLICY "Admins can manage winners" ON public.giveaway_winners
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
        AND user_roles.is_active = true
    ));

-- =====================================================
-- giveaways (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage giveaways" ON public.giveaways;
CREATE POLICY "Admins can manage giveaways" ON public.giveaways
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
        AND user_roles.is_active = true
    ));

-- =====================================================
-- items (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert items" ON public.items;
CREATE POLICY "Admins can insert items" ON public.items
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    ));

-- =====================================================
-- overlay_events (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "users can select own events" ON public.overlay_events;
CREATE POLICY "users can select own events" ON public.overlay_events
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- overlay_presets (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "users can manage own presets" ON public.overlay_presets;
CREATE POLICY "users can manage own presets" ON public.overlay_presets
    FOR ALL
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- payments (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "users can view own payments" ON public.payments;
CREATE POLICY "users can view own payments" ON public.payments
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- point_redemptions (3 policies - consolidate duplicates later)
-- =====================================================

DROP POLICY IF EXISTS "Users can create their own redemptions" ON public.point_redemptions;
CREATE POLICY "Users can create their own redemptions" ON public.point_redemptions
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.point_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.point_redemptions
    FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.point_redemptions;
CREATE POLICY "Users can view their own redemptions" ON public.point_redemptions
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- redemption_items (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage redemption items" ON public.redemption_items;
CREATE POLICY "Admins can manage redemption items" ON public.redemption_items
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
        AND user_roles.is_active = true
    ));

-- =====================================================
-- slot_history (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own slot history" ON public.slot_history;
CREATE POLICY "Users can delete own slot history" ON public.slot_history
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own slot history" ON public.slot_history;
CREATE POLICY "Users can insert own slot history" ON public.slot_history
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own slot history" ON public.slot_history;
CREATE POLICY "Users can update own slot history" ON public.slot_history
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own slot history" ON public.slot_history;
CREATE POLICY "Users can view own slot history" ON public.slot_history
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- slots (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Allow slot management for admins and slot_modders" ON public.slots;
CREATE POLICY "Allow slot management for admins and slot_modders" ON public.slots
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'slot_modder'::text])
        AND user_roles.is_active = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'slot_modder'::text])
        AND user_roles.is_active = true
    ));

-- =====================================================
-- spotify_connections (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete their own Spotify connection" ON public.spotify_connections;
CREATE POLICY "Users can delete their own Spotify connection" ON public.spotify_connections
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own Spotify connection" ON public.spotify_connections;
CREATE POLICY "Users can insert their own Spotify connection" ON public.spotify_connections
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own Spotify connection" ON public.spotify_connections;
CREATE POLICY "Users can update their own Spotify connection" ON public.spotify_connections
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own Spotify connection" ON public.spotify_connections;
CREATE POLICY "Users can view their own Spotify connection" ON public.spotify_connections
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- stream_highlights (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage highlights" ON public.stream_highlights;
CREATE POLICY "Admins can manage highlights" ON public.stream_highlights
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'owner'::text])
        AND user_roles.is_active = true
    ));

-- =====================================================
-- streamelements_connections (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete their own SE connection" ON public.streamelements_connections;
CREATE POLICY "Users can delete their own SE connection" ON public.streamelements_connections
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own SE connection" ON public.streamelements_connections;
CREATE POLICY "Users can insert their own SE connection" ON public.streamelements_connections
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own SE connection" ON public.streamelements_connections;
CREATE POLICY "Users can update their own SE connection" ON public.streamelements_connections
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own SE connection" ON public.streamelements_connections;
CREATE POLICY "Users can view their own SE connection" ON public.streamelements_connections
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- subscriptions (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "users can select own subscription" ON public.subscriptions;
CREATE POLICY "users can select own subscription" ON public.subscriptions
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- the_life_brothel_workers (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage workers" ON public.the_life_brothel_workers;
CREATE POLICY "Admins can manage workers" ON public.the_life_brothel_workers
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    ));

-- =====================================================
-- the_life_brothels (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own brothel" ON public.the_life_brothels;
CREATE POLICY "Users can manage own brothel" ON public.the_life_brothels
    FOR ALL
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can view own brothel" ON public.the_life_brothels;
CREATE POLICY "Users can view own brothel" ON public.the_life_brothels
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_business_productions (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Players can manage own productions" ON public.the_life_business_productions;
CREATE POLICY "Players can manage own productions" ON public.the_life_business_productions
    FOR ALL
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Players can view own productions" ON public.the_life_business_productions;
CREATE POLICY "Players can view own productions" ON public.the_life_business_productions
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_business_required_items (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage business required items" ON public.the_life_business_required_items;
CREATE POLICY "Admins can manage business required items" ON public.the_life_business_required_items
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    ));

-- =====================================================
-- the_life_businesses (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage businesses" ON public.the_life_businesses;
CREATE POLICY "Admins can manage businesses" ON public.the_life_businesses
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    ));

-- =====================================================
-- the_life_category_info (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Allow admins to manage category info" ON public.the_life_category_info;
CREATE POLICY "Allow admins to manage category info" ON public.the_life_category_info
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])
    ));

-- =====================================================
-- the_life_drug_ops (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own drug ops" ON public.the_life_drug_ops;
CREATE POLICY "Users can manage own drug ops" ON public.the_life_drug_ops
    FOR ALL
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can view own drug ops" ON public.the_life_drug_ops;
CREATE POLICY "Users can view own drug ops" ON public.the_life_drug_ops
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_event_messages (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage event messages" ON public.the_life_event_messages;
CREATE POLICY "Admins can manage event messages" ON public.the_life_event_messages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
    ));

-- =====================================================
-- the_life_items (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage TheLife items" ON public.the_life_items;
CREATE POLICY "Admins can manage TheLife items" ON public.the_life_items
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'moderator'::text])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'moderator'::text])
    ));

-- =====================================================
-- the_life_player_brothel_workers (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own hired workers" ON public.the_life_player_brothel_workers;
CREATE POLICY "Users can manage own hired workers" ON public.the_life_player_brothel_workers
    FOR ALL
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can view own hired workers" ON public.the_life_player_brothel_workers;
CREATE POLICY "Users can view own hired workers" ON public.the_life_player_brothel_workers
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_player_businesses (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own businesses" ON public.the_life_player_businesses;
CREATE POLICY "Users can manage own businesses" ON public.the_life_player_businesses
    FOR ALL
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can view own businesses" ON public.the_life_player_businesses;
CREATE POLICY "Users can view own businesses" ON public.the_life_player_businesses
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_player_inventory (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Players can manage own inventory" ON public.the_life_player_inventory;
CREATE POLICY "Players can manage own inventory" ON public.the_life_player_inventory
    FOR ALL
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Players can view own inventory" ON public.the_life_player_inventory;
CREATE POLICY "Players can view own inventory" ON public.the_life_player_inventory
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_players (5 policies - 2 duplicates to consolidate)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own player" ON public.the_life_players;
CREATE POLICY "Users can insert own player" ON public.the_life_players
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own player data" ON public.the_life_players;
CREATE POLICY "Users can insert own player data" ON public.the_life_players
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own player" ON public.the_life_players;
CREATE POLICY "Users can update own player" ON public.the_life_players
    FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own player data" ON public.the_life_players;
CREATE POLICY "Users can update own player data" ON public.the_life_players
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own player data" ON public.the_life_players;
CREATE POLICY "Users can view own player data" ON public.the_life_players
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- the_life_pvp_chat (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.the_life_pvp_chat;
CREATE POLICY "Authenticated users can send messages" ON public.the_life_pvp_chat
    FOR INSERT
    WITH CHECK (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_pvp_logs (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert PvP logs" ON public.the_life_pvp_logs;
CREATE POLICY "Users can insert PvP logs" ON public.the_life_pvp_logs
    FOR INSERT
    WITH CHECK (attacker_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- the_life_pvp_presence (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Users can update own presence" ON public.the_life_pvp_presence;
CREATE POLICY "Users can update own presence" ON public.the_life_pvp_presence
    FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- the_life_robberies (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage robberies" ON public.the_life_robberies;
CREATE POLICY "Admins can manage robberies" ON public.the_life_robberies
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'owner'::text])
        AND user_roles.is_active = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = ANY (ARRAY['admin'::text, 'owner'::text])
        AND user_roles.is_active = true
    ));

-- =====================================================
-- the_life_robbery_history (2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own robbery history" ON public.the_life_robbery_history;
CREATE POLICY "Users can insert own robbery history" ON public.the_life_robbery_history
    FOR INSERT
    WITH CHECK (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can view own robbery history" ON public.the_life_robbery_history;
CREATE POLICY "Users can view own robbery history" ON public.the_life_robbery_history
    FOR SELECT
    USING (player_id IN (
        SELECT the_life_players.id FROM the_life_players
        WHERE the_life_players.user_id = (select auth.uid())
    ));

-- =====================================================
-- tournament_history (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own tournament history" ON public.tournament_history;
CREATE POLICY "Users can delete own tournament history" ON public.tournament_history
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own tournament history" ON public.tournament_history;
CREATE POLICY "Users can insert own tournament history" ON public.tournament_history
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own tournament history" ON public.tournament_history;
CREATE POLICY "Users can update own tournament history" ON public.tournament_history
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own tournament history" ON public.tournament_history;
CREATE POLICY "Users can view own tournament history" ON public.tournament_history
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- tournament_rounds (3 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own tournament rounds" ON public.tournament_rounds;
CREATE POLICY "Users can insert own tournament rounds" ON public.tournament_rounds
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM tournament_history
        WHERE tournament_history.id = tournament_rounds.tournament_id
        AND tournament_history.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can update own tournament rounds" ON public.tournament_rounds;
CREATE POLICY "Users can update own tournament rounds" ON public.tournament_rounds
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM tournament_history
        WHERE tournament_history.id = tournament_rounds.tournament_id
        AND tournament_history.user_id = (select auth.uid())
    ));

DROP POLICY IF EXISTS "Users can view own tournament rounds" ON public.tournament_rounds;
CREATE POLICY "Users can view own tournament rounds" ON public.tournament_rounds
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM tournament_history
        WHERE tournament_history.id = tournament_rounds.tournament_id
        AND tournament_history.user_id = (select auth.uid())
    ));

-- =====================================================
-- user_giveaways (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete their own giveaways" ON public.user_giveaways;
CREATE POLICY "Users can delete their own giveaways" ON public.user_giveaways
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own giveaways" ON public.user_giveaways;
CREATE POLICY "Users can insert their own giveaways" ON public.user_giveaways
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own giveaways" ON public.user_giveaways;
CREATE POLICY "Users can update their own giveaways" ON public.user_giveaways
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own giveaways" ON public.user_giveaways;
CREATE POLICY "Users can view their own giveaways" ON public.user_giveaways
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- user_inventory (3 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own inventory" ON public.user_inventory;
CREATE POLICY "Users can insert own inventory" ON public.user_inventory
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own inventory" ON public.user_inventory;
CREATE POLICY "Users can update own inventory" ON public.user_inventory
    FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
CREATE POLICY "Users can view own inventory" ON public.user_inventory
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- user_profiles (5 policies - 2 duplicates)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can insert own profile" ON public.user_profiles;
CREATE POLICY "users can insert own profile" ON public.user_profiles
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can select own profile" ON public.user_profiles;
CREATE POLICY "users can select own profile" ON public.user_profiles
    FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can update own profile" ON public.user_profiles;
CREATE POLICY "users can update own profile" ON public.user_profiles
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- user_random_slot (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete their own random slot state" ON public.user_random_slot;
CREATE POLICY "Users can delete their own random slot state" ON public.user_random_slot
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own random slot state" ON public.user_random_slot;
CREATE POLICY "Users can insert their own random slot state" ON public.user_random_slot
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own random slot state" ON public.user_random_slot;
CREATE POLICY "Users can update their own random slot state" ON public.user_random_slot
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own random slot state" ON public.user_random_slot;
CREATE POLICY "Users can view their own random slot state" ON public.user_random_slot
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- user_roles (6 policies - 2 duplicates)
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
    FOR DELETE
    USING (is_admin_or_superadmin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
    FOR INSERT
    WITH CHECK (is_admin_or_superadmin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
    FOR UPDATE
    USING (is_admin_or_superadmin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT
    USING (is_admin_or_superadmin((select auth.uid())));

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- user_themes (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can create their own themes" ON public.user_themes;
CREATE POLICY "Users can create their own themes" ON public.user_themes
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own themes" ON public.user_themes;
CREATE POLICY "Users can delete their own themes" ON public.user_themes
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own themes" ON public.user_themes;
CREATE POLICY "Users can update their own themes" ON public.user_themes
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own themes" ON public.user_themes;
CREATE POLICY "Users can view their own themes" ON public.user_themes
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- user_tournaments (4 policies)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete their own tournaments" ON public.user_tournaments;
CREATE POLICY "Users can delete their own tournaments" ON public.user_tournaments
    FOR DELETE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own tournaments" ON public.user_tournaments;
CREATE POLICY "Users can insert their own tournaments" ON public.user_tournaments
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.user_tournaments;
CREATE POLICY "Users can update their own tournaments" ON public.user_tournaments
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own tournaments" ON public.user_tournaments;
CREATE POLICY "Users can view their own tournaments" ON public.user_tournaments
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- voucher_codes (1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage vouchers" ON public.voucher_codes;
CREATE POLICY "Admins can manage vouchers" ON public.voucher_codes
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
        AND user_roles.is_active = true
    ));

-- =====================================================
-- voucher_redemptions (3 policies)
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.voucher_redemptions;
CREATE POLICY "Admins can view all redemptions" ON public.voucher_redemptions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role = 'admin'::text
        AND user_roles.is_active = true
    ));

DROP POLICY IF EXISTS "Users can redeem vouchers" ON public.voucher_redemptions;
CREATE POLICY "Users can redeem vouchers" ON public.voucher_redemptions
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.voucher_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.voucher_redemptions
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- =====================================================
-- Summary
-- =====================================================
-- ✅ Optimized 106 RLS policies with (select auth.uid()) wrapping
-- ✅ All auth.uid() calls now evaluated once per query instead of per row
-- 
-- ⚠️ DUPLICATE POLICIES REMAIN (consolidate separately):
-- - point_redemptions: 2 identical SELECT policies
-- - the_life_players: 2 identical INSERT policies, 2 similar UPDATE policies
-- - user_profiles: 2 identical INSERT policies
-- - user_roles: 2 identical SELECT policies
--
-- Expected Performance Improvements:
-- - 10-100x faster RLS policy evaluation on large result sets
-- - Reduced CPU usage during authenticated queries
-- - Significantly improved query response times
--
-- Next Steps:
-- 1. Test thoroughly in development
-- 2. Monitor query performance with EXPLAIN ANALYZE
-- 3. Consolidate duplicate policies (see optimize_database_indexes.sql)
-- 4. Apply to production during low-traffic window
