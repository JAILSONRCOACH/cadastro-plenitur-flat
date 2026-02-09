-- Add status and admin signature fields to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_admin_signature', -- pending_admin_signature, approved, rejected
ADD COLUMN IF NOT EXISTS admin_signature_url TEXT,
ADD COLUMN IF NOT EXISTS final_contract_url TEXT, -- PDF with BOTH signatures
ADD COLUMN IF NOT EXISTS admin_signed_at TIMESTAMPTZ;

-- Define clear statuses:
-- 1. 'created': Form filled, not signed by client yet (if we saved draft)
-- 2. 'pending_admin_signature': Signed by Client, waiting for Admin
-- 3. 'approved': Signed by Admin, Final PDF generated
-- 4. 'rejected': Admin rejected the contract
