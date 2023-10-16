const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Importe a biblioteca axios
const dotenv = require('dotenv'); // Importe a biblioteca dotenv
const bodyParser = require('body-parser');

const app = express();
const port = 4141;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('client'));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.post("/login", (req, res) => {
  // Verifique o ID do usuário (substitua por sua própria lógica de autenticação).
  const id = req.body.id;

  // Fazer uma requisição axios para 'http://localhost:41414/user' com os dados do usuário.
  axios.post('http://localhost:41414/user', {
    Name: id,
    Pass: id
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


// Rota que faz uma requisição usando o Axios com um parâmetro de ID
app.get("/fetch-clients/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Fazer uma solicitação usando o Axios para a outra API com o ID
    const response = await axios.get(`http://localhost:41414/clients/${id}`);

    // Retornar a resposta da outra API como resposta para esta rota
    //console.log(response.data)
    res.json(response.data);
    
  } catch (error) {
    console.error("Erro ao fazer a solicitação:", error);
    res.status(500).json({ mensagem: "Erro ao buscar clientes" });
  }
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


app.get("/baixar-pdf", (req, res) => {
  const id = req.query.id;
  const responsavel = req.query.responsavel;
  const data = req.query.data;

  // Construa o caminho do arquivo PDF
  const filePath = `./public/pdfs/${responsavel}/${id}-${data}.pdf`;

  // Envie o arquivo PDF como resposta
  res.sendFile(path.join(__dirname, filePath));
});

app.get("/baixar-excel", (req, res) => {
  const id = req.query.id;
  const responsavel = req.query.responsavel;
  const data = req.query.data;
  
  // Construa o caminho do arquivo PDF
  const filePath = `./public/excel/${responsavel}/${id}-${data}.xlsx`;

  // Envie o arquivo PDF como resposta
  res.sendFile(path.join(__dirname, filePath));
});


app.listen(port, () => {
  console.log(`API está rodando em http://localhost:${port}`);
});