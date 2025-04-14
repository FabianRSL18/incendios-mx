const express = require('express');
const { obtenerNoticias } = require('./scraper'); // <- CORRECTO
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/api/incendios', async (req, res) => {
    try {
        const data = await obtenerNoticias();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});

const { exec } = require('child_process');

app.get('/api/analisis-r', (req, res) => {
    const parametro = 'incendios'; // puedes cambiar esto o pasarlo por query

    exec(`Rscript analisis_incendios.R ${parametro}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando R: ${error.message}`);
            return res.status(500).json({ error: 'Error al ejecutar R' });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        res.json({ resultado: stdout.trim() });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
