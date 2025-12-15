const { data } = require("../source/Symptoms");
const Sintomas = require("../model/Sintomas");
const connectDB = require("../config/database"); // Importa a função de conexão
const mongoose = require('mongoose'); // Importa mongoose diretamente

async function registrarSintomas() {
    try {
        // Primeiro conectar ao MongoDB
        await connectDB();
        
        // Agora podemos verificar o estado da conexão
        console.log(`Estado da conexão: ${mongoose.connection.readyState}`);
        
        // Validar dados
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("Nenhum dado de sintomas disponível para registro");
            return [];
        }

        console.log(`Processando ${data.length} sintomas...`);

        // Preparar dados para inserção
        const sintomasParaRegistrar = data
            .map(sintoma => ({ 
                nome: typeof sintoma === 'string' ? sintoma.trim() : String(sintoma)
            }))
            .filter(sintoma => sintoma.nome && sintoma.nome.length > 0);

        if (sintomasParaRegistrar.length === 0) {
            console.log("Nenhum sintoma válido encontrado após processamento");
            return [];
        }

        console.log(`Preparados ${sintomasParaRegistrar.length} sintomas válidos para inserção`);

        // Opção 1: Tentar inserir todos de uma vez
        try {
            const resultado = await Sintomas.insertMany(sintomasParaRegistrar, {
                ordered: false,
                maxTimeMS: 30000
            });
            
            console.log(`✅ Foram registrados ${resultado.length} sintomas com sucesso`);
            return resultado;
            
        } catch (insertError) {
            console.warn("Primeira tentativa falhou, tentando método alternativo...", insertError.message);
            
            // Opção 2: Inserir em lotes menores
            return await inserirEmLotes(sintomasParaRegistrar);
        }
        
    } catch (erro) {
        console.error("❌ Erro ao registrar sintomas:", erro.message);
        throw erro;
    }
}

// Função para inserir em lotes menores
async function inserirEmLotes(sintomas, tamanhoLote = 50) {
    const lotes = [];
    for (let i = 0; i < sintomas.length; i += tamanhoLote) {
        lotes.push(sintomas.slice(i, i + tamanhoLote));
    }

    let totalInseridos = 0;
    const resultados = [];

    for (let indice = 0; indice < lotes.length; indice++) {
        const lote = lotes[indice];
        try {
            console.log(`Processando lote ${indice + 1}/${lotes.length} (${lote.length} itens)`);
            
            const resultado = await Sintomas.insertMany(lote, {
                ordered: false,
                maxTimeMS: 15000
            });
            
            totalInseridos += resultado.length;
            resultados.push(...resultado);
            console.log(`✅ Lote ${indice + 1} inserido: ${resultado.length} sintomas`);
            
        } catch (erroLote) {
            console.warn(`⚠️ Erro no lote ${indice + 1}:`, erroLote.message);
            
            // Tentar inserir um por um no lote falhado
            for (const sintoma of lote) {
                try {
                    const resultado = await Sintomas.create(sintoma);
                    totalInseridos++;
                    resultados.push(resultado);
                } catch (erroIndividual) {
                    console.warn(`  Falha ao inserir "${sintoma.nome}":`, erroIndividual.message);
                }
            }
        }
    }

    console.log(`✅ Total: ${totalInseridos} sintomas registrados com sucesso`);
    return resultados;
}

// Verificar se o módulo foi executado diretamente
if (require.main === module) {
    registrarSintomas()
        .then(() => {
            console.log("🎉 Processo concluído com sucesso!");
            // Fechar conexão com MongoDB antes de sair
            mongoose.connection.close()
                .then(() => {
                    console.log("Conexão com MongoDB fechada.");
                    process.exit(0);
                })
                .catch(err => {
                    console.error("Erro ao fechar conexão:", err);
                    process.exit(0);
                });
        })
        .catch(erro => {
            console.error("💥 Falha no processo de registro:", erro.message);
            
            // Tentar fechar a conexão mesmo em caso de erro
            mongoose.connection.close()
                .then(() => {
                    console.log("Conexão com MongoDB fechada.");
                    process.exit(1);
                })
                .catch(err => {
                    console.error("Erro ao fechar conexão:", err);
                    process.exit(1);
                });
        });
}

module.exports = { registrarSintomas };