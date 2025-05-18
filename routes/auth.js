// routes/auth.js

const express  = require('express');
const passport = require('passport');
const multer   = require('multer');
const path     = require('path');
const User     = require('../models/User');
const router   = express.Router();

// --- Multer config para avatar ---
const storage = multer.diskStorage({
    destination: (req, file, cb) =>
        cb(null, path.join(__dirname, '../public/uploads/avatars')),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
            cb(null, true);
        } else {
            cb(new Error('Sólo se aceptan imágenes JPG o PNG'));
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB máximo
});

// --- Rutas de formulario ---
router.get('/register', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/register.html'))
);
router.get('/login', (req, res) =>
    res.sendFile(path.join(__dirname, '../public/login.html'))
);

// --- Procesar registro ---
router.post(
    '/register',
    upload.single('avatar'),
    async (req, res, next) => {
        try {
            const { username, firstName, lastName, email, password } = req.body;

            // Verificar campos obligatorios
            if (!username || !firstName || !lastName || !email || !password) {
                return res.status(400).json({ error: 'Todos los campos son requeridos' });
            }

            // Verificar unicidad de email y username
            if (await User.findOne({ email })) {
                return res.status(400).json({ error: 'El correo ya está registrado' });
            }
            if (await User.findOne({ username })) {
                return res.status(400).json({ error: 'El usuario ya existe' });
            }

            // Construir el nuevo usuario
            const userData = {
                username,
                firstName,
                lastName,
                email,
                password,
                avatar: req.file
                    ? `/uploads/avatars/${req.file.filename}`
                    : null
            };

            await User.create(userData);

            // Si el registro se llamó por fetch/ajax:
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true });
            }
            // Si vino de un form tradicional:
            res.redirect('/login');
        } catch (err) {
            next(err);
        }
    }
);

// --- Procesar login ---
router.post(
    '/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })
);

// --- Logout ---
router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/login');
    });
});

module.exports = router;
