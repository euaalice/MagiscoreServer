const mongoose = require("../../database/index");
const mongoose_paginate = require('mongoose-paginate');

const schema = new mongoose.Schema({
    nome:{
        type: String,
        required: true
    },
    idade:{
        type: String,
        required: true
    },
    avaliacoes:[{
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'usuario',
            required: true
        },
        nota: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comentario: {
            type: String,
            required: false
        },
        criadoEm: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt:{
        type: Date,
        default: Date.now
    }
});

schema.plugin(mongoose_paginate);

const Magistrado = mongoose.model("Magistrado", schema);
module.exports = Magistrado;