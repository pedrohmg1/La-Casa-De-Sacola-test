import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportarParaPDF(dados, nomeArquivo = "relatorio.pdf") {
  const doc = new jsPDF();
  const cabecalho = Object.keys(dados[0]);

  autoTable(doc, {
    head: [cabecalho],
    body: dados.map((linha) =>
      cabecalho.map((campo) => String(linha[campo] ?? ""))
    ),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [38, 79, 65] }, // verde escuro do projeto
  });

  doc.save(nomeArquivo);
}