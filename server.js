const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const fetch = require('node-fetch');

const { obtenerNoticias } = require('./scraper/scraper');
const { obtenerRankingPorEstado, Noticia, Reporte } = require('./db/db');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const app = express();
const PORT = 3000;

const { analizarNoticiasConR } = require('./analizar');

async function actualizarTodo() {
    console.log('⏱ Iniciando análisis y actualización de datos...');
    try {
        await analizarNoticiasConR();
        console.log('✅ Noticias analizadas correctamente.');

        // Ejecutar R para ranking (mapa)
        exec('Rscript R/analisis_incendios.R noticias_estado.json', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando analisis_incendios.R:', error.message);
            } else {
                console.log('📊 Ranking actualizado:\n', stdout);
            }
        });

        // Ejecutar R para estadísticas (gráficas)
        exec('Rscript R/estadisticas_incendios.R', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando estadisticas_incendios.R:', error.message);
            } else {
                console.log('📈 Estadísticas actualizadas correctamente.');
            }
        });

    } catch (err) {
        console.error('❌ Error durante el proceso de actualización:', err);
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Obtener noticias
app.get('/api/incendios', async (req, res) => {
    try {
        const data = await obtenerNoticias();
        res.json(data);
    } catch (error) {
        console.error('❌ Error interno en /api/incendios:', error);
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});

// Ejecutar análisis en R (mapa)
app.get('/api/analisis-r', (req, res) => {
    exec('Rscript R/analisis_incendios.R', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando R: ${error.message}`);
            return res.status(500).json({ error: 'Error al ejecutar R' });
        }
        if (stderr) console.error(`stderr: ${stderr}`);
        res.json({ resultado: stdout.trim() });
    });
});

// Ranking por estado (mapa)
app.get('/api/ranking-estados', async (req, res) => {
    try {
        const ranking = await obtenerRankingPorEstado();
        res.json(ranking);
    } catch (error) {
        console.error('Error generando ranking:', error);
        res.status(500).json({ error: 'Error interno al generar ranking' });
    }
});

// Normalizar nombres de estados
const normalizarEstado = (nombre) => {
    const mapaNombres = {
        "veracruz": "Veracruz De Ignacio De La Llave",
        "cdmx": "CDMX",
        "ciudad de méxico": "CDMX",
        "estado de méxico": "Estado de México"
        // Puedes agregar más si lo deseas
    };
    const clave = nombre.toLowerCase();
    return mapaNombres[clave] || nombre;
};

// Noticias por estado
app.get('/api/noticias-por-estado/:estado', async (req, res) => {
    try {
        const estadoRaw = req.params.estado;
        const estado = normalizarEstado(estadoRaw);
        const noticias = await Noticia.find({ estado });
        res.json(noticias);
    } catch (error) {
        console.error('❌ Error en noticias-por-estado:', error);
        res.status(500).json({ error: 'Error obteniendo noticias' });
    }
});

// Estadísticas generadas por R (para Chart.js)
app.get('/api/estadisticas', (req, res) => {
    exec('Rscript R/estadisticas_incendios.R', (error, stdout, stderr) => {
        if (error) {
            console.error('Error ejecutando R:', error.message);
            return res.status(500).json({ error: 'Error al ejecutar R' });
        }

        const jsonPath = path.join(__dirname, 'public', 'data', 'estadisticas.json');
        fs.readFile(jsonPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error leyendo estadísticas:', err.message);
                return res.status(500).json({ error: 'Error al leer estadísticas generadas' });
            }

            try {
                const json = JSON.parse(data);
                res.json(json);
            } catch (parseErr) {
                console.error('JSON mal formado:', parseErr.message);
                res.status(500).json({ error: 'El archivo JSON generado es inválido' });
            }
        });
    });
});

// Función para obtener estado y municipio a partir de coordenadas
async function obtenerUbicacion(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'incendios-mx-reporter' }
    });
    const data = await response.json();

    return {
        estado: data.address?.state || null,
        municipio: data.address?.county || data.address?.city || null
    };
}

// Endpoint actualizado con reverse geocoding
app.post('/api/reportar', upload.single('imagen'), async (req, res) => {
    try {
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);

        const ubicacion = await obtenerUbicacion(lat, lng);

        const nuevo = new Reporte({
            descripcion: req.body.descripcion,
            coordenadas: { lat, lng },
            imagen: req.file ? `/uploads/${req.file.filename}` : null,
            estado: ubicacion.estado,
            municipio: ubicacion.municipio
        });

        await nuevo.save();
        res.status(201).json({ mensaje: 'Reporte recibido con ubicación', id: nuevo._id });
    } catch (error) {
        console.error('❌ Error al guardar el reporte:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.patch('/api/reportes/:id/moderar', async (req, res) => {
    const { id } = req.params;
    const { estadoModeracion } = req.body;

    if (!['pendiente', 'revisado', 'falso'].includes(estadoModeracion)) {
        return res.status(400).json({ error: 'Estado de moderación inválido' });
    }

    try {
        const resultado = await Reporte.findByIdAndUpdate(id, { estadoModeracion }, { new: true });
        if (!resultado) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }
        res.json({ mensaje: 'Estado actualizado', reporte: resultado });
    } catch (error) {
        console.error('❌ Error al moderar reporte:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Endpoint para obtener reportes ciudadanos
app.get('/api/reportes', async (req, res) => {
    try {
        const reportes = await Reporte.find();
        res.json(reportes);
    } catch (error) {
        console.error('❌ Error al obtener reportes:', error);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

// Endpoint para devolver los reportes en el mapa
app.get('/api/reportes', async (req, res) => {
    try {
        const reportes = await Reporte.find().sort({ fecha: -1 }).limit(100);
        res.json(reportes);
    } catch (error) {
        console.error('❌ Error obteniendo reportes:', error);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

app.put('/api/moderar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estadoModeracion } = req.body;

        await Reporte.findByIdAndUpdate(id, { estadoModeracion });
        res.json({ mensaje: 'Estado de moderación actualizado' });
    } catch (error) {
        console.error('❌ Error al actualizar reporte:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

actualizarTodo(); // Ejecutar todo al iniciar

setInterval(actualizarTodo, 5 * 60 * 1000); // Repetir cada 5 minutos

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});