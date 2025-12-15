
const openai = require('openai');
require("dotenv").config()

// Criar cliente com configuração para DeepSeek
const client = new openai.OpenAI({
    apiKey: process.env.DEEP_SEEK_KEY,
    baseURL: 'https://api.deepseek.com'  // Endpoint da DeepSeek
});

// Importar função para criar prompt
const criarPrompt = require("../source/contexto");

async function llm_conect(descricao) {
    try {
        // Gerar o prompt
        const promptTexto = await criarPrompt(descricao);
        
        const completion = await client.chat.completions.create({
            model: 'deepseek-chat', // Modelo da DeepSeek
            messages: [{ 
                role: 'user', 
                content: promptTexto 
            }],
            temperature: 0.1,
            max_tokens: 500,
            // Remova o extra_body se não for suportado pela DeepSeek
            // Algumas APIs personalizadas não suportam todos os parâmetros extras
            // extra_body: { "thinking": { "type": "enabled" } },
            response_format: { type: "json_object" },
        });
        
        const respostaTexto = completion.choices[0].message.content;

        let sintomasIdsExtraidos = [];
        try {
            const respostaParsed = JSON.parse(respostaTexto);
            
            // Se a resposta é um objeto com propriedade "sintomas"
            if (typeof respostaParsed === 'object' && respostaParsed !== null) {
                if (Array.isArray(respostaParsed.sintomas)) {
                    sintomasIdsExtraidos = respostaParsed.sintomas;
                } else if (Array.isArray(respostaParsed)) {
                    // Se já é um array direto (fallback)
                    sintomasIdsExtraidos = respostaParsed;
                } else {
                    // Tentar encontrar array em qualquer propriedade
                    const arrayValue = Object.values(respostaParsed).find(v => Array.isArray(v));
                    if (arrayValue) {
                        sintomasIdsExtraidos = arrayValue;
                    }
                }
            } else if (Array.isArray(respostaParsed)) {
                sintomasIdsExtraidos = respostaParsed;
            }
            
            // Validar que são IDs válidos (ObjectId do MongoDB tem 24 caracteres hexadecimais)
            sintomasIdsExtraidos = sintomasIdsExtraidos.filter(id => 
                typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
            );
            
            return sintomasIdsExtraidos;
        } catch (parseError) {
            console.error('Falha ao parsear resposta do LLM:', respostaTexto);
            console.error('Erro detalhado:', parseError.message);
            
            // Fallback: tentar extrair IDs com regex (ObjectId do MongoDB)
            const idsMatch = respostaTexto.match(/\b[0-9a-fA-F]{24}\b/g);
            if (idsMatch) {
                sintomasIdsExtraidos = idsMatch;
                return sintomasIdsExtraidos;
            }
            return [];
        }
    } catch (error) {
        console.error('Erro na conexão com LLM:', error.message);
        
        // Log adicional para debugging
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        }
        
        return [];
    }
}

module.exports = llm_conect;


