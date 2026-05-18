"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthButton from "@/components/auth/AuthButton";
import AuthCard from "@/components/auth/AuthCard";
import AuthPasswordField from "@/components/auth/AuthPasswordField";
import styles from "@/components/auth/auth.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function NovaSenhaConteudo() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [tokenValido, setTokenValido] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Acesso não autorizado.");
      router.push("/recuperacao");
      return;
    }
    async function validar() {
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from("reset_senha")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", agora)
        .single();
      if (error || !data) {
        toast.error("Link inválido ou expirado.");
        setTimeout(() => router.push("/recuperacao"), 2000);
        return;
      }
      setTokenValido(token);
      setAutorizado(true);
    }
    validar();
  }, []);

  if (!autorizado) return null;

  const handleNovaSenha = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (senha.length < 6) {
      toast.error("Mínimo 6 caracteres.");
      setLoading(false);
      return;
    }
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem!");
      setLoading(false);
      return;
    }

    const { data: tokenData } = await supabase
      .from("reset_senha")
      .select("email")
      .eq("token", tokenValido)
      .single();

    if (!tokenData) {
      toast.error("Token inválido.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/atualizar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: tokenData.email,
        senha,
        token: tokenValido,
      }),
    });
    const dados = await res.json();
    if (!res.ok) {
      toast.error(dados.error || "Erro ao atualizar.");
    } else {
      toast.success("Senha atualizada!");
      setTimeout(() => router.push("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <AuthBackground>
      <AuthCard>
        <h1
          className={`${styles.reveal} ${styles.d1} ${styles.title} font-extrabold`}
        >
          Nova Senha
        </h1>
        <p className={`${styles.reveal} ${styles.d2} ${styles.titleSub} mt-2`}>
          Digite sua nova senha
        </p>
        <form
          onSubmit={handleNovaSenha}
          className={`${styles.formBlock} mt-8 flex flex-col`}
        >
          <AuthPasswordField
            placeholder="Nova Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required={true}
          />
          <AuthPasswordField
            placeholder="Confirmar Nova Senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required={true}
          />
          <AuthButton type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Nova Senha"}
          </AuthButton>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}

export default function NovaSenha() {
  return (
    <>
      <Suspense fallback={null}>
        <NovaSenhaConteudo />
      </Suspense>
    </>
  );
}
