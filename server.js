// server.js

// 1. Módulos base
const express  = require('express');
const cors     = require('cors');
const session  = require('express-session');
const passport = require('passport');
const path     = require('path');
const { exec } = require('child_process');
const fs       = require('fs');
const multer   = require('multer');
const fetch    = require('node-fetch');

// 2. Importa tu scraper y modelos
const { obtenerNoticias }      = require('./scraper/scraper');
const { obtenerRankingPorEstado, Noticia, Reporte } = require('./db/db');
const { analizarNoticiasConR } = require('./analizar');

// 3. Config Passport
require('./config/passport')(passport);

// 4. Inicializa Express
const app  = express();
const PORT = 3000;

// 5. Middleware de parsing y CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 6. Configura sesión y Passport
app.use(cors({
    origin: 'http://localhost:3000',       // o tu dominio exacto
    credentials: true   // <–– permite recibir cookies en CORS
}));
app.use(session({
    secret: 'tu_clave_secreta',
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax' /* o lo que necesites */ }
}));
app.use(passport.initialize());
app.use(passport.session());

// 7. Helpers de autorización
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth');

// 8. Exponer estado de autenticación al frontend
// justo después de app.use(passport.session());
// 8. Exponer estado de autenticación al frontend
app.get('/api/auth/status', (req, res) => {
    // Indicamos al navegador que no guarde cache
    res.set('Cache-Control', 'no-store');
    if (req.isAuthenticated()) {
        const { firstName, lastName, email, avatar, role } = req.user;
        return res.json({
            loggedIn: true,
            username: `${firstName} ${lastName}`,
            email,
            avatar,
            role
        });
    }
    res.json({ loggedIn: false });
});


// 9. Monta rutas de auth (/auth/register, /auth/login, /auth/logout)
app.use('/auth', require('./routes/auth'));

// 10. Sirve formularios de login y registro
app.get('/login',    (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

// 11. Protege reportar.html: sólo usuarios autenticados
// Protege reportar.html
app.get('/reportar.html', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reportar.html'));
});

// RUTA UNIFICADA y PROTEGIDA para traer todos los reportes
app.get('/api/reportes', ensureAdmin, async (req, res) => {
    console.log('→ GET /api/reportes recibido');
    try {
        const reportes = await Reporte.find().sort({ fecha: -1 });
        res.json(reportes);
    } catch (err) {
        console.error('❌ Error GET /api/reportes:', err);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

// 12. Resto de archivos estáticos (css, js, imágenes, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// 13. Configuración de multer para uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 14. Función de cron “actualizarTodo”
async function actualizarTodo() {
    try {
        await analizarNoticiasConR();
        console.log('✅ Noticias analizadas correctamente.');

        exec('Rscript R/analisis_incendios.R noticias_estado.json', (err, stdout) => {
            if (err) console.error('❌ Error analisis_incendios.R:', err.message);
            else    console.log('📊 Ranking actualizado:\n', stdout);
        });
        exec('Rscript R/estadisticas_incendios.R', (err) => {
            if (err) console.error('❌ Error estadisticas_incendios.R:', err.message);
            else    console.log('📈 Estadísticas actualizadas correctamente.');
        });

    } catch (err) {
        console.error('❌ Error en actualizarTodo:', err);
    }
}
actualizarTodo();
setInterval(actualizarTodo, 5 * 60 * 1000);

// 15. Tus endpoints API existentes

app.get('/api/incendios', async (req, res) => {
    try {
        const data = await obtenerNoticias();
        res.json(data);
    } catch (error) {
        console.error('❌ Error /api/incendios:', error);
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});

app.get('/api/analisis-r', (req, res) => {
    exec('Rscript R/analisis_incendios.R', (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: 'Error al ejecutar R' });
        if (stderr) console.error('stderr:', stderr);
        res.json({ resultado: stdout.trim() });
    });
});

app.get('/api/ranking-estados', async (req, res) => {
    try {
        const ranking = await obtenerRankingPorEstado();
        res.json(ranking);
    } catch (error) {
        console.error('❌ Error /api/ranking-estados:', error);
        res.status(500).json({ error: 'Error interno al generar ranking' });
    }
});

const normalizarEstado = nombre => {
    const mapa = {
        veracruz: "Veracruz De Ignacio De La Llave",
        cdmx:      "CDMX",
        "ciudad de méxico": "CDMX",
        "estado de méxico": "Estado de México"
    };
    return mapa[nombre.toLowerCase()] || nombre;
};

app.get('/api/noticias-por-estado/:estado', async (req, res) => {
    try {
        const estado = normalizarEstado(req.params.estado);
        const noticias = await Noticia.find({ estado });
        res.json(noticias);
    } catch (error) {
        console.error('❌ Error /api/noticias-por-estado:', error);
        res.status(500).json({ error: 'Error obteniendo noticias' });
    }
});

app.get('/api/estadisticas-dinamicas', async (req, res) => {
    try {
        const noticias = await Noticia.find({}, 'estado');
        const reportes = await Reporte.find({ estadoModeracion: 'revisado' }, 'estado');
        const combinados = [...noticias, ...reportes];
        const conteo    = {};
        combinados.forEach(doc => {
            const e = (doc.estado || '').toLowerCase();
            if (e) conteo[e] = (conteo[e] || 0) + 1;
        });
        res.json({
            labels: Object.keys(conteo).map(e => e.charAt(0).toUpperCase() + e.slice(1)),
            values: Object.values(conteo)
        });
    } catch (error) {
        console.error('❌ Error /api/estadisticas-dinamicas:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/estadisticas', (req, res) => {
    exec('Rscript R/estadisticas_incendios.R', (error) => {
        if (error) return res.status(500).json({ error: 'Error al ejecutar R' });
        const file = path.join(__dirname, 'public/data/estadisticas.json');
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: 'Error leyendo estadísticas' });
            res.json(JSON.parse(data));
        });
    });
});

app.post('/api/reportar', upload.single('imagen'), async (req, res) => {
    try {
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);
        const r   = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
            { headers: { 'User-Agent': 'incendios-mx-reporter' } }
        );
        const json = await r.json();
        const nuevo = new Reporte({
            descripcion: req.body.descripcion,
            coordenadas: { lat, lng },
            imagen:      req.file ? `/uploads/${req.file.filename}` : null,
            estado:      json.address?.state,
            municipio:   json.address?.county || json.address?.city
        });
        await nuevo.save();
        res.status(201).json({ mensaje: 'Reporte recibido', id: nuevo._id });
    } catch (error) {
        console.error('❌ Error POST /api/reportar:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.patch('/api/reportes/:id/moderar', async (req, res) => {
    const { id } = req.params;
    const { estadoModeracion } = req.body;
    if (!['pendiente','revisado','falso'].includes(estadoModeracion)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    try {
        const upd = await Reporte.findByIdAndUpdate(id, { estadoModeracion }, { new: true });
        if (!upd) return res.status(404).json({ error: 'No encontrado' });
        res.json({ mensaje: 'Moderado', reporte: upd });
    } catch (e) {
        console.error('❌ Error PATCH /api/reportes:', e);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});



// 16. Arranca servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
