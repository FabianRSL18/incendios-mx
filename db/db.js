// Se manda a llamar librerias
const mongoose = require('mongoose');

// Conectamos a nuestra base / de no tener se crea
mongoose.connect('mongodb://127.0.0.1:27017/incendios');

// Esquema en que se insertaran las noticias en mongo
const noticiaSchema = new mongoose.Schema({
    titulo: String,
    resumen: String,
    fuente: String,
    link: String,
    estado: String,
    municipio: String,
    fecha: String,
    keywords: [String]
});

const Noticia = mongoose.model('Noticia', noticiaSchema);

// Nuevo esquema para los reportes de usuarios
const reporteSchema = new mongoose.Schema({
    descripcion: String,
    coordenadas: {
        lat: Number,
        lng: Number
    },
    imagen: String,  // ruta del archivo
    fecha: { type: Date, default: Date.now }
});

const Reporte = mongoose.model('Reporte', reporteSchema);

// Ranking por estado
async function obtenerRankingPorEstado() {
    const resultado = await Noticia.aggregate([
        { $match: { estado: { $ne: null } } },
        { $group: { _id: { $toLower: "$estado" }, cantidad: { $sum: 1 } } },
        { $sort: { cantidad: -1 } }
    ]);

    return resultado.map(r => ({ estado: r._id, cantidad: r.cantidad }));
}

// Exportar los modelos
module.exports = {
    Noticia,
    Reporte,
    obtenerRankingPorEstado
};

