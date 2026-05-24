import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Inicializa o cliente dentro da função
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const body = await request.json();

    const preference = new Preference(client);
    
    // Cria a intenção de pagamento no Mercado Pago
    const response = await preference.create({
      body: {
        items: body.items,
        external_reference: body.pedidoId.toString(), // ID do pedido
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        
        // Mantemos os links para caso o usuário feche a janela do MP, 
        // mas retiramos o "auto_return" para evitar o erro de bloqueio do localhost
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/pedidos`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/carrinho`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/pedidos`
        },
        auto_return: 'approved',
      }
    });

    // Devolve o ID da preferência gerada para o frontend
    return NextResponse.json({ id: response.id, init_point: response.init_point });
    
  } catch (error) {
    console.error("Erro na API do Mercado Pago:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}