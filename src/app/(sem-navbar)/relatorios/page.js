"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RotaAdmin from "@/components/admin/rotaAdmin";
import { useRelatorios } from "@/hooks/useRelatorios";
import { exportarParaPDF } from "../exportacao/exportacao";
import useTour from "@/hooks/useTour";
import * as Tabs from "@radix-ui/react-tabs";

const formatoMoeda = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CardTotal = ({ titulo, valor, cor }) => (
  <div className="bg-white border border-[#e4f4ed] rounded-xl p-5 flex-1 min-w-[160px] shadow-sm">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
      {titulo}
    </p>
    <p className={`text-2xl font-black mt-1 ${cor}`}>{valor}</p>
  </div>
);

const Barra = ({ label, valor, max, corBarra }) => {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-32 text-xs font-semibold text-[#264f41] truncate"
        title={label}
      >
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${corBarra}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 w-10 text-right">
        {valor}
      </span>
    </div>
  );
};

const GraficoBarraCor = ({ label, valor, max, hex }) => {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-4 h-4 rounded-full shrink-0 border border-gray-300"
        style={{ backgroundColor: hex }}
      />
      <span
        className="w-28 text-xs font-semibold text-[#264f41] truncate"
        title={label}
      >
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 border-2 border-gray-300"
          style={{ width: `${pct}%`, backgroundColor: hex }}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 w-10 text-right">
        {valor}
      </span>
    </div>
  );
};

export default function Relatorios() {
  const router = useRouter();
  const {
    coresData,
    tiposData,
    statusData,
    faturamentoMensal,
    combinacoes,
    totais,
    loading,
    carregarRelatorios,
  } = useRelatorios();
  const [exportando, setExportando] = useState(null);

  const maxCor = coresData.length
    ? Math.max(...coresData.map((c) => c.quantidade))
    : 1;
  const maxTipo = tiposData.length
    ? Math.max(...tiposData.map((t) => t.quantidade))
    : 1;
  const maxFaturamento = faturamentoMensal.length
    ? Math.max(...faturamentoMensal.map((f) => f.receita))
    : 1;

  const handleExportarPDF = (dados, nome) => {
    if (!dados || dados.length === 0) return;
    setExportando(nome);
    setTimeout(() => {
      exportarParaPDF(dados, nome);
      setExportando(null);
    }, 100);
  };

  useTour(
    "tourRelatorios",
    [
      {
        element: "#cards-totais",
        popover: {
          title: "Métricas Gerais",
          description: `
            Aqui você encontra:
            <ul class="list-disc pl-5 mt-2 space-y-1">
            <li>O quanto lucrou</li>
            <li>Quais produtos mais comprados</li>
            <li>Quantos clientes cadastrados</li>
            </ul>
             `,
          side: "bottom",
        },
      },
      {
        element: "#baixar-dados",
        popover: {
          title: "Baixar Dados",
          description:
            "Clique aqui para baixar todos os dados em arquivo <i>PDF</i>.",
          side: "top",
        },
      },
      {
        element: "#atualizar-dados",
        popover: {
          title: "Atualizar Dados",
          description:
            "Clique aqui para recarregar os gráficos com os dados mais recentes.",
          side: "top",
        },
      },
    ],
    "/",
    "tourHome",
  );

  if (loading) {
    return (
      <RotaAdmin>
        <main className="p-5 m-auto bg-gray-100 min-h-screen flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#5ab58f] border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-bold text-[#264f41] animate-pulse">
              Carregando relatórios...
            </p>
          </div>
        </main>
      </RotaAdmin>
    );
  }

  return (
    <RotaAdmin>
      <main className="p-5 m-auto bg-gray-100 min-h-screen flex flex-col">
        <button
          onClick={() => router.push("/")}
          className="bg-[#264f41] hover:bg-[#403c37] text-white px-2.5 py-2.5 rounded-xl font-bold transition shadow-md flex items-center gap-2 text-md w-max mb-5"
        >
          ← Voltar
        </button>

        <div className="mb-6">
          <h1 className="text-lg lg:text-xl font-extrabold text-[#264f41]">
            Relatórios
          </h1>
          <h2 className="text-md lg:text-lg text-gray-600">
            Métricas e análises do e-commerce
          </h2>
        </div>

        <Tabs.Root defaultValue="relatorios" className="flex flex-col flex-1">
          <Tabs.List className="flex gap-2 mb-6 border-b border-[#e4f4ed]">
            <Tabs.Trigger
              value="relatorios"
              className="px-4 py-2 text-sm font-bold text-gray-500 border-b-2 border-transparent data-[state=active]:border-[#5ab58f] data-[state=active]:text-[#264f41] transition-colors"
            >
              Relatórios
            </Tabs.Trigger>
            <Tabs.Trigger
              value="estatisticas"
              className="px-4 py-2 text-sm font-bold text-gray-500 border-b-2 border-transparent data-[state=active]:border-[#5ab58f] data-[state=active]:text-[#264f41] transition-colors"
            >
              Estatísticas
            </Tabs.Trigger>
          </Tabs.List>

          {/* ABA RELATÓRIOS — conteúdo que já existia */}
          <Tabs.Content value="relatorios">
            <div id="cards-totais" className="flex flex-wrap gap-4 mb-8">
              <CardTotal
                titulo="Total de Pedidos"
                valor={totais.pedidos}
                cor="text-[#264f41]"
              />
              <CardTotal
                titulo="Receita Bruta"
                valor={formatoMoeda(totais.receita)}
                cor="text-[#3ca779]"
              />
              <CardTotal
                titulo="Sacolas Vendidas"
                valor={totais.sacolas}
                cor="text-[#8f0000]"
              />
              <CardTotal
                titulo="Clientes Cadastrados"
                valor={totais.clientes}
                cor="text-[#5ab58f]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* card cores */}
              <div className="bg-white border border-[#e4f4ed] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-[#264f41] uppercase tracking-wide">
                    Cores Mais Utilizadas
                  </h3>
                  <button
                    id="baixar-dados"
                    onClick={() =>
                      handleExportarPDF(coresData, "cores_mais_utilizadas.pdf")
                    }
                    disabled={!coresData.length || exportando}
                    className="text-xs font-bold text-[#5ab58f] hover:text-[#2e8f65] transition-colors"
                  >
                    {exportando === "cores_mais_utilizadas.pdf"
                      ? "Exportando..."
                      : "Exportar PDF"}
                  </button>
                </div>
                {coresData.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Nenhum dado disponível.
                  </p>
                ) : (
                  coresData.map((c) => (
                    <GraficoBarraCor
                      key={c.nome}
                      label={c.nome}
                      valor={c.quantidade}
                      max={maxCor}
                      hex={c.hex}
                    />
                  ))
                )}
              </div>

              {/* card tipos */}
              <div className="bg-white border border-[#e4f4ed] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-[#264f41] uppercase tracking-wide">
                    Tipos de Sacola Mais Pedidos
                  </h3>
                  <button
                    onClick={() =>
                      handleExportarPDF(tiposData, "tipos_sacola.pdf")
                    }
                    disabled={!tiposData.length || exportando}
                    className="text-xs font-bold text-[#5ab58f] hover:text-[#2e8f65] transition-colors"
                  >
                    {exportando === "tipos_sacola.pdf"
                      ? "Exportando..."
                      : "Exportar PDF"}
                  </button>
                </div>
                {tiposData.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Nenhum dado disponível.
                  </p>
                ) : (
                  tiposData.map((t) => (
                    <Barra
                      key={t.tipo}
                      label={t.nome}
                      valor={t.quantidade}
                      max={maxTipo}
                      corBarra="bg-[#5ab58f]"
                    />
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* card status */}
              <div className="bg-white border border-[#e4f4ed] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-[#264f41] uppercase tracking-wide">
                    Pedidos por Status
                  </h3>
                  <button
                    onClick={() =>
                      handleExportarPDF(statusData, "pedidos_por_status.pdf")
                    }
                    disabled={!statusData.length || exportando}
                    className="text-xs font-bold text-[#5ab58f] hover:text-[#2e8f65] transition-colors"
                  >
                    {exportando === "pedidos_por_status.pdf"
                      ? "Exportando..."
                      : "Exportar PDF"}
                  </button>
                </div>
                {statusData.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Nenhum dado disponível.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#e4f4ed]">
                          <th className="py-2 text-xs font-bold text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">
                            Quantidade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusData.map((s) => (
                          <tr
                            key={s.status}
                            className="border-b border-gray-50 hover:bg-[#f0faf5] transition-colors"
                          >
                            <td className="py-2.5 text-sm font-semibold text-[#264f41]">
                              {s.status}
                            </td>
                            <td className="py-2.5 text-sm font-bold text-[#264f41] text-right">
                              {s.quantidade}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* card faturamento */}
              <div className="bg-white border border-[#e4f4ed] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-[#264f41] uppercase tracking-wide">
                    Faturamento Mensal
                  </h3>
                  <button
                    onClick={() =>
                      handleExportarPDF(
                        faturamentoMensal.map((f) => ({
                          ...f,
                          receita: formatoMoeda(f.receita),
                        })),
                        "faturamento_mensal.pdf",
                      )
                    }
                    disabled={!faturamentoMensal.length || exportando}
                    className="text-xs font-bold text-[#5ab58f] hover:text-[#2e8f65] transition-colors"
                  >
                    {exportando === "faturamento_mensal.pdf"
                      ? "Exportando..."
                      : "Exportar PDF"}
                  </button>
                </div>
                {faturamentoMensal.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Nenhum dado disponível.
                  </p>
                ) : (
                  <div>
                    {faturamentoMensal.map((f) => (
                      <Barra
                        key={f.mes}
                        label={f.mes}
                        valor={f.pedidos}
                        max={Math.max(
                          ...faturamentoMensal.map((x) => x.pedidos),
                        )}
                        corBarra="bg-[#8f0000]"
                      />
                    ))}
                    <div className="mt-3 pt-3 border-t border-[#e4f4ed]">
                      {faturamentoMensal.map((f) => (
                        <div
                          key={`rec-${f.mes}`}
                          className="flex justify-between text-xs mb-1"
                        >
                          <span className="font-semibold text-gray-500">
                            {f.mes}
                          </span>
                          <span className="font-bold text-[#3ca779]">
                            {formatoMoeda(f.receita)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Tabs.Content>

          {/* ABA ESTATÍSTICAS — nova */}
          <Tabs.Content value="estatisticas">
            {/* KPIs do mês */}
            <div className="flex flex-wrap gap-4 mb-8">
              <CardTotal
                titulo="Vendas no Mês Atual"
                valor={formatoMoeda(totais.receitaMesAtual)}
                cor="text-[#3ca779]"
              />
              <CardTotal
                titulo="Ticket Médio"
                valor={formatoMoeda(totais.ticketMedio)}
                cor="text-[#264f41]"
              />
              <CardTotal
                titulo="Produto Destaque"
                valor={totais.produtoDestaque}
                cor="text-[#5ab58f]"
              />
            </div>

            {/* Combinações mais pedidas */}
            <div className="bg-white border border-[#e4f4ed] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-[#264f41] uppercase tracking-wide">
                  Combinações Mais Pedidas
                </h3>
                <button
                  onClick={() =>
                    handleExportarPDF(combinacoes, "combinacoes.pdf")
                  }
                  disabled={!combinacoes.length || exportando}
                  className="text-xs font-bold text-[#5ab58f] hover:text-[#2e8f65] transition-colors"
                >
                  {exportando === "combinacoes.pdf"
                    ? "Exportando..."
                    : "Exportar PDF"}
                </button>
              </div>
              {combinacoes.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Nenhum dado disponível.
                </p>
              ) : (
                combinacoes.map((c) => (
                  <Barra
                    key={c.nome}
                    label={c.nome}
                    valor={c.quantidade}
                    max={combinacoes[0].quantidade}
                    corBarra="bg-[#264f41]"
                  />
                ))
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>

        <div className="mt-8 flex justify-end">
          <button
            id="atualizar-dados"
            onClick={carregarRelatorios}
            className="text-sm font-bold text-[#5ab58f] hover:text-[#2e8f65] transition-colors px-4 py-2 border border-[#e4f4ed] rounded-xl hover:bg-[#f0faf5]"
          >
            Atualizar Dados
          </button>
        </div>
      </main>
    </RotaAdmin>
  );
}
