const { obtenerNoticiasGNews } = require('./gnews');
const { obtenerNoticiasGoogle } = require('./googleapi');

async function obtenerNoticias() {
    try {
        const [
            noticiasGNews,
            noticiasGoogle
        ] = await Promise.all([
            obtenerNoticiasGNews(),
            obtenerNoticiasGoogle()
        ]);

        return [
            ...noticiasGNews,
            ...noticiasGoogle
        ];
    } catch (error) {
        console.error('❌ Error general al obtener noticias:', error);
        return [];
    }
}

module.exports = { obtenerNoticias };