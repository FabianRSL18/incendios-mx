const fs = require('fs');
const path = require('path');

// Cargar y parsear el archivo GeoJSON de municipios
const geoData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../public/data/mexico.json'), 'utf8')
);

// Crear una lista de municipios con su estado
const municipios = geoData.features.map(f => ({
    municipio: f.properties.NOMGEO.toLowerCase(),
    estado: f.properties.NOM_ENT.toLowerCase()
}));

// Función principal
function detectarUbicacion(texto) {
    const textoLower = texto.toLowerCase();

    // Buscar municipio
    const municipioCoincidente = municipios.find(m => textoLower.includes(m.municipio));
    if (municipioCoincidente) {
        return {
        estado: capitalizar(municipioCoincidente.estado),
        municipio: capitalizar(municipioCoincidente.municipio)
        };
    }

    // Buscar solo por estado
    const estados = [...new Set(municipios.map(m => m.estado))];
    const estadoCoincidente = estados.find(e => textoLower.includes(e));
    if (estadoCoincidente) {
        return {
        estado: capitalizar(estadoCoincidente),
        municipio: null
        };
    }

    return { estado: null, municipio: null };
}

// Función para capitalizar texto
function capitalizar(texto) {
    return texto
        .split(' ')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

module.exports = { detectarUbicacion };