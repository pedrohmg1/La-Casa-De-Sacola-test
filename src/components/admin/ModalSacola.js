"use client";

import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import CoresMaterialPreview from "@/components/admin/CoresMaterialPreview";
import {
  ExclamationTriangleIcon,
  GearIcon,
  TrashIcon,
  PlusIcon
} from "@radix-ui/react-icons";

/**
 * Props:
 * - aberto: boolean
 * - onOpenChange: (boolean) => void
 * - sacola: objeto com os campos da sacola (novaSacola no hook)
 * - onSacolaChange: (sacola) => void  (setNovaSacola no hook)
 * - sacolaEditandoId: number | null
 * - opcoesMaterial: array de { id_tip, tipo_tip }
 * - opcoesTamanho: array de { id_tam, tamanho_tam }
 * - coresDisponiveis: array de cores do material selecionado
 * - onSalvar: (e) => void  (handleSalvarSacola)
 * - onOcultar: () => void  (handleOcultarSacola)
 * - onAbrirGerenciarMaterial: () => void
 * - onAbrirGerenciarTamanho: () => void
 */
export default function ModalSacola({
  aberto,
  onOpenChange,
  sacola,
  onSacolaChange,
  sacolaEditandoId,
  opcoesMaterial,
  opcoesTamanho,
  coresDisponiveis,
  onSalvar,
  onOcultar,
  onAbrirGerenciarMaterial,
  onAbrirGerenciarTamanho,
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 backdrop-blur-sm z-40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl w-[min(92vw,40rem)] max-h-[90vh] z-[100] overflow-y-auto custom-scrollbar"
        >
          <Dialog.Title className="text-md lg:text-xl font-extrabold mb-6 text-[#264f41]">
            {sacolaEditandoId ? 'Editar Sacola' : 'Adicionar Nova Sacola'}
          </Dialog.Title>

          <form onSubmit={onSalvar} className="flex flex-col gap-5">

            {/* Nome de exibição */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-xs lg:text-sm select-none text-gray-700">
                Nome de Exibição
              </label>
              <input
                type="text"
                placeholder="Sacola de Plástico Alça-fita"
                className="border border-gray-300 p-3 rounded-xl outline-none focus:border-[#5ab58f] transition text-sm lg:text-md font-extralight"
                value={sacola.nome_sac}
                onChange={(e) => onSacolaChange({ ...sacola, nome_sac: e.target.value })}
                required
              />
            </div>

            {/* Material */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-xs lg:text-sm select-none text-gray-700">
                Material
              </label>
              <div className="flex gap-2">
                <Select.Root
                  value={sacola.tipo_sac}
                  onValueChange={(v) => onSacolaChange({ ...sacola, tipo_sac: v })}
                >
                  <Select.Trigger className="flex flex-1 items-center justify-between border border-gray-300 p-3 rounded-xl bg-white focus:border-[#5ab58f] outline-none transition text-sm lg:text-md font-extralight">
                    <Select.Value placeholder="Selecione o material..." />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white rounded-xl shadow-2xl border border-gray-200 z-[110]">
                      <Select.Viewport className="p-2">
                        {opcoesMaterial.map((m) => (
                          <Select.Item
                            key={m.id_tip}
                            value={m.tipo_tip}
                            className="p-3 rounded-lg outline-none cursor-pointer hover:bg-[#f0faf5] focus:bg-[#f0faf5] transition text-sm lg:text-md font-extralight"
                          >
                            <Select.ItemText>{m.tipo_tip}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>

                <button
                  type="button"
                  onClick={onAbrirGerenciarMaterial}
                  className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  <GearIcon />
                </button>
              </div>

              <CoresMaterialPreview
                show={Boolean(sacola.tipo_sac)}
                nomesCores={coresDisponiveis}
              />
            </div>

            {/* Qtd. Mínima + Preço */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-xs lg:text-sm select-none text-gray-700">
                  Qtd. Mínima
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="border border-gray-300 p-3 rounded-xl outline-none focus:border-[#5ab58f] transition text-sm lg:text-md font-extralight"
                  value={sacola.quantidademin_sac}
                  onChange={(e) => onSacolaChange({ ...sacola, quantidademin_sac: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-xs lg:text-sm select-none text-gray-700">
                  Preço Unit. (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 p-3 rounded-xl outline-none focus:border-[#5ab58f] transition text-sm lg:text-md font-extralight"
                  value={sacola.precounitario_sac}
                  onChange={(e) => onSacolaChange({ ...sacola, precounitario_sac: e.target.value })}
                  onBlur={(e) => {
                    const valor = parseFloat(e.target.value);
                    if (!isNaN(valor)) {
                      onSacolaChange({ ...sacola, precounitario_sac: valor.toFixed(2) });
                    }
                  }}
                />
              </div>
            </div>

{/* Peso */}
<div className="flex flex-col gap-1">
  <label className="font-bold text-xs lg:text-sm select-none text-gray-700">
    Peso (Aplicado a todos os tamanhos)
  </label>
  <input
    type="text"
    placeholder="Ex: 50g"
    className="border border-gray-300 p-3 rounded-xl outline-none focus:border-[#5ab58f] transition text-sm lg:text-md font-extralight"
    value={sacola.peso_sac}
    onChange={(e) => onSacolaChange({ ...sacola, peso_sac: e.target.value })}
    required
  />
</div>

{/* Vínculo de Tamanhos */}
<div className="flex flex-col gap-3 mt-2 border-t border-gray-100 pt-5">
  <div className="flex justify-between items-center mb-1">
    <label className="font-bold text-sm lg:text-md select-none text-gray-700">
      Tamanhos Disponíveis, Preço e Qtd. Mínima
    </label>
    <button
      type="button"
      onClick={() => onSacolaChange({
        ...sacola,
        sacola_tamanho: [...(sacola.sacola_tamanho || []), { tam_id: "", preco: "", qtd_minima: "", ativo: true }]
      })}
      className="flex items-center gap-1 text-xs bg-[#f0faf5] text-[#3ca779] px-3 py-2 rounded-lg font-bold hover:bg-[#c8e3d5] transition border border-[#c8e3d5]"
    >
      <PlusIcon /> Adicionar Tamanho
    </button>
  </div>

  {(sacola.sacola_tamanho || []).map((tamanhoVinculo, index) => (
    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr_auto_auto] gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative">
      
      {/* Select Tamanho */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-xs text-gray-600 flex items-center justify-between">
          Tamanho
          <button
            type="button"
            onClick={onAbrirGerenciarTamanho}
            className="text-[#3ca779] hover:text-[#2e8f65] transition"
            title="Gerenciar Tamanhos Globais"
          >
            <GearIcon className="size-3.5" />
          </button>
        </label>
        <Select.Root
          value={String(tamanhoVinculo.tam_id || "")}
          onValueChange={(v) => {
            const novosTamanhos = [...sacola.sacola_tamanho];
            novosTamanhos[index].tam_id = v;
            onSacolaChange({ ...sacola, sacola_tamanho: novosTamanhos });
          }}
        >
          <Select.Trigger className="flex w-full items-center justify-between border border-gray-300 p-2.5 rounded-lg bg-white focus:border-[#5ab58f] outline-none text-sm transition">
            <Select.Value placeholder="Selecione..." />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-white rounded-xl shadow-2xl border border-gray-200 z-[120]">
              <Select.Viewport className="p-2">
                {opcoesTamanho.map((t) => (
                  <Select.Item key={t.id_tam} value={String(t.id_tam)} className="p-2.5 rounded-lg outline-none cursor-pointer hover:bg-[#f0faf5] text-sm">
                    <Select.ItemText>{t.tamanho_tam}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* Input Qtd Mínima */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-xs text-gray-600">Qtd. Mín</label>
        <input
          type="number"
          min="1"
          placeholder="Ex: 100"
          className="border border-gray-300 p-2.5 rounded-lg outline-none focus:border-[#5ab58f] text-sm w-full transition bg-white"
          value={tamanhoVinculo.qtd_minima}
          onChange={(e) => {
            const novosTamanhos = [...sacola.sacola_tamanho];
            novosTamanhos[index].qtd_minima = e.target.value;
            onSacolaChange({ ...sacola, sacola_tamanho: novosTamanhos });
          }}
          required
        />
      </div>

      {/* Input Preço */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-xs text-gray-600">Preço (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex: 1.50"
          className="border border-gray-300 p-2.5 rounded-lg outline-none focus:border-[#5ab58f] text-sm w-full transition bg-white"
          value={tamanhoVinculo.preco}
          onChange={(e) => {
            const novosTamanhos = [...sacola.sacola_tamanho];
            novosTamanhos[index].preco = e.target.value;
            onSacolaChange({ ...sacola, sacola_tamanho: novosTamanhos });
          }}
          required
        />
      </div>

      {/* Toggle Ativo */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-xs text-gray-600 text-center">Ativo</label>
        <button
          type="button"
          onClick={() => {
            const novosTamanhos = [...sacola.sacola_tamanho];
            novosTamanhos[index].ativo = !novosTamanhos[index].ativo;
            onSacolaChange({ ...sacola, sacola_tamanho: novosTamanhos });
          }}
          className={`p-2.5 rounded-lg border text-sm font-bold transition-all min-w-[3.5rem] ${tamanhoVinculo.ativo !== false ? 'bg-[#e0f5ea] text-[#2e8f65] border-[#c8e3d5]' : 'bg-gray-200 text-gray-500 border-gray-300'}`}
        >
          {tamanhoVinculo.ativo !== false ? 'Sim' : 'Não'}
        </button>
      </div>

      {/* Remover */}
      <button
        type="button"
        onClick={() => {
          const novosTamanhos = sacola.sacola_tamanho.filter((_, i) => i !== index);
          onSacolaChange({ ...sacola, sacola_tamanho: novosTamanhos });
        }}
        className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition self-end border border-red-100 h-[42px]"
        title="Remover vínculo"
      >
        <TrashIcon className="size-5" />
      </button>
    </div>
  ))}
  
  {(!sacola.sacola_tamanho || sacola.sacola_tamanho.length === 0) && (
    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold mt-2">
      <ExclamationTriangleIcon className="size-5" />
      Nenhum tamanho vinculado. Adicione ao menos um para prosseguir.
    </div>
  )}
</div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-sm text-gray-700">Status</label>

              {sacola.status_sac === 'Oculto' && (
                <span className="text-sm italic text-gray-700">
                  Altere o status para restaurar esse item de volta aos ativos
                </span>
              )}

              <Select.Root
                value={sacola.status_sac}
                onValueChange={(v) => onSacolaChange({ ...sacola, status_sac: v })}
              >
                <Select.Trigger className="flex items-center justify-between border border-gray-300 p-3 rounded-xl bg-white focus:border-[#5ab58f] outline-none transition text-sm lg:text-md font-extralight">
                  <Select.Value placeholder="Status da sacola..." />
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content className="bg-white rounded-xl shadow-2xl border border-gray-200 z-[110]">
                    <Select.Viewport className="p-2">
                      <Select.Item value="Disponível" className="p-3 rounded-lg outline-none cursor-pointer hover:bg-[#f0faf5]">
                        <Select.ItemText>Disponível</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="Fora de Estoque" className="p-3 rounded-lg outline-none cursor-pointer hover:bg-[#f0faf5]">
                        <Select.ItemText>Fora de Estoque</Select.ItemText>
                      </Select.Item>
                      {sacola.status_sac === 'Oculto' && (
                        <Select.Item
                          value="Oculto"
                          className="p-3 rounded-lg text-red-600 font-bold outline-none cursor-pointer hover:bg-red-50"
                        >
                          <Select.ItemText>Oculto</Select.ItemText>
                        </Select.Item>
                      )}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Botão salvar */}
            <button
              type="submit"
              className="mt-4 bg-[#5ab58f] hover:bg-[#2e8f65] text-white p-4 rounded-xl font-bold transition shadow-lg"
            >
              {sacolaEditandoId ? 'Salvar Alterações' : 'Cadastrar Sacola'}
            </button>

            {/* Aviso */}
            <div className="flex-row flex items-center">
              <ExclamationTriangleIcon className="size-6 lg:size-7" />
              <div className="px-3 flex-col flex font-semibold text-md">
                <span>Cuidado ao salvar!</span>
                <span>Suas alterações podem ter grandes pesos.</span>
              </div>
            </div>

            {/* Botão ocultar — só aparece no modo edição e quando não está oculto */}
            {sacolaEditandoId && sacola.status_sac !== 'Oculto' && (
              <AlertDialog.Root>
                <AlertDialog.Trigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 text-red-500 font-bold hover:underline"
                  >
                    <TrashIcon className="size-5" /> Quero excluir essa sacola
                  </button>
                </AlertDialog.Trigger>

                <AlertDialog.Portal>
                  <AlertDialog.Overlay className="bg-black/45 fixed inset-0 z-[120] backdrop-blur-sm" />
                  <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-7 rounded-2xl shadow-2xl w-[min(92vw,30rem)] z-[130] outline-none border border-[#e4f4ed]">
                    <AlertDialog.Title className="text-xl font-extrabold text-[#264f41] leading-tight">
                      Tem certeza absoluta?
                    </AlertDialog.Title>

                    <AlertDialog.Description className="text-sm text-gray-600 mt-2 leading-relaxed">
                      Esta ação vai excluir e ocultar a sacola da listagem ativa.
                    </AlertDialog.Description>

                    <div className="flex gap-3 justify-end mt-6">
                      <AlertDialog.Cancel asChild>
                        <button className="px-4 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition outline-none">
                          Cancelar
                        </button>
                      </AlertDialog.Cancel>

                      <AlertDialog.Action asChild>
                        <button
                          type="button"
                          onClick={onOcultar}
                          className="px-4 py-3 rounded-xl font-bold text-white bg-[#d94f4f] hover:bg-[#c74242] transition outline-none shadow-sm"
                        >
                          Sim, excluir
                        </button>
                      </AlertDialog.Action>
                    </div>
                  </AlertDialog.Content>
                </AlertDialog.Portal>
              </AlertDialog.Root>
            )}

          </form>

          {/* Botão fechar (X) */}
          <Dialog.Close asChild>
            <button className="absolute top-5 right-5 text-gray-400 hover:text-black font-bold">
              ✕
            </button>
          </Dialog.Close>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}