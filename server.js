const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv'); // Importe a biblioteca dotenv
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');


const app = express()

app.use(express.json())

// Carregue as variáveis de ambiente do arquivo .env
dotenv.config();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ limit: '5000mb', extended: true }));


const User = require('./Models/Users')
const Admin = require('./Models/Admin')

app.get('/', async (req, res) =>{
    return res.status(200).json({"Mensagem":"Conectado"})
})

//ClientsInfo

app.get('/user/:id', async(req, res) =>{
const id = req.params.id

const user = await User.findById(id, '-Pass')

    if(!user) {
        return res.status(402).json({ msg: 'Usuário não encontrado!' })
    }


    res.status(200).json({ user })

})


//ClientsInfo

app.get('/client/:id', async(req, res) =>{
    const id = req.params.id
    
    const user = await Client.findById(id, '-Pass')
    
        if(!user) {
            return res.status(402).json({ msg: 'Usuário não encontrado!' })
        }
    
    
        res.status(200).json({ user })
    
    })
    


//ClientsInfo

app.put('/user/edit/:id', async(req, res) =>{
  
  try {

    const id = req.params.id
    const { Status } = req.body
    const Edit = {Status}

    const user = await User.findById(id, '-Pass')

    if(!user) {

        return res.status(402).json({ msg: 'Usuário não encontrado!' })
    
    }else {

        const user = await User.updateOne({ Status })
        res.status(200).json({ user, "Menssagem":"Alterado com sucesso" })

    }  


    
} catch (error) {
    res.status(400).json({error})
}

})


//CreatUsers


app.post('/Creat/User', async(req, res) =>{

    const { Name, Pass, ConfirmPass, Email, Status } = req.body

//Validações 

if(!Name){
    return res.status(422).json({"Mensagem":"O usuário é obrigatório"})
}
if(!Pass){
    return res.status(422).json({"Mensagem":"A senha é obrigatoria"})
}
if(ConfirmPass !== Pass){
    return res.status(422).json({"Mensagem":"As senhas não conferem"})
}
if(!Email){
    return res.status(422).json({"Mensagem":"O email é obrigatoria"})
}
if(!Status){
    return res.status(422).json({"Mensagem":"O status é obrigatoria"})
}

//ChechEmail 

const UserEmailExists = await User.findOne({ Email: Email })

if (UserEmailExists){
    return res.status(422).json({"Mensagem":"Email já cadastrado!"})
}

//Criando pass

const salt  = await bcrypt.genSalt(12)
const PassHash = await bcrypt.hash(Pass, salt)

// CriandoUser

const user = new User({
    Name,
    Email,
    Pass: PassHash,
    Status,

})

try {
    await user.save()
    res.status(201).json({"Mensagem":"Usuário cadastrado com sucesso"})

} catch (error) {
    console.log(error)

    res
        .status(500)
        .json({
            "Mensagem":"Erro ao se comunicar com o servidor"
        })

}


})


//Auth

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

        // Verifique se o ID do usuário já existe nas sessões usando um loop for
        let sessionExists = false;
        for (let i = 0; i < sessionsData.length; i++) {
            if (sessionsData[i].id == idClient) {
                // Atualize apenas o token e datetime se o ID já existir
                sessionsData[i].token = token;
                sessionsData[i].datetime = moment().tz('America/Sao_Paulo').format();
                sessionExists = true;
                break;
            }
        }

        if (!sessionExists) {
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


//auth admin



app.post('/user-admin', async (req, res) => {
    const { Name, Pass } = req.body;

    // Validações ...

    const user = await Admin.findOne({ Name: Name });

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

        // Verifique se o ID do usuário já existe nas sessões usando um loop for
        let sessionExists = false;
        for (let i = 0; i < sessionsData.length; i++) {
            if (sessionsData[i].id == idClient) {
                // Atualize apenas o token e datetime se o ID já existir
                sessionsData[i].token = token;
                sessionsData[i].datetime = moment().tz('America/Sao_Paulo').format();
                sessionExists = true;
                break;
            }
        }

        if (!sessionExists) {
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


// Defina o modelo Client no mesmo arquivo
const Client = mongoose.model('Client', new mongoose.Schema({
    Responsavel: String,
    // Outros campos do cliente aqui
  }));

// Rota para buscar todos os clientes com base no valor da variável "Responsavel"
app.get('/clients/:Responsavel', async (req, res) => {
    try {
      const Responsavel = req.params.Responsavel;
  
      // Consulta MongoDB para encontrar todos os clientes com o valor de "Responsavel"
      const clients = await Client.find({ Responsavel });
  
      if (clients.length === 0) {
        return res.status(404).json({ "Mensagem": "Nenhum cliente encontrado com o Responsavel especificado" });
      }
  
      res.status(200).json({ clients });
    } catch (error) {
      console.error('Erro ao buscar clientes', error);
      res.status(500).json({ "Mensagem": "Erro ao buscar clientes" });
    }
  });
  

  app.delete('/delete-client-user/:id', async (req, res) => {
    try {
      const id = req.params.id;
  
      // Exclua todos os documentos da coleção "clients" com "Responsavel" igual ao ID
      await Client.deleteMany({ Responsavel: id });
  
      // Exclua todos os documentos da coleção "users" com "Name" igual ao ID
      await User.deleteMany({ Name: id });
  
      res.status(200).json({ "Mensagem": "Documentos excluídos com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir documentos', error);
      res.status(500).json({ "Mensagem": "Erro ao excluir documentos" });
    }
  });



  
  app.post('/Creat/User-Admin', async(req, res) =>{

    const { Name, Pass, ConfirmPass, Email, Status } = req.body

//Validações 

if(!Name){
    return res.status(422).json({"Mensagem":"O usuário é obrigatório"})
}
if(!Pass){
    return res.status(422).json({"Mensagem":"A senha é obrigatoria"})
}
if(ConfirmPass !== Pass){
    return res.status(422).json({"Mensagem":"As senhas não conferem"})
}
if(!Email){
    return res.status(422).json({"Mensagem":"O email é obrigatoria"})
}
if(!Status){
    return res.status(422).json({"Mensagem":"O status é obrigatoria"})
}

//ChechEmail 

const UserEmailExists = await Admin.findOne({ Email: Email })

if (UserEmailExists){
    return res.status(422).json({"Mensagem":"Email já cadastrado!"})
}

//Criando pass

const salt  = await bcrypt.genSalt(12)
const PassHash = await bcrypt.hash(Pass, salt)

// CriandoUser

const user = new Admin({
    Name,
    Email,
    Pass: PassHash,
    Status,

})

try {
    await user.save()
    res.status(201).json({"Mensagem":"Usuário cadastrado com sucesso"})

} catch (error) {
    console.log(error)

    res
        .status(500)
        .json({
            "Mensagem":"Erro ao se comunicar com o servidor"
        })

}


})

const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS
const dbName = process.env.DB_NAME

const dbURI = `mongodb+srv://${dbUser}:${dbPass}@mydatabase.x1wihtt.mongodb.net/${dbName}?retryWrites=true&w=majority`;

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conexão com o MongoDB estabelecida');
    app.listen(31313)
    console.log('Server Runing')

  })
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB', err);
  });


