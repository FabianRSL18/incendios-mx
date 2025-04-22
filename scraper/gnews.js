const axios = require('axios');

const API_KEY = '4732133930d802f4acf9b7413fc4132a'; // ← reemplaza con tu clave real

async function obtenerNoticiasGNews() {
    const url = `https://gnews.io/api/v4/search?q=incendios forestales AND mexico&lang=es&country=mx&max=10&token=${API_KEY}`;

    try {
        const { data } = await axios.get(url);

        return data.articles.map(article => ({
            fuente: article.source.name,
            titulo: article.title,
            resumen: article.description,
            link: article.url,
            fecha: article.publishedAt
        }));
    } catch (error) {
        console.error('❌ Error en GNews API:', error.message);
        return [];
    }
}

module.exports = { obtenerNoticiasGNews };
