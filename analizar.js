const fs = require('fs');
const { detectarEstado } = require('./ubicacion');
const { obtenerNoticias } = require('./scraper');
const { exec } = require('child_process');

function extraerKeywords(texto) {
    const stopwords = ['desde','sobre','estos','tienen','donde','porque','puede','entre','había','estar','haber','fue','para','con','este','una','que','por','los','las','del','más','como','hace','tras','aunque'];
    const palabras = texto
        .toLowerCase()
        .replace(/[.,;:¿?!¡()"]/g, '')
        .split(/\s+/)
        .filter(p => p.length > 4 && !stopwords.includes(p));
    return [...new Set(palabras)];
}

async function analizarNoticiasConR() {
    const noticias = await obtenerNoticias();

    const noticiasEnriquecidas = noticias.map(n => {
        const textoCompleto = `${n.titulo} ${n.resumen}`;
        return {
        titulo: n.titulo,
        resumen: n.resumen,
        fuente: n.fuente || 'Desconocida',
        link: n.link,
        estado: detectarEstado(textoCompleto),
        fecha: n.fecha || null, // si tu scraper no la tiene, puedes extenderlo después
        keywords: extraerKeywords(textoCompleto)
    };
    });

    fs.writeFileSync('noticias_estado.json', JSON.stringify(noticiasEnriquecidas, null, 2));

    exec('Rscript analisis_incendios.R noticias_estado.json', (error, stdout, stderr) => {
        if (error) {
        console.error('Error ejecutando R:', error.message);
        return;
        }
        if (stderr) {
        console.error('stderr:', stderr);
        }
        console.log('Resultado desde R:\n', stdout);
    });
}

analizarNoticiasConR();
