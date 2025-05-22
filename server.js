// === 1. Módulos base ===
const express  = require('express');            // Framework para crear servidor web
const cors     = require('cors');               // Permite solicitudes desde otros dominios
const session  = require('express-session');    // Manejo de sesiones de usuario
const passport = require('passport');           // Autenticación
const path     = require('path');               // Utilidades para manejar rutas
const { exec } = require('child_process');      // Ejecuta comandos del sistema (útil para R)
const fs       = require('fs');                 // Lectura/escritura de archivos
const multer   = require('multer');             // Middleware para subir archivos (ej. imágenes)
const fetch    = require('node-fetch');         // Cliente HTTP para consumir APIs (ej. geolocalización)

// === 2. Módulos propios del proyecto ===
const { obtenerNoticias }      = require('./scraper/scraper');       // Scraper de noticias
const { obtenerRankingPorEstado, Noticia, Reporte } = require('./db/db'); // Modelos y funciones DB
const { analizarNoticiasConR } = require('./analizar');              // Análisis R de noticias

// === 3. Configuración de Passport para autenticación ===
require('./config/passport')(passport);

// === 4. Inicialización de Express ===
const app  = express();
const PORT = 3000;

// === 5. Middlewares globales ===
app.use(cors());                                  // Permitir CORS general
app.use(express.json());                          // Parseo de JSON
app.use(express.urlencoded({ extended: false })); // Parseo de formularios

// === 6. Configuración de sesión y Passport con CORS seguro ===
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(session({
    secret: 'tu_clave_secreta',  // Cambiar en producción
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax' }  // Política de cookies
}));
app.use(passport.initialize());
app.use(passport.session());

// === 7. Middleware de protección de rutas ===
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth');

// === 8. Estado de autenticación (para el frontend) ===
app.get('/api/auth/status', (req, res) => {
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

// === 9. Rutas de autenticación ===
app.use('/auth', require('./routes/auth'));

// === 10. Páginas públicas de login y registro ===
app.get('/login',    (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

// === 11. Página de reportes (sólo autenticados) ===
app.get('/reportar.html', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reportar.html'));
});

// === API: obtener reportes (con restricciones según el rol) ===
app.get('/api/reportes', async (req, res) => {
    console.log('→ GET /api/reportes recibido');
    try {
        let reportes;
        if (req.isAuthenticated?.() && req.user?.role === 'admin') {
            reportes = await Reporte.find().sort({ fecha: -1 });
        } else {
            reportes = await Reporte.find({ estadoModeracion: 'revisado' }).sort({ fecha: -1 });
        }
        res.json(reportes);
    } catch (err) {
        console.error('❌ Error GET /api/reportes:', err);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

// === 12. Archivos estáticos (CSS, JS, imágenes, etc.) ===
app.use(express.static(path.join(__dirname, 'public')));

// === 13. Configuración de multer para subir imágenes ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// === 14. Función automática: analizar y actualizar estadísticas con R ===
async function actualizarTodo() {
    try {
        await analizarNoticiasConR();
        console.log('✅ Noticias analizadas correctamente.');

        // Ejecuta script R para ranking de estados
        exec('Rscript R/analisis_incendios.R noticias_estado.json', (err, stdout) => {
            if (err) console.error('❌ Error analisis_incendios.R:', err.message);
            else    console.log('📊 Ranking actualizado:\n', stdout);
        });

        // Ejecuta script R para estadísticas
        exec('Rscript R/estadisticas_incendios.R', (err) => {
            if (err) console.error('❌ Error estadisticas_incendios.R:', err.message);
            else    console.log('📈 Estadísticas actualizadas correctamente.');
        });

    } catch (err) {
        console.error('❌ Error en actualizarTodo:', err);
    }
}
actualizarTodo();
setInterval(actualizarTodo, 5 * 60 * 1000); // Cada 5 minutos

// === 15. Endpoints de API ===

// Noticias extraídas por scraping
app.get('/api/incendios', async (req, res) => {
    try {
        const data = await obtenerNoticias();
        res.json(data);
    } catch (error) {
        console.error('❌ Error /api/incendios:', error);
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});

// Ejecuta análisis en R manualmente
app.get('/api/analisis-r', (req, res) => {
    exec('Rscript R/analisis_incendios.R', (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: 'Error al ejecutar R' });
        if (stderr) console.error('stderr:', stderr);
        res.json({ resultado: stdout.trim() });
    });
});

// Ranking de estados con más incendios
app.get('/api/ranking-estados', async (req, res) => {
    try {
        const ranking = await obtenerRankingPorEstado();
        res.json(ranking);
    } catch (error) {
        console.error('❌ Error /api/ranking-estados:', error);
        res.status(500).json({ error: 'Error interno al generar ranking' });
    }
});

// Función de ayuda para nombres de estado
const normalizarEstado = nombre => {
    const mapa = {
        veracruz: "Veracruz De Ignacio De La Llave",
        cdmx:      "CDMX",
        "ciudad de méxico": "CDMX",
        "estado de méxico": "Estado de México"
    };
    return mapa[nombre.toLowerCase()] || nombre;
};

// Filtrar noticias por estado
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

// Genera estadísticas dinámicas combinando noticias y reportes
app.get('/api/estadisticas-dinamicas', async (req, res) => {
    try {
        const noticias = await Noticia.find({}, 'estado');
        const reportes = await Reporte.find({ estadoModeracion: 'revisado' }, 'estado');
        const combinados = [...noticias, ...reportes];

        const conteo = {};
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

// Estadísticas generales desde archivo generado por R
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

// Reporte ciudadano de incendio (con foto + geolocalización)
app.post('/api/reportar', upload.single('imagen'), async (req, res) => {
    try {
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);

        const r = await fetch(
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

// Moderación de reportes: cambiar estado a 'pendiente', 'revisado' o 'falso'
app.patch('/api/reportes/:id/moderar', async (req, res) => {
    const { id } = req.params;
    const { estadoModeracion } = req.body;

    if (!['pendiente', 'revisado', 'falso'].includes(estadoModeracion)) {
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

// === 16. Iniciar servidor ===
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
