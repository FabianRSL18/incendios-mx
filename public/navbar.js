// navbar.js - Versión corregida
function loadNavbar() {
    const navbarHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div class="container">
            <a class="navbar-brand" href="index.html">
                <i class="bi bi-shield-shaded me-2"></i>Plataforma
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="index.html" id="nav-index">
                            <i class="bi bi-house-door"></i> Inicio
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="noticias.html" id="nav-noticias">
                            <i class="bi bi-newspaper"></i> Noticias
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="mapa.html" id="nav-mapa">
                            <i class="bi bi-map"></i> Mapa
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="estadisticas.html" id="nav-estadisticas">
                            <i class="bi bi-graph-up"></i> Estadísticas
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="reportar.html" id="nav-reportar">
                            <i class="bi bi-exclamation-triangle"></i> Reportar
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="moderacion.html" id="nav-moderacion">
                            <i class="bi bi-shield-check"></i> Moderación
                        </a>
                    </li>
                </ul>
                <div class="d-flex">
                    <a href="#" class="btn btn-outline-light me-2">
                        <i class="bi bi-box-arrow-in-right"></i> Login
                    </a>
                    <a href="#" class="btn btn-primary">
                        <i class="bi bi-person-plus"></i> Registro
                    </a>
                </div>
            </div>
        </div>
    </nav>
    `; // <-- Asegúrate que este backtick esté presente

    // Insertar la navbar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // Marcar la página activa
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItem = document.getElementById(`nav-${currentPage.split('.')[0]}`);
    if (navItem) {
        navItem.classList.add('active');
        navItem.setAttribute('aria-current', 'page');
    }
}

// Cargar la navbar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadNavbar);