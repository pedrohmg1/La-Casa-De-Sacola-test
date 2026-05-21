"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useNavbarAuth() {
  const [user, setUser] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [nome, setNome] = useState(null);
  const [navbarLoading, setNavbarLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let montado = true; // Evita erros caso o usuário mude de página muito rápido

    // 1. O seu Failsafe (Timeout de 5 segundos)
    const timeout = setTimeout(() => {
      if (montado) {
        console.warn("Ativando timeout.")
        setErro(true);
        setNavbarLoading(false);
      }
    }, 5000);

    // 2. Função isolada para buscar o cargo (usada no carregamento inicial e nas mudanças)
    const carregarPerfil = async (currentUser) => {
      try {
        if (currentUser) {
          const { data: perfil, error: perfilError } = await supabase
            .from("usuario")
            .select("cargo, nome_usu")
            .eq("uuid_usu", currentUser.id)
            .single();

          if (perfilError) throw perfilError;
          if (montado) {
            setCargo(perfil?.cargo ?? null);
            setNome(perfil?.nome_usu ?? null); 
          }
        } else {
          if (montado) setCargo(null);
        }
      } catch (e) {
        console.error("Erro na verificação de cargo:", e);
        if (montado) setErro(true);
      } finally {
        if (montado) {
          // A MÁGICA AQUI: O timeout só é cancelado DEPOIS que a consulta do banco terminar.
          // Se a consulta travar e passar de 5s, o failsafe lá de cima vai ser acionado primeiro!
          console.warn("Limpando timeout.")
          clearTimeout(timeout); 
          setNavbarLoading(false);
        }
      }
    };

    // 3. Busca ATIVA inicial (Resolve o problema do F5)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (montado) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        carregarPerfil(currentUser);
      }
    });

    // 4. Escuta de mudanças (Ex: quando o usuário clica em Sair)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Reage apenas a eventos reais de mudança de usuário para não refazer queries à toa
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (montado) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          console.warn("Ativando loading.")
          setNavbarLoading(true); // Liga o loading enquanto re-valida o cargo
          carregarPerfil(currentUser);
        }
      }
    });

    return () => {
      montado = false;
      console.warn("Limpando timeout.")
      clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, cargo, nome, navbarLoading, erro };
}