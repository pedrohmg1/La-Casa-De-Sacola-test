"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Footer from "@/components/layout/Footer";
import { ShoppingBagIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Pencil2Icon, EnvelopeClosedIcon } from "@radix-ui/react-icons"; // <-- Adicionado ícone de envelope
import ModalConjuntos from "@/components/pedidos/ModalConjuntos";
import { toast } from "react-hot-toast"; // <-- Adicionado o toast para feedback

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pedidoAberto, setPedidoAberto] = useState(null);
  const [modalConjuntosAberto, setModalConjuntosAberto] = useState(false);
  
  // NOVO: Estado para controlar qual botão está carregando o envio do email
  const [enviandoEmail, setEnviandoEmail] = useState(null); 

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        // Busca os pedidos vinculados ao UUID do usuário logado
        const { data, error } = await supabase.from("pedido").select("*, itens_pedido(*)").eq("usu_uuid", user.id).order("data_criacao", { ascending: false });

        if (error) throw error;

        setPedidos(data || []);
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      } finally {
        setCarregando(false);
      }
    };

    fetchPedidos();
  }, []);

  // NOVO: Função para disparar a API de email
  const handleReenviarEmail = async (pedidoId) => {
    setEnviandoEmail(pedidoId);
    try {
      const response = await fetch('/api/reenviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Falha ao enviar email');

      toast.success("Email de confirmação enviado para sua caixa de entrada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar email. Verifique o console.");
    } finally {
      setEnviandoEmail(null);
    }
  };

  // Função auxiliar para formatar o status com cores
  const getStatusBadge = (status) => {
    const styles = {
      "Em Produção": "bg-yellow-100 text-yellow-700",
      Entregue: "bg-green-100 text-green-700",
      Cancelado: "bg-red-100 text-red-700",
      default: "bg-gray-100 text-gray-700",
    };
    return styles[status] || styles["default"];
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 lg:p-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#264f41]">Meus Pedidos</h1>
            <p className="text-gray-600 text-sm">Acompanhe o histórico de suas encomendas</p>
          </div>
          <button
            onClick={() => setModalConjuntosAberto(true)}
            className="flex flex-row items-center gap-2 px-4 py-2 bg-white border border-[#e4f4ed] rounded-2xl text-sm font-bold text-[#264f41] hover:border-[#3ca779] hover:bg-[#f0faf5] transition-all shadow-sm"
          >
            Gerenciar Meus Conjuntos <Pencil2Icon className="size-5"/>
          </button>
        </header>

        {carregando ? (
          <div className="text-center py-20 italic text-gray-500">Buscando seu histórico...</div>
        ) : pedidos.length === 0 ? (
          <div className="bg-white border border-[#e4f4ed] rounded-2xl p-16 text-center shadow-sm">
            <ShoppingBagIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-700 uppercase tracking-wide">Você ainda não fez nenhum pedido.</p>
            <p className="text-gray-500 mt-2">Que tal escolher sua primeira sacola agora?</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map((pedido) => (
              <div key={pedido.id_ped} className="bg-white border border-[#e4f4ed] rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col gap-4">
                
                {/* Cabeçalho do cartão */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="bg-[#f0faf5] p-4 rounded-2xl">
                      <ShoppingBagIcon className="w-8 h-8 text-[#3ca779]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Identificador Único do Pedido: #{pedido.id_ped}</p>
                      <p className="font-bold text-[#264f41] text-lg">Pedido feito em: {new Date(pedido.data_criacao).toLocaleDateString("pt-BR")}</p>
                      <div className="flex flex-col font-semibold ml-2">
                        {pedido.ultima_alteracao && <p className="text-[#264f41] text-sm">Última alteração: {new Date(pedido.ultima_alteracao).toLocaleDateString("pt-BR")}</p>}
                        {pedido.status_ped === "Entregue" && pedido.data_entregue && (
                          <p className="text-[#264f41] text-sm">Confirmado como entregue em: {new Date(pedido.data_entregue).toLocaleDateString("pt-BR")}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Valor Total: <span className="font-bold text-[#3ca779]">R$ {Number(pedido.valor_total || 0).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {/* NOVO: Botão de Teste de Email */}
                    <button 
                      onClick={() => handleReenviarEmail(pedido.id_ped)}
                      disabled={enviandoEmail === pedido.id_ped}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e4f4ed] text-[#3ca779] hover:bg-[#3ca779] hover:text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      title="Fazer envio do email de confirmação"
                    >
                      <EnvelopeClosedIcon className="size-3.5" />
                      {enviandoEmail === pedido.id_ped ? "Enviando..." : "Enviar E-mail Confirmação"}
                    </button>

                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusBadge(pedido.status_ped)}`}>{pedido.status_ped}</span>
                    <button className="text-sm font-bold text-[#264f41] hover:underline px-2" onClick={() => setPedidoAberto(pedidoAberto === pedido.id_ped ? null : pedido.id_ped)}>
                      {pedidoAberto === pedido.id_ped ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>
                  </div>
                </div>

                {pedidoAberto === pedido.id_ped && (
                  <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Itens desse pedido:</p>
                    <div className="space-y-2">
                      {pedido.itens_pedido?.map((item) => (
                        <div key={item.id_ten} className="text-sm text-gray-600 flex justify-between bg-[#f4f7f5] p-2 rounded-lg">
                          <span>
                            {item.quantidade}x Sacolas {item.cor_sacola}
                          </span>
                          <span className="font-semibold text-md text-[#264f41]">R$ {Number(pedido.valor_total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      <ModalConjuntos open={modalConjuntosAberto} onOpenChange={setModalConjuntosAberto} />
    </div>
  );
}