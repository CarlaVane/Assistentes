const Sintomas = require('../model/Sintomas');
const Doencas = require('../model/Doencas');
const SintomaRecomendacoes = require('../model/SintomaRecomendacoes');

async function create(req, res, next) {
    try {
        if (!req.body.nome) return res.status(400).json({ message: 'nome é obrigatório' });
        const s = new Sintomas(req.body);
        await s.save();
        return res.status(201).json({ data: s, message: "Sintoma criado com sucesso" });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        // Paginação: ?page=1&limit=20&q=buscar&sort=nome
        let { page = 1, limit = 20, q, sort } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 20;
        if (page < 1) page = 1;
        // limitar máximo de itens por página para evitar abusos
        const MAX_LIMIT = 200;
        if (limit < 1) limit = 1;
        if (limit > MAX_LIMIT) limit = MAX_LIMIT;

        const filter = {};
        if (q && String(q).trim() !== '') {
            filter.nome = { $regex: String(q).trim(), $options: 'i' };
        }

        const total = await Sintomas.countDocuments(filter);
        const pages = Math.max(1, Math.ceil(total / limit));
        const skip = (page - 1) * limit;

        const sortOption = sort || 'nome';
        const items = await Sintomas.find(filter).sort(sortOption).skip(skip).limit(limit).lean();

        return res.status(200).json({
            data: items,
            meta: {
                total,
                page,
                pages,
                perPage: limit
            },
            message: "Lista de sintomas obtida com sucesso"
        });
    } catch (err) { next(err); }
}

async function get(req, res, next) {
    try {
        const sintomaId = req.params.id;

        // 1. Buscar o sintoma
        const sintoma = await Sintomas.findById(sintomaId).lean();
        if (!sintoma) {
            return res.status(404).json({
                data: null,
                message: 'Sintoma não encontrado'
            });
        }

        // 2. Buscar recomendações relacionadas ao sintoma
        const relacoesRecomendacoes = await SintomaRecomendacoes.find(
            { sintoma: sintomaId },
            { recomendacao: 1, _id: 0 }
        ).populate('recomendacao').lean();

        // 3. Extrair recomendações
        const recomendacoes = relacoesRecomendacoes.map(rel => rel.recomendacao);

        // 4. (Opcional) Buscar doenças relacionadas
        const doencasRelacionadas = await Doencas.find(
            { sintomas: sintomaId.toString() }, // Ajuste conforme o tipo dos IDs
            { _id: 1, nome: 1 }
        ).lean();

        // 5. Montar resposta
        const resposta = {
            ...sintoma,
            recomendacoes: recomendacoes,
            totalRecomendacoes: recomendacoes.length,
            doencasRelacionadas: doencasRelacionadas,
            totalDoencas: doencasRelacionadas.length
        };

        return res.status(200).json({
            data: resposta,
            message: 'Sintoma obtido com sucesso'
        });

    } catch (err) {
        console.error("Erro ao buscar sintoma:", err);

        if (err.name === 'CastError') {
            return res.status(400).json({
                data: null,
                message: 'ID do sintoma é inválido'
            });
        }

        next(err);
    }
}

async function update(req, res, next) {
    try {
        const updated = await Sintomas.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ data: null, message: 'Sintoma não encontrado' });
        return res.status(200).json({ data: updated, message: "Sintoma atualizado com sucesso" });
    } catch (err) { next(err); }
}

async function remove(req, res, next) {
    try {
        const removed = await Sintomas.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ data: null, message: 'Sintoma não encontrado' });
        return res.status(204).send();
    } catch (err) { next(err); }
}

module.exports = { create, list, get, update, remove };
