const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { obtenerNoticias } = require('./scraper/scraper');
const { obtenerRankingPorEstado } = require('./db/db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para obtener noticias
app.get('/api/incendios', async (req, res) => {
    try {
        const data = await obtenerNoticias();
        res.json(data);
    } catch (error) {
        console.error('❌ Error interno en /api/incendios:', error);
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});

// Endpoint para ejecutar análisis en R
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

// Endpoint para ranking por estado
app.get('/api/ranking-estados', async (req, res) => {
    try {
        const ranking = await obtenerRankingPorEstado();
        res.json(ranking);
    } catch (error) {
        console.error('Error generando ranking:', error);
        res.status(500).json({ error: 'Error interno al generar ranking' });
    }
});

// Nuevo endpoint para estadísticas generadas por R
app.get('/api/estadisticas', (req, res) => {
    // Ejecutamos el script de R
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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

