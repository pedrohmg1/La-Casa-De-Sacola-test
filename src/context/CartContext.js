"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

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
        .select("*, sacola(*), cores(nome_cor)")
        .eq("ped_id", pedido.id_ped);

      const mappedItems = (itens || []).map(item => ({
        id_ten: item.id_ten,
        id_sac: item.sac_id,
        nome_sac: item.sacola?.nome_sac,
        tipo_sac: item.sacola?.tipo_sac,
        tamanho_sac: item.sacola?.tamanho_sac,
        quantidademin_sac: item.sacola?.quantidademin_sac,
        precounitario_sac: item.preco,
        quantity: item.quantidade,
        cor_sac: item.cores?.nome_cor,
        cor_id: item.cor_id,
        logo_url: item.logo_url,
      }));

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
      setCartItems(prev => prev.filter(item => item.id_ten !== itemId));
    }
  };

  // Atualiza pelo id_ten
  const updateQuantity = async (itemId, quantity) => {
    const item = cartItems.find(i => i.id_ten === itemId);
    if (!item) return;

    const minimo = item.quantidademin_sac || 1;
    if (quantity < minimo) return;

    const { error } = await supabase
      .from("itens_pedido")
      .update({ quantidade: quantity })
      .eq("id_ten", itemId);

    if (!error) {
      setCartItems(prev =>
        prev.map(i => i.id_ten === itemId ? { ...i, quantity } : i)
      );
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