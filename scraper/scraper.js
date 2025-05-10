// Se importan las funciones de scraping de las APIs externas
const { obtenerNoticiasGNews } = require('./gnews');           // Scraper para GNews
const { obtenerNoticiasGoogle } = require('./googleapi');      // Scraper para Google Custom Search

// Función principal asincrónica que obtiene noticias desde múltiples fuentes
async function obtenerNoticias() {
    try {
        // Se ejecutan ambas funciones en paralelo utilizando Promise.all para mayor eficiencia
        const [
            noticiasGNews,
            noticiasGoogle
        ] = await Promise.all([
            obtenerNoticiasGNews(),     // Consulta a la API de GNews
            obtenerNoticiasGoogle()     // Consulta a la API de Google
        ]);

        // Se combinan los resultados de ambas fuentes en un solo arreglo
        return [
            ...noticiasGNews,
            ...noticiasGoogle
        ];
    } catch (error) {
        // En caso de error, se muestra en consola y se retorna un arreglo vacío
        console.error('❌ Error general al obtener noticias:', error);
        return [];
    }
}

// Exporta la función para que pueda ser utilizada en otros módulos del sistema
module.exports = { obtenerNoticias };