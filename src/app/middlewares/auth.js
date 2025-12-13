const jwt = require('jsonwebtoken');
const auth = require('../../config/auth.json');

// Middleware para autenticar token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, auth.secret, (err, decoded) => {
        if (err) return res.sendStatus(403);
        req.user = decoded;
        next();
    });
}

// Middleware para verificar tipo de usuário
function requireUserType(...allowedTypes) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).send({ error: 'Não autenticado' });
        }

        if (!allowedTypes.includes(req.user.tipo)) {
            return res.status(403).send({ 
                error: 'Acesso negado. Você não tem permissão para acessar este recurso.',
                requiredTypes: allowedTypes,
                yourType: req.user.tipo
            });
        }

        next();
    };
}

// Middleware específico para usuários comuns
function requireComum(req, res, next) {
    return requireUserType('comum')(req, res, next);
}

// Middleware específico para advogados
function requireAdvogado(req, res, next) {
    return requireUserType('advogado', 'comum')(req, res, next);
}

// Middleware específico para magistrados
function requireMagistrado(req, res, next) {
    return requireUserType('magistrado')(req, res, next);
}

// Middleware para permitir múltiplos tipos
function requireAnyOf(...types) {
    return requireUserType(...types);
}

module.exports = {
    authenticateToken,
    requireUserType,
    requireComum,
    requireAdvogado,
    requireMagistrado,
    requireAnyOf
};
