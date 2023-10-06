const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Importe a biblioteca axios
const dotenv = require('dotenv'); // Importe a biblioteca dotenv
const bodyParser = require('body-parser');

const app = express();
const port = 3131;

// Middleware para analisar o corpo da solicitação como JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/maneger', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'maneger.html'));
});

app.get('/list', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'maneger-list.html'));
});


app.get('/consult-list', (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'O parâmetro "id" é obrigatório.' });
  }

  const listFilePath = path.join(__dirname, 'database', id, 'list.json');

  // Verificar se o arquivo list.json existe
  if (!fs.existsSync(listFilePath)) {
    return res.status(404).json({ error: 'Arquivo list.json não encontrado para o ID especificado.' });
  }

  // Ler o arquivo list.json e enviar seu conteúdo como resposta
  const listFileContent = fs.readFileSync(listFilePath, 'utf-8');
  try {
    const listData = JSON.parse(listFileContent);
    res.json(listData);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao analisar o arquivo list.json.' });
  }
});

app.post('/adicionar-pergunta', (req, res) => {
  const { id, pergunta, resposta } = req.body;

  if (!id || !pergunta || !resposta) {
    return res.status(400).json({ error: 'ID, pergunta e resposta são obrigatórios.' });
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

    // Adicionar a nova pergunta ao array
    listData.push({ PERGUNTA: pergunta, RESPOSTA: resposta });

    // Escrever o conteúdo atualizado de volta no arquivo
    fs.writeFileSync(listFilePath, JSON.stringify(listData, null, 2), 'utf-8');

    res.json({ message: 'Pergunta adicionada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao analisar o arquivo list.json.' });
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
