const mongoose = require('mongoose');

const Doencas = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String },
    nomes_variacoes: [{ type: String }],

    sintomas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sintoma" }],

}, { timestamps: true });

module.exports = mongoose.model('Doencas', Doencas);