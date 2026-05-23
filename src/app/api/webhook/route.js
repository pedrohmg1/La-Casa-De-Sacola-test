import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Inicializa o cliente do Mercado Pago usando a sua variável de ambiente
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
    // 1. Pega os parâmetros da URL que o Mercado Pago enviou na notificação
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    // 2. Verifica se a notificação é especificamente sobre um pagamento
    if (topic === 'payment' && id) {
      const payment = new Payment(client);
      
      // 3. Busca os detalhes daquele pagamento no Mercado Pago
      const paymentData = await payment.get({ id });

      // 4. Se o status for "approved" (pagamento aprovado), atualizamos o banco
      if (paymentData.status === 'approved') {
        const pedidoId = paymentData.external_reference; // O ID do pedido que foi passado na criação

        // 5. Atualiza o status_ped na tabela do Supabase
        const { error } = await supabase
          .from('pedido') 
          .update({ status_ped: 'Pago Aguardando Produção' }) // Altere 'Pago' para o texto exato que você usa no seu sistema
          .eq('id_ped', pedidoId);

        if (error) {
          console.error('Erro ao atualizar o Supabase:', error);
          return NextResponse.json({ error: 'Erro ao atualizar o banco de dados' }, { status: 500 });
        }
        
        console.log(`Pagamento aprovado! Pedido ${pedidoId} atualizado.`);
      }
    }

    // 6. Retorna código 200 para o Mercado Pago saber que você recebeu a mensagem
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Erro interno no Webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}