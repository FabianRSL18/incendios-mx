const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { obtenerNoticias } = require('./scraper/scraper');
const { obtenerRankingPorEstado, Noticia, Reporte } = require('./db/db');

const app = express();
const PORT = 3000;

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

// API para guardar reportes de usuarios
app.post('/api/reportar', async (req, res) => {
    try {
        const nuevo = new Reporte(req.body);
        await nuevo.save();
        res.status(201).json({ mensaje: 'Reporte recibido' });
    } catch (error) {
        console.error('❌ Error al guardar el reporte:', error);
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
