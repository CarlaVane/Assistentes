const csv = require('csv-parser');
const fs = require('fs');
const path = require("path");
const { extrairSintomasMarcados } = require("./extract_simptoms");
const Sintomas = require("../model/Sintomas");
const Doencas = require("../model/Doencas");
const ps = require("promise-streams");
const connectDB = require("../config/database");

async function main() {

    // 1. GARANTIR conexão estabelecida
    console.log("A ligar ao MongoDB...");
    await connectDB();  
    console.log("Ligação estabelecida. A iniciar processamento...");

    const stream = fs.createReadStream(
        path.join(__dirname, "..", "source", "Final_Augmented_dataset_Diseases_and_Symptoms.csv")
    );

    // 2. PROCESSAMENTO DO CSV
    await stream
        .pipe(csv({ separator: "," }))
        .pipe(
            ps.map({ concurrent: 10 }, async (data) => {
                try {
                    const sintomasMarcados = extrairSintomasMarcados(data);

                    const currentSintomas = await Sintomas.find({
                        nome: { $in: sintomasMarcados }
                    }).select("_id");

                    await Doencas.create({
                        nome: data.diseases,
                        sintomas: currentSintomas.map(s => s._id)
                    });

                } catch (err) {
                    console.error("Erro ao processar linha:", err);
                }
            })
        )
        .wait();

    console.log("Processamento finalizado!");
}

console.time("Tempo de Execução");

main()
    .then(() => console.timeEnd("Tempo de Execução"))
    .catch(err => console.error("Erro fatal:", err));
