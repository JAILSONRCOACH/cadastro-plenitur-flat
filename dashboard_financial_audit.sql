-- Auditoria financeira do dashboard (mês atual)
-- Regra usada no painel:
-- - Recebido: apenas sinal (deposit_amount) ou total quando status = completed/closed
-- - A receber: total - recebido

WITH month_reservations AS (
    SELECT
        id,
        created_at::date AS created_date,
        COALESCE(status, 'pending') AS status,
        COALESCE(total_amount, 0)::numeric AS total_amount,
        COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
        deposit_paid,
        deposit_date,
        contract_signed_url
    FROM public.reservations
    WHERE created_at >= date_trunc('month', now())
      AND created_at < date_trunc('month', now()) + interval '1 month'
      AND COALESCE(status, 'pending') NOT IN ('cancelled', 'canceled')
),
financial AS (
    SELECT
        id,
        total_amount,
        CASE
            WHEN status IN ('completed', 'closed') THEN total_amount
            WHEN deposit_paid = true
                 OR deposit_date IS NOT NULL
                 OR contract_signed_url IS NOT NULL
                 OR status = 'pending_admin_signature'
                THEN LEAST(deposit_amount, total_amount)
            ELSE 0
        END AS received_amount
    FROM month_reservations
)
SELECT
    COUNT(*) AS reservas_no_mes,
    COALESCE(SUM(total_amount), 0) AS reservado_no_mes,
    COALESCE(SUM(received_amount), 0) AS recebido_no_mes,
    COALESCE(SUM(total_amount - received_amount), 0) AS saldo_a_receber_no_mes
FROM financial;
