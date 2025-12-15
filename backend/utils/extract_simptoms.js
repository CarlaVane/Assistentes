function extrairSintomasMarcados(dadosPaciente) {
    const sintomasMarcados = [];

    // Percorrer todas as propriedades do objeto
    for (const [sintoma, valor] of Object.entries(dadosPaciente)) {
        // Ignorar a propriedade 'diseases' e verificar se o valor é '1'
        if (sintoma !== 'diseases' && valor === '1') {
            sintomasMarcados.push(sintoma);
        }
    }

    return sintomasMarcados;
}

module.exports = { extrairSintomasMarcados }

// // Exemplo de uso:
// const dadosPaciente = {
//     diseases: 'panic disorder',
//     'anxiety and nervousness': '1',
//     depression: '0',
//     'shortness of breath': '1',
//     'depressive or psychotic symptoms': '1',
//     'sharp chest pain': '0',
//     // ... resto do objeto
// };

// const sintomasAtivos = extrairSintomasMarcados(dadosPaciente);
// console.log(sintomasAtivos);
// // Saída: ['anxiety and nervousness', 'shortness of breath', 'depressive or psychotic symptoms', ...]