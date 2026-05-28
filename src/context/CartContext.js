"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-hot-toast";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [pedidoId, setPedidoId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loadingCart, setLoadingCart] = useState(true);

  const fetchCartFromDB = useCallback(async (uid) => {
    if (!uid) {
      setCartItems([]);
      setPedidoId(null);
      setLoadingCart(false);
      return;
    }

    try {
      // Busca o pedido "No Carrinho" mais recente do usuário
      const { data: pedidos } = await supabase
        .from("pedido")
        .select("id_ped")
        .eq("usu_uuid", uid)
        .eq("status_ped", "No Carrinho")
        .order("data_criacao", { ascending: false })
        .limit(1);

      const pedido = pedidos?.[0];

      if (!pedido) {
        setCartItems([]);
        setPedidoId(null);
        setLoadingCart(false);
        return;
      }

      setPedidoId(pedido.id_ped);

      // Busca os itens com dados da sacola e da cor
      const { data: itens } = await supabase
        .from("itens_pedido")
        // 👇 Alteração aqui: tiramos o tamanho solto e colocamos dentro do sacola_tamanho
        .select("*, sacola(*, sacola_tamanho(*, tamanho(tamanho_tam))), cores(nome_cor)")
        .eq("ped_id", pedido.id_ped);

        const mappedItems = (itens || []).map(item => {
          // Encontra o vínculo de tamanho específico para obter a quantidade mínima atualizada
          const vinculoTamanho = item.sacola?.sacola_tamanho?.find(st => st.tam_id === item.tamanho_id);
  
          return {
            id_ten: item.id_ten,
            id_sac: item.sac_id,
            tamanho_id: item.tamanho_id,
            nome_sac: item.sacola?.nome_sac,
            tipo_sac: item.sacola?.tipo_sac,
            tamanho_sac: vinculoTamanho?.tamanho?.tamanho_tam || "Não definido",
            quantidademin_sac: vinculoTamanho ? vinculoTamanho.qtd_minima : 1,
            precounitario_sac: item.preco,
            preco: item.preco, // Garante compatibilidade caso chamem item.preco
            quantity: item.quantidade,
            cor_sac: item.cores?.nome_cor,
            cor_id: item.cor_id,
            logo_url: item.logo_url,
            
            // 💡 Retrocompatibilidade crucial: se a página do carrinho acessar propriedades de dentro de item.sacola,
            // nós injetamos os novos valores dinâmicos aqui para que o layout antigo continue funcionando perfeitamente!
            sacola: item.sacola ? {
              ...item.sacola,
              precounitario_sac: item.preco,
              quantidademin_sac: vinculoTamanho ? vinculoTamanho.qtd_minima : 1,
              tamanho_sac: vinculoTamanho?.tamanho?.tamanho_tam || "Não definido"
            } : null
          };
        });

      setCartItems(mappedItems);
    } catch (error) {
      console.error("Erro ao carregar carrinho do banco:", error);
      setCartItems([]);
    } finally {
      setLoadingCart(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      fetchCartFromDB(uid);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      fetchCartFromDB(uid);
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchCartFromDB]);

  useEffect(() => {
    if (!userId || !pedidoId) return;
  
    const canal = supabase
      .channel(`carrinho-${pedidoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedido",
          filter: `id_ped=eq.${pedidoId}`
        },
        (payload) => {
          // Se o pedido foi pago, limpa o carrinho automaticamente
          if (payload.new.status_ped !== "No Carrinho") {
            clearCart();
            toast.success("Pagamento confirmado! Seu pedido está em andamento.");
          }
        }
      )
      .subscribe();
  
    return () => supabase.removeChannel(canal);
  }, [userId, pedidoId]);
  
  // Chamado pelo criadorSacola após adicionar uma sacola
  const refreshCart = useCallback(() => {
    if (userId) fetchCartFromDB(userId);
  }, [userId, fetchCartFromDB]);

  // Remove pelo id_ten (chave única do item no banco)
  const removeFromCart = async (itemId) => {
    const { error } = await supabase
      .from("itens_pedido")
      .delete()
      .eq("id_ten", itemId);

    if (!error) {
      const novaLista = cartItems.filter(item => item.id_ten !== itemId);
      setCartItems(novaLista);

      // NOVO: Se a lista ficar vazia após a remoção, cancelamos o pedido órfão
      if (novaLista.length === 0 && pedidoId && userId) {
        const { error: cancelError } = await supabase
          .from("pedido")
          .update({ status_ped: "Cancelado" })
          .eq("id_ped", pedidoId)
          .eq("usu_uuid", userId); // Trava de segurança garantindo que é o dono do pedido

        if (!cancelError) {
          // Limpamos o pedidoId do contexto para que o sistema crie um 
          // carrinho totalmente novo na próxima vez que ele adicionar uma sacola
          setPedidoId(null);
        } else {
          console.error("Erro ao cancelar o carrinho vazio:", cancelError);
        }
      }
    }
  };

  // Atualiza pelo id_ten
  const updateQuantity = async (itemId, quantity) => {
    const item = cartItems.find(i => i.id_ten === itemId);
    if (!item) return;
  
    const minimo = item.quantidademin_sac || 1;
    if (quantity < minimo) return;
  
    // Atualiza a tela imediatamente
    setCartItems(prev =>
      prev.map(i => i.id_ten === itemId ? { ...i, quantity } : i)
    );
  
    // Sincroniza com o banco em paralelo
    const { error } = await supabase
      .from("itens_pedido")
      .update({ quantidade: quantity })
      .eq("id_ten", itemId);
  
    // Se falhar, reverte para o valor anterior
    if (error) {
      setCartItems(prev =>
        prev.map(i => i.id_ten === itemId ? { ...i, quantity: item.quantity } : i)
      );
      toast.error("Erro ao atualizar quantidade.");
    }
  };

  // Função para adicionar item direto do catálogo
  const addToCart = async (produto, tamanhoVinculo) => {
    if (!userId) {
      console.error("Usuário não logado.");
      return;
    }

    let currentPedidoId = pedidoId;

    // Se o usuário ainda não tem um pedido "No Carrinho", cria um agora
    if (!currentPedidoId) {
      const { data: novoPedido, error: erroPedido } = await supabase
        .from("pedido")
        .insert([{ 
          usu_uuid: userId, 
          status_ped: "No Carrinho" 
        }])
        .select()
        .single();

      if (erroPedido) {
        console.error("Erro ao criar carrinho:", erroPedido);
        return;
      }
      
      currentPedidoId = novoPedido.id_ped;
      setPedidoId(currentPedidoId);
    }

    // Se vier um tamanho selecionado do catálogo, usa os dados dele. Caso contrário, pega o primeiro ativo.
    const vinculo = tamanhoVinculo || produto.sacola_tamanho?.filter(st => st.ativo)[0];

    if (!vinculo) {
      console.error("Nenhum tamanho disponível para este produto.");
      return;
    }

    // Insere o produto na tabela itens_pedido
    const { error: erroItem } = await supabase
      .from("itens_pedido")
      .insert([{
        ped_id: currentPedidoId,
        sac_id: produto.id_sac,
        tamanho_id: vinculo.tam_id,
        quantidade: vinculo.qtd_minima || 1,
        preco: vinculo.preco,
      }]);

    if (!erroItem) {
      refreshCart(); // Chama a função que já existe para atualizar os dados na tela
    } else {
      console.error("Erro ao adicionar produto:", erroItem);
    }
  };



  const clearCart = () => {
    setCartItems([]);
    setPedidoId(null);
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      pedidoId,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart,
      cartCount,
      addToCart,
      loadingCart,
      
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de um CartProvider");
  return context;
}