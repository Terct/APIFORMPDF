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
const { google } = require('googleapis');
const sheets = google.sheets('v4');
const cheerio = require('cheerio');

const app = express();
const port = 3131;

// Middleware para analisar o corpo da solicitação como JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/manager', (req, res) => {
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


app.post('/criar-pasta', async (req, res) => {
  const { nomeCliente, nicho, email } = req.body;

  console.log(nomeCliente);

  if (!nomeCliente || !nicho || !email) {
    return res.status(400).send('O nome do cliente e o nicho são obrigatórios.');
  }

  // Gerar um ID de 15 caracteres
  const id = generateRandomId(15);

  // Fazer uma requisição Axios para criar o usuário
  try {
    const response = await axios.post('http://localhost:41414/Creat/User', {
      Name: id,
      Pass: id,
      ConfirmPass: id,
      Email: email,
      Status: 'Ativo'
    });

    console.log('Resposta da requisição:', response.data);

    if (response.status === 201) {
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
    } else {
      res.status(500).send('Ocorreu um erro ao criar o usuário.');
    }
  } catch (error) {
    console.error('Erro ao fazer a requisição:', error);
    res.status(500).send('Ocorreu um erro ao criar o usuário.');
  }
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
  worksheet.getCell('B2').value = cliente;
  worksheet.getCell('B3').value = num;
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


app.delete('/apagar-client/:id', (req, res) => {
  const clientId = req.params.id;

  // Lógica para remover o cliente do arquivo JSON
  const dataFilePath = path.join(__dirname, 'database', 'data.json');
  let data = JSON.parse(fs.readFileSync(dataFilePath));

  const updatedData = data.filter(client => client.id !== clientId);

  fs.writeFileSync(dataFilePath, JSON.stringify(updatedData, null, 2));

  // Verificar e excluir diretórios associados ao cliente
  const pdfDirectoryPath = path.join(__dirname, 'public', 'pdfs', clientId);
  const excelDirectoryPath = path.join(__dirname, 'public', 'excel', clientId);
  const listDirectoryPath = path.join(__dirname, 'database', clientId);

  if (fs.existsSync(pdfDirectoryPath)) {
    fs.rmdirSync(pdfDirectoryPath, { recursive: true });
  }

  if (fs.existsSync(listDirectoryPath)) {
    fs.rmdirSync(listDirectoryPath, { recursive: true });
  }

  if (fs.existsSync(listDirectoryPath)) {
    fs.rmdirSync(listDirectoryPath, { recursive: true });
  }



  // Após a remoção das pastas, faça uma requisição DELETE com o Axios
  axios.delete(`http://localhost:41414/delete-client-user/${clientId}`)
    .then(response => {
      if (response.status === 200) {
        console.log('Tudo saiu ok!'); // Mensagem de sucesso
      } else {
        console.log('A solicitação não retornou o status 200.');
      }
    })
    .catch(error => {
      console.error('Ocorreu um erro ao fazer a solicitação DELETE:', error);
    });

  // Responda com sucesso (código 204) após a exclusão
  res.status(204).send();

});


app.post("/login-admin", (req, res) => {
  // Verifique o ID do usuário (substitua por sua própria lógica de autenticação).
  const nameCollect = req.body.nameCollect;
  const passCollect = req.body.passCollect;

  console.log(nameCollect, passCollect)

  // Fazer uma requisição axios para 'http://localhost:41414/user' com os dados do usuário.
  axios.post('http://localhost:41414/user-admin', {
    Name: nameCollect,
    Pass: passCollect
  })
    .then(axiosResponse => {
      // Você pode processar a resposta da outra rota aqui, se necessário.
      console.log(axiosResponse.data);

      // Retorne a resposta da requisição axios como resposta para a rota "/login".
      res.status(200).json(axiosResponse.data);
    })
    .catch(axiosError => {
      console.error(axiosError);

      // Se a autenticação falhar, retorne um status de erro.
      res.status(401).json({ Mensagem: "Falha na autenticação" });
    });
});

app.post("/validacao", (req, res) => {
  const idClient = req.body.idClient;
  const token = req.body.token;

  // Lê o arquivo sessions.json
  const sessionsFilePath = path.join(__dirname, "sessions.json");
  const sessions = JSON.parse(fs.readFileSync(sessionsFilePath, "utf8"));

  // Encontra a sessão correspondente pelo idClient
  const session = sessions.find((session) => session.id === idClient);

  if (!session) {
    //console.log("Não encontarda!")
    return res.status(401).json({ Mensagem: "Sessão não encontrada" });
  }

  if (session.token !== token) {
    //console.log("Não confere!")
    return res.status(401).json({ Mensagem: "Sessão expirada" });
  }

  const datetime = new Date(session.datetime);
  const currentDate = new Date();

  // Verifique se a sessão expirou (mais de 30 minutos da última atualização)
  if (currentDate - datetime > 30 * 60 * 1000) {
    //console.log("Expirada!")
    return res.status(401).json({ Mensagem: "Sessão expirada" });
  }

  // Sessão válida
  res.status(200).json({ Mensagem: "Sessão válida" });
});

const multer = require('multer');
const xlsx = require('xlsx');
// Configuração do multer para o upload de arquivos
const upload = multer({ dest: 'uploads/' }); // Defina o diretório onde os arquivos serão armazenados


app.post('/importar-planilha/:id', upload.single('file'), (req, res) => {
  const id = req.params.id;
  const file = req.file; // O arquivo enviado estará em req.file

  if (!file) {
    return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
  }

  // Leitura do arquivo XLSX
  const workbook = xlsx.readFile(file.path);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Obtém a primeira planilha

  // Transforme a planilha em um array de objetos JSON
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(data)

  // Validação dos dados
  const validData = data.filter(item => (
    item.PERGUNTA && (item.RESPOSTA === 'SIM/NÃO' || item.RESPOSTA === 'LIVRE')
  ));

  if (validData.length === 0) {
    return res.status(400).json({ message: "Dados inválidos. As perguntas devem estar na coluna 'Pergunta' e as respostas na coluna 'RESPOSTA'." });
  }

  // Caminho para o diretório com base no ID
  const directoryPath = path.join(__dirname, 'database', id);

  // Certifique-se de que o diretório exista, senão, crie-o
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
  }

  // Caminho para o arquivo JSON dentro do diretório
  const filePath = path.join(directoryPath, 'list.json');

  // Ler o arquivo JSON existente ou criar um novo se não existir
  let jsonData = [];
  if (fs.existsSync(filePath)) {
    jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Adicionar as respostas aos dados existentes
  jsonData = jsonData.concat(validData);

  // Escrever os dados de volta no arquivo JSON
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');

  return res.json({ message: "Respostas importadas com sucesso." });
});


app.post('/gerar-modelo', (req, res) => {
  const qtds = req.body.qtdItens;
  console.log(qtds)

  // Carregue o conteúdo do arquivo JSON
  const filePathElemnetorModel = './Models/elementorModel.json';
  const elemnetorModel = JSON.parse(fs.readFileSync(filePathElemnetorModel, 'utf8'));

  const filePathRes = './Models/resArray.json';
  const jsonDataRes = JSON.parse(fs.readFileSync(filePathRes, 'utf8'));

  const filePathPer = './Models/perArray.json';
  const jsonDataPer = JSON.parse(fs.readFileSync(filePathPer, 'utf8'));

  // Verifique se qtds é maior que 1
  if (qtds > 1) {
    const baseItemRes = jsonDataRes[0].elements[1]; // O modelo de item base
    const baseItemPer = jsonDataRes[0].elements[1]; // O modelo de item base

    // Adicione novos itens com base em qtds - 1
    for (let i = 2; i <= qtds; i++) {
      const newItemRes = JSON.parse(JSON.stringify(baseItemRes)); // Clone o item base
      const newItemPer = JSON.parse(JSON.stringify(baseItemPer)); // Clone o item base

      // Atualize _element_id e id
      newItemRes.settings._element_id = `res${i}`;
      newItemRes.id = `id${Math.floor(Math.random() * 100000)}`; // Você pode gerar IDs únicos como preferir
      // Atualize _element_id e id

      newItemPer.settings._element_id = `per${i}`;
      newItemPer.id = `id${Math.floor(Math.random() * 100000)}`; // Você pode gerar IDs únicos como preferir

      jsonDataRes[0].elements.push(newItemRes); // Adicione o novo item à matriz de elementos
      jsonDataPer[0].elements.push(newItemPer); // Adicione o novo item à matriz de elementos
    }

    elemnetorModel.content[2].elements[1].elements[0].elements = jsonDataPer[0].elements;
    elemnetorModel.content[2].elements[1].elements[1].elements = jsonDataRes[0].elements;
    elemnetorModel.title = `Modelo de Consulta com ${qtds} perguntas`

    // Retorne os dados atualizados ou faça o que desejar
    //console.log(jsonDataRes)

    res.json(elemnetorModel);
  }
});




app.listen(port, () => {
  console.log(`API está rodando em http://localhost:${port}`);
});