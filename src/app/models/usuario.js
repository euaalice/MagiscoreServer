const mongoose = require("../../database/index");
const mongoose_paginate = require('mongoose-paginate');

const schema = new mongoose.Schema({
    nome:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    senha:{
        type: String,
        required: false  // Não obrigatório para login com Google
    },
    tipo:{
        type: String,
        enum: ['comum', 'advogado', 'magistrado'],
        default: 'comum',
        required: true
    },
    googleId:{
        type: String,
        unique: true,
        sparse: true  // Permite null/undefined para usuários sem Google
    },
    oab:{
        type: String,
        required: false  // Obrigatório apenas para advogados
    },
    cnj:{
        type: String,
        required: false  // Obrigatório apenas para magistrados
    },
    foto:{
        type: String,
        required: false
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

schema.plugin(mongoose_paginate);

const Usuario = mongoose.model("usuario", schema);
module.exports = Usuario;