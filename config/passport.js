// config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) return done(null, false, { message: 'Usuario no encontrado' });
            const match = await user.comparePassword(password);
            if (!match) return done(null, false, { message: 'Contraseña incorrecta' });
            return done(null, user);
        } catch (err) { return done(err); }
    }));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        const user = await User.findById(id);
        done(null, user);
    });
};
