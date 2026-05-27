import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { salvarCorNoBanco, excluirCorNoBanco } from "@/services/coresService";
import {
  adicionarCorLocal,
  removerCorLocal,
} from "@/components/admin/coresMaterialLogic";

export function useCoresMaterial({ carregarFiltros = () => {}, toastPainel = () => {} } = {}) {
  const [coresPorMaterial, setCoresPorMaterial] = useState({});
  const [coresPrincipais, setCoresPrincipais] = useState([]);
  const [coresSelecionadasPorMaterial, setCoresSelecionadasPorMaterial] = useState({});
  const [novaCorNome, setNovaCorNome] = useState("");
  const [novaCorHex, setNovaCorHex] = useState("#000000");
  const [modalEditarCoresAberto, setModalEditarCoresAberto] = useState(false);

  const carregarCores = async () => {
    const { data, error } = await supabase
      .from("cores")
      .select("*")
      .or("excluido.is.null,excluido.eq.false");

    if (error) {
      console.error("Erro ao buscar cores:", error);
      toastPainel("error", "Não foi possível carregar as cores.");
      return;
    }

    if (data) {
      setCoresPrincipais(data.map((c) => ({
        nome: c.nome_cor,
        hex: c.hex_cor,
        id: c.id_cor,
      })));
    }
  };

  const obterChaveSelecaoCor = (nomeMaterial) => {
    const chave = (nomeMaterial || "").trim().toLowerCase();
    return chave || "__principal__";
  };

  const obterCoresSelecionadasDoMaterial = (nomeMaterial) => {
    const chave = obterChaveSelecaoCor(nomeMaterial);
    return coresSelecionadasPorMaterial[chave] || [];
  };

  const handleToggleSelecaoCor = (nomeMaterial, cor) => {
    const chave = obterChaveSelecaoCor(nomeMaterial);
    const coresAtuais = coresSelecionadasPorMaterial[chave] || [];
    const existe = coresAtuais.some((selecionada) => selecionada.id === cor.id);

    setCoresSelecionadasPorMaterial((anterior) => ({
      ...anterior,
      [chave]: existe
        ? coresAtuais.filter((selecionada) =>
            !(selecionada.nome === cor.nome && selecionada.hex === cor.hex)
          )
        : [...coresAtuais, cor],
    }));
  };

  const handleExcluirCorLocal = async (nomeMaterial, cor) => {
    if (cor.id) {
      const resultado = await excluirCorNoBanco(cor.id);

      if (!resultado.ok) {
        toastPainel("error", resultado.mensagem);
        return;
      }

      await carregarCores();
      await carregarFiltros();

      setCoresSelecionadasPorMaterial((prev) => {
        const novo = {};
        Object.keys(prev).forEach((material) => {
          novo[material] = prev[material].filter((c) => c.id !== cor.id);
        });
        return novo;
      });
    }

    const resultadoLocal = removerCorLocal({
      nomeMaterial,
      cor,
      coresPrincipais,
      coresPorMaterial,
      coresSelecionadasPorMaterial,
    });

    if (!resultadoLocal.ok) return;

    setCoresSelecionadasPorMaterial(
      resultadoLocal.coresSelecionadasPorMaterialAtualizadas
    );

    if (resultadoLocal.tipo === "principal") {
      setCoresPrincipais(resultadoLocal.coresPrincipaisAtualizadas);
    }

    if (resultadoLocal.tipo === "material") {
      setCoresPorMaterial((anterior) => ({
        ...anterior,
        [resultadoLocal.materialNormalizado]: resultadoLocal.coresDoMaterialAtualizadas,
      }));
    }

    toastPainel("success", "Cor excluída.");
  };

  const resetFormularioCor = () => {
    setNovaCorNome("");
    setNovaCorHex("#000000");
  };

  const handleAdicionarCorMaterialLocal = async (nomeMaterial) => {
    const resultado = adicionarCorLocal({
      nomeMaterial,
      novaCorNome,
      novaCorHex,
      coresPrincipais,
      coresPorMaterial,
    });

    if (!resultado.ok) {
      toastPainel("error", resultado.mensagem || "Falha ao salvar cor.");
      return;
    }

    const corSalva = await salvarCorNoBanco(novaCorNome, novaCorHex);

    if (!corSalva.ok) {
      toastPainel("error", corSalva.mensagem);
      return;
    }

    if (resultado.tipo === "principal") {
      setCoresPrincipais((prev) => [
        ...prev,
        {
          id: corSalva.dados.id_cor,
          nome: corSalva.dados.nome_cor,
          hex: corSalva.dados.hex_cor,
        },
      ]);
    }

    if (resultado.tipo === "material") {
      setCoresPorMaterial((anterior) => ({
        ...anterior,
        [resultado.materialNormalizado]: resultado.coresDoMaterialAtualizadas,
      }));
    }

    setNovaCorNome("");
    setNovaCorHex("#000000");
    toastPainel("success", "Cor adicionada.");
  };

  return {
    coresPrincipais,
    coresSelecionadasPorMaterial,
    setCoresSelecionadasPorMaterial,
    novaCorNome,
    setNovaCorNome,
    novaCorHex,
    setNovaCorHex,
    modalEditarCoresAberto,
    setModalEditarCoresAberto,
    carregarCores,
    obterCoresSelecionadasDoMaterial,
    handleToggleSelecaoCor,
    handleAdicionarCorMaterialLocal,
    handleExcluirCorLocal,
    resetFormularioCor,
  };
}