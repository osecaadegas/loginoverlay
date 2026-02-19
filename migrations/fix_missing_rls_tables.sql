-- Enable RLS on tables missing it
-- Run this in your Supabase SQL editor

-- =====================================================
-- 1. THE_LIFE_SYSTEM_LOCKS - Admin only table
-- =====================================================
ALTER TABLE the_life_system_locks ENABLE ROW LEVEL SECURITY;

-- Only admins can manage locks
CREATE POLICY "Admins can manage system locks" ON the_life_system_locks FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- 2. THE_LIFE_WIPE_BACKUPS - Admin only table
-- =====================================================
ALTER TABLE the_life_wipe_backups ENABLE ROW LEVEL SECURITY;

-- Only admins can manage backups
CREATE POLICY "Admins can manage wipe backups" ON the_life_wipe_backups FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- 3. THE_LIFE_WIPE_TABLE_CONFIG - Admin only table
-- =====================================================
ALTER TABLE the_life_wipe_table_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view config
CREATE POLICY "Anyone can view wipe table config" ON the_life_wipe_table_config FOR SELECT 
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage wipe table config" ON the_life_wipe_table_config 
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update wipe table config" ON the_life_wipe_table_config 
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete wipe table config" ON the_life_wipe_table_config 
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- 4. THE_LIFE_STOCK_PORTFOLIOS - Player owned data
-- =====================================================
ALTER TABLE the_life_stock_portfolios ENABLE ROW LEVEL SECURITY;

-- Anyone can view portfolios
CREATE POLICY "Anyone can view stock portfolios" ON the_life_stock_portfolios FOR SELECT 
  USING (true);

-- Users can manage their own portfolios
CREATE POLICY "Users can insert own portfolio" ON the_life_stock_portfolios FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own portfolio" ON the_life_stock_portfolios FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own portfolio" ON the_life_stock_portfolios FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 5. THE_LIFE_STOCK_TRANSACTIONS - Player transaction history
-- =====================================================
ALTER TABLE the_life_stock_transactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view transactions
CREATE POLICY "Anyone can view stock transactions" ON the_life_stock_transactions FOR SELECT 
  USING (true);

-- Users can insert their own transactions
CREATE POLICY "Users can insert stock transactions" ON the_life_stock_transactions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 6. THE_LIFE_RATE_LIMITS - System table
-- =====================================================
ALTER TABLE the_life_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow all operations (rate limits are managed by server functions)
CREATE POLICY "Anyone can view rate limits" ON the_life_rate_limits FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated can manage rate limits" ON the_life_rate_limits FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update rate limits" ON the_life_rate_limits FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete rate limits" ON the_life_rate_limits FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 7. THE_LIFE_DOCK_SHIPMENTS - Player shipment data
-- =====================================================
ALTER TABLE the_life_dock_shipments ENABLE ROW LEVEL SECURITY;

-- Anyone can view shipments
CREATE POLICY "Anyone can view dock shipments" ON the_life_dock_shipments FOR SELECT 
  USING (true);

-- Users can manage their shipments
CREATE POLICY "Users can insert shipments" ON the_life_dock_shipments FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update shipments" ON the_life_dock_shipments FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete shipments" ON the_life_dock_shipments FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 8. THE_LIFE_DOCK_BOATS - Boat definitions
-- =====================================================
ALTER TABLE the_life_dock_boats ENABLE ROW LEVEL SECURITY;

-- Anyone can view boats
CREATE POLICY "Anyone can view dock boats" ON the_life_dock_boats FOR SELECT 
  USING (true);

-- Only admins can manage boats
CREATE POLICY "Admins can manage dock boats" ON the_life_dock_boats FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update dock boats" ON the_life_dock_boats FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete dock boats" ON the_life_dock_boats FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ));
