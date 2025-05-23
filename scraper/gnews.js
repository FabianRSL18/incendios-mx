// Se importa la librería 'axios', que permite realizar peticiones HTTP
const axios = require('axios');

// Clave de acceso (API key) para usar el servicio de noticias GNews
const API_KEY = '';

// Función asincrónica que consulta noticias sobre incendios forestales en México desde la API de GNews
async function obtenerNoticiasGNews() {
    // URL de la solicitud a la API de GNews con parámetros de búsqueda
    const url = `https://gnews.io/api/v4/search?q=incendios forestales AND mexico&lang=es&country=mx&max=10&token=${API_KEY}`;

    try {
        // Realiza una petición GET a la API usando axios
        const { data } = await axios.get(url);

        // Transforma la respuesta en un arreglo con solo los campos relevantes
        return data.articles.map(article => ({
            fuente: article.source.name,   // Nombre del medio de comunicación
            titulo: article.title,         // Título de la noticia
            resumen: article.description,  // Breve descripción o resumen
            link: article.url,             // Enlace a la noticia completa
            fecha: article.publishedAt     // Fecha de publicación
        }));
    } catch (error) {
        // En caso de error, muestra el mensaje en consola y retorna un arreglo vacío
        console.error('❌ Error en GNews API:', error.message);
        return [];
    }
}

// Exporta la función para que pueda ser utilizada en otros archivos del proyecto
module.exports = { obtenerNoticiasGNews };
