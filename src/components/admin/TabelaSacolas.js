import { EyeClosedIcon, Pencil2Icon } from "@radix-ui/react-icons";

export default function TabelaSacolas({ sacolasFiltradas, onAbrirEdicao, carregando }) {
  if (carregando) {
    return (
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#e4f4ed] flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-[#6b9e8a]">
          <div className="w-8 h-8 border-4 border-[#3ca779] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Carregando sacolas...</p>
        </div>
      </div>
    );
  }
  return (
    <div
      id="tabela-sacolas"
      className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-[#e4f4ed] overflow-hidden"
    >
      <div className="max-h-full overflow-auto custom-scrollbar">
        <table className="w-full text-left">
<thead className="sticky top-0 z-10 bg-[#264f41] text-white">
<tr>
  <th className="p-4 font-semibold text-sm">Nome</th>
  <th className="p-4 font-semibold text-sm">Material</th>
  <th className="p-4 font-semibold text-sm text-center">Preço Inicial (R$)</th>
  <th className="p-4 font-semibold text-sm text-center">Tamanhos</th>
  
  <th className="p-4 font-semibold text-sm text-center">Status</th>
  <th className="p-4 font-semibold text-sm text-center">Ações</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-100">
{sacolasFiltradas.length === 0 ? (
  <tr>
    <td colSpan="6" className="p-10 text-center text-gray-500">
      <div className="flex flex-col items-center justify-center gap-2">
        <EyeClosedIcon className="size-10 text-gray-400" />
        <p className="text-lg font-semibold">
          Nenhuma sacola encontrada.
        </p>
        <p className="text-sm">
          Selecione uma das opções acima para visualizar os itens.
        </p>
      </div>
    </td>
  </tr>
) : (
  sacolasFiltradas.map((sacola) => (
    <tr
      key={sacola.id_sac}
      className="hover:bg-[#f0faf5] transition"
    >
      <td
        className="p-4 font-bold text-[#264f41] max-w-[250px] truncate"
        title={sacola.nome_sac}
      >
        {sacola.nome_sac}
      </td>
      <td className="p-4">{sacola.tipo_sac}</td>
      
      <td className="p-4 text-center">
        R$ {
          sacola.sacola_tamanho && sacola.sacola_tamanho.length > 0
            ? Math.min(...sacola.sacola_tamanho.map(st => Number(st.preco))).toFixed(2)
            : "0.00"
        }
      </td>
      
      <td className="p-4 text-center text-xs">
        {sacola.sacola_tamanho && sacola.sacola_tamanho.length > 0
          ? sacola.sacola_tamanho.map(st => st.tamanho?.tamanho_tam).filter(Boolean).join(", ")
          : "Sem tamanhos"}
      </td>

      <td className="p-4 text-center">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            sacola.status_sac === "Disponível"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {sacola.status_sac}
        </span>
      </td>
      <td className="p-4 text-center">
        <button
          onClick={() => onAbrirEdicao(sacola)}
          className="text-blue-600 hover:bg-white p-2 rounded-lg transition inline-flex items-center gap-1 font-bold"
        >
          <Pencil2Icon /> Editar
        </button>
      </td>
    </tr>
  ))
)}
</tbody>
        </table>
      </div>
    </div>
  );
}
