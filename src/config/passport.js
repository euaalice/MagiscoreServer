const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Usuario = require('../app/models/usuario');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await Usuario.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/server/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Verifica se usuário já existe
        let user = await Usuario.findOne({ googleId: profile.id });

        if (user) {
            // Usuário já existe
            return done(null, user);
        }

        // Verifica se existe usuário com mesmo email
        user = await Usuario.findOne({ email: profile.emails[0].value });

        if (user) {
            // Atualiza com googleId
            user.googleId = profile.id;
            user.foto = profile.photos[0]?.value;
            await user.save();
            return done(null, user);
        }

        // Cria novo usuário
        user = await Usuario.create({
            nome: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            foto: profile.photos[0]?.value,
            tipo: 'comum'
        });

        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

module.exports = passport;
