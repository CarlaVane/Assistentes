const Doencas = require('../model/Doencas');
const Sintomas = require('../model/Sintomas');
const DoencasRecomendacoes = require('../model/DoencasRecomendacoes');

async function create(req, res, next) {
    try {
        if (!req.body.nome) return res.status(400).json({ message: 'nome é obrigatório' });
        const d = new Doencas(req.body);
        await d.save();
        return res.status(201).json({ data: d, message: 'Doença Registra com sucesso' });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const all = await Doencas.find().lean().populate("");
        return res.status(200).json({ data: all, message: 'Lista de doenças obtida com sucesso' });
    } catch (err) { next(err); }
}

async function get(req, res, next) {
    try {
        const doencaId = req.params.id;

        // 1. Buscar a doença
        const doenca = await Doencas.findById(doencaId).lean();
        if (!doenca) {
            return res.status(404).json({
                data: null,
                message: 'Doença não encontrada'
            });
        }

        // 2. Buscar recomendações relacionadas
        const relacoesRecomendacoes = await DoencasRecomendacoes.find(
            { doenca: doencaId },
            { recomendacao: 1, _id: 0 }
        ).populate('recomendacao').lean();

        // 3. Extrair recomendações
        const recomendacoes = relacoesRecomendacoes.map(rel => rel.recomendacao);

        // 4. Buscar sintomas com nomes (opcional)
        const sintomasDetalhados = await Sintomas.find(
            { _id: { $in: doenca.sintomas } },
            { _id: 1, nome: 1 }
        ).lean();

        // 5. Montar resposta
        const resposta = {
            ...doenca,
            sintomasDetalhados: sintomasDetalhados,
            recomendacoes: recomendacoes,
            totalRecomendacoes: recomendacoes.length
        };

        return res.status(200).json({
            data: resposta,
            message: 'Doença obtida com sucesso'
        });

    } catch (err) {
        console.error("Erro ao buscar doença:", err);

        if (err.name === 'CastError') {
            return res.status(400).json({
                data: null,
                message: 'ID da doença é inválido'
            });
        }

        next(err);
    }
}

async function update(req, res, next) {
    try {
        const updated = await Doencas.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ data: null, message: 'Doença não encontrada' });
        return res.status(200).json({ data: updated, message: 'Doença atualizada com sucesso' });
    } catch (err) { next(err); }
}

async function remove(req, res, next) {
    try {
        const removed = await Doencas.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ data: null, message: 'Doença não encontrada' });
        return res.status(204).send();
    } catch (err) { next(err); }
}


module.exports = { create, list, get, update, remove };
