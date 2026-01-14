-- Delete all widget types and their instances
-- This will cascade delete all widgets due to foreign key constraints

-- Delete all user widget instances first
DELETE FROM widgets;

-- Delete all widget types
DELETE FROM widget_types;

-- Verify deletion
SELECT 'All widget types deleted' AS status, COUNT(*) as remaining_types FROM widget_types;
SELECT 'All widget instances deleted' AS status, COUNT(*) as remaining_instances FROM widgets;
