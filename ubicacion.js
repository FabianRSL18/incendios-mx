const ubicacionesMX = [
    { estado: "Aguascalientes", patrones: [/aguascalientes/i] },
    { estado: "Baja California", patrones: [/baja\s?california(?!\s?sur)/i] },
    { estado: "Baja California Sur", patrones: [/baja\s?california\s?sur/i] },
    { estado: "Campeche", patrones: [/campeche/i] },
    { estado: "CDMX", patrones: [/ciudad\s+de\s+m[eé]xico|cdmx|d\.f\./i] },
    { estado: "Chiapas", patrones: [/chiapas/i] },
    { estado: "Chihuahua", patrones: [/chihuahua/i] },
    { estado: "Coahuila", patrones: [/coahuila/i] },
    { estado: "Colima", patrones: [/colima/i] },
    { estado: "Durango", patrones: [/durango/i] },
    { estado: "Estado de México", patrones: [/estado\s+de\s+m[eé]xico/i] },
    { estado: "Guanajuato", patrones: [/guanajuato/i] },
    { estado: "Guerrero", patrones: [/guerrero/i] },
    { estado: "Hidalgo", patrones: [/hidalgo/i] },
    { estado: "Jalisco", patrones: [/jalisco/i] },
    { estado: "Michoacán", patrones: [/michoac[aá]n/i] },
    { estado: "Morelos", patrones: [/morelos/i] },
    { estado: "Nayarit", patrones: [/nayarit/i] },
    { estado: "Nuevo León", patrones: [/nuevo\s+le[oó]n/i] },
    { estado: "Oaxaca", patrones: [/oaxaca/i] },
    { estado: "Puebla", patrones: [/puebla/i] },
    { estado: "Querétaro", patrones: [/quer[eé]taro/i] },
    { estado: "Quintana Roo", patrones: [/quintana\s+roo/i] },
    { estado: "San Luis Potosí", patrones: [/san\s+luis\s+potos[ií]/i] },
    { estado: "Sinaloa", patrones: [/sinaloa/i] },
    { estado: "Sonora", patrones: [/sonora/i] },
    { estado: "Tabasco", patrones: [/tabasco/i] },
    { estado: "Tamaulipas", patrones: [/tamaulipas/i] },
    { estado: "Tlaxcala", patrones: [/tlaxcala/i] },
    { estado: "Veracruz", patrones: [/veracruz(?!ana)/i] },
    { estado: "Yucatán", patrones: [/yucat[aá]n/i] },
    { estado: "Zacatecas", patrones: [/zacatecas/i] }
];

function detectarEstado(texto) {
    for (const ubicacion of ubicacionesMX) {
        for (const patron of ubicacion.patrones) {
            if (patron.test(texto)) {
            return ubicacion.estado;
            }
        }
    }
    return null;
}

module.exports = {
    detectarEstado
};