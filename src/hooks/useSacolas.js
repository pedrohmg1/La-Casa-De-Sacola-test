import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

export function useSacolas({ obterCoresSelecionadasDoMaterial }) {
  const [sacolas, setSacolas] = useState([]);
  const [carregandoSacolas, setCarregandoSacolas] = useState(true);

  const [novaSacola, setNovaSacola] = useState({
    nome_sac: "",
    tipo_sac: "",
    peso_sac: "",
    status_sac: "",
    sacola_tamanho: [],
  });

  const [modalAberto, setModalAberto] = useState(false);

  const [sacolaEditandoId, setSacolaEditandoId] = useState(null);

  const [mostrarSacolasAtivas, setMostrarSacolasAtivas] = useState(true);
  const [mostrarSacolasOcultas, setMostrarSacolasOcultas] = useState(false);

  const obterCoresDisponiveisParaNovaSacola = () => {
    if (!novaSacola.tipo_sac) {
      return [];
    }

    return obterCoresSelecionadasDoMaterial(novaSacola.tipo_sac);
  };

  // Criamos a função que vai até a nuvem
  const carregarSacolas = async () => {
    // Pedimos tudo (*) de uma tabela específica
    setCarregandoSacolas(true);
    const { data, error } = await supabase
      .from("sacola")
      .select("*, sacola_tamanho(*, tamanho(tamanho_tam))")
      .order("nome_sac");

    if (error) {
      console.error("Erro ao buscar as sacolas:", error);
      toast.error("Não foi possível carregar as sacolas.");
      setCarregandoSacolas(false);
      return; // Se der erro, paramos por aqui
    }

    if (data) setSacolas(data);
    // Se a resposta chegou, colocamos os dados na nossa lista principal!
    setCarregandoSacolas(false);
  };

  const handleAbrirEdicao = (sacolaEscolhida) => {
    setSacolaEditandoId(sacolaEscolhida.id_sac);
    setNovaSacola(sacolaEscolhida);
    setModalAberto(true);
  };

  const handleAbrirNovaSacola = () => {
    setSacolaEditandoId(null);

    setNovaSacola({
      nome_sac: "",
      tipo_sac: "",
      peso_sac: "",
      status_sac: "",
      sacola_tamanho: [],
    });

    setModalAberto(true);
  };

  const handleSalvarSacola = async (e) => {
    e.preventDefault();

    // Validação básica
    if (!novaSacola.sacola_tamanho || novaSacola.sacola_tamanho.length === 0) {
      toast.error("Adicione ao menos um tamanho para a sacola.");
      return;
    }

    const sacolaPronta = {
      tipo_sac: novaSacola.tipo_sac,
      /* peso_sac: novaSacola.peso_sac, */
      nome_sac: novaSacola.nome_sac,
      status_sac: novaSacola.status_sac,
    };

    if (sacolaEditandoId) {
      // ---------------- MODO EDIÇÃO ----------------
      const { error: errorSacola } = await supabase
        .from("sacola")
        .update(sacolaPronta)
        .eq("id_sac", sacolaEditandoId);

      if (errorSacola) {
        console.error("Erro ao editar sacola:", errorSacola);
        toast.error("Não foi possível atualizar a sacola.");
        return;
      }

      // Deleta vínculos antigos e insere os novos (Garante a integridade do array)
      await supabase.from("sacola_tamanho").delete().eq("sac_id", sacolaEditandoId);
      
      const tamanhosParaInserir = novaSacola.sacola_tamanho.map((st) => ({
        sac_id: sacolaEditandoId,
        tam_id: parseInt(st.tam_id),
        preco: parseFloat(st.preco),
        peso: parseFloat(st.peso),
        qtd_minima: parseInt(st.qtd_minima),
        qtd_estoque: parseInt(st.qtd_estoque) || 0,
        ativo: st.ativo !== false,
      }));

      const { error: errorTamanhos } = await supabase.from("sacola_tamanho").insert(tamanhosParaInserir);

      if (errorTamanhos) {
         console.error("Erro ao atualizar tamanhos:", errorTamanhos);
         toast.error("Sacola atualizada, mas houve erro nos tamanhos.");
      } else {
         toast.success("Sacola atualizada.");
      }

    } else {
      // ---------------- MODO CRIAÇÃO ----------------
      const { data, error: errorSacola } = await supabase.from("sacola").insert([sacolaPronta]).select();

      if (errorSacola || !data || !data[0]) {
        console.error("Erro ao criar sacola:", errorSacola);
        toast.error("Erro ao cadastrar sacola.");
        return;
      }

      const novaSacolaId = data[0].id_sac;

      const tamanhosParaInserir = novaSacola.sacola_tamanho.map((st) => ({
        sac_id: novaSacolaId,
        tam_id: parseInt(st.tam_id),
        preco: parseFloat(st.preco),
        peso: parseFloat(st.peso),
        qtd_minima: parseInt(st.qtd_minima),
        qtd_estoque: parseInt(st.qtd_estoque) || 0,
        ativo: st.ativo !== false,
      }));

      const { error: errorTamanhos } = await supabase.from("sacola_tamanho").insert(tamanhosParaInserir);

      if (errorTamanhos) {
         console.error("Erro ao inserir tamanhos:", errorTamanhos);
         toast.error("Sacola criada, mas houve erro ao salvar os tamanhos.");
      } else {
         toast.success("Sacola cadastrada.");
      }
    }

    await carregarSacolas();
    setNovaSacola({
      nome_sac: "",
      tipo_sac: "",
      /* peso_sac: "", */
      status_sac: "",
      sacola_tamanho: [],
    });
    setModalAberto(false);
    setSacolaEditandoId(null);
  };

  const handleOcultarSacola = async () => {
    const { error } = await supabase.from("sacola").update({ status_sac: "Oculto" }).eq("id_sac", sacolaEditandoId);

    if (error) {
      console.error("Erro ao ocultar sacola:", error);
      toast.error("Não foi possível excluir a Sacola.");
    } else {
      setSacolas((prevSacolas) => prevSacolas.map((sacola) => (sacola.id_sac === sacolaEditandoId ? { ...sacola, status_sac: "Oculto" } : sacola)));
      setModalAberto(false);
      setSacolaEditandoId(null);
      toast.success("Sacola Excluída.");
    }
  };

  const sacolasFiltradas = sacolas.filter((sacola) => {
    if (!sacola) return false;
    if (sacola.status_sac === "Oculto") {
      return mostrarSacolasOcultas;
    }
    return mostrarSacolasAtivas;
  });
  return {
    sacolas,
    novaSacola,
    setNovaSacola,
    modalAberto,
    setModalAberto,
    sacolaEditandoId,
    mostrarSacolasAtivas,
    setMostrarSacolasAtivas,
    mostrarSacolasOcultas,
    setMostrarSacolasOcultas,
    sacolasFiltradas,
    carregarSacolas,
    handleSalvarSacola,
    handleOcultarSacola,
    handleAbrirEdicao,
    handleAbrirNovaSacola,
    obterCoresDisponiveisParaNovaSacola,
    carregandoSacolas,
  };
}