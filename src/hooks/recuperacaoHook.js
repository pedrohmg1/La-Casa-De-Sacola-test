"use client";
import { useState } from "react";
import toast from "react-hot-toast";

export default function useRecuperacaoHook() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviarEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/recuperacao-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await res.json();
      if (!res.ok) {
        toast.error(dados.error || "Erro ao enviar email.");
      } else {
        setEnviado(true);
        toast.success("Email enviado! Verifique sua caixa de entrada.");
        setEmail("");
      }
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
    setLoading(false);
  };

  return { email, setEmail, loading, enviado, handleEnviarEmail };
}