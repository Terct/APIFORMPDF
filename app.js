const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const port = 3131;

// Middleware para analisar o corpo da solicitação como JSON
app.use(express.json());

app.post('/gerar-pdf', (req, res) => {
  // Aqui você deve obter os dados do corpo da solicitação POST

  const requestData = req.body; // Suponha que os dados sejam enviados como JSON no corpo da solicitação
  // Agora você pode usar requestData para criar o PDF

  // Cria um novo documento PDF
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream('output.pdf')); // Salva o PDF em um arquivo chamado 'output.pdf'

  // Cabeçalho do PDF
  doc.fontSize(16).text('Exemplo de PDF gerado a partir de um array', 50, 50);

  // Organize as perguntas em grupos de 5 e crie uma tabela para cada grupo
  const groupSize = 5;
  for (let i = 0; i < requestData.length; i += groupSize) {
    const group = requestData.slice(i, i + groupSize);
    criarTabela(doc, group);
  }

  // Finalize o PDF e envie-o como resposta
  doc.end();
  res.status(200).send('PDF gerado com sucesso!');
});

function criarTabela(doc, group) {
  // Configuração da tabela
  const tableX = 50;
  const tableY = doc.y + 15;
  const col1Width = 300;
  const col2Width = 50;
  const col3Width = 50;
  const rowHeight = 20;
  const headerHeight = 25;

  // Cabeçalho da tabela
  doc
    .fontSize(12)
    .text('Perguntas', tableX, doc.y, { width: col1Width })
    .text('SIM', tableX + col1Width, doc.y, { width: col2Width })
    .text('NÃO', tableX + col1Width + col2Width, doc.y, { width: col3Width });

  doc.moveDown();

  // Linhas da tabela
  group.forEach((item, index) => {
    doc
      .fontSize(12)
      .text(item.PERGUNTA, tableX, doc.y, { width: col1Width, height: rowHeight })
      .text(item.SIM, tableX + col1Width, doc.y, { width: col2Width, height: rowHeight })
      .text(item.NÃO, tableX + col1Width + col2Width, doc.y, { width: col3Width, height: rowHeight });

    doc.moveDown();
  });

  // Mova a posição Y para a próxima seção
  doc.moveDown();
}

app.listen(port, () => {
  console.log(`API está rodando em http://localhost:${port}`);
});
