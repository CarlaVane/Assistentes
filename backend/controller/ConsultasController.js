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
    console.log("🟢 getPendingConsultas - Iniciando busca de consultas pendentes");

    /* =====================================================
     * 1️⃣ Buscar consultas pendentes (LIMITADO)
     * ===================================================== */
    const consultasList = await Consultas.find({ status: 'preliminar' })
      .limit(10)
      .populate('paciente', 'nome documento')
      .lean();

    console.log(`📊 Consultas pendentes encontradas: ${consultasList.length}`);

    if (!consultasList.length) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Nenhuma consulta pendente encontrada'
      });
    }

    /* =====================================================
     * 2️⃣ Coletar TODOS os sintomas usados nas consultas
     * ===================================================== */
    const allSymptomIds = new Set();

    consultasList.forEach(c => {
      (c.sintomas || []).forEach(id => {
        if (ObjectId.isValid(id)) {
          allSymptomIds.add(id.toString());
        }
      });
    });

    console.log(`🔍 Sintomas únicos encontrados: ${allSymptomIds.size}`);

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
     * 4️⃣ Buscar TODAS as doenças (UMA VEZ) com IDs REAIS
     * ===================================================== */
    const doencas = await Doencas.find()
      .select('nome sintomas _id')
      .lean();

    console.log(`📚 Doenças no sistema: ${doencas.length}`);

    /* =====================================================
     * 5️⃣ Pré-processar doenças (converter sintomas)
     * ===================================================== */
    const doencasProcessadas = doencas.map(d => {
      const sintomasIds = (d.sintomas || [])
        .filter(id => ObjectId.isValid(id))
        .map(id => id.toString());

      return {
        _id: d._id.toString(), // ID REAL da doença
        nome: d.nome,
        sintomasIds,
        sintomasNomes: sintomasIds.map(id => sintomasMap[id]).filter(Boolean)
      };
    });

    /* =====================================================
     * 6️⃣ Processar consultas (SEM QUERIES)
     * ===================================================== */
    const pending = consultasList.map(consulta => {
      const sintomasConsultaIds = (consulta.sintomas || [])
        .filter(id => ObjectId.isValid(id))
        .map(id => id.toString());

      const sintomasConsultaNomes = sintomasConsultaIds
        .map(id => sintomasMap[id])
        .filter(Boolean);

      // Calcular diagnósticos possíveis
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
            _id: d._id, // ← ID REAL da doença
            doencaId: d._id, // ← Campo adicional para clareza
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
        descricao: consulta.descricao_sintomas || consulta.resultado || undefined,
        submittedDate: consulta.data_hora ? consulta.data_hora.toISOString().split('T')[0] : 'Data não disponível',
        status: consulta.status,
        diagnosticos: diagnosticos || []
      };
    });

    /* =====================================================
     * 7️⃣ Resposta final
     * ===================================================== */
    console.log("✅ getPendingConsultas - Processamento concluído");
    
    return res.status(200).json({
      success: true,
      data: pending,
      message: 'Consultas pendentes obtidas com sucesso'
    });

  } catch (err) {
    console.error("❌ Erro em getPendingConsultas:", err);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Erro interno ao buscar consultas pendentes',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

async function make_consulta(req, res, next) {
    try {
        console.log("🔍 === make_consulta INICIADO ===");
        
        // IMPORTAR OS MODELS NECESSÁRIOS
        const Pacientes = require('../model/Pacientes');
        const Consultas = require('../model/Consultas');
        const ConsultasSintomas = require('../model/ConsultaSintomas');
        const Doencas = require('../model/Doencas');
        const llm_conect = require('../utils/LLMApiCall');
        const { ObjectId } = require('mongoose').Types;

        // 1. VERIFICAÇÃO DE AUTENTICAÇÃO E PACIENTE
        console.log("🔄 Verificando autenticação...");
        
        if (!req.user || !req.user.id) {
            console.log("❌ req.user não disponível");
            return res.status(401).json({
                message: "Usuário não autenticado"
            });
        }

        console.log("👤 Usuário autenticado:", {
            id: req.user.id,
            tipo: req.user.tipo,
            email: req.user.email,
            nome: req.user.nome
        });

        // 2. BUSCAR PACIENTE ASSOCIADO AO USUÁRIO
        console.log("🔄 Buscando paciente para user ID:", req.user.id);
        const paciente = await Pacientes.findOne({ user: req.user.id }).lean();
        
        if (!paciente) {
            console.log("❌ Nenhum paciente encontrado para user:", req.user.id);
            return res.status(403).json({
                message: "Usuário não associado a um paciente. Apenas pacientes podem criar consultas."
            });
        }

        const pacienteId = paciente._id;
        console.log("✅ Paciente encontrado:", {
            id: pacienteId,
            nome: paciente.nome,
            documento: paciente.documento
        });

        // 3. OBTER DADOS DO BODY
        let { bodySintomas, descricao } = req.body;
        
        console.log("📦 Dados recebidos:", {
            bodySintomas: bodySintomas,
            descricao: descricao,
            tipoBodySintomas: typeof bodySintomas,
            éArray: Array.isArray(bodySintomas)
        });

        // 4. VALIDAR E PROCESSAR bodySintomas
        if (!bodySintomas || !Array.isArray(bodySintomas)) {
            console.log("⚠️ bodySintomas não é array, convertendo para array vazio");
            bodySintomas = [];
        }

        console.log("✅ bodySintomas após validação:", bodySintomas);

        // 5. PROCESSAR DESCRIÇÃO COM OPENAI (SE HOUVER)
        if (descricao && descricao.trim().length > 0) {
            console.log("🤖 Processando descrição com OpenAI...");
            console.log("📝 Descrição:", descricao);
            
            try {
                const sintomasOpenAI = await llm_conect(descricao);
                console.log("🤖 Sintomas retornados pela OpenAI:", sintomasOpenAI);
                
                // Combinar sintomas existentes com os da OpenAI
                bodySintomas = [...bodySintomas, ...sintomasOpenAI];
                console.log("🤖 Sintomas combinados:", bodySintomas);
            } catch (openaiError) {
                console.error("❌ Erro na OpenAI:", openaiError.message);
                // Continua sem os sintomas da OpenAI
            }
        }

        console.log("🔍 Sintomas finais para processamento:", bodySintomas);

        // 6. VALIDAR SE HÁ SINTOMAS PARA PROCESSAR
        if (bodySintomas.length === 0) {
            console.log("⚠️ Nenhum sintoma identificado para processamento");
            
            // Mesmo sem sintomas, criamos a consulta para o médico analisar
            console.log("📋 Criando consulta básica...");
            const novaConsulta = new Consultas({
                paciente: pacienteId,
                data_hora: new Date(),
                status: 'preliminar', // ← CORREÇÃO: usar 'preliminar'
                resultado: descricao || "Sem descrição fornecida",
                notas: "Consulta criada sem sintomas identificados - análise manual necessária"
            });

            await novaConsulta.save();
            
            return res.status(200).json({
                message: "Consulta registrada. Descreva seus sintomas com mais detalhes para uma análise mais precisa.",
                data: [],
                consultaId: novaConsulta._id,
                metadata: {
                    sintomasPesquisados: 0,
                    doencasEncontradas: 0,
                    consultaCriada: true,
                    status: 'preliminar'
                }
            });
        }

        // 7. CONVERTER IDs PARA ObjectId E FILTRAR INVÁLIDOS
        console.log("🔄 Convertendo IDs para ObjectId...");
        const sintomasConsultaIds = bodySintomas.map(id => {
            try {
                return new ObjectId(id);
            } catch (error) {
                console.warn(`⚠️ ID inválido ignorado: ${id}`, error.message);
                return null;
            }
        }).filter(id => id !== null);

        console.log("✅ IDs válidos após conversão:", sintomasConsultaIds.length);
        console.log("📋 IDs:", sintomasConsultaIds);

        if (sintomasConsultaIds.length === 0) {
            console.log("⚠️ Nenhum ID de sintoma válido após conversão");
            
            // Criar consulta mesmo sem sintomas válidos
            const novaConsulta = new Consultas({
                paciente: pacienteId,
                data_hora: new Date(),
                status: 'preliminar', // ← CORREÇÃO
                resultado: descricao || "Sem descrição",
                notas: "Sintomas fornecidos não correspondem a sintomas válidos no sistema"
            });

            await novaConsulta.save();
            
            return res.status(200).json({
                message: "Consulta registrada. Os sintomas fornecidos não correspondem ao sistema.",
                data: [],
                consultaId: novaConsulta._id,
                metadata: {
                    sintomasPesquisados: bodySintomas.length,
                    sintomasValidos: 0,
                    doencasEncontradas: 0,
                    consultaCriada: true,
                    status: 'preliminar'
                }
            });
        }

        // 8. CRIAR CONSULTA NO BANCO DE DADOS
        console.log("📋 Criando consulta no banco...");
        const novaConsulta = new Consultas({
            paciente: pacienteId,
            data_hora: new Date(),
            status: 'preliminar', // ← CORREÇÃO
            resultado: descricao || "Consulta via auto-diagnóstico",
            notas: `Consulta com ${sintomasConsultaIds.length} sintomas identificados`
        });

        await novaConsulta.save();
        console.log("✅ Consulta criada com ID:", novaConsulta._id);

        // 9. ASSOCIAR SINTOMAS À CONSULTA
        console.log("🔗 Associando sintomas à consulta...");
        const associacoes = sintomasConsultaIds.map(sintomaId => ({
            consulta: novaConsulta._id,
            sintoma: sintomaId
        }));

        await ConsultasSintomas.insertMany(associacoes);
        console.log("✅", associacoes.length, "sintomas associados à consulta");

        // 10. CALCULAR DIAGNÓSTICO (AGREGAÇÃO)
        console.log("🧮 Calculando diagnóstico...");
        const calculus = await Doencas.aggregate([
            // 1. Converter sintomas para ObjectId se necessário
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
            
            // 2. Calcular sintomas comuns
            {
                $addFields: {
                    sintomasComunsIds: {
                        $setIntersection: ["$sintomasConvertidos", sintomasConsultaIds]
                    }
                }
            },
            
            // 3. Calcular porcentagem de compatibilidade
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

            // 4. Filtrar doenças com alguma compatibilidade
            { $match: { compatibilidade: { $gt: 0 } } },

            // 5. Buscar NOMES dos sintomas da doença
            {
                $lookup: {
                    from: "sintomas",
                    let: { sintomasIds: "$sintomasConvertidos" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$sintomasIds"] } } },
                        { $project: { _id: 0, nome: 1 } }
                    ],
                    as: "sintomasDoencaNomes"
                }
            },
            {
                $addFields: {
                    sintomasDoencaNomes: {
                        $map: {
                            input: "$sintomasDoencaNomes",
                            as: "s",
                            in: "$$s.nome"
                        }
                    }
                }
            },

            // 6. Buscar NOMES dos sintomas comuns
            {
                $lookup: {
                    from: "sintomas",
                    let: { sintomasComunsIds: "$sintomasComunsIds" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$sintomasComunsIds"] } } },
                        { $project: { _id: 0, nome: 1 } }
                    ],
                    as: "sintomasComunsNomes"
                }
            },
            {
                $addFields: {
                    sintomasComunsNomes: {
                        $map: {
                            input: "$sintomasComunsNomes",
                            as: "s",
                            in: "$$s.nome"
                        }
                    }
                }
            },

            // 7. Buscar NOMES dos sintomas da consulta
            {
                $lookup: {
                    from: "sintomas",
                    pipeline: [
                        { $match: { _id: { $in: sintomasConsultaIds } } },
                        { $project: { _id: 0, nome: 1 } }
                    ],
                    as: "sintomasConsultaNomes"
                }
            },
            {
                $addFields: {
                    sintomasConsultaNomes: {
                        $map: {
                            input: "$sintomasConsultaNomes",
                            as: "s",
                            in: "$$s.nome"
                        }
                    }
                }
            },

            // 8. Projetar resultado final
            {
                $project: {
                    _id: 1,
                    doenca: "$nome",
                    porcentagem: "$compatibilidade",
                    sintomasDoenca: "$sintomasDoencaNomes",
                    sintomasConsulta: "$sintomasConsultaNomes",
                    sintomasComuns: "$sintomasComunsNomes",
                    sintomasFaltantes: {
                        $setDifference: ["$sintomasDoencaNomes", "$sintomasComunsNomes"]
                    }
                }
            },

            // 9. Ordenar por compatibilidade e limitar
            { $sort: { porcentagem: -1 } },
            { $limit: 15 }
        ]);

        console.log("✅ Diagnóstico calculado. Doenças encontradas:", calculus.length);

        // 11. ATUALIZAR CONSULTA COM RESULTADOS DO DIAGNÓSTICO
        if (calculus.length > 0) {
            const resultadoDiagnostico = calculus.map(d => ({
                doenca: d.doenca,
                porcentagem: d.porcentagem,
                sintomasComuns: d.sintomasComuns,
                sintomasFaltantes: d.sintomasFaltantes
            }));
            
            await Consultas.findByIdAndUpdate(novaConsulta._id, {
                $set: {
                    'diagnostico_auto': resultadoDiagnostico,
                    'notas': `Análise automática: ${calculus.length} doenças possíveis identificadas. Compatibilidade de ${calculus[0]?.porcentagem?.toFixed(1) || 0}% com ${calculus[0]?.doenca || 'nenhuma doença'}`
                }
            });
            console.log("📊 Diagnóstico salvo na consulta");
        }

        // 12. PREPARAR RESPOSTA FINAL
        console.log("🎉 Processo completo concluído com sucesso!");
        
        return res.status(200).json({
            message: "Consulta criada com sucesso! Diagnóstico preliminar gerado. Aguarde validação médica.",
            data: calculus,
            consultaId: novaConsulta._id,
            metadata: {
                sintomasRecebidos: bodySintomas.length,
                sintomasValidos: sintomasConsultaIds.length,
                doencasEncontradas: calculus.length,
                consultaCriada: true,
                status: 'preliminar',
                pacienteId: pacienteId.toString(),
                pacienteNome: paciente.nome,
                timestamp: new Date().toISOString()
            }
        });

    } catch (err) {
        console.error("❌ ERRO CRÍTICO em make_consulta:", err);
        console.error("❌ Stack trace:", err.stack);
        
        // Tentar fornecer uma mensagem de erro útil
        let errorMessage = "Erro ao processar consulta";
        if (err.name === 'MongoError') {
            errorMessage = "Erro no banco de dados";
        } else if (err.name === 'ValidationError') {
            errorMessage = "Erro de validação: " + err.message;
        } else if (err.name === 'TypeError') {
            errorMessage = "Erro de tipo de dados";
        }
        
        return res.status(500).json({
            message: `${errorMessage}: ${err.message}`,
            data: null,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}


async function validateDiagnosis(req, res, next) {
    try {
        const { id } = req.params;
        const { 
            doenca, 
            recomendacoes_medicos = [],
            notas,
            diagnostico_final,
            recomendacoes_livres = []
        } = req.body;

        console.log('🔍 Validando diagnóstico para consulta:', id);
        console.log('📋 Dados recebidos:', req.body);

        // Validar campos obrigatórios
        if (!doenca) {
            return res.status(400).json({ 
                success: false,
                message: 'O campo "doenca" é obrigatório' 
            });
        }

        // Buscar a consulta
        const consulta = await Consultas.findById(id);
        if (!consulta) {
            return res.status(404).json({ 
                success: false,
                message: 'Consulta não encontrada' 
            });
        }

        // Validar se a doença existe
        if (!ObjectId.isValid(doenca)) {
            return res.status(400).json({ 
                success: false,
                message: 'ID da doença é inválido' 
            });
        }

        const doencaDoc = await Doencas.findById(doenca);
        if (!doencaDoc) {
            return res.status(404).json({ 
                success: false,
                message: 'Doença não encontrada' 
            });
        }

        // Validar recomendações (se houver)
        if (recomendacoes_medicos.length > 0) {
            const recomendacoesValidas = await Recomendacoes.find({
                _id: { $in: recomendacoes_medicos }
            }).select('_id').lean();

            if (recomendacoesValidas.length !== recomendacoes_medicos.length) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Algumas recomendações não foram encontradas' 
                });
            }
        }

        // Preparar dados para a função approve
        const dadosApprove = {
            doenca: doenca,
            recomendacoes_medicos: recomendacoes_medicos,
            notas: notas,
            diagnostico_final: diagnostico_final || `Diagnóstico: ${doencaDoc.nome}`,
            recomendacoes_livres: recomendacoes_livres
        };

        console.log('📦 Chamando função approve com dados:', dadosApprove);

        // Criar um objeto request falso para passar para a função approve
        const fakeReq = {
            params: { id },
            body: dadosApprove,
            user: req.user
        };

        const fakeRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                return res.status(this.statusCode || 200).json(data);
            }
        };

        // Chamar a função approve existente
        await module.exports.approve(fakeReq, fakeRes, next);

    } catch (err) {
        console.error('❌ Erro ao validar diagnóstico:', err);
        
        // Se já respondeu, não responder novamente
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao validar diagnóstico',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
    }

async function getConsultaForPaciente(req, res, next) {
    try {
        const { id } = req.params;
        const pacienteId = req.user.paciente?._id || req.user.paciente;
        
        console.log('🔍 Buscando consulta para paciente:', {
            consultaId: id,
            pacienteId: pacienteId,
            userId: req.user.id
        });

        if (!pacienteId) {
            return res.status(403).json({ 
                success: false,
                message: 'Acesso restrito a pacientes' 
            });
        }

        // PRIMEIRO: Tentar buscar sem populate nas recomendações
        let consulta;
        try {
            consulta = await Consultas.findOne({
                _id: id,
                paciente: pacienteId
            })
            .populate('paciente', 'nome documento data_nascimento altura peso')
            .populate('medico', 'user')
            .populate('doenca', 'nome descricao')
            .lean();
        } catch (populateErr) {
            console.warn('⚠️ Erro no populate, tentando sem populate...', populateErr.message);
            
            // Tentar sem populate
            consulta = await Consultas.findOne({
                _id: id,
                paciente: pacienteId
            }).lean();
        }

        if (!consulta) {
            return res.status(404).json({ 
                success: false,
                message: 'Consulta não encontrada ou você não tem permissão para acessá-la' 
            });
        }

        // Buscar sintomas associados à consulta
        let symptoms = [];
        try {
            const consultaSintomas = await ConsultasSintomas.find({
                consulta: consulta._id
            }).populate('sintoma', 'nome').lean();

            symptoms = consultaSintomas.map(cs => cs.sintoma?.nome).filter(Boolean);
        } catch (sintomasErr) {
            console.warn('⚠️ Erro ao buscar sintomas:', sintomasErr.message);
        }

        // Buscar nome do médico
        let medicoInfo = null;
        if (consulta.medico) {
            try {
                let medicoUserId;
                
                // Se medico já é um objeto populado
                if (consulta.medico.user) {
                    medicoUserId = consulta.medico.user;
                } 
                // Se medico é apenas um ID
                else if (typeof consulta.medico === 'string' || consulta.medico._id) {
                    const medicoDoc = await Medicos.findById(consulta.medico).select('user').lean();
                    if (medicoDoc) {
                        medicoUserId = medicoDoc.user;
                    }
                }
                
                if (medicoUserId) {
                    const medicoUser = await Users.findById(medicoUserId).select('nome email').lean();
                    if (medicoUser) {
                        medicoInfo = {
                            nome: medicoUser.nome,
                            email: medicoUser.email
                        };
                    }
                }
            } catch (medicoErr) {
                console.warn('⚠️ Erro ao buscar médico:', medicoErr.message);
            }
        }

        // Buscar recomendações médicas (se IDs existirem)
        let recomendacoesMedicas = [];
        if (consulta.recomendacoes_medicos && consulta.recomendacoes_medicos.length > 0) {
            try {
                // Tentar buscar as recomendações
                const Recomendacoes = require('../model/Recomendacoes');
                const recomendacoesDocs = await Recomendacoes.find({
                    _id: { $in: consulta.recomendacoes_medicos }
                }).select('descricao').lean();
                
                recomendacoesMedicas = recomendacoesDocs.map(r => r.descricao);
            } catch (recomendacaoErr) {
                console.warn('⚠️ Erro ao buscar recomendações médicas:', recomendacaoErr.message);
                // Usar IDs como fallback
                recomendacoesMedicas = consulta.recomendacoes_medicos.map(id => 
                    `Recomendação ID: ${id.toString().slice(-6)}`
                );
            }
        }

        // Formatar dados para o paciente
        const consultaFormatada = {
            id: consulta._id.toString(),
            // Informações básicas
            paciente: consulta.paciente ? {
                nome: consulta.paciente.nome || 'Paciente',
                documento: consulta.paciente.documento || '',
                dataNascimento: consulta.paciente.data_nascimento || null,
                altura: consulta.paciente.altura || null,
                peso: consulta.paciente.peso || null
            } : { nome: 'Paciente' },
            medico: medicoInfo,
            // Datas
            dataHora: consulta.data_hora,
            dataCriacao: consulta.createdAt,
            dataAtualizacao: consulta.updatedAt,
            // Sintomas
            symptoms: symptoms.length > 0 ? symptoms : ['Nenhum sintoma registrado'],
            // Diagnóstico e resultados
            status: consulta.status,
            doenca: consulta.doenca ? {
                nome: consulta.doenca.nome,
                descricao: consulta.doenca.descricao
            } : null,
            resultado: consulta.resultado,
            diagnostico: consulta.diagnostico_final || consulta.notas || consulta.resultado,
            // Recomendações
            recomendacoes_medicos: recomendacoesMedicas,
            recomendacoes_livres: consulta.recomendacoes_livres || [],
            // Notas adicionais
            notas: consulta.notas,
            // Auto-diagnóstico (se disponível)
            diagnostico_auto: consulta.diagnostico_auto
        };

        // Filtrar campos nulos/vazios
        Object.keys(consultaFormatada).forEach(key => {
            const value = consultaFormatada[key];
            if (value === null || value === undefined || 
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date))) {
                delete consultaFormatada[key];
            }
        });

        console.log('✅ Consulta formatada para paciente:', {
            id: consultaFormatada.id,
            status: consultaFormatada.status,
            hasDiagnostico: !!consultaFormatada.diagnostico,
            hasRecomendacoes: (consultaFormatada.recomendacoes_medicos?.length || 0) + (consultaFormatada.recomendacoes_livres?.length || 0) > 0
        });

        return res.status(200).json({
            success: true,
            data: consultaFormatada,
            message: 'Consulta obtida com sucesso'
        });

    } catch (err) {
        console.error('❌ Erro em getConsultaForPaciente:', err);
        
        // Se for o erro específico do modelo Recomendacao
        if (err.message && err.message.includes('Recomendacao')) {
            console.log('🔧 Tentando abordagem alternativa...');
            
            try {
                // Buscar apenas dados básicos
                const { id } = req.params;
                const pacienteId = req.user.paciente?._id;
                
                const consultaBasica = await Consultas.findOne({
                    _id: id,
                    paciente: pacienteId
                })
                .select('status diagnostico_final notas resultado recomendacoes_livres data_hora')
                .lean();
                
                if (!consultaBasica) {
                    return res.status(404).json({ 
                        success: false,
                        message: 'Consulta não encontrada' 
                    });
                }
                
                const response = {
                    id: id,
                    status: consultaBasica.status,
                    diagnostico: consultaBasica.diagnostico_final || consultaBasica.notas || consultaBasica.resultado,
                    recomendacoes_livres: consultaBasica.recomendacoes_livres || [],
                    dataHora: consultaBasica.data_hora
                };
                
                return res.status(200).json({
                    success: true,
                    data: response,
                    message: 'Consulta obtida com sucesso'
                });
                
            } catch (simpleErr) {
                console.error('❌ Erro na abordagem simplificada:', simpleErr);
            }
        }
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar consulta',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}
module.exports = { create, list, get, update, remove, approve, cancel, markAsDone, diagnose, getValidatedReports, getConsultaDetails, getPendingConsultas, make_consulta, validateDiagnosis, getConsultaForPaciente };
