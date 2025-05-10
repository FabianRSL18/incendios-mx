// Se importan los módulos nativos de Node.js para manejo de archivos y rutas
const fs = require('fs');
const path = require('path');

// Cargar y parsear el archivo GeoJSON que contiene los municipios y estados de México
// El archivo debe estar ubicado en: /public/data/mexico.json
const geoData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../public/data/mexico.json'), 'utf8')
);

// Se crea un arreglo de objetos con nombres de municipio y estado, en minúsculas para facilitar la comparación
const municipios = geoData.features.map(f => ({
    municipio: f.properties.NOMGEO.toLowerCase(),     // Nombre del municipio
    estado: f.properties.NOM_ENT.toLowerCase()        // Nombre del estado
}));

// Función principal que detecta estado y municipio mencionados dentro de un texto
function detectarUbicacion(texto) {
    const textoLower = texto.toLowerCase(); // Se convierte todo el texto a minúsculas para hacer comparación insensible a mayúsculas

    // Primero se intenta encontrar un municipio mencionado en el texto
    const municipioCoincidente = municipios.find(m => textoLower.includes(m.municipio));
    if (municipioCoincidente) {
        return {
            estado: capitalizar(municipioCoincidente.estado),
            municipio: capitalizar(municipioCoincidente.municipio)
        };
    }

    // Si no se encontró municipio, se intenta encontrar un estado mencionado
    const estados = [...new Set(municipios.map(m => m.estado))];  // Lista única de estados
    const estadoCoincidente = estados.find(e => textoLower.includes(e));
    if (estadoCoincidente) {
        return {
            estado: capitalizar(estadoCoincidente),
            municipio: null
        };
    }

    // Si no se encontró ni estado ni municipio, se retorna nulo
    return { estado: null, municipio: null };
}

// Función auxiliar que convierte a mayúscula la primera letra de cada palabra
function capitalizar(texto) {
    return texto
        .split(' ')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

// Exporta la función detectarUbicacion para su uso en otros archivos
module.exports = { detectarUbicacion };