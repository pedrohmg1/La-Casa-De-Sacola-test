"use client";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";
import { TrashIcon } from "@radix-ui/react-icons";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function ModalConjuntos({ open, onOpenChange }) {
  const [conjuntos, setConjuntos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchConjuntos();
  }, [open]);

  const fetchConjuntos = async () => {
    setCarregando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("conjunto_logo")
        .select("*")
        .eq("usu_uuid", user.id)
        .order("data_criacao", { ascending: false });

      if (error) throw error;
      setConjuntos(data || []);
    } catch (e) {
      console.error("Erro ao buscar conjuntos:", e);
    } finally {
      setCarregando(false);
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este conjunto?")) return;
    try {
      const { error } = await supabase
        .from("conjunto_logo")
        .delete()
        .eq("id_conjunto", id);

      if (error) throw error;

      setConjuntos((prev) => prev.filter((c) => c.id_conjunto !== id));
      toast.success("Conjunto removido.");
    } catch (e) {
      toast.error("Erro ao remover conjunto.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 backdrop-blur-sm z-40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl w-[min(92vw,40rem)] max-h-[85vh] z-50 flex flex-col gap-6 overflow-hidden"
        >
          <Dialog.Title className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#264f41]">Meus Conjuntos de Logo</h2>
              <p className="text-xs text-[#6b9e8a] mt-1">
                Logos salvos de pedidos anteriores para reutilização
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </Dialog.Close>
          </Dialog.Title>

          <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
            {carregando ? (
              <p className="text-sm text-center text-[#6b9e8a] italic py-8">
                Carregando seus conjuntos...
              </p>
            ) : conjuntos.length === 0 ? (
              <div className="text-center py-12 bg-[#f9fdfa] rounded-2xl border border-dashed border-[#c8e3d5]">
                <p className="text-sm font-bold text-[#264f41]">Nenhum conjunto salvo ainda.</p>
                <p className="text-xs text-[#6b9e8a] mt-1">
                  Seus logos serão salvos automaticamente ao fazer um pedido.
                </p>
              </div>
            ) : (
              conjuntos.map((conjunto) => (
                <div
                  key={conjunto.id_conjunto}
                  className="bg-[#f9fdfa] border border-[#e4f4ed] rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-[#264f41]">{conjunto.nome}</p>
                      <p className="text-xs text-[#6b9e8a]">
                        {new Date(conjunto.data_criacao).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {conjunto.logo_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Logo ${i + 1}`}
                            className="w-16 h-16 object-contain rounded-xl border border-[#e4f4ed] bg-white hover:shadow-md transition cursor-pointer"
                          />
                        </a>
                      ))}
                    </div>
                    <p className="text-xs text-[#6b9e8a] mt-2">
                      {conjunto.logo_urls.length} arquivo(s)
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeletar(conjunto.id_conjunto)}
                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors shrink-0"
                    title="Excluir conjunto"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}