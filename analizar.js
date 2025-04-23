const fs = require('fs');
const path = require('path');
const { detectarUbicacion } = require('./scraper/ubicacion');
const { obtenerNoticias } = require('./scraper/scraper');
const { exec } = require('child_process');
const mongoose = require('mongoose');
const { Noticia } = require('./db/db');
const geojson = require('./public/data/mexico.json');

function extraerKeywords(texto) {
    const stopwords = ['desde', 'sobre', 'estos', 'tienen', 'donde', 'porque', 'puede', 'entre', 'había', 'estar', 'haber', 'fue', 'para', 'con', 'este', 'una', 'que', 'por', 'los', 'las', 'del', 'más', 'como', 'hace', 'tras', 'aunque'];
    const palabras = texto
        .toLowerCase()
        .replace(/[.,;:¿?!¡()"']/g, '')
        .split(/\s+/)
        .filter(p => p.length > 4 && !stopwords.includes(p));
    return [...new Set(palabras)];
}

async function analizarNoticiasConR() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/incendios');
        console.log('✅ Conectado a MongoDB');

        const noticias = await Noticia.find();

        const noticiasEnriquecidas = noticias.map(n => {
            const textoCompleto = `${n.titulo} ${n.resumen}`;
            const ubicacion = detectarUbicacion(textoCompleto, geojson);

            return {
                titulo: n.titulo,
                resumen: n.resumen,
                fuente: n.fuente || 'Desconocida',
                link: n.link,
                estado: ubicacion?.estado || null,
                municipio: ubicacion?.municipio || null,
                fecha: n.fecha || null,
                keywords: extraerKeywords(textoCompleto)
            };
        });

        fs.writeFileSync('noticias_estado.json', JSON.stringify(noticiasEnriquecidas, null, 2));

        let nuevas = 0;
        for (const noticia of noticiasEnriquecidas) {
            const yaExiste = await Noticia.findOne({ link: noticia.link });
            if (!yaExiste) {
                await Noticia.create(noticia);
                nuevas++;
            }
        }

        console.log(`🟢 Se insertaron ${nuevas} noticias nuevas en MongoDB`);

        exec('Rscript R/analisis_incendios.R noticias_estado.json', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando R:', error.message);
                return;
            }
            if (stderr) {
                console.error('⚠️ stderr:', stderr);
            }
            console.log('📊 Resultado desde R:\n', stdout);
        });

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

analizarNoticiasConR();