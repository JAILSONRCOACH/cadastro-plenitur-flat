// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    try {
        const { email, name, contract_signed_url, signature_url } = await req.json()
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Plenitur Flats <onboarding@resend.dev>'

        if (!RESEND_API_KEY) {
            throw new Error('Missing RESEND_API_KEY')
        }

        if (!email) {
            throw new Error('Missing recipient email')
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: RESEND_FROM,
                to: [email],
                subject: `Contrato de Locação Assinado - ${name}`,
                html: `
          <h1>Olá, ${name}!</h1>
          <p>Obrigado por completar sua assinatura digital.</p>
          <p>Você pode acessar seu contrato assinado no link abaixo:</p>
          <p><a href="${contract_signed_url}">Baixar Contrato Assinado</a></p>
          <hr />
          <p><strong>Para o Locador:</strong></p>
          <p>Link da Assinatura: <a href="${signature_url}">Ver Assinatura</a></p>
          <p>Por favor, verifique se está tudo correto.</p>
          <hr />
          <p>Atenciosamente,<br />Equipe Plenitur Flats</p>
        `,
                // Link para o contrato (sem anexo para evitar erros de entrega)
            }),
        })

        const raw = await res.text()
        let data: any = null
        try {
            data = raw ? JSON.parse(raw) : {}
        } catch {
            data = { raw }
        }

        if (!res.ok) {
            const errorMsg = data?.message || data?.error || raw || 'Falha ao enviar email'
            return new Response(JSON.stringify({ error: errorMsg, status: res.status }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
    }
})
