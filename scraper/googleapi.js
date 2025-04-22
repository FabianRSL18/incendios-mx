// scraper/googleapi.js

const axios = require('axios');

const API_KEY = 'AIzaSyCyZnooLbuHb6_ZoFOrJX6XQRbvK4jwHns'; // 🔑 Reemplaza con tu API Key
const CX_ID = 'e1828373b377948db';     // 🔍 Reemplaza con tu ID del buscador personalizado

async function obtenerNoticiasGoogle() {
    const query = 'incendios forestales México';
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${API_KEY}&cx=${CX_ID}`;

    try {
        const { data } = await axios.get(url);

        const noticias = (data.items || []).map(item => {
            let fecha = null;

            // Intentamos extraer la fecha de los metadatos si existe
            if (item.pagemap?.metatags && item.pagemap.metatags.length > 0) {
                const meta = item.pagemap.metatags[0];
                fecha = meta['article:published_time'] || meta['date'] || null;
            }

            return {
                fuente: item.displayLink,
                titulo: item.title,
                resumen: item.snippet,
                link: item.link,
                fecha
            };
        });

        return noticias;
    } catch (error) {
        console.error('❌ Error en Google Custom Search API:', error.message);
        return [];
    }
}

module.exports = { obtenerNoticiasGoogle };
