"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { TrashIcon, PlusIcon, MinusIcon, ChevronLeftIcon } from "@radix-ui/react-icons";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

export default function CarrinhoPage() {
  const { cartItems, removeFromCart, updateQuantity, cartCount, clearCart, pedidoId } = useCart();
  const router = useRouter();
  
  // Estados de controle de acesso
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Estados do Frete e Pagamento
  const [tipoFrete, setTipoFrete] = useState("");
  const [cep, setCep] = useState("");
  const [valorFrete, setValorFrete] = useState(0);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [enderecosSalvos, setEnderecosSalvos] = useState([]);
  const [mostrarDropdownCep, setMostrarDropdownCep] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  
  // NOVO: Monitora se o usuário retornou de um cancelamento do Mercado Pago
  useEffect(() => {
    const verificarRetornoCancelado = async () => {
      const params = new URLSearchParams(window.location.search);
      const idPedidoCancelado = params.get("external_reference");

      if (idPedidoCancelado) {
        try {
          // CORREÇÃO: Busca o usuário logado para garantir a propriedade daquele carrinho
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Atualiza o status_ped para 'cancelado' no Supabase
          const { error } = await supabase
          .from("pedido")
          .update({ status_ped: "No Carrinho" }) // Restaura o carrinho
          .eq("id_ped", idPedidoCancelado)
          .eq("usu_uuid", user.id); // TRAVA: Só atualiza se for do próprio usuário!

          if (!error) {
            toast.error("Pagamento não concluído. O pedido segue em aberto.");
            // Limpa os parâmetros da URL para o aviso não repetir ao atualizar a página
            router.replace("/carrinho");
          }
        } catch (err) {
          console.error("Erro ao atualizar status de cancelamento:", err);
        }
      }
    };

    verificarRetornoCancelado();
  }, [router]);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Você precisa estar logado para acessar o carrinho.");
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("usuario")
          .select("cargo")
          .eq("uuid_usu", user.id)
          .single();

        if (profile?.cargo === "administrador") {
          toast.error("Administradores não possuem acesso ao carrinho de compras.");
          router.push("/painel"); 
          return;
        }

        setAuthorized(true);

        const { data: meusEnderecos, error: endError } = await supabase
          .from("endereco")
          .select("cep_end") 
          .eq("uuid_usu", user.id);

        if (!endError && meusEnderecos) {
          const cepsUnicos = Array.from(new Set(meusEnderecos.map(e => e.cep_end)))
            .map(cep => ({ cep_end: cep }));
          setEnderecosSalvos(cepsUnicos);
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.precounitario_sac * item.quantity,
    0
  );

  const descontoPix = metodoPagamento === 'pix' ? subtotal * 0.05 : 0;
  const total = subtotal - descontoPix + valorFrete;

  const calcularFrete = async () => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      toast.error("Insira um CEP válido.");
      return;
    }

    setLoadingFrete(true);

    try {
      const response = await fetch('/api/frete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cepDestino: cepLimpo,
          pacotes: cartItems.map(item => ({
            id: item.id_sac,
            weight: 0.5, 
            width: 15,   
            height: 15,  
            length: 15,  
            quantity: item.quantity,
            insurance_value: item.precounitario_sac
          }))
        })
      });

      const data = await response.json();
      const freteValido = data.find(opcao => !opcao.error);

      if (freteValido) {
        setValorFrete(parseFloat(freteValido.price));
        toast.success(`Frete calculado: ${freteValido.name}`);
      } else {
        toast.error("Nenhuma transportadora disponível para este CEP.");
        setValorFrete(0);
      }

    } catch (error) {
      console.error("Erro na requisição:", error);
      toast.error("Falha ao calcular o frete.");
    } finally {
      setLoadingFrete(false);
    }
  };

  const finalizarCompra = async () => {
    if (!tipoFrete) {
      toast.error("Por favor, selecione uma opção de frete.");
      return;
    }
    if (tipoFrete === "correios" && valorFrete === 0) {
      toast.error("Por favor, calcule o frete antes de finalizar.");
      return;
    }
    if (!pedidoId) {
      toast.error("Carrinho não encontrado. Tente recarregar a página.");
      return;
    }
  
    setCheckoutLoading(true);
  
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sessão expirada. Faça login novamente.");
  
      // ✅ ATUALIZA o pedido existente — não cria um novo
      const { error: pedidoError } = await supabase
        .from("pedido")
        .update({
          valor_total: total,
          status_ped: "Aguardando Pagamento",
          metodo_pagamento: metodoPagamento,
          cep_entrega: cep,
        })
        .eq("id_ped", pedidoId)
        .eq("usu_uuid", user.id);
  
      if (pedidoError) throw new Error(`Erro ao atualizar pedido: ${pedidoError.message}`);
  
      // ✅ Itens já estão no banco — não precisa reinserir
  
      const dadosPedido = {
        pedidoId: pedidoId,
        metodoPagamento: metodoPagamento,
        items: [
          ...cartItems.map((item) => ({
            id: item.id_sac,
            title: `${item.nome_sac} - ${item.tamanho_sac}`,
            unit_price: Number(
              metodoPagamento === 'pix'
                ? (item.precounitario_sac * 0.95).toFixed(2)
                : item.precounitario_sac
            ),
            quantity: item.quantity,
            currency_id: 'BRL'
          })),
          ...(valorFrete > 0 ? [{
            id: 'frete',
            title: 'Frete',
            unit_price: Number(valorFrete),
            quantity: 1,
            currency_id: 'BRL'
          }] : [])
        ]
      };
  
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosPedido),
      });
  
      const data = await res.json();
  
      if (data.init_point) {
        toast.success("Redirecionando para o pagamento...");
        window.location.href = data.init_point;
      } else {
        throw new Error("Não foi possível gerar o link de pagamento.");
      }
  
    } catch (error) {
      console.error("Erro no checkout:", error);
      toast.error(error.message || "Não foi possível finalizar a compra.");
      setLoading(false);
    }
  };

  if (loading) return null; 
  if (!authorized) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7f5]">
      <main className="flex-grow container mx-auto px-4 py-8 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link href="/catalogo" className="flex items-center gap-2 text-[#6b9e8a] hover:text-[#3ca779] transition-colors font-bold text-sm mb-2">
                <ChevronLeftIcon /> Continuar comprando
              </Link>
              <h1 className="text-4xl font-extrabold text-[#264f41]" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                Meu Carrinho
              </h1>
            </div>
            <div className="text-right">
              <span className="bg-white px-4 py-2 rounded-2xl border border-[#e4f4ed] text-[#264f41] font-bold shadow-sm">
                {cartCount} {cartCount === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-[#c8e3d5] shadow-sm">
              <div className="w-20 h-20 bg-[#f0faf5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3ca779" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#264f41] mb-2">Seu carrinho está vazio</h2>
              <p className="text-[#6b9e8a] mb-8">Parece que você ainda não adicionou nenhum modelo de sacola.</p>
              <div className="flex gap-4 justify-center">
              <Link href="/catalogo" className="bg-[#3ca779] hover:bg-[#2e8f65] text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#3ca779]/30 inline-block">
                Explorar Catálogo
              </Link>
              <Link href="/novo-pedido" className="bg-[#3ca779] hover:bg-[#2e8f65] text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#3ca779]/30 inline-block">
                Novo Pedido
              </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Lista de Itens */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                {cartItems.map((item) => (
                  <div key={item.id_ten} className="bg-white rounded-3xl p-6 border border-[#e4f4ed] shadow-sm flex items-center gap-6 group hover:border-[#3ca779] transition-all">
                    <div className="w-24 h-24 bg-[#f0faf5] rounded-2xl flex items-center justify-center text-[#6b9e8a] font-bold text-[10px] text-center p-2 uppercase tracking-tighter">
                      {item.tipo_sac}
                    </div>
                    
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-[#264f41] group-hover:text-[#3ca779] transition-colors">{item.nome_sac}</h3>
                      <p className="text-sm text-[#6b9e8a] font-medium whitespace-pre-wrap">{item.tamanho_sac} • {item.cor_sac || 'Cor padrão'}</p>
                      <p className="text-sm text-[#6b9e8a] font-medium whitespace-pre-wrap">Min. {item.quantidademin_sac} unidades</p>
                      <p className="text-[#3ca779] font-black mt-1">R$ {Number(item.precounitario_sac).toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">/unid</span></p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center bg-[#f0faf5] rounded-xl border border-[#e4f4ed] p-1">
                        <button 
                          onClick={() => updateQuantity(item.id_ten, item.quantity - 1)}
                          className="p-1.5 hover:bg-white rounded-lg text-[#3ca779] transition-colors"
                        >
                          <MinusIcon />
                        </button>
                        <span className="w-8 text-center font-bold text-[#264f41]">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id_ten, item.quantity + 1)}
                          className="p-1.5 hover:bg-white rounded-lg text-[#3ca779] transition-colors"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => {
                          removeFromCart(item.id_ten);
                          toast.error("Item removido");
                        }}
                        className="text-[#8f0000] hover:bg-red-50 p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
                      >
                        <TrashIcon /> Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumo */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl p-8 border border-[#e4f4ed] shadow-md sticky top-28">
                  <h3 className="text-xl font-bold text-[#264f41] mb-6">Resumo do Pedido</h3>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-[#264f41] mb-3">Opções de Entrega</h4>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-[#6b9e8a] font-medium text-sm">
                        <input
                          type="radio"
                          name="frete"
                          value="correios"
                          checked={tipoFrete === "correios"}
                          onChange={(e) => setTipoFrete(e.target.value)}
                          className="text-[#3ca779] focus:ring-[#3ca779] w-4 h-4"
                        />
                        Correios (Calcular frete)
                      </label>

                      {tipoFrete === "correios" && (
                        <div className="pl-6 flex gap-2 transition-all mt-1">
                          <div className="relative w-full">
                            <input
                              type="text"
                              placeholder="00000-000"
                              value={cep}
                              onChange={(e) => {
                                setCep(e.target.value);
                                setMostrarDropdownCep(true); 
                              }}
                              onFocus={() => setMostrarDropdownCep(true)}
                              onBlur={() => setTimeout(() => setMostrarDropdownCep(false), 200)} 
                              className="w-full border border-[#e4f4ed] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#3ca779] text-[#264f41]"
                              maxLength="9"
                            />
                            
                            {mostrarDropdownCep && enderecosSalvos.length > 0 && (
                              <div className="absolute z-10 w-max left-0 mt-1 bg-white border border-[#e4f4ed] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {enderecosSalvos.map((end, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-2 hover:bg-[#f0faf5] cursor-pointer text-sm text-[#264f41] transition-colors border-b border-[#e4f4ed] last:border-b-0"
                                    onClick={() => {
                                      setCep(end.cep_end);
                                      setMostrarDropdownCep(false);
                                    }}
                                  >
                                    <span className="font-bold">{end.cep_end}</span>
                                    <span className="text-xs text-[#6b9e8a] ml-2 font-medium">Endereço Salvo</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={calcularFrete}
                            disabled={loadingFrete}
                            className="bg-[#f0faf5] text-[#3ca779] font-bold px-4 py-2 rounded-xl border border-[#e4f4ed] hover:bg-[#e4f4ed] transition-colors text-sm disabled:opacity-50"
                          >
                            {loadingFrete ? "Calculando..." : "OK"}
                          </button>
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer text-[#6b9e8a] font-medium text-sm mt-2">
                        <input
                          type="radio"
                          name="frete"
                          value="combinar"
                          checked={tipoFrete === "combinar"}
                          onChange={(e) => {
                            setTipoFrete(e.target.value);
                            setValorFrete(0);
                          }}
                          className="text-[#3ca779] focus:ring-[#3ca779] w-4 h-4"
                        />
                        A combinar
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-8">
                    <div className="flex justify-between text-[#6b9e8a] font-medium">
                      <span>Subtotal</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                  {metodoPagamento === 'pix' && (
                    <div className="flex justify-between text-[#3ca779] font-medium">
                      <span>Desconto PIX (5%)</span>
                      <span>- R$ {descontoPix.toFixed(2)}</span>
                    </div>
                  )}
                    <div className="flex justify-between text-[#6b9e8a] font-medium">
                      <span>Frete</span>
                      <span className="text-[#3ca779] font-bold">
                        {tipoFrete === "combinar" ? "A combinar" : valorFrete > 0 ? `R$ ${valorFrete.toFixed(2)}` : "-"}
                      </span>
                    </div>
                    <div className="h-px bg-[#e4f4ed] my-2" />
                    <div className="flex justify-between items-end">
                      <span className="text-[#264f41] font-bold">Total</span>
                      <div className="text-right">
                        <span className="text-3xl font-black text-[#264f41]">R$ {total.toFixed(2)}</span>
                        <p className="text-[10px] text-[#6b9e8a] font-bold uppercase mt-1">Em até 12x no cartão</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-[#264f41] mb-3">Forma de Pagamento</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {['pix', 'cartao', 'boleto'].map((metodo) => (
                        <label key={metodo} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${metodoPagamento === metodo ? 'border-[#3ca779] bg-[#f0faf5]' : 'border-[#e4f4ed] hover:border-[#c8e3d5]'}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="pagamento"
                              value={metodo}
                              checked={metodoPagamento === metodo}
                              onChange={(e) => setMetodoPagamento(e.target.value)}
                              className="hidden"
                            />
                            <span className="capitalize font-bold text-[#264f41]">
                              {metodo === 'cartao' ? 'Cartão' : metodo}
                            </span>
                          </div>
                          {metodo === 'pix' && <span className="text-[10px] bg-[#3ca779] text-white px-2 py-0.5 rounded-full">Desconto 5%</span>}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center select-none">

                  <button 
                    onClick={finalizarCompra}
                    disabled={loading || cartItems.length === 0 || !tipoFrete || (tipoFrete === "correios" && valorFrete === 0)}
                    className="w-full bg-[#264f41] hover:bg-[#1a362c] text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#264f41]/20 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? "Processando e Redirecionando..." : "Finalizar Compra"}
                  </button>
                  <p className="text-[12px] text-[#6b9e8a] font-bold uppercase">Pagamento via Mercado Pago</p>
                  </div> 

                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}