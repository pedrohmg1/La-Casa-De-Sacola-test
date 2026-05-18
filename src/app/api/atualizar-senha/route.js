import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email, senha, token } = await req.json();

    const { data: usuarios } = await supabase.auth.admin.listUsers();
    const usuario = usuarios?.users?.find((u) => u.email === email);

    if (!usuario) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });

    const { error } = await supabase.auth.admin.updateUserById(usuario.id, { password: senha });
    if (error) return Response.json({ error: "Não foi possível atualizar." }, { status: 500 });

    await supabase.from("reset_senha").update({ used: true }).eq("token", token);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro:", error.message);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}