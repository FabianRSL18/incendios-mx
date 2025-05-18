// navbar.js

async function loadNavbar() {
    // 1) Consulta al servidor si hay usuario logueado
    let auth = { loggedIn: false };
    try {
        const resp = await fetch('/api/auth/status', {
            credentials: 'same-origin'  // <–– obligatorio para que llegue la cookie
        });
        auth = await resp.json();
    } catch (e) {
        console.warn('No se pudo consultar el estado de auth:', e);
    }

    // 2) Decide qué sección de usuario mostrar
    let userSection = '';
    if (auth.loggedIn) {
        // Si tiene avatar, lo muestra; si no, icono genérico
        const avatarHtml = auth.avatar
            ? `<img src="${auth.avatar}" class="rounded-circle" style="width:2rem;height:2rem;">`
            : `<i class="bi bi-person-circle" style="font-size:1.5rem;"></i>`;

        userSection = `
      <div class="dropdown text-white">
        <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" data-bs-toggle="dropdown">
          ${avatarHtml}
          <span class="ms-2">${auth.username}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          ${auth.role === 'admin'
            ? `<li><a class="dropdown-item" href="moderacion.html">
                 <i class="bi bi-shield-check"></i> Moderación
               </a></li>`
            : ''
        }
          <li><hr class="dropdown-divider"></li>
          <li>
            <a class="dropdown-item" href="/auth/logout">
              <i class="bi bi-box-arrow-right"></i> Cerrar sesión
            </a>
          </li>
        </ul>
      </div>
    `;
    } else {
        userSection = `
      <a href="login.html" class="btn btn-outline-light me-2">
        <i class="bi bi-box-arrow-in-right"></i> Login
      </a>
      <a href="register.html" class="btn btn-primary">
        <i class="bi bi-person-plus"></i> Registro
      </a>
    `;
    }

    // 3) Construye el HTML completo de la navbar
    const html = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div class="container">
        <a class="navbar-brand" href="index.html" style="font-family:Poppins; font-weight:bold;">
          <img src="./images/logo.png" style="height:2.5rem;"> incendiosMX
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class="nav-link" href="index.html" id="nav-index"><i class="bi bi-house-door"></i> Inicio</a></li>
            <li class="nav-item"><a class="nav-link" href="noticias.html" id="nav-noticias"><i class="bi bi-newspaper"></i> Noticias</a></li>
            <li class="nav-item"><a class="nav-link" href="mapa.html" id="nav-mapa"><i class="bi bi-map"></i> Mapa</a></li>
            <li class="nav-item"><a class="nav-link" href="estadisticas.html" id="nav-estadisticas"><i class="bi bi-graph-up"></i> Estadísticas</a></li>
            <li class="nav-item"><a class="nav-link" href="reportar.html" id="nav-reportar"><i class="bi bi-exclamation-triangle"></i> Reportar</a></li>
          </ul>
          <div class="d-flex align-items-center">
            ${userSection}
          </div>
        </div>
      </div>
    </nav>
  `;

    // 4) Inserta la navbar en el DOM
    document.body.insertAdjacentHTML('afterbegin', html);

    // 5) Marca la pestaña activa
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const base = current.split('.')[0];
    const activeLink = document.getElementById(`nav-${base}`);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
    }
}

document.addEventListener('DOMContentLoaded', loadNavbar);
