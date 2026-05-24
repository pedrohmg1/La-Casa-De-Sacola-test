import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export async function POST(request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');
  const url = new URL(request.url);

  if (xSignature && secret) {
    const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
    const dataId = url.searchParams.get('data.id');
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;

    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== parts.v1) {
      console.warn('Assinatura inválida recebida no webhook.');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => null);

    const topic = url.searchParams.get('type')
      || url.searchParams.get('topic')
      || body?.type;

    const id = url.searchParams.get('data.id')
      || body?.data?.id
      || url.searchParams.get('id');

    if (topic === 'payment' && id) {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id });

      if (paymentData.status === 'approved') {
        const pedidoId = paymentData.external_reference;
      
        // Verifica se o pedido já foi processado
        const { data: pedidoAtual } = await supabaseAdmin
          .from('pedido')
          .select('status_ped')
          .eq('id_ped', pedidoId)
          .single();
      
        if (pedidoAtual?.status_ped === 'Pago Aguardando Produção') {
          console.log(`Pedido ${pedidoId} já foi processado, ignorando.`);
          return NextResponse.json({ success: true }, { status: 200 });
        }
      
        const { error } = await supabaseAdmin
          .from('pedido')
          .update({ status_ped: 'Pago Aguardando Produção' })
          .eq('id_ped', pedidoId);

        if (error) {
          console.error('Erro ao atualizar o Supabase:', error);
          return NextResponse.json({ error: 'Erro ao atualizar o banco de dados' }, { status: 500 });
        }

        console.log(`Pagamento aprovado! Pedido ${pedidoId} atualizado.`);
      } else if (paymentData.status === 'in_process' || paymentData.status === 'pending') {
        // ✅ Novo — PIX e boleto aguardando confirmação
        const pedidoId = paymentData.external_reference;
      
        const { error } = await supabaseAdmin
          .from('pedido')
          .update({ status_ped: 'Aguardando Pagamento' })
          .eq('id_ped', pedidoId);
      
        if (error) {
          console.error('Erro ao atualizar pedido:', error);
          return NextResponse.json({ error: 'Erro ao atualizar o banco de dados' }, { status: 500 });
        }
      
        console.log(`Pagamento pendente. Pedido ${pedidoId} aguardando confirmação.`);
      } else if (paymentData.status === 'rejected') {
        const pedidoId = paymentData.external_reference;
      
        const { error } = await supabaseAdmin
          .from('pedido')
          .update({ status_ped: 'Cancelado' })
          .eq('id_ped', pedidoId);
      
        if (error) {
          console.error('Erro ao cancelar pedido:', error);
          return NextResponse.json({ error: 'Erro ao atualizar o banco de dados' }, { status: 500 });
        }
      
        console.log(`Pagamento rejeitado. Pedido ${pedidoId} cancelado.`);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Erro interno no Webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}