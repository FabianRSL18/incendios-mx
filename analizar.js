const fs = require('fs');
const { detectarEstado } = require('./scraper/ubicacion');
const { obtenerNoticias } = require('./scraper/scraper');
const { Noticia } = require('./db/db');
const { exec } = require('child_process');
const mongoose = require('mongoose');


function extraerKeywords(texto) {
    const stopwords = ['desde', 'sobre', 'estos', 'tienen', 'donde', 'porque', 'puede', 'entre', 'había', 'estar', 'haber', 'fue', 'para', 'con', 'este', 'una', 'que', 'por', 'los', 'las', 'del', 'más', 'como', 'hace', 'tras', 'aunque'];
    const palabras = texto
        .toLowerCase()
        .replace(/[.,;:¿?!¡()"]/g, '')
        .split(/\s+/)
        .filter(p => p.length > 4 && !stopwords.includes(p));
    return [...new Set(palabras)];
}

async function analizarNoticiasConR() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/incendios', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    console.log('✅ Conectado a MongoDB');

    const noticias = await obtenerNoticias();

    const noticiasEnriquecidas = noticias.map(n => {
        const textoCompleto = `${n.titulo} ${n.resumen}`;
        return {
            titulo: n.titulo,
            resumen: n.resumen,
            fuente: n.fuente || 'Desconocida',
            link: n.link,
            estado: detectarEstado(textoCompleto),
            fecha: n.fecha || null,
            keywords: extraerKeywords(textoCompleto)
        };
    });

    // Guardar JSON opcionalmente
    fs.writeFileSync('noticias_estado.json', JSON.stringify(noticiasEnriquecidas, null, 2));

    // Guardar en MongoDB
    await Noticia.deleteMany({}); // limpia base si quieres
    await Noticia.insertMany(noticiasEnriquecidas);
    console.log('🟢 Noticias guardadas en MongoDB');

    // Llamar a R
    exec('Rscript R/analisis_incendios.R noticias_estado.json', (error, stdout, stderr) => {
        if (error) {
            console.error('Error ejecutando R:', error.message);
            return;
        }
        if (stderr) {
            console.error('stderr:', stderr);
        }
        console.log('📊 Resultado desde R:\n', stdout);
        });

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

analizarNoticiasConR();

