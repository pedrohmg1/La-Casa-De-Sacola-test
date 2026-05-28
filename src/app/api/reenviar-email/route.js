import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request) {
  try {
    const { pedidoId } = await request.json();

    if (!pedidoId) {
      return NextResponse.json({ error: 'ID do pedido não fornecido' }, { status: 400 });
    }

    // Busca o pedido e o email do usuário
    const { data: pedidoAtual, error } = await supabaseAdmin
      .from('pedido')
      .select('status_ped, usuario:usu_uuid(email_usu)') 
      .eq('id_ped', pedidoId)
      .single();

    if (error || !pedidoAtual) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const emailCliente = pedidoAtual?.usuario?.email_usu;

    if (!emailCliente) {
      return NextResponse.json({ error: 'Email do cliente não encontrado' }, { status: 404 });
    }

    const linkAcompanhamento = `${process.env.NEXT_PUBLIC_APP_URL}pedidos`;

    await transporter.sendMail({
      from: `"La Casa de Sacola" <${process.env.EMAIL_USER}>`,
      to: emailCliente,
      subject: `La Casa de Sacola | Pagamento Aprovado (Pedido #${pedidoId}) [TESTE/REENVIO]`,
      html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pagamento Aprovado</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Manrope:wght@400;500;600&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background-color: #f0ebe0; font-family: 'Manrope', 'Helvetica Neue', sans-serif; padding: 40px 16px; }
          .wrapper { max-width: 560px; margin: 0 auto; }
          .top-bar { text-align: center; margin-bottom: 24px; }
          .logo-text { font-family: 'Quicksand', sans-serif; font-weight: 800; font-size: 22px; color: #264f41; letter-spacing: 0.5px; }
          .logo-text span { color: #3ca779; }
          .card { background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 32px rgba(38, 79, 65, 0.10); }
          .card-header { background-color: #264f41; padding: 36px 40px 32px; text-align: center; position: relative; }
          .card-header::after { content: ''; display: block; width: 64px; height: 4px; background-color: #3ca779; border-radius: 2px; margin: 16px auto 0; }
          .card-header h1 { font-family: 'Quicksand', sans-serif; font-weight: 800; font-size: 26px; color: #ffffff; line-height: 1.2; }
          .card-header p { font-size: 14px; color: #9ab8ae; margin-top: 6px; font-weight: 500; }
          .card-body { padding: 40px 40px 32px; }
          .greeting { font-size: 16px; color: #264f41; font-weight: 600; margin-bottom: 16px; }
          .message { font-size: 15px; color: #6b8c7e; line-height: 1.7; margin-bottom: 32px; }
          .btn-wrapper { text-align: center; margin-bottom: 32px; }
          .btn { display: inline-block; padding: 16px 40px; background-color: #3ca779; color: #ffffff !important; text-decoration: none; border-radius: 14px; font-family: 'Quicksand', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: 0.3px; }
          .card-footer { background-color: #f9f7f4; padding: 24px 40px; border-top: 1px solid #f0ebe0; text-align: center; }
          .card-footer p { font-size: 12.5px; color: #9ab8ae; line-height: 1.6; }
          .card-footer p + p { margin-top: 6px; }
          .card-footer strong { color: #6b8c7e; font-weight: 600; }
          .bottom-note { text-align: center; margin-top: 20px; }
          .bottom-note p { font-size: 12px; color: #b0a898; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="top-bar">
            <div class="logo-text"><strong style="color: #264f41">La Casa <span>de Sacola</span></strong></div>
          </div>
          <div class="card">
            <div class="card-header">
              <h1>Pagamento Confirmado!</h1>
              <p>Pedido #${pedidoId}</p>
            </div>
            <div class="card-body">
              <p class="greeting">Olá! 🎉</p>
              <p class="message">
                Temos uma ótima notícia! O pagamento do seu pedido <strong style="color: #264f41;">(Identificador Único: #${pedidoId})</strong> foi aprovado com sucesso.<br><br>
                Ele já foi encaminhado para a nossa equipe e no momento encontra-se no status: <strong style="color: #3ca779;">Aguardando Produção</strong>.
              </p>
              <div class="btn-wrapper">
                <a href="${linkAcompanhamento}" class="btn">Acompanhar meu pedido</a>
              </div>
            </div>
            <div class="card-footer">
              <p>Este é um email automático — por favor, não responda.</p>
              <p><strong>La Casa de Sacola</strong> &nbsp;·&nbsp; Sacolas personalizadas com identidade</p>
            </div>
          </div>
          <div class="bottom-note">
            <p>Enviado com segurança por La Casa de Sacola</p>
          </div>
        </div>
      </body>
      </html>
      `
    });

    return NextResponse.json({ success: true, message: "Email enviado com sucesso" }, { status: 200 });

  } catch (error) {
    console.error('Erro ao reenviar email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}