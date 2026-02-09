-- Create tables for the Reservation System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    rg TEXT,
    profession TEXT, -- [NOVO] Para contrato
    phone TEXT NOT NULL,
    email TEXT,
    address_zip_code TEXT,
    address_street TEXT,
    address_number TEXT, -- [NOVO] Adicionado para completude do endereço
    address_city TEXT, -- [NOVO] Para contrato
    address_state TEXT, -- [NOVO] Para contrato
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Reservations Table
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_in_time TIME DEFAULT '14:00:00', -- [NOVO] Para contrato
    check_out DATE NOT NULL,
    check_out_time TIME DEFAULT '12:00:00', -- [NOVO] Para contrato
    guests_count INTEGER DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2),
    deposit_date DATE,
    payment_method TEXT,
    status TEXT CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_dates CHECK (check_out >= check_in)
);

-- Indexes for performance (especially for date range queries)
CREATE INDEX idx_reservations_dates ON public.reservations (check_in, check_out);
CREATE INDEX idx_reservations_status ON public.reservations (status);
CREATE INDEX idx_reservations_client_id ON public.reservations (client_id);

-- RLS Policies (Row Level Security)
-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create generic policies (Modify these based on your auth requirements)
-- For now, allowing all interaction for authenticated users or public if no auth is set up yet for the agent
-- CAUTION: Adjust these for production!

CREATE POLICY "Enable read access for all users" ON public.clients
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.clients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.clients
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.reservations
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.reservations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.reservations
    FOR UPDATE USING (true);


-- 3. Function for Availability Check (for n8n)
CREATE OR REPLACE FUNCTION check_availability(
    p_check_in DATE,
    p_check_out DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1
        FROM reservations
        WHERE status IN ('confirmed', 'pending')
        AND (
            (check_in < p_check_out) AND (check_out > p_check_in)
        )
    );
END;
$$;

-- Comment on function usage
COMMENT ON FUNCTION check_availability IS 'Returns true if the dates are available, false if overlapping with existing confirmed/pending reservations.';
