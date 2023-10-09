const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Importe a biblioteca axios
const dotenv = require('dotenv'); // Importe a biblioteca dotenv
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const Excel = require('excel4node');
const { execPath } = require('process');


const app = express();
const port = 3131;

// Middleware para analisar o corpo da solicitação como JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.post('/user', async (req, res) => {
  const { Name, Pass } = req.body;

  // Validações ...

  const user = await User.findOne({ Name: Name });

  if (!user) {
      return res.status(422).json({ "Mensagem": "Usuário não encontrado" });
  }

  const CheckPass = await bcrypt.compare(Pass, user.Pass);

  if (!CheckPass) {
      return res.status(422).json({ "Mensagem": "Senha inválida" });
  }

  try {
      const secret = process.env.SECRET;
      const token = jwt.sign({ id: user._id }, secret);

      const StatusClient = user.Status;
      const idClient = user._id;

      // Verifique se o arquivo sessions.json existe
      let sessionsData = [];
      try {
          const sessionsJson = fs.readFileSync('sessions.json');
          sessionsData = JSON.parse(sessionsJson);
      } catch (err) {
          // Se o arquivo não existir, não há necessidade de tratamento especial
      }

      // Encontre o índice do usuário no array de sessões, se existir
      const userIndex = sessionsData.findIndex(session => session.id === idClient);

      if (userIndex !== -1) {
          // Atualize apenas o token e datetime se o ID já existir
          sessionsData[userIndex].token = token;
          sessionsData[userIndex].datetime = moment().tz('America/Sao_Paulo').format();
      } else {
          // Crie uma nova entrada se o ID não existir
          sessionsData.push({
              id: idClient,
              token,
              datetime: moment().tz('America/Sao_Paulo').format(),
          });
      }

      // Salve os dados atualizados no arquivo sessions.json
      fs.writeFileSync('sessions.json', JSON.stringify(sessionsData, null, 2));

      res.status(200).json({ "Mensagem": "Usuário autenticado com sucesso", token, StatusClient, idClient });
  } catch (err) {
      console.log('Erro na autenticação', err);
  }
});


app.delete('/apagar-pergunta', (req, res) => {
  const { id, index } = req.body;

  if (!id || typeof index !== 'number') {
    return res.status(400).json({ error: 'ID e índice são obrigatórios.' });
  }

  const listFilePath = path.join(__dirname, 'database', id, 'list.json');

  // Verificar se o arquivo list.json existe
  if (!fs.existsSync(listFilePath)) {
    return res.status(404).json({ error: 'Arquivo list.json não encontrado para o ID especificado.' });
  }

  // Ler o conteúdo atual do arquivo list.json
  const listFileContent = fs.readFileSync(listFilePath, 'utf-8');
  try {
    const listData = JSON.parse(listFileContent);

    // Verificar se o índice está dentro dos limites do array
    if (index >= 0 && index < listData.length) {
      // Remover a pergunta do array
      listData.splice(index, 1);

      // Escrever o conteúdo atualizado de volta no arquivo
      fs.writeFileSync(listFilePath, JSON.stringify(listData, null, 2), 'utf-8');

      res.json({ message: 'Pergunta apagada com sucesso.' });
    } else {
      res.status(400).json({ error: 'Índice fora dos limites do array.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao analisar o arquivo list.json.' });
  }
});

app.put('/editar-pergunta', (req, res) => {
  const { id, index, pergunta, resposta } = req.body;

  if (!id || typeof index !== 'number' || !pergunta || !resposta) {
    return res.status(400).json({ error: 'ID, índice, pergunta e resposta são obrigatórios.' });
  }

  const listFilePath = path.join(__dirname, 'database', id, 'list.json');

  // Verificar se o arquivo list.json existe
  if (!fs.existsSync(listFilePath)) {
    return res.status(404).json({ error: 'Arquivo list.json não encontrado para o ID especificado.' });
  }

  // Ler o conteúdo atual do arquivo list.json
  const listFileContent = fs.readFileSync(listFilePath, 'utf-8');
  try {
    const listData = JSON.parse(listFileContent);

    // Verificar se o índice está dentro dos limites do array
    if (index >= 0 && index < listData.length) {
      // Atualizar a pergunta no array
      listData[index] = { PERGUNTA: pergunta, RESPOSTA: resposta };

      // Escrever o conteúdo atualizado de volta no arquivo
      fs.writeFileSync(listFilePath, JSON.stringify(listData, null, 2), 'utf-8');

      res.json({ message: 'Pergunta editada com sucesso.' });
    } else {
      res.status(400).json({ error: 'Índice fora dos limites do array.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao analisar o arquivo list.json.' });
  }
});


app.get('/dados-clientes', (req, res) => {
  const dataPath = path.join(__dirname, 'database', 'data.json');

  // Verificar se o arquivo data.json existe
  if (fs.existsSync(dataPath)) {
    const dataFile = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(dataFile);
    res.json(data);
  } else {
    res.status(404).json({ error: 'O arquivo de dados não foi encontrado.' });
  }
});


app.post('/criar-pasta', (req, res) => {
  const { nomeCliente, nicho } = req.body;

  console.log(nomeCliente)

  if (!nomeCliente || !nicho) {
    return res.status(400).send('O nome do cliente e o nicho são obrigatórios.');
  }

  // Gerar um ID de 15 caracteres
  const id = generateRandomId(15);

  const pastaPath = path.join(__dirname, 'database', id);

  // Verificar se a pasta já existe
  if (fs.existsSync(pastaPath)) {
    return res.status(409).send('A pasta já existe.');
  }

  // Criar a pasta
  fs.mkdirSync(pastaPath);

  // Crie um arquivo list.json com um array vazio dentro da pasta
  const arquivoList = path.join(pastaPath, 'list.json');
  fs.writeFileSync(arquivoList, '[]', 'utf-8');

  // Criar um objeto com os dados do cliente
  const clienteData = {
    id,
    nomeCliente,
    nicho,
  };

  // Ler o arquivo data.json se ele existir
  let data = [];
  const dataPath = path.join(__dirname, 'database', 'data.json');
  if (fs.existsSync(dataPath)) {
    const dataFile = fs.readFileSync(dataPath, 'utf-8');
    data = JSON.parse(dataFile);
  }

  // Adicionar os dados do cliente ao array
  data.push(clienteData);

  // Salvar os dados no arquivo data.json
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');

  res.status(201).json({ id });
});

// Função para gerar um ID aleatório de comprimento especificado
function generateRandomId(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return id;
}

app.post('/gerar-pdf', async (req, res) => {
  const requestData = req.body;
  const { id, idresponsavel, nome, telefone, data, num, cliente } = req.query; // Obtenha os parâmetros da consulta

  // Verifique se todos os parâmetros necessários estão presentes
  if (!id || !idresponsavel || !data || !num || !cliente) {
    return res.status(400).json({ error: 'Parâmetros incompletos na consulta.' });
  }

  // Caminho do arquivo Excel temporário
  const excelDir = `./public/excel/${idresponsavel}`;

  if (!fs.existsSync(excelDir)) {
    try {
      fs.mkdirSync(excelDir, { recursive: true });
    } catch (err) {
      console.error('Erro ao criar diretório:', err);
      res.status(500).send('Erro ao criar diretório');
      return;
    }
  }

  
  const excelFileName = `${id}-${data.replace(/\//g, '-')}.xlsx`;
  const dirExcelFinal = `${excelDir}/${excelFileName}`
  const excelPath = path.join(excelDir, excelFileName);

  // Configurar a planilha do Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Respostas');

  // Configurar cabeçalhos da planilha
  worksheet.getCell('A2').value = 'Nome:';
  worksheet.getCell('A3').value = 'Telefone:';
  worksheet.getCell('A4').value = 'Data:';
  worksheet.getCell('B2').value = nome;
  worksheet.getCell('B3').value = telefone;
  worksheet.getCell('B4').value = data;

  // Configurar cabeçalho da tabela de perguntas e respostas
  worksheet.getCell('A10').value = 'Perguntas';
  worksheet.getCell('B10').value = 'Respostas';

  // Preencher a tabela de perguntas e respostas com os dados do corpo da solicitação
  requestData.forEach((item, index) => {
    worksheet.getCell(`A${index + 11}`).value = item.PERGUNTA;
    worksheet.getCell(`B${index + 11}`).value = item.RESPOSTA;
  });

  // Salvar a planilha em um arquivo Excel
  await workbook.xlsx.writeFile(excelPath);

  console.log(dirExcelFinal)

  // Agora que o Excel foi gerado com sucesso, chame a função para converter em PDF
  convertXlsxToPdf(dirExcelFinal, idresponsavel, id, data, res);
});

async function convertXlsxToPdf(inputFilePath, idresponsavel, id, data, res) {
  const pdfDir = `./public/pdfs/${idresponsavel}`;

  if (!fs.existsSync(pdfDir)) {
    try {
      fs.mkdirSync(pdfDir, { recursive: true });
    } catch (err) {
      console.error('Erro ao criar diretório:', err);
      res.status(500).send('Erro ao criar diretório');
      return;
    }
  }

  const pdfFileName = `${id}-${data.replace(/\//g, '-')}.pdf`;
  const pdfPath = path.join(pdfDir, pdfFileName);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(inputFilePath);
  } catch (err) {
    console.error('Erro ao ler arquivo XLSX:', err);
    res.status(500).send('Erro ao ler arquivo XLSX');
    return;
  }

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);

  doc.pipe(stream);

  const margemEsquerda = 50;
  const margemSuperior = 50;
  const espacoEntreColunas = 20;

  workbook.eachSheet((worksheet) => {
    let currentX = margemEsquerda;
    const columnWidths = {}; // Armazenar as larguras de coluna calculadas

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const x = currentX;
        const y = margemSuperior + (rowNumber - 1) * 20;

        const cellValue = cell.value.toString();
        doc.text(cellValue, x, y);

        // Calcular a largura da coluna com base no comprimento do texto
        const cellWidth = doc.widthOfString(cellValue);
        if (!columnWidths[colNumber] || cellWidth > columnWidths[colNumber]) {
          columnWidths[colNumber] = cellWidth;
        }

        currentX += columnWidths[colNumber] + espacoEntreColunas;
      });

      currentX = margemEsquerda;
    });
  });

  // Definir as larguras das colunas no PDF
  for (let colNumber = 1; colNumber <= workbook.columnCount; colNumber++) {
    doc.widths[colNumber - 1] = columnWidths[colNumber] || 0;
  }

  doc.end();

  stream.on('finish', () => {
    res.status(200).send(`Arquivo PDF gerado com sucesso! Caminho do arquivo: ${pdfPath}`);
  });

  stream.on('error', (error) => {
    console.error('Erro ao gerar o PDF:', error);
    res.status(500).send('Erro ao gerar o PDF');
  });
}

app.listen(port, () => {
  console.log(`API está rodando em http://localhost:${port}`);
});