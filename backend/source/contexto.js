const Sintomas = require("../model/Sintomas");

// FUNÇÃO para criar o prompt
async function criarPrompt(descricao) {
    // Carregar sintomas do banco de dados
    const sintomas = await Sintomas.find({}, { _id: 1, nome: 1, descricao: 1 }).lean();
    
    // Mapear sintomas para o formato necessário
    const sintomasMap = sintomas.map(s => ({
        id: s._id.toString(),
        nome: s.nome,
        descricao: s.descricao || ''
    }));

    // Construir o prompt
    const prompt = `
Você é um assistente médico especializado em extrair sintomas de descrições em português.
Abaixo está uma lista de sintomas registrados no sistema, cada um com ID, nome e descrição:

${sintomasMap.map(s => `ID: ${s.id}, Nome: ${s.nome}, Descrição: ${s.descricao}`).join('\n')}

Com base na seguinte descrição do paciente, identifique todos os sintomas mencionados que correspondam à lista acima.
Retorne APENAS um objeto JSON com a seguinte estrutura: {"sintomas": ["id1", "id2", ...]}
Onde "sintomas" é um array contendo os IDs dos sintomas identificados. Se nenhum sintoma for encontrado, retorne {"sintomas": []}.

Descrição do paciente: "${descricao}"

Resposta (objeto JSON):
`;

    return prompt;
}

// Exportar a função
module.exports = criarPrompt;