// Se importa la librería axios para realizar peticiones HTTP
const axios = require('axios');

// Clave de API de Google Custom Search
const API_KEY = 'AIzaSyCyZnooLbuHb6_ZoFOrJX6XQRbvK4jwHns'; 

// ID del motor de búsqueda personalizado (CX) configurado en Google Custom Search
const CX_ID = 'e1828373b377948db';     

// Función asincrónica que obtiene resultados de búsqueda de Google relacionados con incendios forestales en México
async function obtenerNoticiasGoogle() {
    // Consulta de búsqueda
    const query = 'incendios forestales México';

    // Construcción de la URL con parámetros codificados
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${API_KEY}&cx=${CX_ID}`;

    try {
        // Realiza una petición GET a la API de Google Custom Search
        const { data } = await axios.get(url);

        // Se procesan los resultados encontrados, si los hay
        const noticias = (data.items || []).map(item => {
            let fecha = null;

            // Intenta obtener la fecha de publicación desde los metadatos (si existen)
            if (item.pagemap?.metatags && item.pagemap.metatags.length > 0) {
                const meta = item.pagemap.metatags[0];
                fecha = meta['article:published_time'] || meta['date'] || null;
            }

            // Se retorna un objeto simplificado con los datos de interés
            return {
                fuente: item.displayLink,  // Dominio de la fuente
                titulo: item.title,        // Título del resultado
                resumen: item.snippet,     // Fragmento del contenido
                link: item.link,           // Enlace al sitio
                fecha                      // Fecha extraída (si existe)
            };
        });

        return noticias;
    } catch (error) {
        // Muestra el error en consola y retorna un arreglo vacío en caso de fallo
        console.error('❌ Error en Google Custom Search API:', error.message);
        return [];
    }
}

// Exporta la función para que pueda ser utilizada desde otros módulos
module.exports = { obtenerNoticiasGoogle };