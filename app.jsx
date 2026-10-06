import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css'; // Mantenemos tu archivo de estilos intacto

function App() {
  const [vistaActual, setVistaActual] = useState('login'); // 
  // Este bloque carga el mapa SOLO cuando la vista actual es 'home'
  useEffect(() => {
    if (vistaActual === 'home') {
      //  Inicializamos el mapa centrado en el Tecnológico de Matamoros
      const map = window.L.map('map').setView([25.8540, -97.5140], 15); 

      //  Cargamos las texturas de OpenStreetMap
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      //  Agregamos un marcador de prueba para la ruta
      window.L.marker([25.8540, -97.5140]).addTo(map)
        .bindPopup('Zona Tecnológico')
        .openPopup();

      //  Limpieza: destruye el mapa viejo si cambias de vista, para evitar errores de Leaflet
      return () => {
        map.remove();
      };
    }
  }, [vistaActual]);

  return (
    <>
      {/* VISTA 1: INICIO DE SESIÓN */}
      {vistaActual === 'login' && (
        <div id="login-view" className="view active">
          <video autoPlay muted loop id="video-fondo">
            <source src="tu_video_de_fondo.mp4" type="video/mp4" />
          </video>
          <div className="overlay"></div>
          <div className="login-container">
            <h1>TrashRoutes</h1>
            <p>Rastreo de recolección en tiempo real</p>
            <form id="login-form">
              <input type="email" id="email" placeholder="Correo electrónico" required />
              <input type="password" id="password" placeholder="Contraseña" required />
              {/* Al hacer clic, simulamos el login y cambiamos a la vista 'home' */}
              <button type="button" onClick={() => setVistaActual('home')}>Iniciar Sesión</button>
            </form>
            <p className="register-link">
              <a href="#" id="link-to-register" onClick={() => setVistaActual('register')}>¿No tienes cuenta? Regístrate aquí</a>
            </p>
          </div>
        </div>
      )}

      {/* VISTA 2: REGISTRO */}
      {vistaActual === 'register' && (
        <div id="register-view" className="view active">
          <video autoPlay muted loop id="video-fondo-reg">
            <source src="tu_video_de_fondo.mp4" type="video/mp4" />
          </video>
          <div className="overlay"></div>
          <div className="login-container">
            <h1>Crear Cuenta</h1>
            <form id="register-form">
              <input type="text" id="reg-name" placeholder="Nombre de usuario" required />
              <input type="email" id="reg-email" placeholder="Correo electrónico" required />
              <input type="password" id="reg-password" placeholder="Contraseña" required />
              <input type="password" id="reg-password-confirm" placeholder="Repetir contraseña" required />
              
              <div className="permissions-group">
                <label><input type="checkbox" id="perm-location" /> Permitir uso de mi ubicación en tiempo real</label>
                <label><input type="checkbox" id="perm-notifications" /> Recibir alertas y notificaciones push</label>
              </div>

              <div className="tyc-group">
                <label>
                  <input type="checkbox" id="accept-tyc" /> 
                  Acepto los <a href="#" id="link-tyc">Términos y Condiciones y Políticas de Privacidad</a>
                </label>
              </div>

              <button type="button" id="btn-register" onClick={() => setVistaActual('home')}>Registrarse</button>
            </form>
            <p className="register-link">
              <a href="#" id="link-to-login" onClick={() => setVistaActual('login')}>¿Ya tienes cuenta? Inicia sesión</a>
            </p>
          </div>
        </div>
      )}

      {/* VISTA 3: HOME / MAPA */}
      {vistaActual === 'home' && (
        <div id="home-view" className="view active">
          <div id="sidebar" className="sidebar">
            <div className="profile-info">
              <div className="avatar">👤</div>
              <h3 id="user-name">Sergio D'banhi</h3>
              <p id="user-email">dbas@tecnologico.edu.mx</p>
            </div>
            <hr />
            <button id="logout-btn" className="logout-btn" onClick={() => setVistaActual('login')}>Cerrar Sesión</button>
          </div>

          <nav className="navbar">
            <button id="menu-btn" className="menu-btn">☰</button>
            <h2>TrashRoutes</h2>
            <button id="btn-ver-reportes" className="report-btn">Ver Reportes</button>
          </nav>

          <main className="main-content">
            <div id="map-container">
              <div id="map" style={{ height: '400px', width: '100%' }}>
                  {/* El código de inicialización del mapa de Leaflet irá aquí más adelante */}
              </div>
            </div>
            <div className="info-panel">
              <div className="location-header">
                <h3>📍 Zona: <span id="current-zone">Tecnológico</span></h3>
              </div>
              <div className="route-selector">
                <label htmlFor="rutas-cercanas">Rutas cercanas:</label>
                <div className="selector-row">
                  <select id="rutas-cercanas">
                      <option>Ruta 1 - Tecnológico</option>
                  </select>
                  <button id="btn-mi-ubicacion" title="Mostrar mi ubicación real">📍 Mi ubicación</button>
                </div>
                <p id="mis-coordenadas" className="coordenadas-text">Coordenadas: Buscando...</p>
                <p id="eta-text" className="eta-text hidden">Llegada estimada del camión: Calculando...</p>
              </div>
              <div className="schedule-info" style={{ marginTop: '10px' }}>
                <h4>Horario de recolección</h4>
                <p><strong>Días:</strong> <span id="route-days">Lunes, Miércoles, Viernes</span></p>
                <p><strong>Horario:</strong> <span id="route-time">08:00 AM - 12:00 PM</span></p>
              </div>
            </div>
          </main>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);