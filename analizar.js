// Se importan módulos necesarios
const fs = require('fs');
const { detectarUbicacion } = require('./scraper/ubicacion');     // Función para detectar estado y municipio en texto
const { obtenerNoticias } = require('./scraper/scraper');          // Función que obtiene noticias desde GNews y Google
const { exec } = require('child_process');                         // Permite ejecutar scripts externos (en este caso, R)
const mongoose = require('mongoose');                              // ORM para interactuar con MongoDB
const { Noticia } = require('./db/db');                            // Modelo de la colección Noticia
const geojson = require('./public/data/mexico.json');              // Archivo GeoJSON con datos de municipios y estados

// Función para extraer palabras clave (keywords) desde el texto de cada noticia
function extraerKeywords(texto) {
    const stopwords = ['desde', 'sobre', 'estos', 'tienen', 'donde', 'porque', 'puede', 'entre', 'había', 'estar', 'haber', 'fue', 'para', 'con', 'este', 'una', 'que', 'por', 'los', 'las', 'del', 'más', 'como', 'hace', 'tras', 'aunque'];
    
    const palabras = texto
        .toLowerCase()                                   // Todo en minúsculas
        .replace(/[.,;:¿?!¡()"']/g, '')                   // Quitar signos de puntuación
        .split(/\s+/)                                     // Separar por espacios
        .filter(p => p.length > 4 && !stopwords.includes(p));  // Eliminar palabras cortas y comunes

    return [...new Set(palabras)]; // Eliminar duplicados
}

// Función principal: obtiene noticias, las procesa, las guarda en MongoDB y ejecuta análisis en R
async function analizarNoticiasConR() {
    try {
        // Conexión a la base de datos MongoDB
        await mongoose.connect('mongodb://127.0.0.1:27017/incendios');
        console.log('✅ Conectado a MongoDB');

        // Se obtienen noticias desde las fuentes configuradas (GNews y Google)
        const noticias = await obtenerNoticias();

        // Se enriquecen las noticias con ubicación y palabras clave
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

        // Se guarda un respaldo en un archivo JSON local para análisis o revisión
        fs.writeFileSync('noticias_estado.json', JSON.stringify(noticiasEnriquecidas, null, 2));

        let nuevas = 0;
        let actualizadas = 0;

        // Se recorren las noticias para insertarlas o actualizarlas en la base de datos
        for (const noticia of noticiasEnriquecidas) {
            const existente = await Noticia.findOne({ link: noticia.link });

            if (!existente) {
                await Noticia.create(noticia);
                nuevas++;
            } else {
                await Noticia.updateOne({ link: noticia.link }, { $set: noticia });
                actualizadas++;
            }
        }

        // Mensajes resumen del procesamiento
        console.log(`🆕 Noticias nuevas insertadas: ${nuevas}`);
        console.log(`♻️ Noticias actualizadas: ${actualizadas}`);
        console.log(`📦 Total procesadas: ${nuevas + actualizadas}`);

        // Se ejecuta un script en R para análisis estadístico
        exec('Rscript R/analisis_incendios.R noticias_estado.json', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error ejecutando R:', error.message);
                return;
            }
            if (stderr) {
                console.error('⚠️ stderr:', stderr);
            }
            // Se muestra el resultado del script en consola
            console.log('📊 Resultado desde R:\n', stdout);
        });

    } catch (err) {
        // Manejo de errores generales
        console.error('❌ Error:', err);
    }
}

// Se exporta la función principal para ser llamada desde otros módulos o scripts
module.exports = { analizarNoticiasConR };