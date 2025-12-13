const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../../config/auth.json');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const Magistrado = require("../models/magistrado");
const Usuario = require("../models/usuario");
const { authenticateToken, requireUserType } = require('../middlewares/auth');

function generateToken(params = {}) {
	const token = jwt.sign(params, auth.secret, {
		expiresIn: 86400
	});
	return token;
}

// Middleware to verify token and extract user (DEPRECATED - use authenticateToken from middlewares/auth.js)
function authenticateTokenOld(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, auth.secret, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

router.post('/cria_usuario', async (req, res) => {
	const { nome, email, senha, tipo, oab, cnj } = req.body;

    // Validações
    if (!nome || !email || !senha) {
        return res.status(400).send({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Validação específica por tipo
    if (tipo === 'advogado' && !oab) {
        return res.status(400).send({ error: 'OAB é obrigatória para advogados' });
    }

    if (tipo === 'magistrado' && !cnj) {
        return res.status(400).send({ error: 'CNJ é obrigatório para magistrados' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(senha, 10);

    try {
		if (await Usuario.findOne({ email })) {
			return res.status(400).send({ error: 'E-mail já cadastrado!' });
		}

        const userData = {
            nome, 
            email, 
            senha: hashedPassword,
            tipo: tipo || 'comum'
        };

        // Adiciona campos específicos se fornecidos
        if (oab) userData.oab = oab;
        if (cnj) userData.cnj = cnj;
        
		const user = await Usuario.create(userData);
        
        const token = generateToken({ 
            id: user.id, 
            tipo: user.tipo,
            email: user.email
        });

		return res.send({ 
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
                oab: user.oab,
                cnj: user.cnj
            }, 
            token 
        });
	} catch (err) {
		console.log(err);
		return res.status(400).send({ error: 'Falha de registro!' });
	}
});

// rota para mostrar todos os usuários cadastrados
router.get('/mostrar_usuarios', async (req, res) => {
    try {
        console.log('/mostrar_usuarios');

        const users = await Usuario.find({});
        return res.send(users);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ error: 'Failed to fetch users' });
    }
});

// rota para fazer login
router.post('/entrar_usuario', async (req, res) => {
    const { email, senha } = req.body;

    // Check if email and password are provided
    if (!email || !senha) {
        return res.status(400).send({ error: 'Email and password are required' });
    }

    try {
        // Find the user by email and select the password field
        const user = await Usuario.findOne({ email }).select('+senha');

        if (!user) {
            return res.status(400).send({ error: 'User not found' });
        }

        // Se usuário tem googleId mas não tem senha, significa que só usa Google login
        if (user.googleId && !user.senha) {
            return res.status(400).send({ 
                error: 'Esta conta usa login do Google. Por favor, faça login com o Google.' 
            });
        }
        
        // Check if the password is correct
        const isPasswordValid = await bcrypt.compare(senha, user.senha);

        if (!isPasswordValid) {
            return res.status(400).send({ error: 'Invalid password' });
        }

        // Generate a token
        const token = generateToken({ 
            id: user.id,
            tipo: user.tipo,
            email: user.email
        });

        // Send the user and token as response
        res.send({ 
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
                oab: user.oab,
                cnj: user.cnj,
                foto: user.foto
            }, 
            token 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

router.post('/cria_magistrado', async(req, res) => {
    try{
        
        const{nome, idade} = req.body;

        const magistrado = await Magistrado.create(req.body);
        return res.send ("Magistrado criado!");
    }
    catch(err){
        console.log(err);
    }
});

// Busca magistrado na API externa e cria se não existir
router.post('/buscar_magistrado', async(req, res) => {
    try {
        const { texto } = req.body;

        if (!texto) {
            return res.status(400).send({ error: 'Campo texto é obrigatório' });
        }

        // Busca na API externa
        const response = await axios.post('https://www.tjsp.jus.br/AutoComplete/ListarMagistrados1Grau', {
            texto: texto
        });

        const magistrados = response.data;

        if (!magistrados || magistrados.length === 0) {
            return res.status(404).send({ error: 'Nenhum magistrado encontrado' });
        }

        return res.send(magistrados);
    } catch (err) {
        console.error('Erro ao buscar magistrado:', err);
        return res.status(500).send({ error: 'Erro ao buscar magistrado na API' });
    }
});

// Cria avaliação e magistrado (se não existir) - Apenas usuários autenticados
router.post('/avaliar_magistrado', authenticateToken, async(req, res) => {
    try {
        const { nomeMagistrado, idadeMagistrado, nota, comentario } = req.body;
        const usuarioId = req.user.id;

        // Validações
        if (!nomeMagistrado || !nota) {
            return res.status(400).send({ error: 'Nome do magistrado e nota são obrigatórios' });
        }

        if (nota < 1 || nota > 5) {
            return res.status(400).send({ error: 'Nota deve ser entre 1 e 5' });
        }

        // Verifica se magistrado existe
        let magistrado = await Magistrado.findOne({ nome: nomeMagistrado });

        // Se não existir, cria
        if (!magistrado) {
            magistrado = await Magistrado.create({
                nome: nomeMagistrado,
                idade: idadeMagistrado || 'Não informado',
                avaliacoes: []
            });
        }

        // Adiciona a avaliação
        const avaliacao = {
            usuario: usuarioId,
            nota: nota,
            comentario: comentario || ''
        };

        magistrado.avaliacoes.push(avaliacao);
        await magistrado.save();

        // Popular a referência do usuário para retornar os dados completos
        await magistrado.populate('avaliacoes.usuario', 'nome email');

        return res.send({ 
            message: 'Avaliação registrada com sucesso', 
            magistrado 
        });
    } catch (err) {
        console.error('Erro ao avaliar magistrado:', err);
        return res.status(500).send({ error: 'Erro ao registrar avaliação' });
    }
});

// Busca todas as avaliações de um magistrado
router.get('/avaliacoes_magistrado/:magistradoId', async(req, res) => {
    try {
        const { magistradoId } = req.params;

        const magistrado = await Magistrado.findById(magistradoId)
            .populate('avaliacoes.usuario', 'nome email');

        if (!magistrado) {
            return res.status(404).send({ error: 'Magistrado não encontrado' });
        }

        return res.send({
            magistrado: {
                id: magistrado._id,
                nome: magistrado.nome,
                idade: magistrado.idade
            },
            avaliacoes: magistrado.avaliacoes
        });
    } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
        return res.status(500).send({ error: 'Erro ao buscar avaliações' });
    }
});

// Ranking dos magistrados por média de avaliação
router.get('/ranking_magistrados', async (req, res) => {
    try {
        // Busca todos os magistrados
        const magistrados = await Magistrado.find({});

        // Calcula média e quantidade de avaliações para cada magistrado
        const ranking = magistrados.map(mag => {
            const total = mag.avaliacoes.length;
            const media = total > 0 ? (mag.avaliacoes.reduce((sum, a) => sum + a.nota, 0) / total) : 0;
            return {
                id: mag._id,
                nome: mag.nome,
                idade: mag.idade,
                media: Number(media.toFixed(2)),
                quantidade: total
            };
        });

        // Ordena do maior para o menor
        ranking.sort((a, b) => b.media - a.media || b.quantidade - a.quantidade);

        return res.send(ranking);
    } catch (err) {
        console.error('Erro ao gerar ranking:', err);
        return res.status(500).send({ error: 'Erro ao gerar ranking' });
    }
});

// ============ ROTAS ESPECÍFICAS POR TIPO DE USUÁRIO ============

// Rota protegida - apenas usuários autenticados
router.get('/perfil', authenticateToken, async (req, res) => {
    try {
        const user = await Usuario.findById(req.user.id).select('-senha');
        if (!user) {
            return res.status(404).send({ error: 'Usuário não encontrado' });
        }
        return res.send(user);
    } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        return res.status(500).send({ error: 'Erro ao buscar perfil' });
    }
});

// Rota para atualizar tipo de usuário (ex: comum -> advogado)
router.put('/atualizar_tipo', authenticateToken, async (req, res) => {
    try {
        const { tipo, oab, cnj } = req.body;
        const userId = req.user.id;

        if (!['comum', 'advogado', 'magistrado'].includes(tipo)) {
            return res.status(400).send({ error: 'Tipo inválido' });
        }

        if (tipo === 'advogado' && !oab) {
            return res.status(400).send({ error: 'OAB é obrigatória para advogados' });
        }

        if (tipo === 'magistrado' && !cnj) {
            return res.status(400).send({ error: 'CNJ é obrigatório para magistrados' });
        }

        const updateData = { tipo };
        if (oab) updateData.oab = oab;
        if (cnj) updateData.cnj = cnj;

        const user = await Usuario.findByIdAndUpdate(userId, updateData, { new: true }).select('-senha');

        // Gera novo token com tipo atualizado
        const token = generateToken({ 
            id: user.id,
            tipo: user.tipo,
            email: user.email
        });

        return res.send({ user, token });
    } catch (err) {
        console.error('Erro ao atualizar tipo:', err);
        return res.status(500).send({ error: 'Erro ao atualizar tipo de usuário' });
    }
});

// Rota para advogados verem seus clientes (exemplo de funcionalidade específica)
router.get('/advogado/clientes', authenticateToken, requireUserType('advogado'), async (req, res) => {
    try {
        // Aqui você pode implementar lógica específica para advogados
        // Por exemplo, listar clientes associados
        return res.send({ 
            message: 'Rota específica para advogados',
            oab: req.user.oab 
        });
    } catch (err) {
        console.error('Erro:', err);
        return res.status(500).send({ error: 'Erro ao buscar clientes' });
    }
});

// Rota para magistrados verem estatísticas (exemplo de funcionalidade específica)
router.get('/magistrado/estatisticas', authenticateToken, requireUserType('magistrado'), async (req, res) => {
    try {
        // Aqui você pode implementar lógica específica para magistrados
        // Por exemplo, estatísticas de processos
        return res.send({ 
            message: 'Rota específica para magistrados',
            cnj: req.user.cnj 
        });
    } catch (err) {
        console.error('Erro:', err);
        return res.status(500).send({ error: 'Erro ao buscar estatísticas' });
    }
});

// Rota para usuários comuns verem suas avaliações
router.get('/usuario/minhas_avaliacoes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Busca todos os magistrados e filtra as avaliações do usuário
        const magistrados = await Magistrado.find({ 'avaliacoes.usuario': userId })
            .populate('avaliacoes.usuario', 'nome email');

        const minhasAvaliacoes = magistrados.map(mag => {
            const avaliacaoUsuario = mag.avaliacoes.find(
                av => av.usuario._id.toString() === userId
            );
            return {
                magistrado: {
                    id: mag._id,
                    nome: mag.nome,
                    idade: mag.idade
                },
                avaliacao: avaliacaoUsuario
            };
        });

        return res.send(minhasAvaliacoes);
    } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
        return res.status(500).send({ error: 'Erro ao buscar avaliações' });
    }
});


/*
router.post('/post_produto_img', async(req, res) => {
    try{
        const{id, img} = req.body;

        const produto = await Produtos.findById(id);

        pusher = {
            imagem:img
        }
        await produto.imgs.push(pusher)
        await produto.save()

        return res.send(produto);
    }
    catch(err){
        console.log(err);
    }
});

router.get('/get_produtos', async (req, res)=>{
    try{
        const {page = 1} = req.query;

        return res.send(await Produtos.paginate({}, {page, limit:10}));
    }
    catch(err){

    }
});

router.post('/post_get_produtos_imgs', async (req, res)=>{
    try{
        const {id} = req.body;
        produto = await Produtos.findById(id);
        console.log( produto );

        const { imgs } = produto;


        return res.send({imgs});

    }
    catch(err){
        console.log(err);
    }
});


router.get('/get_produtos/:id', async (req, res)=>{
    try{
        
        return res.send(await Produtos.findById(req.params.id));
    }
    catch(err){

    }
});

router.post('/delete', async (req, res)=>{
    try{
        const { _id } = req.body
        await Produtos.findByIdAndRemove({_id})
        return res.send(await Produtos.findById({_id}));
    }
    catch(err){

    }
});
*/
module.exports = (app) => app.use('/server', router);