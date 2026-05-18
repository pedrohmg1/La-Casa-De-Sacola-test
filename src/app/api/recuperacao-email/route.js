import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email)
      return Response.json({ error: "Email não informado." }, { status: 400 });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/nova-senha?token=${token}`;

    const { error: dbError } = await supabase
      .from("reset_senha")
      .insert([{ email, token, expires_at: expiresAt }]);

    if (dbError) {
      console.error("Erro ao salvar token:", dbError);
      return Response.json({ error: "Erro interno." }, { status: 500 });
    }

    await transporter.sendMail({
      from: `"La Casa de Sacola" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "La Casa de Sacola | Redefina sua senha",
      html: `
    <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefina sua senha</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Manrope:wght@400;500;600&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            background-color: #f0ebe0;
            font-family: 'Manrope', 'Helvetica Neue', sans-serif;
            padding: 40px 16px;
          }

          .wrapper {
            max-width: 560px;
            margin: 0 auto;
          }

          .top-bar {
            text-align: center;
            margin-bottom: 24px;
          }

          .logo-text {
            font-family: 'Quicksand', sans-serif;
            font-weight: 800;
            font-size: 22px;
            color: #264f41;
            letter-spacing: 0.5px;
          }

          .logo-text span {
            color: #3ca779;
          }

          .card {
            background-color: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 4px 32px rgba(38, 79, 65, 0.10);
          }

          .card-header {
            background-color: #264f41;
            padding: 36px 40px 32px;
            text-align: center;
            position: relative;
          }

          .card-header::after {
            content: '';
            display: block;
            width: 64px;
            height: 4px;
            background-color: #3ca779;
            border-radius: 2px;
            margin: 16px auto 0;
          }

          .card-header .icon {
            width: 56px;
            height: 56px;
            background-color: rgba(60, 167, 121, 0.18);
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }

          .card-header h1 {
            font-family: 'Quicksand', sans-serif;
            font-weight: 800;
            font-size: 26px;
            color: #ffffff;
            line-height: 1.2;
          }

          .card-header p {
            font-size: 14px;
            color: #9ab8ae;
            margin-top: 6px;
            font-weight: 500;
          }

          .card-body {
            padding: 40px 40px 32px;
          }

          .greeting {
            font-size: 16px;
            color: #264f41;
            font-weight: 600;
            margin-bottom: 16px;
          }

          .message {
            font-size: 15px;
            color: #6b8c7e;
            line-height: 1.7;
            margin-bottom: 32px;
          }

          .btn-wrapper {
            text-align: center;
            margin-bottom: 32px;
          }

          .btn {
            display: inline-block;
            padding: 16px 40px;
            background-color: #3ca779;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 14px;
            font-family: 'Quicksand', sans-serif;
            font-weight: 800;
            font-size: 16px;
            letter-spacing: 0.3px;
          }

          .expiry-note {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            background-color: #f5faf7;
            border: 1px solid #c8e3d5;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 28px;
          }

          .expiry-note .dot {
            width: 8px;
            height: 8px;
            background-color: #3ca779;
            border-radius: 50%;
            margin-top: 5px;
            flex-shrink: 0;
          }

          .expiry-note p {
            font-size: 13px;
            color: #4a7c67;
            line-height: 1.6;
          }

          .fallback {
            border-top: 1px solid #f0ebe0;
            padding-top: 24px;
          }

          .fallback p {
            font-size: 13px;
            color: #9ab8ae;
            margin-bottom: 10px;
          }

          .fallback-link {
            display: block;
            background-color: #f5faf7;
            border: 1px solid #c8e3d5;
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 12px;
            color: #4a7c67;
            word-break: break-all;
            line-height: 1.5;
            font-family: 'Courier New', monospace;
          }

          .card-footer {
            background-color: #f9f7f4;
            padding: 24px 40px;
            border-top: 1px solid #f0ebe0;
            text-align: center;
          }

          .card-footer p {
            font-size: 12.5px;
            color: #9ab8ae;
            line-height: 1.6;
          }

          .card-footer p + p {
            margin-top: 6px;
          }

          .card-footer strong {
            color: #6b8c7e;
            font-weight: 600;
          }

          .bottom-note {
            text-align: center;
            margin-top: 20px;
          }

          .bottom-note p {
            font-size: 12px;
            color: #b0a898;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">

          <div class="top-bar">
            <div class="logo-text"><a href="{{ .SiteURL }}"><strong style="color: #264f41">La Casa <span>de Sacola</span></a></strong></div>
          </div>

          <div class="card">

            <div class="card-header">
              <h1>Redefina sua senha</h1>
              <p>Solicitação recebida com sucesso</p>
            </div>

            <div class="card-body">
              <p class="greeting">Olá! 👋</p>
              <p class="message">
                Recebemos uma solicitação para redefinir a senha da sua conta na <strong style="color: #264f41;">La Casa de Sacola</strong>.<br><br>
                Clique no botão abaixo para criar uma <strong style="color: #264f41;">nova senha</strong>.
              </p>

              <div class="btn-wrapper">
                <a href="${resetLink}" class="btn">
                  &nbsp;Redefinir minha senha
                </a>
              </div>

              <div class="expiry-note">
                <div class="dot"></div>
                <p>Se você não solicitou a redefinição de senha, pode ignorar este email com segurança. Sua conta continua protegida.</p>
              </div>

              <div class="fallback">
                <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
                <span class="fallback-link">${resetLink}</span>
              </div>
            </div>

            <div class="card-footer">
              <p>Este é um email automático — por favor, não responda.</p>
              <p><strong>La Casa de Sacola</strong> &nbsp;·&nbsp; Sacolas personalizadas com identidade</p>
              <p>&copy; 2026 La Casa de Sacola. Todos os direitos reservados.</p>
            </div>

          </div>

          <div class="bottom-note">
            <p>Enviado com segurança por La Casa de Sacola</p>
          </div>

        </div>



      </body>
      </html>
       `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro:", error.message);
    return Response.json({ error: "Erro ao enviar email." }, { status: 500 });
  }
}
