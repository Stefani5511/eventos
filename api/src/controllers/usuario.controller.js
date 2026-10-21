const prisma = require("../data/prisma");

const cadastrar = async (req, res) => {
    const data = req.body;

    const item = await prisma.usuario.create({
        data
    });

    res.json(item).status(201).end();
};

const listar = async (req, res) => {
    const lista = await prisma.usuario.findMany();

    res.json(lista).status(200).end();
};

const buscar = async (req, res) => {
    const { id } = req.params;
    
    const item = await prisma.usuario.findUnique({
        where: { id : Number(id) }
    });

    res.json(item).status(200).end();
};

const atualizar = async (req, res) => {
    const { id } = req.params;
    const dados = req.body;
    
    const item = await prisma.usuario.update({
        where: { id : Number(id) },
        data: dados
    });

    res.json(item).status(200).end();
};

const excluir = async (req, res) => {
    const { id } = req.params;
    
    const item = await prisma.usuario.delete({
        where: { id : Number(id) }
    });

    res.json(item).status(200).end();
};

const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: "Informe o e-mail e a senha."
            });
        }

        const usuario = await prisma.usuario.findFirst({
            where: { email: email }
        });

        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({
                erro: "E-mail ou senha inválidos."
            });
        }

        const { senha: _, ...dadosUsuario } = usuario;

        return res.status(200).json(dadosUsuario);
    } catch (erro) {
        return res.status(500).json({
            erro: "Erro ao realizar login."
        });
    }
};

module.exports = {
    cadastrar,
    listar,
    buscar,
    atualizar,
    excluir,
    login
}
