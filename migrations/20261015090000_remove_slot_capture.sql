-- Remove the discontinued local Slot Capture feature while preserving
-- forward-only migration history for databases where it was deployed.
drop table if exists public.slot_capture_outputs cascade;
drop table if exists public.slot_capture_filters cascade;
drop table if exists public.slot_capture_masks cascade;
drop table if exists public.slot_capture_sources cascade;
drop table if exists public.slot_capture_profiles cascade;
