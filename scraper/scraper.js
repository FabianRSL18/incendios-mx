const axios = require('axios');
const cheerio = require('cheerio');
const API_KEY = '4732133930d802f4acf9b7413fc4132a';

async function obtenerNoticiasElUniversal() {
    const url = 'https://www.eluniversal.com.mx/tag/incendios-forestales';
    const noticias = [];

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        $('article').each((i, el) => {
            const titulo = $(el).find('h2, h3').text().trim();
            const link = $(el).find('a').attr('href');
            const resumen = $(el).find('p').text().trim();

            // Extrae la fecha del span con clase sc__author--date si existe en el HTML
            const fechaRaw = $(el).find('span.sc__author--date').text();
            const fecha = fechaRaw.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;

            if (titulo.toLowerCase().includes("incendio") || resumen.toLowerCase().includes("forestal")) {
                noticias.push({
                    fuente: 'El Universal',
                    titulo,
                    link: link.startsWith('http') ? link : `https://www.eluniversal.com.mx${link}`,
                    resumen,
                    fecha
                });
            }
        });

        return noticias;
    } catch (error) {
        console.error("Error al hacer scraping de El Universal:", error.message);
        return [];
    }
}


async function obtenerNoticiasMilenio() {
    const url = 'https://www.milenio.com/temas/incendios-forestales';
    const noticias = [];

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        $('li.lr-list-row-row-news').each((i, el) => {
            const titulo = $(el).find('h2.lr-list-row-row-news__title a').text().trim();
            const link = 'https://www.milenio.com' + $(el).find('h2.lr-list-row-row-news__title a').attr('href');
            const resumen = $(el).find('.lr-list-row-row-news__abstract').text().trim();

            if (titulo && resumen) {
                noticias.push({
                    fuente: 'Milenio',
                    titulo,
                    resumen,
                    link
                });
            }
        });

        return noticias;
    } catch (error) {
        console.error('Error obteniendo noticias de Milenio:', error.message);
        return [];
    }
}

async function obtenerNoticiasExcelsior() {
    const url = 'https://www.excelsior.com.mx/buscador?texto=incendios+forestales+mexico';
    const noticias = [];
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        $('.node-title').each((i, el) => {
            const titulo = $(el).find('a').text().trim();
            const link = $(el).find('a').attr('href');
            const resumen = $(el).next('.field-content').text().trim(); // puede variar

            if (titulo && link) {
                noticias.push({
                    fuente: 'Excélsior',
                    titulo,
                    resumen: resumen || '',
                    link: link.startsWith('http') ? link : `https://www.excelsior.com.mx${link}`
                });
            }
        });
    } catch (error) {
        console.error('Error obteniendo noticias de Excélsior:', error.message);
    }

    return noticias;
}

async function buscarNoticiasAPI() {
    const url = `https://gnews.io/api/v4/search?q=incendios+forestales+AND+mexico&lang=es&country=mx&max=10&token=${API_KEY}`;



    try {
        const { data } = await axios.get(url);

        return data.articles.map(article => ({
            fuente: article.source.name,
            titulo: article.title,
            resumen: article.description,
            link: article.url
        }));
    } catch (error) {
        console.error('Error con la API de GNews:', error.message);
        return [];
    }
}

module.exports = {
    obtenerNoticias: async () => {
        const noticiasElUniversal = await obtenerNoticiasElUniversal();
        const noticiasMilenio = await obtenerNoticiasMilenio();
        const noticiasAPI = await buscarNoticiasAPI();
    
        return [...noticiasElUniversal, 
                ...noticiasMilenio, 
                ...noticiasAPI];
    }
};


