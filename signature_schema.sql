-- Create Storage Bucket for Contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Allow public uploads for now - secure in production)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'contracts');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'contracts');

-- Update Reservations Table for Signature Tracking
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_url TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signer_ip TEXT,
ADD COLUMN IF NOT EXISTS signer_user_agent TEXT,
ADD COLUMN IF NOT EXISTS signature_accepted BOOLEAN DEFAULT FALSE;
