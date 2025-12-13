const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const jwt = require('jsonwebtoken');
const auth = require('../../config/auth.json');

function generateToken(params = {}) {
    const token = jwt.sign(params, auth.secret, {
        expiresIn: 86400
    });
    return token;
}

// Rota para iniciar autenticação com Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));

// Callback do Google
router.get('/google/callback', 
    passport.authenticate('google', { 
        session: false,
        failureRedirect: '/login' 
    }),
    (req, res) => {
        // Gera token JWT
        const token = generateToken({ 
            id: req.user.id,
            tipo: req.user.tipo,
            email: req.user.email
        });

        // Redireciona para o frontend com o token
        // Você pode ajustar a URL do frontend conforme necessário
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendURL}/auth/callback?token=${token}`);
    }
);

// Rota para verificar status de autenticação
router.get('/status', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send({ authenticated: false });
    }

    jwt.verify(token, auth.secret, (err, decoded) => {
        if (err) {
            return res.status(403).send({ authenticated: false });
        }
        return res.send({ 
            authenticated: true, 
            user: decoded 
        });
    });
});

module.exports = (app) => app.use('/server/auth', router);
