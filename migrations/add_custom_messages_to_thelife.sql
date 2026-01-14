-- Add custom success/failure messages to crimes, businesses, and workers

-- Add message fields to robberies (crimes)
ALTER TABLE the_life_robberies 
ADD COLUMN IF NOT EXISTS success_message TEXT DEFAULT 'Success! You earned ${reward} and ${xp} XP!',
ADD COLUMN IF NOT EXISTS fail_message TEXT DEFAULT 'You failed! Lost ${hp} HP and going to jail for ${jailTime} minutes.';

-- Add message fields to businesses
ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS success_message TEXT DEFAULT 'Business successful! You earned ${reward} and ${xp} XP!',
ADD COLUMN IF NOT EXISTS fail_message TEXT DEFAULT 'Business failed! Lost ${hp} HP.';

-- Add message fields to brothel workers
ALTER TABLE the_life_brothel_workers 
ADD COLUMN IF NOT EXISTS hire_message TEXT DEFAULT 'Successfully hired ${name}! They will earn ${income} per hour.';

-- Update existing records to have default messages if null
UPDATE the_life_robberies 
SET success_message = 'Success! You earned $${reward} and ${xp} XP! (${chance}% chance)'
WHERE success_message IS NULL;

UPDATE the_life_robberies 
SET fail_message = 'You failed! Lost ${hp} HP and going to jail for ${jailTime} minutes.'
WHERE fail_message IS NULL;

UPDATE the_life_businesses 
SET success_message = 'Business successful! You earned $${reward} and ${xp} XP!'
WHERE success_message IS NULL;

UPDATE the_life_businesses 
SET fail_message = 'Business failed! Lost ${hp} HP.'
WHERE fail_message IS NULL;

UPDATE the_life_brothel_workers 
SET hire_message = 'Successfully hired ${name}! They will earn $${income}/hour.'
WHERE hire_message IS NULL;
