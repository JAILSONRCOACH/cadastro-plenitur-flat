-- Manual date blocks for admin calendar
-- Run this in Supabase SQL Editor before using the feature.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.manual_date_blocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT manual_date_blocks_check_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_manual_date_blocks_active_dates
    ON public.manual_date_blocks (is_active, start_date, end_date);

CREATE OR REPLACE FUNCTION public.validate_manual_date_block()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.start_date < CURRENT_DATE OR NEW.end_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Manual block cannot use past dates.';
    END IF;

    IF NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'End date must be greater than or equal to start date.';
    END IF;

    IF NEW.is_active = true AND EXISTS (
        SELECT 1
        FROM public.reservations r
        WHERE COALESCE(r.status, 'pending') <> 'cancelled'
          AND r.check_in <= NEW.end_date
          AND r.check_out > NEW.start_date
    ) THEN
        RAISE EXCEPTION 'Manual block overlaps occupied reservation dates.';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_manual_date_block ON public.manual_date_blocks;
CREATE TRIGGER trg_validate_manual_date_block
BEFORE INSERT OR UPDATE ON public.manual_date_blocks
FOR EACH ROW
EXECUTE FUNCTION public.validate_manual_date_block();

ALTER TABLE public.manual_date_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'manual_date_blocks'
          AND policyname = 'Enable read access for all users (manual_date_blocks)'
    ) THEN
        CREATE POLICY "Enable read access for all users (manual_date_blocks)"
            ON public.manual_date_blocks
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'manual_date_blocks'
          AND policyname = 'Enable insert for all users (manual_date_blocks)'
    ) THEN
        CREATE POLICY "Enable insert for all users (manual_date_blocks)"
            ON public.manual_date_blocks
            FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'manual_date_blocks'
          AND policyname = 'Enable update for all users (manual_date_blocks)'
    ) THEN
        CREATE POLICY "Enable update for all users (manual_date_blocks)"
            ON public.manual_date_blocks
            FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'manual_date_blocks'
          AND policyname = 'Enable delete for all users (manual_date_blocks)'
    ) THEN
        CREATE POLICY "Enable delete for all users (manual_date_blocks)"
            ON public.manual_date_blocks
            FOR DELETE USING (true);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_availability(
    p_check_in DATE,
    p_check_out DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_last_night DATE;
BEGIN
    IF p_check_out <= p_check_in THEN
        RETURN false;
    END IF;

    p_last_night := p_check_out - 1;

    RETURN NOT EXISTS (
        SELECT 1
        FROM reservations
        WHERE COALESCE(status, 'pending') <> 'cancelled'
          AND check_in < p_check_out
          AND check_out > p_check_in
    )
    AND NOT EXISTS (
        SELECT 1
        FROM manual_date_blocks
        WHERE is_active = true
          AND start_date <= p_last_night
          AND end_date >= p_check_in
    );
END;
$$;

COMMENT ON FUNCTION public.check_availability IS
'Returns true if dates are available considering reservations and active manual date blocks.';
