"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";
import { PlusIcon, MinusIcon, ArchiveIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ReloadIcon, Cross2Icon, UploadIcon } from "@radix-ui/react-icons";

// ---------------------------------------------------------------------------
// Função utilitária: faz o upload para o Cloudinary usando assinatura segura
// ---------------------------------------------------------------------------
async function uploadParaCloudinary(arquivo) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = "publico";

  const formData = new FormData();
  formData.append("file", arquivo);
  formData.append("upload_preset", uploadPreset);

  const resUpload = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });

  if (!resUpload.ok) {
    const erroDetalhado = await resUpload.json();
    console.error("Erro Cloudinary:", erroDetalhado);
    throw new Error(erroDetalhado?.error?.message || "Falha ao enviar o arquivo.");
  }

  const dados = await resUpload.json();
  return dados.secure_url;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function CriadorDeSacola({ pedidoId, setPedidoId, userId, temItens, onSacolaAdicionada }) {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(1);
  const [sacolas, setSacolas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [coresDisponiveis, setCoresDisponiveis] = useState([]);

  // Seleções do wizard
  const [sacolaSelecionada, setSacolaSelecionada] = useState(null);
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);
  const [corSelecionada, setCorSelecionada] = useState(null);
  const [numCoresLogo, setNumCoresLogo] = useState(1);
  const [quantidade, setQuantidade] = useState(1);

  const [logos, setLogos] = useState([]); // { id, arquivo: File, preview: string|null, url: string|null }
  const [uploadandoLogo, setUploadandoLogo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputArquivoRef = useRef(null);
  const MAX_LOGOS = 3;

  const [conjuntosSalvos, setConjuntosSalvos] = useState([]);
  const [carregandoConjuntos, setCarregandoConjuntos] = useState(false);
  const [abaSelecionada, setAbaSelecionada] = useState("novo"); // "novo" | "salvo"

  const intervaloRefQuant = useRef(null);
  const timeoutRefQuant = useRef(null);

  const qtdStep = () => {
    const min = tamanhoSelecionado?.qtd_minima || 1;
    return min >= 1000 ? 100 : min >= 100 ? 10 : 1;
  };

  const qtdIniciarRepeticao = (delta) => {
    setQuantidade((q) => Math.max(tamanhoSelecionado?.qtd_minima || 1, q + delta));
    timeoutRefQuant.current = setTimeout(() => {
      intervaloRefQuant.current = setInterval(() => {
        setQuantidade((q) => Math.max(tamanhoSelecionado?.qtd_minima || 1, q + delta));
      }, 50);
    }, 300);
  };

  const fetchConjuntos = async () => {
    if (!userId) return;
    setCarregandoConjuntos(true);
    try {
      const { data, error } = await supabase.from("conjunto_logo").select("*").eq("usu_uuid", userId).order("data_criacao", { ascending: false });

      if (error) throw error;
      setConjuntosSalvos(data || []);
    } catch (e) {
      console.error("Erro ao buscar conjuntos:", e);
    } finally {
      setCarregandoConjuntos(false);
    }
  };

  const qtdPararRepeticao = () => {
    clearTimeout(timeoutRefQuant.current);
    clearInterval(intervaloRefQuant.current);
  };

  const qtdHandleInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const min = tamanhoSelecionado?.qtd_minima || 1;
    if (raw === "") {
      setQuantidade(min);
      return;
    }
    setQuantidade(Number(raw));
  };

  const qtdHandleBlur = () => {
    const min = tamanhoSelecionado?.qtd_minima || 1;
    if (quantidade < min) setQuantidade(min);
  };

  // -------------------------------------------------------------------------
  // Busca sacolas ao abrir o wizard
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (aberto && sacolas.length === 0) fetchDadosIniciais();
    if (aberto) fetchConjuntos();
  }, [aberto]);

  useEffect(() => {
    if (sacolaSelecionada) {
      const tamanhosAtivos = sacolaSelecionada.sacola_tamanho?.filter(st => st.ativo) || [];
      if (tamanhosAtivos.length > 0) {
        setTamanhoSelecionado(tamanhosAtivos[0]);
        setQuantidade(tamanhosAtivos[0].qtd_minima || 1);
      } else {
        setTamanhoSelecionado(null);
        setQuantidade(1);
      }
    }
  }, [sacolaSelecionada]);

  useEffect(() => {
    if (tamanhoSelecionado) {
      setQuantidade(q => Math.max(q, tamanhoSelecionado.qtd_minima || 1));
    }
  }, [tamanhoSelecionado]);

  const fetchDadosIniciais = async () => {
    setCarregando(true);
    try {
      const { data: dataSac, error: errSac } = await supabase.from("sacola").select("*, sacola_tamanho(*, tamanho(tamanho_tam))").order("nome_sac", { ascending: true });
      if (errSac) throw errSac;
      setSacolas(dataSac || []);

      const { data: dataCor, error: errCor } = await supabase.from("cores").select("id_cor, nome_cor, hex_cor").is("excluido", false).order("nome_cor", { ascending: true });
      if (errCor) throw errCor;
      setCoresDisponiveis(dataCor || []);
    } catch (e) {
      toast.error("Erro ao carregar dados do catálogo.");
    } finally {
      setCarregando(false);
    }
  };

  // -------------------------------------------------------------------------
  // Lógica de seleção e preview do arquivo de logo
  // -------------------------------------------------------------------------
  const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "application/pdf"];
  const tamanhoMaximoMB = 10;

  const processarArquivo = (arquivo) => {
    if (!arquivo) return;
    if (!tiposPermitidos.includes(arquivo.type)) {
      toast.error("Formato inválido. Use PNG, JPG, SVG ou PDF.");
      return;
    }
    if (arquivo.size > tamanhoMaximoMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${tamanhoMaximoMB}MB.`);
      return;
    }
    if (logos.length >= MAX_LOGOS) {
      toast.error(`Máximo de ${MAX_LOGOS} logos por item.`);
      return;
    }
    const preview = arquivo.type !== "application/pdf" ? URL.createObjectURL(arquivo) : null;
    setLogos((prev) => [...prev, { id: Date.now(), arquivo, preview, url: null }]);
  };

  const handleInputArquivo = (e) => {
    processarArquivo(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastando(true);
  };

  const handleDragLeave = () => setArrastando(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    processarArquivo(e.dataTransfer.files?.[0]);
  };

  const removerLogo = (id) => {
    setLogos((prev) => prev.filter((l) => l.id !== id));
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  };

  // -------------------------------------------------------------------------
  // Faz o upload ao avançar do passo 4 para o 5
  // -------------------------------------------------------------------------
  const salvarConjunto = async (urls) => {
    if (!userId || urls.length === 0) return;
    try {
      // Conta quantos conjuntos o usuário já tem para gerar o nome
      const { count } = await supabase.from("conjunto_logo").select("*", { count: "exact", head: true }).eq("usu_uuid", userId);

      const nome = `Conjunto Nº ${(count || 0) + 1}`;

      await supabase.from("conjunto_logo").insert({
        usu_uuid: userId,
        nome,
        logo_urls: urls,
      });
    } catch (e) {
      console.error("Erro ao salvar conjunto:", e);
    }
  };

  const handleUploadEAvancar = async () => {
    const pendentes = logos.filter((l) => !l.url);
    if (pendentes.length === 0) {
      setPasso((p) => p + 1);
      return;
    }

    setUploadandoLogo(true);
    try {
      const logosAtualizados = await Promise.all(
        logos.map(async (logo) => {
          if (logo.url) return logo;
          const url = await uploadParaCloudinary(logo.arquivo);
          return { ...logo, url };
        })
      );
      setLogos(logosAtualizados);

      // Salva automaticamente como conjunto
      const urls = logosAtualizados.map((l) => l.url).filter(Boolean);
      await salvarConjunto(urls);

      toast.success(`${logosAtualizados.length} logo(s) enviado(s) com sucesso!`);
      setPasso((p) => p + 1);
    } catch (error) {
      toast.error(error.message || "Falha ao enviar logo(s). Tente novamente.");
    } finally {
      setUploadandoLogo(false);
    }
  };

  // -------------------------------------------------------------------------
  // Navegação entre passos
  // -------------------------------------------------------------------------
  const podeAvancar = () => {
    if (passo === 1) return !!sacolaSelecionada;
    if (passo === 2) return !!corSelecionada;
    if (passo === 3) return !!tamanhoSelecionado && quantidade >= (tamanhoSelecionado.qtd_minima || 1);
    if (passo === 4) return true; // Logo é opcional
    return false;
  };

  const avancar = () => {
    if (passo === 4) {
      handleUploadEAvancar();
      return;
    }
    if (podeAvancar()) setPasso((p) => p + 1);
  };

  const voltar = () => {
    if (passo > 1) setPasso((p) => p - 1);
  };

  const resetWizard = () => {
    setPasso(1);
    setSacolaSelecionada(null);
    setCorSelecionada(null);
    setNumCoresLogo(1);
    setQuantidade(1);
    setLogos([]);
    setAberto(false);
  };

  // -------------------------------------------------------------------------
  // Confirma e salva no banco (agora inclui logo_url)
  // -------------------------------------------------------------------------
  const confirmarSacola = async () => {
    setSalvando(true);
    try {
      let idPedido = pedidoId;

      if (!idPedido) {
        // Verifica se já existe um pedido "No Carrinho" antes de criar um novo
        const { data: pedidos } = await supabase.from("pedido").select("id_ped").eq("usu_uuid", userId).eq("status_ped", "No Carrinho").order("data_criacao", { ascending: false }).limit(1);

        const pedidoExistente = pedidos?.[0];

        if (pedidoExistente) {
          idPedido = pedidoExistente.id_ped;
          setPedidoId(idPedido);
        } else {
          const { data: novoPedido, error: errPedido } = await supabase.from("pedido").insert({ status_ped: "No Carrinho", usu_uuid: userId }).select().single();
          if (errPedido) throw errPedido;
          idPedido = novoPedido.id_ped;
          setPedidoId(idPedido);
        }
      }

      const { error: errItem } = await supabase.from("itens_pedido").insert({
        ped_id: idPedido,
        sac_id: sacolaSelecionada.id_sac,
        tamanho_id: tamanhoSelecionado.tam_id,
        quantidade: quantidade,
        preco: tamanhoSelecionado.preco * numCoresLogo,
        cor_id: corSelecionada.id_cor,
        logo_url: logos[0]?.url || null,
        logo_urls: logos.map((l) => l.url).filter(Boolean),
      });
      if (errItem) throw errItem;

      toast.success("Sacola adicionada ao pedido!");
      // Notifica o pai para atualizar o carrinho via DB
      onSacolaAdicionada();
      setPasso(6);
    } catch (e) {
      console.error("Erro ao salvar sacola:", e);
      toast.error("Erro ao adicionar sacola. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  // -------------------------------------------------------------------------
  // Estado fechado — botão de entrada
  // -------------------------------------------------------------------------
  if (!aberto) {
    if (!temItens) {
      return (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-[#c8e3d5] shadow-sm">
          <div className="w-20 h-20 bg-[#f0faf5] rounded-full flex items-center justify-center mx-auto mb-6">
            <ArchiveIcon className="text-[#3ca779] size-8" />
          </div>
          <h2 className="text-2xl font-bold text-[#264f41] mb-2">Esse pedido está vazio</h2>
          <p className="text-[#6b9e8a] mb-8">Clique no botão abaixo para criar e adicionar sua sacola personalizada.</p>
          <button
            onClick={() => setAberto(true)}
            className="bg-[#3ca779] hover:bg-[#2e8f65] text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#3ca779]/30 inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusIcon className="size-5" /> Criar sacola personalizada
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full mt-4 border-2 border-dashed border-[#c8e3d5] rounded-2xl py-4 text-[#6b9e8a] hover:border-[#3ca779] hover:text-[#3ca779] hover:bg-[#f0faf5] transition-all font-bold flex items-center justify-center gap-2"
      >
        <PlusIcon className="size-5" /> Adicionar outra sacola
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Indicador de progresso
  // -------------------------------------------------------------------------
  const PASSOS = ["Sacola", "Cor", "Detalhes", "Logo", "Revisão"];

  const IndicadorPassos = () => (
    <div className="flex items-center justify-between mb-8 px-1">
      {PASSOS.map((label, i) => {
        const num = i + 1;
        const ativo = num === passo;
        const feito = num < passo;
        return (
          <div key={num} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${feito ? "bg-[#3ca779] text-white" : ativo ? "bg-[#264f41] text-white scale-110 shadow-md" : "bg-[#e4f4ed] text-[#6b9e8a]"}`}
              >
                {feito ? <CheckIcon className="size-4" /> : num}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${ativo ? "text-[#264f41]" : "text-[#6b9e8a]"}`}>{label}</span>
            </div>
            {i < PASSOS.length - 1 && <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${feito ? "bg-[#3ca779]" : "bg-[#e4f4ed]"}`} />}
          </div>
        );
      })}
    </div>
  );

  // -------------------------------------------------------------------------
  // Botões de navegação
  // -------------------------------------------------------------------------
  const BotoesNavegacao = ({ onConfirmar }) => (
    <div className="flex justify-between mt-8 pt-6 border-t border-[#e4f4ed]">
      <button onClick={passo === 1 ? resetWizard : voltar} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[#6b9e8a] hover:bg-[#f0faf5] font-bold transition-all">
        <ChevronLeftIcon /> {passo === 1 ? "Cancelar" : "Voltar"}
      </button>

      {passo < 5 ? (
        <button
          onClick={avancar}
          disabled={!podeAvancar() || uploadandoLogo}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all
            ${podeAvancar() && !uploadandoLogo ? "bg-[#3ca779] hover:bg-[#2e8f65] text-white shadow-lg shadow-[#3ca779]/30" : "bg-[#e4f4ed] text-[#b0cfc4] cursor-not-allowed"}`}
        >
          {uploadandoLogo ? (
            <>
              <ReloadIcon className="animate-spin size-4" /> Enviando...
            </>
          ) : (
            <>
              Próximo <ChevronRightIcon />
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onConfirmar}
          disabled={salvando}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#264f41] hover:bg-[#1a3a2e] text-white font-bold transition-all shadow-lg disabled:opacity-50"
        >
          {salvando ? (
            <>
              <ReloadIcon className="animate-spin size-4" /> Salvando...
            </>
          ) : (
            <>
              <CheckIcon className="size-4" /> Adicionar ao pedido
            </>
          )}
        </button>
      )}
    </div>
  );

  // -------------------------------------------------------------------------
  // Wrapper do wizard
  // -------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-3xl p-8 border border-[#e4f4ed] shadow-sm">
      <IndicadorPassos />

      {/* PASSO 1 — Escolha da sacola */}
      {passo === 1 && (
        <div>
          <h3 className="text-xl font-bold text-[#264f41] mb-1">Escolha o tipo de sacola</h3>
          <p className="text-[#6b9e8a] text-sm mb-6">Selecione o modelo que deseja personalizar.</p>

          {carregando ? (
            <div className="flex items-center justify-center py-12 text-[#6b9e8a] gap-3">
              <ReloadIcon className="animate-spin size-5" /> Carregando sacolas...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sacolas.map((sac) => {
                const selecionada = sacolaSelecionada?.id_sac === sac.id_sac;
                return (
                  <button
                    key={sac.id_sac}
                    onClick={() => setSacolaSelecionada(sac)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all
                      ${selecionada ? "border-[#3ca779] bg-[#f0faf5] shadow-md" : "border-[#e4f4ed] hover:border-[#a8d5be] hover:bg-[#f9fdfa]"}`}
                  >
                    <div className="flex justify-between items-start">
<div>
<p className="font-bold text-[#264f41]">{sac.nome_sac}</p>
<p className="text-sm text-[#6b9e8a] mt-0.5">{sac.tipo_sac}</p>
{sac.sacola_tamanho?.filter(st => st.ativo).length > 0 && (
  <p className="text-xs text-[#a0bcb2] mt-1">
    {sac.sacola_tamanho.filter(st => st.ativo).length} tamanho(s) disponível(is)
  </p>
)}
</div>
<div className="text-right flex flex-col items-end">
{(() => {
  const ativos = sac.sacola_tamanho?.filter(st => st.ativo) || [];
  const precos = ativos.map(st => Number(st.preco));
  const minimo = precos.length > 0 ? Math.min(...precos) : 0;
  return (
    <>
      <p className="text-[10px] uppercase text-[#6b9e8a] font-bold">A partir de</p>
      <p className="font-extrabold text-[#3ca779]">R$ {minimo.toFixed(2).replace(".", ",")}</p>
      <p className="text-xs text-[#a0bcb2]">por unidade</p>
    </>
  );
})()}
</div>
                    </div>
                    {selecionada && (
                      <div className="mt-3 flex items-center gap-1.5 text-[#3ca779] text-sm font-semibold">
                        <CheckIcon className="size-4" /> Selecionada
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <BotoesNavegacao />
        </div>
      )}

      {/* PASSO 2 — Cor da sacola */}
      {passo === 2 && (
        <div>
          <h3 className="text-xl font-bold text-[#264f41] mb-1">Escolha a cor da sacola</h3>
          <p className="text-[#6b9e8a] text-sm mb-6">Selecione a cor de fundo da sacola.</p>

          <div className="grid grid-cols-4 gap-4">
            {coresDisponiveis.map((cor) => {
              const selecionada = corSelecionada?.id_cor === cor.id_cor;
              return (
                <button
                  key={cor.id_cor}
                  onClick={() => setCorSelecionada(cor)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all
                    ${selecionada ? "border-[#3ca779] bg-[#f0faf5]" : "border-[#e4f4ed] hover:border-[#a8d5be]"}`}
                >
                  <div className="w-10 h-10 rounded-full shadow-inner border border-[#e4f4ed]" style={{ backgroundColor: cor.hex_cor }} />
                  <span className="text-xs font-semibold text-[#264f41]">{cor.nome_cor}</span>
                  {selecionada && <CheckIcon className="text-[#3ca779] size-3" />}
                </button>
              );
            })}
          </div>
          <BotoesNavegacao />
        </div>
      )}

      {/* PASSO 3 — Detalhes: quantidade e cores do logo */}
      {passo === 3 && (
        <div>
          <h3 className="text-xl font-bold text-[#264f41] mb-1">Detalhes do pedido</h3>
          <p className="text-[#6b9e8a] text-sm mb-6">Informe a quantidade e as cores do seu logo.</p>

<div className="space-y-6">
<div className="bg-[#f9fdfa] rounded-2xl p-5 border border-[#e4f4ed]">
  <p className="font-bold text-[#264f41] mb-1">Tamanho da sacola</p>
  <div className="flex flex-wrap gap-3 mt-3 mb-2">
    {sacolaSelecionada?.sacola_tamanho?.filter(st => st.ativo).map((st) => (
      <button
        key={st.tam_id}
        onClick={() => setTamanhoSelecionado(st)}
        className={`px-4 py-2 rounded-xl font-bold border-2 transition-all ${
          tamanhoSelecionado?.tam_id === st.tam_id
            ? "border-[#3ca779] bg-[#e4f4ed] text-[#264f41]"
            : "border-[#e4f4ed] text-[#6b9e8a] hover:border-[#c8e3d5]"
        }`}
      >
        {st.tamanho?.tamanho_tam}
      </button>
    ))}
  </div>
</div>

<div className="bg-[#f9fdfa] rounded-2xl p-5 border border-[#e4f4ed]">
  <p className="font-bold text-[#264f41] mb-1">Quantidade</p>
  {tamanhoSelecionado?.qtd_minima && <p className="text-xs text-[#6b9e8a] mb-4">Mínimo de {tamanhoSelecionado.qtd_minima} unidades para o tamanho {tamanhoSelecionado.tamanho?.tamanho_tam}.</p>}
              {sacolaSelecionada?.quantidademin_sac && <p className="text-xs text-[#6b9e8a] mb-4">Mínimo de {sacolaSelecionada.quantidademin_sac} unidades para este modelo.</p>}
              <div className="flex items-center gap-4">
                <button
                  onMouseDown={() => qtdIniciarRepeticao(-qtdStep())}
                  onMouseUp={qtdPararRepeticao}
                  onMouseLeave={qtdPararRepeticao}
                  onTouchStart={() => qtdIniciarRepeticao(-qtdStep())}
                  onTouchEnd={qtdPararRepeticao}
                  className="w-10 h-10 rounded-xl bg-[#e4f4ed] hover:bg-[#c8e3d5] text-[#264f41] flex items-center justify-center transition-all select-none"
                >
                  <MinusIcon />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quantidade}
                  onChange={qtdHandleInput}
                  onBlur={qtdHandleBlur}
                  className="text-2xl font-extrabold text-[#264f41] w-24 text-center bg-transparent border border-[#e4f4ed] rounded-xl py-1 px-2 focus:outline-none focus:border-[#3ca779] focus:bg-white transition-all"
                />
                <button
                  onMouseDown={() => qtdIniciarRepeticao(qtdStep())}
                  onMouseUp={qtdPararRepeticao}
                  onMouseLeave={qtdPararRepeticao}
                  onTouchStart={() => qtdIniciarRepeticao(qtdStep())}
                  onTouchEnd={qtdPararRepeticao}
                  className="w-10 h-10 rounded-xl bg-[#e4f4ed] hover:bg-[#c8e3d5] text-[#264f41] flex items-center justify-center transition-all select-none"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>

            <div className="bg-[#f9fdfa] rounded-2xl p-5 border border-[#e4f4ed]">
              <p className="font-bold text-[#264f41] mb-1">Cores do logo</p>
              <p className="text-xs text-[#6b9e8a] mb-4">Cada cor adicional representa uma estampagem extra (silk screen).</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNumCoresLogo((n) => Math.max(1, n - 1))}
                  className="w-10 h-10 rounded-xl bg-[#e4f4ed] hover:bg-[#c8e3d5] text-[#264f41] flex items-center justify-center transition-all"
                >
                  <MinusIcon />
                </button>
                <span className="text-2xl font-extrabold text-[#264f41] w-16 text-center">{numCoresLogo}</span>
                <button
                  onClick={() => setNumCoresLogo((n) => Math.min(3, n + 1))}
                  className="w-10 h-10 rounded-xl bg-[#e4f4ed] hover:bg-[#c8e3d5] text-[#264f41] flex items-center justify-center transition-all"
                >
                  <PlusIcon />
                </button>
              </div>
              {numCoresLogo > 1 && (
                <p className="text-xs text-[#3ca779] mt-3 font-semibold">
                  {quantidade} sacolas × {numCoresLogo} cores = {quantidade * numCoresLogo} estampagens no total
                </p>
              )}
            </div>
          </div>
          <BotoesNavegacao />
        </div>
      )}

      {/* PASSO 4 — Upload do logo (NOVO) */}
      {passo === 4 && (
        <div>
          <h3 className="text-xl font-bold text-[#264f41] mb-1">Envie seu(s) logo(s)</h3>
          <p className="text-[#6b9e8a] text-sm mb-4">
            Até {MAX_LOGOS} arquivos. PNG, JPG, SVG ou PDF · Máx. 10MB cada. <span className="text-[#3ca779] font-semibold">Opcional</span>
          </p>

          {/* ✅ Disclaimer */}
          <div className="mb-5 p-4 bg-[#fffbeb] border border-[#f6d860] rounded-xl">
            <p className="text-xs font-bold text-[#92680a] mb-1">📁 Seus logos e imagens serão salvos</p>
            <p className="text-xs text-[#92680a] leading-relaxed">
              Os arquivos enviados serão salvos como um conjunto reutilizável em pedidos futuros. Você pode gerenciar seus conjuntos na página de "Meus Pedidos".
            </p>
          </div>

          {/* ✅ Abas: Novo upload vs Conjuntos salvos */}
          {conjuntosSalvos.length > 0 && (
            <div className="flex gap-5 px-5 mb-5 items-center place-items-center">
              <button
                onClick={() => setAbaSelecionada("novo")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 w-full ${
                  abaSelecionada === "novo" ? "border-[#3ca779] bg-[#f0faf5] text-[#264f41]" : "border-[#e4f4ed] text-[#6b9e8a] hover:border-[#c8e3d5]"
                }`}
              >
                Enviar novos logos
              </button>
              <p className="text-md text-[#264f41] font-bold select-none">
              ou
            </p>
              <button
                onClick={() => setAbaSelecionada("salvo")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 w-full ${
                  abaSelecionada === "salvo" ? "border-[#3ca779] bg-[#f0faf5] text-[#264f41]" : "border-[#e4f4ed] text-[#6b9e8a] hover:border-[#c8e3d5]"
                }`}
              >
                Usar conjunto salvo
              </button>
            </div>
          )}

          {/* ✅ Aba: Conjuntos salvos */}
          {abaSelecionada === "salvo" && (
            <div className="flex flex-col gap-3 mb-4">
              {carregandoConjuntos ? (
                <div className="flex items-center gap-2 text-[#6b9e8a] text-sm py-4">
                  <ReloadIcon className="animate-spin size-4" /> Carregando conjuntos...
                </div>
              ) : (
                conjuntosSalvos.map((conjunto) => {
                  const selecionado = logos.length > 0 && logos.every((l) => conjunto.logo_urls.includes(l.url));
                  return (
                    <button
                      key={conjunto.id_conjunto}
                      onClick={() => {
                        // Carrega os logos do conjunto sem re-upload
                        const logosDoConjunto = conjunto.logo_urls.map((url, i) => ({
                          id: Date.now() + i,
                          arquivo: null,
                          preview: url,
                          url,
                        }));
                        setLogos(logosDoConjunto);
                      }}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${selecionado ? "border-[#3ca779] bg-[#f0faf5]" : "border-[#e4f4ed] hover:border-[#a8d5be]"}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-[#264f41] text-sm">{conjunto.nome}</p>
                        <span className="text-xs text-[#6b9e8a]">{conjunto.logo_urls.length} logo(s)</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {conjunto.logo_urls.map((url, i) => (
                          <img key={i} src={url} alt={`Logo ${i + 1}`} className="w-12 h-12 object-contain rounded-lg border border-[#e4f4ed] bg-white" />
                        ))}
                      </div>
                      {selecionado && (
                        <div className="mt-2 flex items-center gap-1 text-[#3ca779] text-xs font-bold">
                          <CheckIcon className="size-3" /> Selecionado
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Aba: Novo upload — código existente */}
          {abaSelecionada === "novo" && (
            <>
              {logos.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  {logos.map((logo, index) => (
                    <div key={logo.id} className="rounded-2xl border-2 border-[#3ca779] bg-[#f0faf5] p-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl border border-[#c8e3d5] bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {logo.preview ? (
                          <img src={logo.preview} alt={`Logo ${index + 1}`} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs font-black text-[#8f0000] uppercase">PDF</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#264f41] text-sm truncate">{logo.arquivo?.name || `Logo ${index + 1}`}</p>
                        {logo.arquivo && <p className="text-xs text-[#6b9e8a]">{(logo.arquivo.size / 1024 / 1024).toFixed(2)} MB</p>}
                        {logo.url && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckIcon className="size-3 text-[#3ca779]" />
                            <span className="text-xs text-[#3ca779] font-semibold">Enviado</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#a0bcb2] shrink-0">Logo {index + 1}</span>
                      <button onClick={() => removerLogo(logo.id)} className="p-2 rounded-xl text-[#6b9e8a] hover:bg-red-50 hover:text-red-500 transition-all shrink-0">
                        <Cross2Icon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {logos.length < MAX_LOGOS && (
                <label
                  className={`flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                    arrastando ? "border-[#3ca779] bg-[#f0faf5] scale-[1.02]" : "border-[#c8e3d5] bg-[#f9fdfa] hover:border-[#3ca779] hover:bg-[#f0faf5]"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input ref={inputArquivoRef} type="file" accept=".png,.jpg,.jpeg,.svg,.pdf" className="hidden" onChange={handleInputArquivo} />
                  <div className="w-14 h-14 bg-white rounded-2xl border border-[#e4f4ed] flex items-center justify-center shadow-sm">
                    <UploadIcon className="size-6 text-[#3ca779]" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[#264f41]">{logos.length === 0 ? "Arraste seu logo aqui" : "Adicionar outro logo"}</p>
                    <p className="text-sm text-[#6b9e8a] mt-1">
                      {logos.length}/{MAX_LOGOS} adicionados
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 bg-[#3ca779] hover:bg-[#2e8f65] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all">
                    <PlusIcon /> Escolher arquivo
                  </span>
                </label>
              )}

              <div className="mt-4 p-4 bg-[#f9fdfa] rounded-xl border border-[#e4f4ed]">
                <p className="text-xs font-bold text-[#264f41] mb-1">💡 Dica</p>
                <p className="text-xs text-[#6b9e8a] leading-relaxed">
                  Para melhor resultado, prefira <strong className="text-[#264f41]">SVG ou PDF vetorizado</strong> ou PNG com fundo transparente em alta resolução (mín. 300 DPI).
                </p>
              </div>
            </>
          )}

          <BotoesNavegacao />
        </div>
      )}

      {/* PASSO 5 — Revisão */}
      {passo === 5 && (
        <div>
          <h3 className="text-xl font-bold text-[#264f41] mb-1">Revisão da sacola</h3>
          <p className="text-[#6b9e8a] text-sm mb-6">Confirme os detalhes antes de adicionar ao pedido.</p>

          <div className="space-y-3">
            <RevisaoLinha label="Sacola" valor={sacolaSelecionada?.nome_sac} />
            <RevisaoLinha label="Tipo" valor={sacolaSelecionada?.tipo_sac} />
            {tamanhoSelecionado && <RevisaoLinha label="Tamanho" valor={tamanhoSelecionado.tamanho?.tamanho_tam} />}
            <RevisaoLinha
              label="Cor"
              valor={
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full inline-block border border-[#e4f4ed]" style={{ backgroundColor: corSelecionada?.hex_cor }} />
                  {corSelecionada?.nome_cor}
                </span>
              }
            />
            <RevisaoLinha label="Quantidade" valor={`${quantidade} unidades`} />
            <RevisaoLinha label="Cores do logo" valor={`${numCoresLogo} ${numCoresLogo === 1 ? "cor" : "cores"}`} />

            {/* Logo na revisão */}
            <div className="flex justify-between items-start py-3 px-4 bg-[#f9fdfa] rounded-xl border border-[#e4f4ed]">
              <span className="text-sm text-[#6b9e8a] font-semibold">Logos</span>
              {logos.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {logos.map((logo, i) => (
                    <div key={logo.id} className="flex items-center gap-1">
                      {logo.preview ? (
                        <img src={logo.preview} alt={`Logo ${i + 1}`} className="w-8 h-8 rounded-lg object-contain border border-[#e4f4ed] bg-white" />
                      ) : (
                        <span className="text-xs font-black text-[#8f0000] bg-white border border-[#e4f4ed] px-2 py-1 rounded-lg">PDF</span>
                      )}
                    </div>
                  ))}
                  <span className="text-sm text-[#3ca779] font-bold">{logos.length} arquivo(s)</span>
                </div>
              ) : (
                <span className="text-sm text-[#a0bcb2] font-semibold italic">Não enviado</span>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#e4f4ed] flex justify-between items-center">
              <span className="font-bold text-[#264f41]">Subtotal estimado</span>
              <span className="text-xl font-extrabold text-[#3ca779]">R$ {(tamanhoSelecionado?.preco * quantidade * numCoresLogo).toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          <BotoesNavegacao onConfirmar={confirmarSacola} />
        </div>
      )}

      {/* PASSO 6 — Sucesso */}
      {passo === 6 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#f0faf5] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="size-8 text-[#3ca779]" />
          </div>
          <h3 className="text-2xl font-bold text-[#264f41] mb-2">Sacola adicionada ao carrinho!</h3>
          <p className="text-[#6b9e8a] mb-8">O que você gostaria de fazer agora?</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setPasso(1);
                setSacolaSelecionada(null);
                setCorSelecionada(null);
                setNumCoresLogo(1);
                setQuantidade(1);
                removerLogo();
                setTamanhoSelecionado(null)
              }}
              className="px-6 py-3 rounded-2xl border-2 border-[#3ca779] text-[#3ca779] hover:bg-[#f0faf5] font-bold transition-all"
            >
              Criar outra sacola
            </button>
            <Link href="/carrinho">
              <button className="px-6 py-3 rounded-2xl border-2 border-[#3ca779] text-[#3ca779] hover:bg-[#f0faf5] font-bold transition-all">Ir para o carrinho</button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente auxiliar de linha de revisão
// ---------------------------------------------------------------------------
function RevisaoLinha({ label, valor }) {
  return (
    <div className="flex justify-between items-center py-3 px-4 bg-[#f9fdfa] rounded-xl border border-[#e4f4ed]">
      <span className="text-sm text-[#6b9e8a] font-semibold">{label}</span>
      <span className="text-sm text-[#264f41] font-bold">{valor}</span>
    </div>
  );
}