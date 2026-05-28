"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Tabs from "@radix-ui/react-tabs";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import RotaAdmin from "@/components/admin/rotaAdmin";
import TabelaProducao from "@/components/producao/TabelaProducao.js";
import useVerificaAcessoAdmin from "@/hooks/verificaAcesso.js";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ModalAlterarStatus from "@/components/producao/ModalAlterarStatus";
import useTour from "@/hooks/useTour.js";
import { toast } from "react-hot-toast";
import { UploadIcon, Cross2Icon, ReloadIcon } from "@radix-ui/react-icons";

// Função para enviar imagens para o Cloudinary
async function uploadParaCloudinary(arquivo) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = "publico";

  const formData = new FormData();
  formData.append("file", arquivo);
  formData.append("upload_preset", uploadPreset);

  const resUpload = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { 
    method: "POST", 
    body: formData 
  });

  if (!resUpload.ok) {
    throw new Error("Falha ao enviar o arquivo.");
  }

  const dados = await resUpload.json();
  return dados.secure_url;
}

function LogosItem({ item, setImagemAberta, setPedidos, setPedidoSelecionado }) {
  const [uploadando, setUploadando] = useState(false);
  const [logoParaRemover, setLogoParaRemover] = useState(null); // Controla qual logo será removido e abre o modal

  const urls = item.logo_urls?.length > 0 
    ? item.logo_urls 
    : item.logo_url ? [item.logo_url] : [];

  // Função para sincronizar a tela (Lista geral e Modal aberto)
  const atualizarEstadoLocal = (novasUrls) => {
    // 1. Atualiza a lista principal de pedidos
    setPedidos((prev) => prev.map((p) => {
      if (p.id_ped === item.ped_id) {
        return {
          ...p,
          itens_pedido: p.itens_pedido.map((i) => 
            i.id_ten === item.id_ten ? { ...i, logo_urls: novasUrls, logo_url: novasUrls[0] || null } : i
          )
        };
      }
      return p;
    }));

    // 2. Atualiza o Modal que está aberto neste momento
    setPedidoSelecionado((prev) => {
      if (!prev || prev.id_ped !== item.ped_id) return prev;
      return {
        ...prev,
        itens_pedido: prev.itens_pedido.map((i) =>
          i.id_ten === item.id_ten ? { ...i, logo_urls: novasUrls, logo_url: novasUrls[0] || null } : i
        )
      };
    });
  };

  const handleAdicionarLogo = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    
    setUploadando(true);
    try {
      const urlStr = await uploadParaCloudinary(arquivo);
      const novasUrls = [...urls, urlStr];
      
      const { error } = await supabase
        .from("itens_pedido")
        .update({ logo_urls: novasUrls, logo_url: novasUrls[0] })
        .eq("id_ten", item.id_ten);
        
      if (error) throw error;
      toast.success("Logo adicionado com sucesso!");
      
      atualizarEstadoLocal(novasUrls);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao enviar o logo.");
    } finally {
      setUploadando(false);
      e.target.value = null; 
    }
  };

  const handleConfirmarRemocao = async () => {
    if (!logoParaRemover) return;
    
    const novasUrls = urls.filter((u) => u !== logoParaRemover);
    
    try {
      const { error } = await supabase
        .from("itens_pedido")
        .update({ logo_urls: novasUrls, logo_url: novasUrls[0] || null })
        .eq("id_ten", item.id_ten);
        
      if (error) throw error;
      toast.success("Logo removido.");
      
      atualizarEstadoLocal(novasUrls);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao remover o logo.");
    } finally {
      setLogoParaRemover(null); // Fecha o modal
    }
  };

  return (
    <div className="mt-3">
      <p className="text-xs font-bold text-[#6b9e8a] uppercase mb-2">
        Logo(s) do item:
      </p>

      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={i} className="relative flex flex-col items-center gap-1 group">
            {/* Botão de Remover (Aparece ao passar o mouse) */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLogoParaRemover(url); // Abre o modal de confirmação
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
              title="Remover logo"
            >
              <Cross2Icon className="size-3" />
            </button>
            
            <img
              src={url}
              alt={`Logo ${i + 1}`}
              onClick={() => setImagemAberta(url)}
              className="w-20 h-20 object-contain rounded-xl border border-[#e4f4ed] bg-white cursor-pointer hover:opacity-80 hover:shadow-md transition"
            />
            <span className="text-xs text-[#a0bcb2]">Logo {i + 1}</span>
          </div>
        ))}

        {/* Botão de Upload em formato de Card */}
        <div className="flex flex-col items-center gap-1">
          <label className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadando ? 'border-gray-300 bg-gray-50' : 'border-[#3ca779] bg-[#f0faf5] hover:bg-[#e4f4ed]'}`}>
            {uploadando ? (
              <ReloadIcon className="animate-spin size-5 text-gray-400" />
            ) : (
              <UploadIcon className="size-5 text-[#3ca779] mb-1" />
            )}
            <span className={`text-[10px] font-bold mt-1 ${uploadando ? 'text-gray-400' : 'text-[#3ca779]'}`}>
              {uploadando ? "Enviando" : "Adicionar"}
            </span>
            <input 
              type="file" 
              accept=".png,.jpg,.jpeg,.svg,.pdf" 
              className="hidden" 
              onChange={handleAdicionarLogo} 
              disabled={uploadando} 
            />
          </label>
        </div>
      </div>

      {/* Modal de Confirmação Radix (AlertDialog) */}
      <AlertDialog.Root open={!!logoParaRemover} onOpenChange={(open) => !open && setLogoParaRemover(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="bg-black/50 fixed inset-0 backdrop-blur-sm z-[70]" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-xl w-[90vw] max-w-md z-[80] focus:outline-none">
            <AlertDialog.Title className="text-lg font-bold text-[#264f41]">
              Remover Logo
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 mt-2 mb-6">
              Tem certeza que deseja remover este logo do pedido do cliente? Esta ação atualizará o sistema.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">
                  Cancelar
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  onClick={handleConfirmarRemocao} 
                  className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
                >
                  Sim, Remover
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

export default function Producao() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pedidoAberto, setPedidoAberto] = useState(null);

  const [modalStatusAberto, setModalStatusAberto] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState(null);

  const router = useRouter();

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        // Busca os pedidos vinculados ao UUID do usuário logado
        const { data, error } = await supabase
          .from("pedido")
          .select(
            `*,
            usuario (nome_usu, email_usu),
            itens_pedido (*,sacola (nome_sac, tipo_sac),cores (nome_cor))`,
          )
          .order("data_criacao", { ascending: false });

        if (error) throw error;

        setPedidos(data || []);
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      } finally {
        setCarregando(false);
      }
    };

    fetchPedidos();
    const canal = supabase
    .channel("pedidos-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pedido" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          // Novo pedido: busca completo com joins e adiciona à lista
          supabase
            .from("pedido")
            .select(`*, usuario(nome_usu, email_usu), itens_pedido(*,sacola(nome_sac, tipo_sac),cores(nome_cor))`)
            .eq("id_ped", payload.new.id_ped)
            .single()
            .then(({ data }) => {
              if (data) setPedidos((prev) => [data, ...prev]);
            });
        }

        if (payload.eventType === "UPDATE") {
          // Pedido atualizado: substitui na lista
          supabase
            .from("pedido")
            .select(`*, usuario(nome_usu, email_usu), itens_pedido(*,sacola(nome_sac, tipo_sac),cores(nome_cor))`)
            .eq("id_ped", payload.new.id_ped)
            .single()
            .then(({ data }) => {
              if (data) setPedidos((prev) =>
                prev.map((p) => p.id_ped === data.id_ped ? data : p)
              );
            });
        }
      }
    )
    .subscribe();

  //  Cancela a inscrição ao sair da página
  return () => {
    supabase.removeChannel(canal);
  };
}, []);


  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [imagemAberta, setImagemAberta] = useState(null);

  const handleAbrirPedido = (pedidoCompleto) => {
    setPedidoSelecionado(pedidoCompleto);
  };

  const handleAlterarStatus = (pedido) => {
    setPedidoParaEditar(pedido);
    setModalStatusAberto(true);
  };

  // Atualiza o estado local sem recarregar a página:
  const handleStatusAtualizado = (idPedido, novoStatus, nomeAlterador) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id_ped === idPedido
          ? {
              ...p,
              status_ped: novoStatus,
              alterado_por: nomeAlterador,
              ultima_alteracao: new Date().toISOString(),
            }
          : p,
      ),
    );
  };

  const handleFecharModal = () => {
    setPedidoSelecionado(null);
  };

  const handleDetalhesCliente = (pedido) => {
    alert(`Opa! Ainda não!\n${pedido.usu_uuid}`);
  };

  // A Produção passa o bastão para os Relatórios
  useTour(
    "tourProducao",
    [
      {
        element: "#filtro-status",
        popover: {
          title: "Abas de Status",
          description:
            "Use as abas para filtrar os pedidos de acordo com seu status.",
          side: "bottom",
        },
      },
      {
        element: "#tabela-producao",
        popover: {
          title: "Pedidos em Produção",
          description:
            "Cada linha é um pedido. Clique em <i>Abrir Detalhes</i> para ver a logo e especificações. Use <i>Editar</i> para mudar o status após a produção.",
          side: "right",
        },
        disableActiveInteraction: true,
      },
    ],
    "/relatorios",
    "tourRelatorios",
  );

  return (
    <RotaAdmin>
      <>
        <main className="p-5 m-auto bg-gray-100 h-screen flex flex-col">
          <meta charSet="UTF-8" />
          <button
            onClick={() => router.push("/")}
            className="bg-[#264f41] hover:bg-[#403c37] text-white px-2.5 py-2.5 rounded-xl font-bold transition shadow-md flex items-left gap-2 text-md lg:text-md w-max mb-5"
          >
            ← Voltar
          </button>

          <title>Produção</title>

          <div className="mb-4">
            <h1 className="text-lg lg:text-xl font-extrabold text-[#264f41]">
              Painel Produção
            </h1>
            <h2 className="text-md lg:text-lg text-gray-600">
              Visualize os detalhes dos pedidos
            </h2>
          </div>

          <Tabs.Root
            defaultValue="producao"
            className="w-full flex-1 min-h-0 flex flex-col"
          >
            <Tabs.List
              id="filtro-status"
              className="flex items-center mb-5 gap-5 bg-white p-4 rounded-xl shadow-sm border border-[#e4f4ed] shrink-0"
            >
              <Tabs.Trigger
                value="aguardando"
                className="data-[state=active]:border-[#61c39a] data-[state=active]:text-[#61c39a] text-[#264f41] border-b-4 hover:bg-gray-200 p-2 transition duration-300"
              >
                Aguardando Cliente
              </Tabs.Trigger>

              <Tabs.Trigger
                value="producao"
                className="data-[state=active]:border-[#61c39a] data-[state=active]:text-[#61c39a] text-[#264f41] border-b-4 hover:bg-gray-200 p-2 transition duration-300"
              >
                Em produção
              </Tabs.Trigger>

              <Tabs.Trigger
                value="entrega"
                className="data-[state=active]:border-[#61c39a] data-[state=active]:text-[#61c39a] text-[#264f41] border-b-4 hover:bg-gray-200 p-2 transition duration-300"
              >
                Em entrega
              </Tabs.Trigger>

              <Tabs.Trigger
                value="cancelado"
                className="data-[state=active]:border-[#61c39a] data-[state=active]:text-[#61c39a] text-[#264f41] border-b-4 hover:bg-gray-200 p-2 transition duration-300"
              >
                Cancelados
              </Tabs.Trigger>
            </Tabs.List>

            <div id="tabela-producao">
              <Tabs.Content
                value="aguardando"
                className="data-[state=active]:flex-1 data-[state=active]:min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <div>
                  <TabelaProducao
                    dados={pedidos.filter(
                      (p) =>
                        p.status_ped === "Pago Aguardando Produção" ||
                        p.status_ped === "Aguardando Pagamento" ||
                        p.status_ped === "No Carrinho" ||
                        p.status_ped === "pendente",
                    )}
                    onAbrirDetalhes={handleAbrirPedido}
                    handleAlterarStatus={handleAlterarStatus}
                    handleDetalhesCliente={handleDetalhesCliente}
                  />
                </div>
              </Tabs.Content>

              <Tabs.Content
                value="producao"
                className="data-[state=active]:flex-1 data-[state=active]:min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <TabelaProducao
                  dados={pedidos.filter((p) => p.status_ped === "Em Produção")}
                  onAbrirDetalhes={handleAbrirPedido}
                  handleAlterarStatus={handleAlterarStatus}
                  handleDetalhesCliente={handleDetalhesCliente}
                />
              </Tabs.Content>

              <Tabs.Content
                value="entrega"
                className="data-[state=active]:flex-1 data-[state=active]:min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <TabelaProducao
                  dados={pedidos.filter(
                    (p) =>
                      p.status_ped === "Entregue" ||
                      p.status_ped === "A Caminho" ||
                      p.status_ped === "Aguardando Retirada",
                  )}
                  onAbrirDetalhes={handleAbrirPedido}
                  handleAlterarStatus={handleAlterarStatus}
                  handleDetalhesCliente={handleDetalhesCliente}
                />
              </Tabs.Content>

              <Tabs.Content
                value="cancelado"
                className="data-[state=active]:flex-1 data-[state=active]:min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <TabelaProducao
                  dados={pedidos.filter((p) => p.status_ped === "Cancelado")}
                  onAbrirDetalhes={handleAbrirPedido}
                  handleAlterarStatus={handleAlterarStatus}
                  handleDetalhesCliente={handleDetalhesCliente}
                />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </main>

        <Dialog.Root
          open={!!pedidoSelecionado}
          onOpenChange={(open) => {
            if (!open) handleFecharModal();
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="bg-black/50 fixed inset-0 backdrop-blur-sm z-40" />
            <Dialog.Content
              aria-describedby={undefined}
              onInteractOutside={(e) => {
                if (imagemAberta) {
                  e.preventDefault();
                }
              }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl w-[min(92vw,50rem)] max-h-[90vh] z-40 overflow-y-auto custom-scrollbar flex flex-col gap-6"
            >
              <Dialog.Title className="flex justify-between items-center border-b border-gray-100 pb-4 m-0">
                <div>
                  <h2 className="text-md lg:text-xl font-extrabold text-[#264f41] uppercase tracking-tight">
                    Pedido #{pedidoSelecionado?.id_ped}
                  </h2>
                  <div className="flex gap-3 items-center mt-1">
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      Realizado em:{" "}
                      {pedidoSelecionado &&
                        new Date(
                          pedidoSelecionado.data_criacao,
                        ).toLocaleDateString("pt-BR")}
                    </p>
                    <span className="px-2 py-1 bg-[#e4f4ed] text-[#264f41] text-[10px] font-black rounded uppercase">
                      {pedidoSelecionado?.status_ped}
                    </span>
                  </div>
                </div>
              </Dialog.Title>

              {/* Informações do Cliente */}
              <div className="bg-[#f9fdfa] border border-[#e4f4ed] rounded-xl p-4">
                <p className="text-xs font-bold text-[#3ca779] uppercase tracking-wider mb-2">
                  Dados do Cliente
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Nome</p>
                    <p className="font-semibold text-[#264f41]">
                      {pedidoSelecionado?.usuario?.nome_usu || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-semibold text-[#264f41]">
                      {pedidoSelecionado?.usuario?.email_usu || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Histórico de Alteração — NOVO */}
              <div className="bg-[#f9fdfa] border border-[#e4f4ed] rounded-xl p-4">
                <p className="text-xs font-bold text-[#3ca779] uppercase tracking-wider mb-2">
                  Histórico
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">
                      Última alteração por
                    </p>
                    <p className="font-semibold text-[#264f41]">
                      {pedidoSelecionado?.alterado_por || (
                        <span className="text-gray-400 italic font-normal">
                          Nenhuma alteração ainda
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data da alteração</p>
                    <p className="font-semibold text-[#264f41]">
                      {pedidoSelecionado?.ultima_alteracao ? (
                        new Date(
                          pedidoSelecionado.ultima_alteracao,
                        ).toLocaleString("pt-BR")
                      ) : (
                        <span className="text-gray-400 italic font-normal">
                          —
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de Itens */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto mt-2">
                <p className="text-xs font-bold text-[#3ca779] uppercase tracking-wider">
                  Itens a Produzir:
                </p>
                {pedidoSelecionado?.itens_pedido?.map((item) => (
                  <div
                    key={item.id_ten}
                    className="bg-[#f4f7f5] border border-[#e4f4ed] rounded-xl p-4 flex justify-between items-start gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-[#264f41]">
                        {item.sacola?.nome_sac || "Sacola Personalizada"} - Cor:{" "}
                        {item.cores?.nome_cor || item.cor_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.quantidade}x unidades
                      </p>

                      <LogosItem
  item={item}
  setImagemAberta={setImagemAberta}
  setPedidos={setPedidos}
  setPedidoSelecionado={setPedidoSelecionado}
/>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 font-bold uppercase">
                        Subtotal
                      </p>
                      <p className="font-black text-[#3ca779]">
                        R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rodapé: Resumo de Valores */}
              <div className="mt-2 pt-4 border-t border-gray-100 bg-[#f9fdfa] p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-bold uppercase text-sm">
                    Valor Total (estimativa do frente inclusa):
                  </span>
                  <span className="text-2xl font-black text-[#264f41]">
                    R$ {Number(pedidoSelecionado?.valor_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <Dialog.Close asChild>
                <button className="absolute top-5 right-5 text-gray-400 hover:text-black font-bold text-lg transition">
                  ✕
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {imagemAberta && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setImagemAberta(null)}
          >
            <button
              className="absolute top-4 right-4 text-white bg-black/40 rounded-full px-3 py-1 text-sm"
              onClick={(event) => {
                event.stopPropagation();
                setImagemAberta(null);
              }}
            >
              Fechar
            </button>
            <img
              src={imagemAberta}
              alt="Imagem ampliada"
              className="max-h-full max-w-full rounded-xl object-contain shadow-2xl z-[999999] select-none"
              draggable="false"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}

        <ModalAlterarStatus
          pedido={pedidoParaEditar}
          open={modalStatusAberto}
          onOpenChange={setModalStatusAberto}
          onStatusAtualizado={handleStatusAtualizado}
        />
      </>
    </RotaAdmin>
  );
}
