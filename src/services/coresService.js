import { supabase } from "@/lib/supabaseClient";

export const salvarCorNoBanco = async (nome, hex) => {
  const { data, error } = await supabase
    .from('cores')
    .insert([{ nome_cor: nome, hex_cor: hex }])
    .select();

  if (error) {
    console.error("Erro ao salvar cor:", error);
    return { ok: false, mensagem: "Não foi possível salvar a cor." };
  }

  return { ok: true, dados: data[0] };
};

export const excluirCorNoBanco = async (id) => {
  const { error } = await supabase
    .from('cores')
    .update({ excluido: true })
    .eq('id_cor', id);

  if (error) {
    console.error("Erro ao excluir cor:", error);
    return { ok: false, mensagem: "Não foi possível excluir a cor." };
  }

  return { ok: true };
};