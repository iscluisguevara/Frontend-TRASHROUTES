import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function App() {
  const [vistaActual, setVistaActual] = useState('login');
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (vistaActual === 'home') {
      const map = window.L.map('map').setView([25.8540, -97.5140], 15); 

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      window.L.marker([25.8540, -97.5140]).addTo(map)
        .bindPopup('Zona Tecnológico')
        .openPopup();

      return () => {
        map.remove();
      };
    }
  }, [vistaActual]);

  const manejarLogin = async (e) => {
    e.preventDefault();

    const correoInput = document.getElementById('email-login').value; 
    const passwordInput = document.getElementById('password-login').value;

    try {
      const peticion = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo_electronico: correoInput,
          password: passwordInput
        })
      });

      const respuesta = await peticion.json();

      if (peticion.ok) {
        console.log("Token recibido:", respuesta.token);
        
        // Guardamos los datos reales del usuario
        localStorage.setItem('token', respuesta.token);
        localStorage.setItem('nombre', respuesta.nombre);
        localStorage.setItem('correo', respuesta.correo);
        
        setVistaActual('home'); 
      } else {
        alert(respuesta.error || "Correo o contraseña incorrectos");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor de Django.");
    }
  };

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
              <input type="email" id="email-login" placeholder="Correo electrónico" required />
              <input type="password" id="password-login" placeholder="Contraseña" required />
              <button type="button" onClick={manejarLogin}>Iniciar Sesión</button>
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
        <div id="home-view" className="view active" style={{ position: 'relative' }}>
          
          {menuAbierto && (
            <div 
              onClick={() => setMenuAbierto(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1500
              }}
            ></div>
          )}

          <div id="sidebar" className={`sidebar ${menuAbierto ? 'active' : ''}`} style={{ zIndex: 2000 }}>
            <button 
              onClick={() => setMenuAbierto(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '22px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <div className="profile-info">
              <div className="avatar">👤</div>
              {/* Leemos el nombre y correo guardados */}
              <h3 id="user-name">{localStorage.getItem('nombre') || 'Usuario'}</h3>
              <p id="user-email">{localStorage.getItem('correo') || 'correo@ejemplo.com'}</p>
            </div>
            <hr />

            <button id="logout-btn" className="logout-btn" onClick={() => {
                setVistaActual('login');
                setMenuAbierto(false);
            }}>Cerrar Sesión</button>
          </div>

          <nav className="navbar">
            <button id="menu-btn" className="menu-btn" onClick={() => setMenuAbierto(!menuAbierto)}>☰</button>
            <h2>TrashRoutes</h2>
            <button id="btn-ver-reportes" className="report-btn">Ver Reportes</button>
          </nav>

          <main className="main-content">
            <div id="map-container">
              <div id="map" style={{ height: '400px', width: '100%' }}></div>
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