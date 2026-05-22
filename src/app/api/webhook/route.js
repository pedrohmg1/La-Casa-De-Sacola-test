import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Inicializa o cliente do Mercado Pago usando a sua variável de ambiente
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export async function POST(request) {
  try {
    // 1. Pega os parâmetros da URL que o Mercado Pago enviou na notificação
    const url = new URL(request.url);
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
          .from('pedidos') 
          .update({ status_ped: 'Pago' }) // Altere 'Pago' para o texto exato que você usa no seu sistema
          .eq('id', pedidoId);

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