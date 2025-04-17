const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/incendios');


const noticiaSchema = new mongoose.Schema({
    titulo: String,
    resumen: String,
    fuente: String,
    link: String,
    estado: String,
    fecha: String,
    keywords: [String]
});

const Noticia = mongoose.model('Noticia', noticiaSchema);

async function obtenerRankingPorEstado() {
    const resultado = await Noticia.aggregate([
        { $match: { estado: { $ne: null } } },
        { $group: { _id: { $toLower: "$estado" }, cantidad: { $sum: 1 } } },
        { $sort: { cantidad: -1 } }
    ]);

    return resultado.map(r => ({ estado: r._id, cantidad: r.cantidad }));
}

module.exports = { Noticia, obtenerRankingPorEstado };
