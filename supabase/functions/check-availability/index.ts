
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { checkIn, checkOut } = await req.json()

        if (!checkIn || !checkOut) {
            throw new Error('Missing checkIn or checkOut dates')
        }

        // Call the RPC function defined in SQL
        const { data, error } = await supabase
            .rpc('check_availability', {
                p_check_in: checkIn,
                p_check_out: checkOut
            })

        if (error) throw error

        return new Response(
            JSON.stringify({ available: data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
