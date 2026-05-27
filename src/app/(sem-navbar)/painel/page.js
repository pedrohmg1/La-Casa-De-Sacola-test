"use client";

// Hooks
import { useSacolas } from "@/hooks/useSacolas";
import { useCoresMaterial } from "@/hooks/useCoresMaterial";
import { useEnum } from "@/hooks/useEnum";
import useTour from "@/hooks/useTour.js";
import useLoginHook from "@/hooks/loginHook.js"; // precisa trocar pra um que valide...

// Componentes
import RotaAdmin from "@/components/admin/rotaAdmin";
import TabelaSacolas from "@/components/admin/TabelaSacolas";
import ModalSacola from "@/components/admin/ModalSacola";
import ModalGerenciarEnum from "@/components/admin/ModalGerenciarEnum";
import EditarCoresDialog from "@/components/admin/EditarCoresDialog";
import FiltrosSacola from "@/components/admin/FiltrosSacola";

// Bibliotecas e Utils
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function Painel() {
  const router = useRouter();

  // O toast precisa ser declarado ANTES do useEnum, pois o hook usa ele
  const toastPainel = (
    variant,
    title /* description intentionally ignored for panel toasts */,
  ) => {
    const mensagem = title;

    if (variant === "error") {
      toast.error(mensagem);
      return;
    }

    toast.success(mensagem);
  };

  const cores = useCoresMaterial({ toastPainel });

  // Agora passamos tudo que o useEnum precisa para funcionar
  const enum_ = useEnum({
    coresSelecionadasPorMaterial: cores.coresSelecionadasPorMaterial,
    setCoresSelecionadasPorMaterial: cores.setCoresSelecionadasPorMaterial,
    toastPainel: toastPainel,
  });

  const {
    modalAberto,
    setModalAberto,
    novaSacola,
    setNovaSacola,
    sacolaEditandoId,
    sacolasFiltradas,
    handleSalvarSacola,
    handleOcultarSacola,
    handleAbrirEdicao,
    handleAbrirNovaSacola,
    obterCoresDisponiveisParaNovaSacola,
    carregarSacolas,
    mostrarSacolasAtivas,
    setMostrarSacolasAtivas,
    mostrarSacolasOcultas,
    setMostrarSacolasOcultas,
    carregandoSacolas
  } = useSacolas({
    obterCoresSelecionadasDoMaterial: cores.obterCoresSelecionadasDoMaterial,
  });

  useEffect(() => {
    // Executamos a função com os prefixos corretos dos seus respectivos hooks
    carregarSacolas();
    enum_.carregarFiltros();
    cores.carregarCores();
  }, []); // 👈 Esse colchete vazio é vital! Ele diz ao React: "Rode isso apenas UMA VEZ ao abrir a página."

  // OBS: Todas aquelas funções soltas (carregarFiltros, handleAdicionarValorEnum, etc)
  // e states foram deletadas daqui, pois agora vivem no useEnum!

  // O Painel passa o bastão para a Produção
  useTour(
    "tourPainel",
    [
      {
        element: "#filtros-sacola",
        popover: {
          title: "Filtros",
          description:
            "Marque as caixas de opção para visualizar quais sacolas estão <strong>diponíveis</strong> ou <strong>ocultas</strong> do catálogo.",
          side: "bottom",
        },
      },
      {
        element: "#btn-adicionar-sacola",
        popover: {
          title: "Adicionar Sacola",
          description:`
            Clique para adicionar uma sacola ao catálogo. Você pode definir:
            <ul class="list-disc pl-5 mt-2 space-y-1">
            <li>Preço</li>
            <li>Tamanho</li>
            <li>Material</li>
            </ul>
            `,
          side: "left",
        },
        disableActiveInteraction: true,
      },
      {
        element: "#tabela-sacolas",
        popover: {
          title: "Sacolas Cadastradas",
          description:
            "Todas as sacolas do catálogo aparecem aqui. Clique em <i>Editar</i> para alterar qualquer uma.",
          side: "top",
        },
        disableActiveInteraction: true,
      },
    ],
    "/producao",
    "tourProducao",
  );

  return (
    <RotaAdmin>
      <main className="p-5 m-auto bg-gray-100 h-screen flex flex-col">
        <meta charSet="UTF-8" />
        <button
          onClick={() => router.push("/")}
          className="bg-[#264f41] hover:bg-[#403c37] text-white px-2.5 py-2.5 rounded-xl font-bold transition shadow-md flex items-left gap-2 text-md lg:text-md w-max mb-5"
        >
          ← Voltar
        </button>

        <title>Painel Administrador</title>

        <div className="mb-4">
          <h1 className="text-lg lg:text-xl font-extrabold text-[#264f41]">
            Painel Administrador
          </h1>
          <h2 className="text-md lg:text-lg text-gray-600">
            Gerencie seus produtos
          </h2>
        </div>

        <ModalSacola
          aberto={modalAberto}
          onOpenChange={setModalAberto}
          sacola={novaSacola}
          onSacolaChange={setNovaSacola}
          sacolaEditandoId={sacolaEditandoId}
          opcoesMaterial={enum_.opcoesMaterial}
          opcoesTamanho={enum_.opcoesTamanho}
          coresDisponiveis={obterCoresDisponiveisParaNovaSacola()}
          onSalvar={handleSalvarSacola}
          onOcultar={handleOcultarSacola}
          onAbrirGerenciarMaterial={() => {
            enum_.setEnumAtual("tipo");
            enum_.setEnumEditandoId(null);
            enum_.setNovoValorEnum("");
            cores.resetFormularioCor();
            enum_.setModalEnumAberto(true);
          }}
          onAbrirGerenciarTamanho={() => {
            enum_.setEnumAtual("tamanho");
            enum_.setEnumEditandoId(null);
            enum_.setNovoValorEnum("");
            cores.resetFormularioCor();
            enum_.setModalEnumAberto(true);
          }}
        />

        <FiltrosSacola
          id="btn-adicionar-sacola"
          mostrarAtivas={mostrarSacolasAtivas}
          setMostrarAtivas={setMostrarSacolasAtivas}
          mostrarOcultas={mostrarSacolasOcultas}
          setMostrarOcultas={setMostrarSacolasOcultas}
          onAbrirNovaSacola={handleAbrirNovaSacola}
          onAbrirGerenciarCores={() => cores.setModalEditarCoresAberto(true)}
        />

        <TabelaSacolas
          id="tabela-sacolas"
          sacolasFiltradas={sacolasFiltradas}
          onAbrirEdicao={handleAbrirEdicao}
          carregando={carregandoSacolas}
        />

        <ModalGerenciarEnum enum_={enum_} cores={cores} />

        <EditarCoresDialog
          open={cores.modalEditarCoresAberto}
          onOpenChange={(aberto) => {
            cores.setModalEditarCoresAberto(aberto);
            if (!aberto) cores.resetFormularioCor();
          }}
          novaCorNome={cores.novaCorNome}
          novaCorHex={cores.novaCorHex}
          onNomeChange={cores.setNovaCorNome}
          onHexChange={cores.setNovaCorHex}
          onSalvarCor={() => cores.handleAdicionarCorMaterialLocal("")}
          onExcluirCor={async (cor) => {
            await cores.handleExcluirCorLocal("", cor);
            await enum_.carregarFiltros(); // chama depois, fora do hook
          }}
          cores={cores.coresPrincipais}
        />
      </main>
    </RotaAdmin>
  );
}
