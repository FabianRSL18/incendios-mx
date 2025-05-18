const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username:  { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    password:  { type: String, required: true },
    avatar:    { type: String, default: null },       // URL o ruta al archivo
    role:      { type: String, enum: ['user','admin'], default: 'user' }
});

// Hash de la contraseña
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

UserSchema.methods.comparePassword = function(candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
