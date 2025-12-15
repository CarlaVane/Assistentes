// var express = require('express');
// var router = express.Router();
// const csv = require('csv-parser')
// const fs = require('fs')
// const path = require("path");
// const { extrairSintomasMarcados } = require("../utils/extract_simptoms")
// const Sintomas = require("../model/Sintomas");
// const Doencas = require("../model/Doencas")

// async function importDiseasesOptimized() {
//     console.log('Loading all symptoms into memory...');
//     const allSintomas = await Sintomas.find({}).select('nome _id').lean();
//     const sintomasMap = new Map(allSintomas.map(s => [s.nome, s._id]));
//     console.log(`Loaded ${sintomasMap.size} symptoms`);
    
//     const dataRows = [];
    
//     return new Promise((resolve, reject) => {
//         fs.createReadStream(path.join(__dirname, "..", "source", "Final_Augmented_dataset_Diseases_and_Symptoms.csv"))
//             .pipe(csv())
//             .on('data', (data) => dataRows.push(data))
//             .on('end', async () => {
//                 try {
//                     console.log(`Processing ${dataRows.length} diseases...`);
                    
//                     const diseasesToInsert = [];
                    
//                     for (const data of dataRows) {
//                         const currentSintomas = extrairSintomasMarcados(data);
//                         const sintomaIds = currentSintomas
//                             .map(s => sintomasMap.get(s))
//                             .filter(id => id !== undefined);
                        
//                         if (sintomaIds.length > 0) {
//                             diseasesToInsert.push({
//                                 nome: data.diseases,
//                                 sintomas: sintomaIds
//                             });
//                         }
//                     }
                    
//                     console.log(`Inserting ${diseasesToInsert.length} diseases...`);
                    
//                     // Bulk insert in batches
//                     let insertedCount = 0;
//                     for (let i = 0; i < diseasesToInsert.length; i += 1000) {
//                         const batch = diseasesToInsert.slice(i, i + 1000);
//                         await Doencas.insertMany(batch, { ordered: false });
//                         insertedCount += batch.length;
//                         console.log(`Inserted ${Math.min(i + 1000, diseasesToInsert.length)}/${diseasesToInsert.length}`);
//                     }
                    
//                     resolve({ 
//                         total: diseasesToInsert.length,
//                         inserted: insertedCount,
//                         symptomsLoaded: sintomasMap.size,
//                         rowsProcessed: dataRows.length
//                     });
//                 } catch (error) {
//                     reject(error);
//                 }
//             })
//             .on('error', reject);
//     });
// }

// // Rota para importar doenças
// router.post('/import', async (req, res) => {
//     try {
//         console.log('Starting disease import...');
        
//         const results = await importDiseasesOptimized();
        
//         res.status(200).json({
//             success: true,
//             message: 'Import completed successfully',
//             data: results
//         });
        
//     } catch (error) {
//         console.error('Import failed:', error);
        
//         res.status(500).json({
//             success: false,
//             message: 'Import failed',
//             error: error.message
//         });
//     }
// });

// // Rota para verificar o status (opcional)
// router.get('/status', async (req, res) => {
//     try {
//         const diseasesCount = await Doencas.countDocuments();
//         const symptomsCount = await Sintomas.countDocuments();
        
//         res.status(200).json({
//             success: true,
//             data: {
//                 diseases: diseasesCount,
//                 symptoms: symptomsCount
//             }
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

// module.exports = router;