-- Add new columns to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_pet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb;

-- Optional: Update existing records to default values if needed
-- UPDATE reservations SET installments = 1 WHERE installments IS NULL;
