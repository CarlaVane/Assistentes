const Consultas = require('../model/Consultas');
const Pacientes = require('../model/Pacientes');
const Medicos = require('../model/Medicos');
const Recomendacoes = require('../model/Recomendacoes');
const ConsultasSintomas = require('../model/ConsultaSintomas');
const Sintomas = require("../model/Sintomas")
const Doencas = require("../model/Doencas");
const DoencasSintomas = require('../model/DoencasSintomas');
const Users = require('../model/Users');
const llm_conect = require('../utils/LLMApiCall');
const { ObjectId } = require('mongoose').Types;
// const tf = require('@tensorflow/tfjs-node');
// Regras principais:
// - paciente e medico são obrigatórios e devem existir
// - data_hora é obrigatória; uma vez criada, é imutável (model já define immutable)
// - quando resultado for referência para Doencas, o serviço deve permitir ObjectId ou texto

async function create(req, res, next) {
    try {
        const { medico } = req.body;
        const paciente = req.user.paciente._id
        // console.log("paciente :", req.user)

        // if (!paciente) return res.status(400).json({ data: null, message: 'paciente é obrigatório' });
        // if (!medico) return res.status(400).json({ data: null, message: 'medico é obrigatório' });
        // if (!data_hora) return res.status(400).json({ data: null, message: 'data_hora é obrigatória' }); 
        const data_hora = new Date();

        const p = await Pacientes.findById(paciente);
        if (!p) return res.status(400).json({ data: null, message: 'paciente não encontrado' });
        // const m = await Medicos.findById(medico);
        // if (!m) return res.status(400).json({ data: null, message: 'medico não encontrado' });

        // Validação das recomendacoes se fornecidas
        if (req.body.recomendacoes_medicos && req.body.recomendacoes_medicos.length) {
            const recCount = await Recomendacoes.countDocuments({ _id: { $in: req.body.recomendacoes_medicos } });
            if (recCount !== req.body.recomendacoes_medicos.length)
                return res.status(400).json({ data: null, message: 'algumas recomendacoes_medicos não existem' });
        }

        const consulta = new Consultas({ ...req.body, paciente: paciente, data_hora: data_hora });
        await consulta.save();
        return res.status(201).json({ data: consulta, message: 'Consulta criada com sucesso' });
    } catch (err) {
        next(err);
    }
}

async function list(req, res, next) {
    try {
        const list = await Consultas.find().populate('paciente medico recomendacoes_medicos').lean();
        return res.status(200).json({ data: list, message: 'Lista de consultas obtida com sucesso' });
    } catch (err) {
        next(err);
    }
}

async function get(req, res, next) {
    try {
        const { id } = req.params;
        const item = await Consultas.findById(id).populate('paciente medico recomendacoes_medicos').lean();
        if (!item) return res.status(404).json({ data: null, message: 'Consulta não encontrada' });
        return res.status(200).json({ data: item, message: 'Consulta obtida com sucesso' });
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const { id } = req.params;
        // não permitir alteração da data_hora (model define immutable, mas bloqueamos por segurança)
        if (req.body.data_hora) return res.status(400).json({ data: null, message: 'data_hora é imutável' });

        const updates = req.body;
        if (updates.paciente) {
            const p = await Pacientes.findById(updates.paciente);
            if (!p) return res.status(400).json({ data: null, message: 'paciente não encontrado' });
        }
        if (updates.medico) {
            const m = await Medicos.findById(updates.medico);
            if (!m) return res.status(400).json({ data: null, message: 'medico não encontrado' });
        }

        const consulta = await Consultas.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!consulta) return res.status(404).json({ data: null, message: 'Consulta não encontrada' });
        return res.status(200).json({ data: consulta, message: 'Consulta atualizada com sucesso' });
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        const { id } = req.params;
        const removed = await Consultas.findByIdAndDelete(id);
        if (!removed) return res.status(404).json({ data: null, message: 'Consulta não encontrada' });
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
}

async function approve(req, res, auth, next) {
    try {
        const { id } = req.params;
        const consulta = await Consultas.findById(id);
        if (!consulta) return res.status(404).json({ data: null, message: 'Consulta não encontrada' })
        
        const body = req.body || {};

        const doencaId = body.resultado || body.doenca;
        if (doencaId) {
            if (!ObjectId.isValid(doencaId)) {
                return res.status(400).json({ data: null, message: 'doenca inválida' });
            }
            const d = await Doencas.findById(doencaId).select('_id').lean();
            if (!d) {
                return res.status(400).json({ data: null, message: 'doenca não encontrada' });
            }
            consulta.doenca = d._id;
        }

        if (Array.isArray(body.recomendacoes_medicos)) {
            const recIds = body.recomendacoes_medicos
                .filter((id) => ObjectId.isValid(id))
                .map((id) => new ObjectId(id));
            const recCount = await Recomendacoes.countDocuments({ _id: { $in: recIds } });
            if (recCount !== recIds.length) {
                return res.status(400).json({ data: null, message: 'algumas recomendacoes_medicos não existem' });
            }
            consulta.recomendacoes_medicos = recIds;
        }

        const livresAtuais = Array.isArray(consulta.recomendacoes_livres) ? consulta.recomendacoes_livres : [];
        // Agregar campos livres: notas, diagnostico_final e arrays explícitos
        if (typeof body.notas === 'string' && body.notas.trim()) {
            livresAtuais.push(body.notas.trim());
        }
        if (typeof body.diagnostico_final === 'string' && body.diagnostico_final.trim()) {
            livresAtuais.push(body.diagnostico_final.trim());
        }
        if (Array.isArray(body.recomendacoes_livres)) {
            const extras = body.recomendacoes_livres
                .filter((x) => typeof x === 'string')
                .map((x) => x.trim())
                .filter((x) => x.length > 0);
            livresAtuais.push(...extras);
        }
        if (Array.isArray(body.recomendacoesLivres)) {
            const extras = body.recomendacoesLivres
                .filter((x) => typeof x === 'string')
                .map((x) => x.trim())
                .filter((x) => x.length > 0);
            livresAtuais.push(...extras);
        }
        // Remover duplicados preservando ordem
        consulta.recomendacoes_livres = Array.from(new Set(livresAtuais));

        consulta.status = 'aprovada';
        consulta.medico = req.user?.medico?._id || req.user?.id;
        await consulta.save();
        return res.status(200).json({ data: consulta, message: 'Consulta aprovada com sucesso' });
    } catch (err) {
        next(err);
    }
}
async function cancel(req, res, next) {
    try {
        const { id } = req.params;
        const consulta = await Consultas.findById(id);
        if (!consulta) return res.status(404).json({ data: null, message: 'Consulta não encontrada' })
        consulta.status = 'cancelada';
        await consulta.save();
        return res.status(200).json({ data: consulta, message: 'Consulta cancelada com sucesso' });
    } catch (err) {
        next(err);
    }
}
async function markAsDone(req, res, next) {
    try {
        const { id } = req.params;
        const consulta = await Consultas.findById(id);
        if (!consulta) return res.status(404).json({ data: null, message: 'Consulta não encontrada' })
        consulta.status = 'realizada';
        await consulta.save();
        return res.status(200).json({ data: consulta, message: 'Consulta marcada como realizada com sucesso' });
    } catch (err) {
        next(err);
    }
}

// calcular a doença mais provável com base nos sintomas fornecidos
async function diagnose(req, res, next) {
    try {
        // implementar lógica de diagnóstico aqui
        const sintomas = await Sintomas.find().select("nome").lean()
        const doencas = await Doencas.find().select("nome").lean()
        // ---------------------------------------
        // 1) Preparar dados de treinamento
        // ---------------------------------------
        const sintomaIndex = {};
        sintomas.find().forEach((s, i) => sintomaIndex[s._id] = i);
        // ---------------------------------------
        // ---------------------------------------
        // 2) Construir matrizes X e y
        // ---------------------------------------
        const X = [];
        const y = [];
        for (const d of doencas) {
            // busca todos sintomas daquela doença
            const rels = await DoencasSintomas.find({ doenca: d._id });

            // linha binária
            const linha = Array(sintomas.length).fill(0);
            for (const r of rels) {
                const idx = sintomaIndex[r.sintoma];
                linha[idx] = 1;
            }

            X.push(linha);
            y.push(doencas.findIndex(x => x._id === d._id));
        }


        const Xtensor = tf.tensor2d(X);
        const ytensor = tf.tensor1d(y, 'int32');

        // ---------------------------------------
        // 3) Criar modelo (multiclasse)
        // ---------------------------------------
        const model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [sintomas.length], units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: doencas.length, activation: 'softmax' }));

        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'sparseCategoricalCrossentropy',
            metrics: ['accuracy'],
        });

        // ---------------------------------------
        // 4) Treinar
        // ---------------------------------------
        console.log("A treinar...");
        await model.fit(Xtensor, ytensor, {
            epochs: 30,
            batchSize: 4,
            verbose: 1
        });

        // Guardar modelo
        await model.save("file://./modelo-doencas");

        // ---------------------------------------
        // 5) Função de previsão
        // ---------------------------------------
        async function preverDoenca(idsSintomasSelecionados) {
            const linha = Array(sintomas.length).fill(0);

            for (const id of idsSintomasSelecionados) {
                const idx = sintomaIndex[id];
                if (idx !== undefined) linha[idx] = 1;
            }

            const entrada = tf.tensor2d([linha]);
            const pred = model.predict(entrada);
            const probs = await pred.data();

            const maxIdx = probs.indexOf(Math.max(...probs));
            return {
                doencaPrevista: doencas[maxIdx].nome,
                probabilidades: doencas.map((d, i) => ({ d: d.nome, p: probs[i] }))
            };
        }
        // ---------------------------------------
        // 6) Exemplo real de previsão
        // ---------------------------------------

        // EXEMPLO:
        // sintomas: febre, tosse
        const febreId = sintomas.find(s => s.nome === "febre")._id;
        const tosseId = sintomas.find(s => s.nome === "tosse")._id;

        // const resultado = await preverDoenca([febreId, tosseId]);
        console.log(resultado);

        return res.status(200).json({ message: 'Diagnóstico realizado com sucesso', data: resultado });
    } catch (err) {
        next(err);
    }
}

async function getValidatedReports(req, res, next) {
    try {
        let filter = {}
        if (req.query.status)
            filter = { status: { $in: req.query.status.split(",") } }

        // Buscar consultas com status 'realizada' (validadas/aprovadas)
        const consultas = await Consultas.find(filter).populate('paciente', 'nome')
            .populate('medico', 'user')
            .lean();
        // Formatar os dados conforme esperado pelo frontend
        const validatedReports = await Promise.all(
            consultas.map(async (consulta) => {
                // Buscar sintomas associados à consulta
                const consultaSintomas = await ConsultasSintomas.find({
                    consulta: consulta._id
                }).populate('sintoma', 'nome').lean();

                const symptoms = consultaSintomas.map(cs => cs.sintoma.nome);

                // Buscar nome do médico
                let medicoName = 'Médico';
                if (consulta.medico && consulta.medico.user) {
                    const medicoUser = await require('../model/Users').findById(consulta.medico.user).select('nome').lean();
                    if (medicoUser) {
                        medicoName = medicoUser.nome;
                    }
                }

                return {
                    id: consulta._id.toString(),
                    patientName: consulta.paciente?.nome || 'Paciente Desconhecido',
                    patientNumber: `MED-${consulta._id.toString().slice(10)}`,
                    date: consulta.data_hora.toISOString().split('T')[0],
                    symptoms: symptoms.length > 0 ? symptoms : ['Nenhum sintoma registrado'],
                    status: consulta.status,
                    validatedBy: medicoName,
                };
            })
        );


        return res.status(200).json({
            data: validatedReports,
            message: 'Relatórios validados obtidos com sucesso'
        });
    } catch (err) {
        next(err);
    }
}

async function getConsultaDetails(req, res, next) {
    try {
        let filter = { _id: req.params.id }
        if (req.query.status)
            filter = { status: { $in: req.query.status.split(",") } }


        // Buscar consultas com status 'realizada' (validadas/aprovadas)
        const consultas = await Consultas.find(filter).populate('paciente', 'nome altura peso data_nascimento documento')
            .populate('medico', 'user')
            .lean();

        const qtd = await Consultas.countDocuments({ paciente: consultas[0].paciente._id });

        // Formatar os dados conforme esperado pelo frontend
        const validatedReports = await Promise.all(
            consultas.map(async (consulta) => {
                // Buscar sintomas associados à consulta
                const consultaSintomas = await ConsultasSintomas.find({
                    consulta: consulta._id
                }).populate('sintoma', 'nome').lean();

                const symptoms = consultaSintomas.map(cs => cs.sintoma.nome);

                // Buscar nome do médico
                let medicoName = 'Médico';
                if (consulta.medico && consulta.medico.user) {
                    const medicoUser = await require('../model/Users').findById(consulta.medico.user).select('nome').lean();
                    if (medicoUser) {
                        medicoName = medicoUser.nome;
                    }
                }

                return {
                    id: consulta._id.toString(),
                    patientName: consulta.paciente?.nome || 'Paciente Desconhecido',
                    height: consulta.paciente.altura,
                    quantidade_consultas: qtd,
                    weight: consulta.paciente.peso,
                    data_consulta: consulta.data_hora,
                    data_nascimento: consulta.paciente.data_nascimento,
                    documento: consulta.paciente.documento,
                    patientNumber: `MED-${consulta._id.toString().slice(10)}`,
                    date: consulta.data_hora.toISOString().split('T')[0],
                    symptoms: symptoms.length > 0 ? symptoms : ['Nenhum sintoma registrado'],
                    status: consulta.status,
                    validatedBy: medicoName,
                };
            })
        );


        return res.status(200).json({
            data: validatedReports[0],
            message: 'Relatórios validados obtidos com sucesso'
        });
    } catch (err) {
        next(err);
    }
}

async function getPendingConsultas(req, res, next) {
  try {
    /* =====================================================
     * 1️⃣ Buscar consultas pendentes (LIMITADO)
     * ===================================================== */
    const consultas = await Consultas.find({ status: 'preliminar' })
      .limit(10)
      .populate('paciente', 'nome documento')
      .lean();

    if (!consultas.length) {
      return res.status(200).json({
        data: [],
        message: 'Nenhuma consulta pendente encontrada'
      });
    }

    /* =====================================================
     * 2️⃣ Coletar TODOS os sintomas usados nas consultas
     * ===================================================== */
    const allSymptomIds = new Set();

    consultas.forEach(c => {
      (c.sintomas || []).forEach(id => {
        if (ObjectId.isValid(id)) {
          allSymptomIds.add(id.toString());
        }
      });
    });

    const symptomObjectIds = [...allSymptomIds].map(id => new ObjectId(id));

    /* =====================================================
     * 3️⃣ Buscar nomes dos sintomas (UMA VEZ)
     * ===================================================== */
    const sintomasDocs = symptomObjectIds.length
      ? await Sintomas.find({ _id: { $in: symptomObjectIds } })
          .select('nome')
          .lean()
      : [];

    const sintomasMap = {};
    sintomasDocs.forEach(s => {
      sintomasMap[s._id.toString()] = s.nome;
    });

    /* =====================================================
     * 4️⃣ Buscar TODAS as doenças (UMA VEZ)
     * ===================================================== */
    const doencas = await Doencas.find()
      .select('nome sintomas')
      .lean();

    /* =====================================================
     * 5️⃣ Pré-processar doenças (converter sintomas)
     * ===================================================== */
    const doencasProcessadas = doencas.map(d => {
      const sintomasIds = (d.sintomas || [])
        .filter(id => ObjectId.isValid(id))
        .map(id => id.toString());

      return {
        _id: d._id,
        nome: d.nome,
        sintomasIds,
        sintomasNomes: sintomasIds.map(id => sintomasMap[id]).filter(Boolean)
      };
    });

    /* =====================================================
     * 6️⃣ Processar consultas (SEM QUERIES)
     * ===================================================== */
    const pending = consultas.map(consulta => {
      const sintomasConsultaIds = (consulta.sintomas || [])
        .filter(id => ObjectId.isValid(id))
        .map(id => id.toString());

      const sintomasConsultaNomes = sintomasConsultaIds
        .map(id => sintomasMap[id])
        .filter(Boolean);

      const diagnosticos = doencasProcessadas
        .map(d => {
          const comuns = d.sintomasIds.filter(id =>
            sintomasConsultaIds.includes(id)
          );

          if (!comuns.length) return null;

          const porcentagem = Math.round(
            (comuns.length / d.sintomasIds.length) * 100
          );

          return {
            doenca: d.nome,
            porcentagem,
            sintomasDoenca: d.sintomasNomes,
            sintomasConsulta: sintomasConsultaNomes,
            sintomasComuns: comuns.map(id => sintomasMap[id]),
            sintomasFaltantes: d.sintomasNomes.filter(
              n => !comuns.map(id => sintomasMap[id]).includes(n)
            )
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.porcentagem - a.porcentagem)
        .slice(0, 10);

      return {
        id: consulta._id.toString(),
        patientName: consulta.paciente?.nome || '',
        patientBI: consulta.paciente?.documento || '',
        symptoms: sintomasConsultaNomes,
        symptomIds: sintomasConsultaIds,
        descricao: consulta.descricao_sintomas || undefined,
        submittedDate: consulta.data_hora.toISOString().split('T')[0],
        status: consulta.status,
        diagnosticos
      };
    });

    /* =====================================================
     * 7️⃣ Resposta final
     * ===================================================== */
    return res.status(200).json({
      data: pending,
      message: 'Consultas pendentes obtidas com sucesso'
    });

  } catch (err) {
    next(err);
  }
}



async function make_consulta(req, res, next) {
    try {
        let { bodySintomas = [], descricao } = req.body;

        // =====================================================
        // 1️⃣ Garantir array
        // =====================================================
        if (!Array.isArray(bodySintomas)) {
            bodySintomas = [];
        }

        // =====================================================
        // 2️⃣ NLP: extrair NOMES dos sintomas da descrição
        // =====================================================
        if (descricao && typeof descricao === "string") {

            // Ex: ["Febre", "Dor de cabeça"]
            const sintomasExtraidos = await llm_conect(descricao);

            if (Array.isArray(sintomasExtraidos) && sintomasExtraidos.length > 0) {

                // 🔥 CONVERSÃO REAL: NOME → ID
                const sintomasDb = await Sintomas.find({
                    nome: { $in: sintomasExtraidos }
                }).select("_id");

                // Unir sintomas vindos do front + NLP (sem duplicar)
                bodySintomas = Array.from(
                    new Set([
                        ...bodySintomas.map(String),
                        ...sintomasDb.map(s => s._id.toString())
                    ])
                );
            }
        }

        // =====================================================
        // 3️⃣ Validação FINAL (depois do NLP)
        // =====================================================
        if (!Array.isArray(bodySintomas) || bodySintomas.length === 0) {
            return res.status(400).json({
                message: "Não foi possível identificar sintomas a partir da descrição."
            });
        }

        // =====================================================
        // 4️⃣ Converter para ObjectId
        // =====================================================
        const sintomasConsultaIds = bodySintomas.map(id => new ObjectId(id));

        // =====================================================
        // 5️⃣ Agregação para cálculo das doenças
        // =====================================================
        const calculus = await Doencas.aggregate([
            {
                $addFields: {
                    sintomasConvertidos: {
                        $map: {
                            input: "$sintomas",
                            as: "s",
                            in: {
                                $cond: [
                                    { $eq: [{ $type: "$$s" }, "string"] },
                                    { $toObjectId: "$$s" },
                                    "$$s"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    sintomasComunsIds: {
                        $setIntersection: ["$sintomasConvertidos", sintomasConsultaIds]
                    }
                }
            },
            {
                $addFields: {
                    compatibilidade: {
                        $cond: {
                            if: { $gt: [{ $size: "$sintomasConvertidos" }, 0] },
                            then: {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $size: "$sintomasComunsIds" },
                                            { $size: "$sintomasConvertidos" }
                                        ]
                                    },
                                    100
                                ]
                            },
                            else: 0
                        }
                    }
                }
            },

            { $match: { compatibilidade: { $gt: 0 } } },

            // Nomes dos sintomas da doença
            {
                $lookup: {
                    from: "sintomas",
                    let: { sintomasIds: "$sintomasConvertidos" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$sintomasIds"] } } },
                        { $project: { _id: 0, nome: 1 } }
                    ],
                    as: "sintomasDoenca"
                }
            },

            // Nomes dos sintomas comuns
            {
                $lookup: {
                    from: "sintomas",
                    let: { sintomasComunsIds: "$sintomasComunsIds" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$sintomasComunsIds"] } } },
                        { $project: { _id: 0, nome: 1 } }
                    ],
                    as: "sintomasComuns"
                }
            },

            // Nomes dos sintomas da consulta
            {
                $lookup: {
                    from: "sintomas",
                    pipeline: [
                        { $match: { _id: { $in: sintomasConsultaIds } } },
                        { $project: { _id: 0, nome: 1 } }
                    ],
                    as: "sintomasConsulta"
                }
            },

            {
                $project: {
                    _id: 1,
                    doenca: "$nome",
                    porcentagem: "$compatibilidade",
                    sintomasDoenca: "$sintomasDoenca.nome",
                    sintomasConsulta: "$sintomasConsulta.nome",
                    sintomasComuns: "$sintomasComuns.nome",
                    sintomasFaltantes: {
                        $setDifference: ["$sintomasDoenca.nome", "$sintomasComuns.nome"]
                    }
                }
            },

            { $sort: { porcentagem: -1 } },
            { $limit: 15 }
        ]);

        // =====================================================
        // 6️⃣ Resposta
        // =====================================================
        return res.status(200).json({
            message: "Cálculo feito com sucesso!",
            data: calculus,
            metadata: {
                sintomasPesquisados: bodySintomas.length,
                doencasEncontradas: calculus.length
            }
        });

    } catch (err) {
        console.error("Erro em make_consulta:", err);
        next(err);
    }
}

module.exports = { create, list, get, update, remove, approve, cancel, markAsDone, diagnose, getValidatedReports, getConsultaDetails, getPendingConsultas, make_consulta };
