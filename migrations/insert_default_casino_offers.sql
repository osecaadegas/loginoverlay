-- Insert hardcoded casino offers into the database
-- Note: You'll need to update the bonus_link URLs with actual affiliate links

INSERT INTO casino_offers (casino_name, title, image_url, bonus_link, badge, badge_class, min_deposit, cashback, bonus_value, free_spins, is_premium, details, is_active, display_order) VALUES
('Ignibet', '665% Bonus & 750 FS up to €6250', 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400&h=300&fit=crop', 'https://example.com/ignibet', 'HOT', 'hot', '20€', '30%', '665%', 'Up to 750', true, '+18 | T&C APPLY

New players only. Min deposit €20. Max bonus €6250 + 750 Free Spins. Wagering 40x. Game weighting applies. T&Cs apply.', true, 0),

('Betfury', 'Special GODMOTA VIP Program', 'https://images.unsplash.com/photo-1518449965925-3439867d4d36?w=400&h=300&fit=crop', 'https://example.com/betfury', 'HOT', 'hot', '20€', '20%', '100%', 'Up to 100', true, '+18 | T&C APPLY

Exclusive VIP program for GODMOTA viewers. Level up for better rewards. Cashback on every bet. T&Cs apply.', true, 1),

('Free Coins', '400% Bonus up to €2200 & 350FS', 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=400&h=300&fit=crop', 'https://example.com/freecoins', 'NEW', 'new', '25€', '35%', '400%', 'Up to 350', true, '+18 | T&C APPLY

Welcome package spread across first 3 deposits. Min deposit €25. Wagering requirements apply. T&Cs apply.', true, 2),

('Flagman', '125FS on signup & 100€ Free Bets', 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=400&h=300&fit=crop', 'https://example.com/flagman', '', '', '10€', '', '150%', 'Up to 125', true, '+18 | T&C APPLY

No deposit required for signup spins. Use code GODMOTA for extra bonus. T&Cs apply.', true, 3),

('Lootbox', '5% On Every Deposit & VIP Battle', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop', 'https://example.com/lootbox', '', '', '1€', '', '5%', '', false, '+18 | T&C APPLY

Get 5% extra on every deposit. Join exclusive VIP battles. Use code GODMOTA. T&Cs apply.', true, 4),

('Crasher', '400% Bonus & 350FS up to €2200', 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=400&h=300&fit=crop', 'https://example.com/crasher', '', '', '10€', '', '400%', 'Up to 350', false, '+18 | T&C APPLY

Massive welcome package. Min deposit €10. Use code GODCB. Wagering 35x. T&Cs apply.', true, 5),

('BC.GAME', '360% Bonus & Daily Wheel of Fortune', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400&h=300&fit=crop', 'https://example.com/bcgame', '', '', '10€', '25%', '360%', '', false, '+18 | T&C APPLY

Daily wheel of fortune with guaranteed prizes. 25% cashback on losses. Min deposit €10. T&Cs apply.', true, 6),

('Ribace', '400% Bonus + 350FS up to €2000', 'https://images.unsplash.com/photo-1571974599782-87624638275e?w=400&h=300&fit=crop', 'https://example.com/ribace', '', '', '25€', '35%', '450%', 'Up to 350', false, '+18 | T&C APPLY

Premium welcome package. Min deposit €25. 35% weekly cashback. Wagering 40x. T&Cs apply.', true, 7);
