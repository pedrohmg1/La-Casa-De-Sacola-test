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
        items: body.items, // Recebe os itens do carrinho
        external_reference: body.pedidoId ? body.pedidoId.toString() : "pedido_teste", // ID do pedido
        
        // Mantemos os links para caso o usuário feche a janela do MP, 
        // mas retiramos o "auto_return" para evitar o erro de bloqueio do localhost
        back_urls: {
          success: 'http://localhost:3000/pedidos',
          failure: 'http://localhost:3000/carrinho',
          pending: 'http://localhost:3000/pedidos'
        }
      }
    });

    // Devolve o ID da preferência gerada para o frontend
    return NextResponse.json({ id: response.id, init_point: response.init_point });
    
  } catch (error) {
    console.error("Erro na API do Mercado Pago:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}