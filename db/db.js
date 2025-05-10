// Se manda a llamar la librería mongoose, que permite interactuar con bases de datos MongoDB
const mongoose = require('mongoose');

// Se establece la conexión a la base de datos 'incendios' en el host local
// Si no existe, mongoose la crea automáticamente
mongoose.connect('mongodb://127.0.0.1:27017/incendios');

// Se define un esquema para almacenar noticias relacionadas con incendios
const noticiaSchema = new mongoose.Schema({
    titulo: String,         // Título de la noticia
    resumen: String,        // Resumen breve de la noticia
    fuente: String,         // Fuente que publicó la noticia
    link: String,           // Enlace a la noticia original
    estado: String,         // Estado al que se refiere la noticia
    municipio: String,      // Municipio involucrado
    fecha: String,          // Fecha de publicación o del evento
    keywords: [String]      // Palabras clave relacionadas
});

// Se crea el modelo 'Noticia' basado en el esquema definido
const Noticia = mongoose.model('Noticia', noticiaSchema);

// Se define un nuevo esquema para reportes de usuarios sobre incendios
const reporteSchema = new mongoose.Schema({
    descripcion: String,     // Descripción proporcionada por el usuario
    coordenadas: {
        lat: Number,         // Latitud del evento reportado
        lng: Number          // Longitud del evento reportado
    },
    estado: String,          // Estado donde ocurrió el evento
    municipio: String,       // Municipio correspondiente
    imagen: String,          // Ruta de la imagen enviada
    fecha: {                 // Fecha de envío del reporte
        type: Date,
        default: Date.now
    },
    estadoModeracion: {      // Estado de revisión del reporte
        type: String,
        enum: ['pendiente', 'revisado', 'falso'],
        default: 'pendiente'
    }
});

// Se crea el modelo 'Reporte' basado en el esquema anterior
const Reporte = mongoose.model('Reporte', reporteSchema);

// Función asincrónica que obtiene un ranking de noticias por estado
async function obtenerRankingPorEstado() {
    const resultado = await Noticia.aggregate([
        // Se filtran documentos que tengan el campo 'estado' no nulo
        { $match: { estado: { $ne: null } } },
        // Se agrupan por estado (en minúsculas), contando la cantidad de noticias por estado
        { $group: { _id: { $toLower: "$estado" }, cantidad: { $sum: 1 } } },
        // Se ordena de mayor a menor según la cantidad
        { $sort: { cantidad: -1 } }
    ]);

    // Se devuelve un arreglo de objetos con 'estado' y 'cantidad'
    return resultado.map(r => ({ estado: r._id, cantidad: r.cantidad }));
}

// Exportamos los modelos y la función para que puedan usarse en otros archivos
module.exports = {
    Noticia,
    Reporte,
    obtenerRankingPorEstado
};