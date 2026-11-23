"use strict";
import React, { useState, useEffect, useRef, StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

// ==========================================
// 1. FUNCIONES AUXILIARES GLOBALES
// ==========================================
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const obtenerUrlImagen = (url) => {
  if (!url) return '';
  const hostActual = window.location.hostname;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('127.0.0.1', hostActual).replace('localhost', hostActual);
  }
  return `http://${hostActual}:8000${url}`;
};

const mostrarVistaPrevia = (e) => {
  const archivo = e.target.files[0];
  const imgEtiqueta = document.getElementById('imagen-de-formulario');
  if (archivo) {
    const urlTemporal = URL.createObjectURL(archivo);
    imgEtiqueta.src = urlTemporal;
    imgEtiqueta.style.display = 'block';
  } else {
    imgEtiqueta.src = "";
    imgEtiqueta.style.display = 'none';
  }
};

async function mandar_ubicacion(longitude, latitude, colonia, calle, codigopostal) {
  try {
    const peticion = await fetch('/api/guardar-ubi-usuario/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${localStorage.getItem('token')}`,
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({
        longitud: longitude,
        latitud: latitude,
        colonia: colonia,
        calle: calle,
        codigopostal: codigopostal,
      })
    });
    if (peticion.status === 200) {
      alert("Se guardó con éxito la ubicación");
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    alert("No se pudo conectar con el servidor de Django.");
  }
}

async function tiene_ubicacion_usuario() {
  const url = '/api/usuario-tiene-ubicacion/';
  const config = {
    method: 'GET',
    cache: "no-store",
    headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
  };
  const response = await fetch(url, config);
  const data = await response.json();
  return data['tiene_ubicacion'];
}

// Ícono de camión personalizado
const iconoCamion = new window.L.divIcon({
  html: '<div style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); cursor: pointer;">🚛</div>',
  className: 'truck-div-icon',
  iconSize: [35, 35],
  iconAnchor: [17, 17]
});

// Función para simular el avance del camión
function animarCamion(marker, puntosRuta) {
  let index = 0;
  setInterval(() => {
    if (index < puntosRuta.length) {
      marker.setLatLng(puntosRuta[index]);
      index++;
    } else {
      index = 0; 
    }
  }, 3000); 
}


// ==========================================
// 2. COMPONENTES SECUNDARIOS (Modales y Vistas)
// ==========================================
export function ModalCarga({ isOpen, texto = "Cargando..." }) {
  if (!isOpen) return null;
  return (
    <div className="overlay-carga">
      <div className="spinner-animado"></div>
      <p className="texto-carga">{texto}</p>
    </div>
  );
}

function ModalReporte({ isOpen, onClose, onSave }) {
  if (!isOpen) return null;

  const comprimirImagen = (archivo, maxWidth = 1000, maxQuality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const base64Comprimido = canvas.toDataURL('image/jpeg', maxQuality);
          resolve(base64Comprimido);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const archivo = formData.get('imagen');

    if (!archivo || archivo.size === 0) {
      alert("Debe adjuntar una imagen.");
      return;
    }

    try {
      const imagenBase64 = await comprimirImagen(archivo);
      await onSave({
        titulo: formData.get('titulo'),
        texto: formData.get('texto'),
        imagen: imagenBase64
      });
    } catch (error) {
      console.error("Error al comprimir la imagen:", error);
      alert("No se pudo procesar la foto. Intenta con otra imagen.");
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
      <dialog open style={{ position: 'relative', maxHeight: '85vh', overflowY: 'auto', display: 'block', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '450px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backgroundColor: '#fff', color: '#333' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#1a1a1a' }}>Generar Reporte</h3>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold', fontSize: '14px' }}>Título:
            <input type="text" name="titulo" required style={{ marginTop: '5px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold', fontSize: '14px' }}>Imagen del Reporte:
            <input type="file" name="imagen" required style={{ marginTop: '5px' }} onChange={mostrarVistaPrevia} />
            <img src='' id="imagen-de-formulario" style={{ width: '100%', display: 'none' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold', fontSize: '14px' }}>Texto:
            <textarea name="texto" required style={{ marginTop: '5px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '100px', resize: 'vertical' }}></textarea>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f3f5', color: '#333', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
            <button type="submit" style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Publicar</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function VistaPerfil({ setVistaActual }) {
  const [datosPerfil, setDatosPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const peticion = await fetch('/api/ver-mi-perfil/', {
          method: 'GET',
          cache: "no-store",
          headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
        });
        const data = await peticion.json();
        if (!peticion.ok && data.requiere_ubicacion) {
          alert("⚠️ " + data.mensaje);
          setVistaActual('home');
          return;
        }
        setDatosPerfil(data);
        setCargando(false);
      } catch (error) {
        console.error("Error cargando el perfil:", error);
        setCargando(false);
      }
    };
    cargarPerfil();
  }, []);

  if (cargando) return <div style={{ color: 'white', padding: '50px', textAlign: 'center', fontSize: '20px' }}>Cargando perfil...</div>;
  if (!datosPerfil) return null;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <button onClick={() => setVistaActual('home')} style={{ backgroundColor: '#1abc9c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px', fontSize: '16px' }}>
        ← Volver al Mapa
      </button>

      <div style={{ backgroundColor: '#1a222f', borderRadius: '15px', padding: '24px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h2 style={{ marginTop: 0, color: '#1abc9c', borderBottom: '1px solid #2c3e50', paddingBottom: '10px' }}>👤 {datosPerfil.nombre}</h2>
        <p style={{ fontSize: '18px', margin: '10px 0' }}><strong>Correo:</strong> {datosPerfil.correo_electronico}</p>
        <h3 style={{ marginTop: '20px', color: '#1abc9c' }}>📍 Dirección Registrada</h3>
        <p style={{ fontSize: '16px', margin: '5px 0' }}><strong>Calle:</strong> {datosPerfil.direccion.calle}</p>
        <p style={{ fontSize: '16px', margin: '5px 0' }}><strong>Código Postal:</strong> {datosPerfil.direccion.codigo_postal}</p>
      </div>

      <h2 style={{ color: '#1abc9c', marginBottom: '20px' }}>📋 Mis Reportes</h2>
      {datosPerfil.reportes && datosPerfil.reportes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {datosPerfil.reportes.map((reporte) => (
            <div key={reporte.id} style={{ backgroundColor: '#1a222f', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px' }}>{reporte.titulo}</h3>
              <p style={{ marginBottom: '15px', fontSize: '16px', lineHeight: '1.5' }}>{reporte.texto}</p>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
                <p style={{ margin: '0' }}>📍 {reporte.calle}, {reporte.colonia}</p>
              </div>
              {reporte.imagen && <img src={obtenerUrlImagen(reporte.imagen)} alt="Foto del reporte" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '10px', marginTop: '10px' }} />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: '#1a222f', borderRadius: '15px', padding: '30px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0 }}>Aún no has creado ningún reporte.</p>
        </div>
      )}
    </div>
  );
}


const INCIDENCIAS = [
  { id: 'ACCIDENTE', label: '🚨 Accidente Vial', color: '#dc3545' },
  { id: 'FALLA', label: '🛠️ Falla Mecánica', color: '#fd7e14' },
  { id: 'CLIMA', label: '🌧️ Mal Clima', color: '#0d6efd' },
  { id: 'POSPUESTO', label: '⏰ Ruta Pospuesta', color: '#6f42c1' }
];

function PanelChofer({ setVistaActual }) {
  const [listaCamiones, setListaCamiones] = useState([]);
  const [camion, setCamion] = useState(null);
  const mapRefChofer = useRef(null);
  const routingControlRef = useRef(null);

  // 1. Obtener las rutas desde Django
  useEffect(() => {
    const cargarCamiones = async () => {
      try {
        const response = await fetch('/api/obtener-rutas-camion/', {
          headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        setListaCamiones(data.lista_ruta);

        if (data.lista_ruta && data.lista_ruta.length > 0) {
          setCamion(data.lista_ruta[0]);
        }
      } catch (error) {
        console.error("Error al cargar rutas desde Django:", error);
      }
    };
    cargarCamiones();
  }, []);

  // 2. Inicializar mapa y trazar ruta inteligente
  useEffect(() => {
    // FRENO 1: No hacer nada si no hay camión
    if (!camion) return;

    // FRENO 2: Asegurar que el contenedor HTML existe antes de llamar a Leaflet
    const mapContainer = document.getElementById('mapa-chofer');
    if (!mapContainer) return;

    // FRENO 3: Validar coordenadas (Evita el error 'lat')
    let centro = [25.8655, -97.5115]; // Coordenadas por defecto (Tecnológico)
    let coordenadas = [];

    try {
      // 1. Convertir el JSON (maneja tanto string como objeto ya convertido)
      const centroParsed = typeof camion.centro_mapa === 'string' ? JSON.parse(camion.centro_mapa) : camion.centro_mapa;
      const coordParsed = typeof camion.ruta_coordenadas === 'string' ? JSON.parse(camion.ruta_coordenadas) : camion.ruta_coordenadas;

      // 2. Extraer los arreglos usando las llaves exactas que definiste en Django
      const arregloCentro = centroParsed.coordenadas || centroParsed;
      const arregloRuta = coordParsed.rutaCoordenadas || coordParsed;

      // 3. Validar longitud y asignar
      if (arregloCentro && arregloCentro.length === 2) {
        centro = arregloCentro;
      }

      if (arregloRuta && arregloRuta.length > 0) {
        coordenadas = arregloRuta;
      }
    } catch (e) {
      console.warn("Error leyendo coordenadas de Django, usando valores por defecto.");
    }

    // Inicializar mapa de forma segura
    if (!mapRefChofer.current) {
      mapRefChofer.current = window.L.map('mapa-chofer').setView(centro, 14);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRefChofer.current);
    } else {
      mapRefChofer.current.setView(centro, 14);
    }

    if (routingControlRef.current) {
      mapRefChofer.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Trazar ruta solo si hay coordenadas válidas
    if (coordenadas.length > 0 && coordenadas[0] != null) {
      const puntosRuta = coordenadas.map(coord => window.L.latLng(coord[0], coord[1]));

      routingControlRef.current = window.L.Routing.control({
        waypoints: puntosRuta,
        lineOptions: {
          styles: [{ color: '#198754', weight: 6 }]
        },
        show: false,
        addWaypoints: false,
        createMarker: () => null
      }).addTo(mapRefChofer.current);

      const markerChofer = window.L.marker(puntosRuta[0], { icon: iconoCamion }).addTo(mapRefChofer.current);
      
      mapRefChofer.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        markerChofer.setLatLng([lat, lng]);
        
        // Guardar la nueva posición en la base de datos de Django
        mandar_ubicacion(lng, lat, "Zona Chofer", "Ruta Activa", camion.codigo_postal || "87470");
      });
    }

    return () => {
      if (mapRefChofer.current) {
        mapRefChofer.current.remove();
        mapRefChofer.current = null;
        routingControlRef.current = null;
      }
    };
  }, [camion]);

  // 3. Emitir la alerta
  const enviarAlerta = async (tipoIncidencia) => {
    // Si no tienes el codigo postal en el modelo de Django, usa uno por defecto o asegúrate de agregarlo
    const codigoPostal = camion.codigo_postal || "87470";

    const payload = {
      codigo_postal: codigoPostal,
      incidencia: tipoIncidencia,
      mensaje: `Aviso oficial: La ${camion.mombre_ruta} presenta un retraso por ${tipoIncidencia.toLowerCase()}.`
    };

    try {
      const response = await fetch('/api/emitir-alerta/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        alert(`¡Alerta enviada con éxito a los ciudadanos del C.P. ${codigoPostal}!`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
    }
  };

  if (!camion) {
    return (
      <div style={{ color: 'white', padding: '50px', textAlign: 'center', fontSize: '20px' }}>
        Cargando rutas o no hay unidades registradas en la base de datos...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#333', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#198754' }}>🚛 Consola Operativa</h2>
        <button onClick={() => { localStorage.clear(); setVistaActual('login'); }} style={{ backgroundColor: '#dc3545', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cerrar Sesión</button>
      </div>

      <select
        value={camion.id_ruta}
        // CAMBIO 1: Usar listaCamiones en lugar de CAMIONES_DISPONIBLES
        onChange={(e) => setCamion(listaCamiones.find(c => String(c.id_ruta) === String(e.target.value)))}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', fontSize: '16px' }}
      >
        {/* CAMBIO 2: Mapear sobre listaCamiones en lugar de CAMIONES_DISPONIBLES */}
        {listaCamiones.map(c => (
          <option key={c.id_ruta} value={c.id_ruta}>
            {c.mombre_ruta}
          </option>
        ))}
      </select>

      <div id="mapa-chofer" style={{ height: '350px', marginBottom: '20px', borderRadius: '10px', border: '2px solid #ccc' }}></div>

      <h3 style={{ marginTop: '20px' }}>⚠️ Reportar Eventualidad</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {INCIDENCIAS.map(inc => (
          <button key={inc.id} onClick={() => enviarAlerta(inc.id)} style={{ backgroundColor: inc.color, color: 'white', padding: '15px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: '1 1 150px' }}>
            {inc.label}
          </button>
        ))}
      </div>
    </div>
  );
}


// ==========================================
// 3. COMPONENTE PRINCIPAL (APP)
// ==========================================
function App() {
  // --- ESTADOS GLOBALES ---
  const [vistaActual, setVistaActual] = useState(() => {
    if (!localStorage.getItem('token')) return 'login';
    return localStorage.getItem('vistaActual') || 'home';
  });

  const [cargando, setCargando] = useState(false);
  const [textoCarga, setTextoCarga] = useState('Cargando...');

  const esChofer = localStorage.getItem('es_chofer') === 'true';
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportes, setReportes] = useState([]);
  const [zonaActual, setZonaActual] = useState('Buscando...');

  // Referencias para el Mapa
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Función auxiliar para cambiar de vista y recordarla al recargar (F5)
  const cambiarVista = (nuevaVista) => {
    setVistaActual(nuevaVista);
    localStorage.setItem('vistaActual', nuevaVista);
  };

  // Función reutilizable para descargar y actualizar la lista de reportes
  const cargarListaReportes = async () => {
    try {
      const response = await fetch('/api/listar-reporte/', {
        method: 'GET',
        headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReportes(data);
      }
    } catch (error) {
      console.error("Error al cargar los reportes:", error);
    }
  };

  // --- EFECTOS (Ciclo de vida) ---
  useEffect(() => {
    const verificarUbicacionInicial = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        await fetch('/api/ver-mi-perfil/', { headers: { 'Authorization': `Token ${token}` } });
      } catch (error) {
        console.error("Error al obtener la ubicación inicial:", error);
      }
    };
    verificarUbicacionInicial();
  }, []);

  // Si el usuario entra a 'reportes' o recarga la página (F5) estando ahí, los carga automáticamente
  useEffect(() => {
    if (vistaActual === 'reportes' && localStorage.getItem('token')) {
      cargarListaReportes();
    }
  }, [vistaActual]);

  // --- POLLING DE ALERTAS PARA CIUDADANOS ---
  useEffect(() => {
    if (vistaActual !== 'home' || localStorage.getItem('es_chofer') === 'true') return;

    const buscarAlertas = async () => {
      try {
        const peticion = await fetch('/api/consultar-alertas/', {
          headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
        });

        if (peticion.ok) {
          const data = await peticion.json();
          const ultimaAlertaVista = localStorage.getItem('ultimaAlertaVista');

          if (data.hay_alerta && ultimaAlertaVista !== data.mensaje) {
            alert(`⚠️ AVISO DEL CAMIÓN: ${data.mensaje}`);
            localStorage.setItem('ultimaAlertaVista', data.mensaje);
          }
        }
      } catch (error) {
        console.error("Error buscando alertas");
      }
    };

    const intervalo = setInterval(buscarAlertas, 15000);
    return () => clearInterval(intervalo);
  }, [vistaActual]);

  useEffect(() => {
    let temporizadorChofer;

    if (vistaActual === 'home' && !esChofer && !mapRef.current) {
      const inicializarMapa = async () => {
        let latitud = 25.851103;
        let longitud = -97.505796;
        let ubicacionEncontrada = false;

        // --- A. OBTENER UBICACIÓN GUARDADA DEL CIUDADANO ---
        try {
          const response = await fetch('/api/obtener-reporte-ubicacion/', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${localStorage.getItem('token')}`,
              'X-CSRFToken': getCookie('csrftoken')
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.latitud && data.longitud) {
              latitud = parseFloat(data.latitud);
              longitud = parseFloat(data.longitud);
              ubicacionEncontrada = true;
            }
          }
        } catch (error) {
          console.error("Error al obtener la ubicación guardada:", error);
        }

        // --- B. CREAR EL MAPA BASE ---
        const mapContainer = document.getElementById('map');
        if (!mapContainer || mapRef.current) return;

        mapRef.current = window.L.map('map').setView([latitud, longitud], 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        if (ubicacionEncontrada) {
          markerRef.current = window.L.marker([latitud, longitud]).addTo(mapRef.current);
        }

        // --- C. OBTENER NOMBRE DE LA CALLE (Nominatim) ---
        try {
          const urlNominatim = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}`;
          const respuestaNominatim = await fetch(urlNominatim);
          const datosNominatim = await respuestaNominatim.json();
          const calle = datosNominatim.address.road || "Calle no identificada";
          setZonaActual(calle);
        } catch (error) {
          console.error("Error al obtener la dirección desde Nominatim:", error);
        }

        // --- D. DIBUJAR RUTA Y SINCRONIZAR CAMIÓN ---
        try {
          const peticionRutas = await fetch('/api/obtener-rutas-camion/', {
            headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
          });
          const dataRutas = await peticionRutas.json();

          if (dataRutas.lista_ruta && dataRutas.lista_ruta.length > 0) {
            const rutaAsignada = dataRutas.lista_ruta[0];
            const coordParsed = typeof rutaAsignada.ruta_coordenadas === 'string'
              ? JSON.parse(rutaAsignada.ruta_coordenadas)
              : rutaAsignada.ruta_coordenadas;
            const arregloRuta = coordParsed.rutaCoordenadas || coordParsed;

            if (arregloRuta && arregloRuta.length > 0 && mapRef.current) {
              const puntosRuta = arregloRuta.map(coord => window.L.latLng(coord[0], coord[1]));

              window.L.Routing.control({
                waypoints: puntosRuta,
                lineOptions: { styles: [{ color: '#198754', weight: 6 }] },
                show: false,
                addWaypoints: false,
                createMarker: () => null
              }).addTo(mapRef.current);

              let markerCamionCiudadano = null;

              const consultarUbicacionChofer = async () => {
                try {
                  const resUbi = await fetch('/api/obtener-ubicacion-camion/', {
                    headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
                  });

                  if (resUbi.ok) {
                    const dataUbi = await resUbi.json();
                    if (dataUbi.latitud && dataUbi.longitud) {
                      const latCamion = parseFloat(dataUbi.latitud);
                      const lngCamion = parseFloat(dataUbi.longitud);

                      if (!markerCamionCiudadano && mapRef.current) {
                        markerCamionCiudadano = window.L.marker([latCamion, lngCamion], { icon: iconoCamion }).addTo(mapRef.current);
                      } else if (markerCamionCiudadano) {
                        markerCamionCiudadano.setLatLng([latCamion, lngCamion]);
                      }
                    }
                  }
                } catch (err) {
                  console.error("Error al sincronizar ubicación del camión:", err);
                }
              };

              consultarUbicacionChofer();
              temporizadorChofer = setInterval(consultarUbicacionChofer, 5000);
            }
          }
        } catch (e) {
          console.error("Error al cargar la ruta:", e);
        }
      };

      inicializarMapa();
    }

    // --- E. LIMPIEZA AL DESMONTAR ---
    return () => {
      if (temporizadorChofer) {
        clearInterval(temporizadorChofer);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [vistaActual, esChofer]);

  // --- FUNCIONES Y LÓGICA ---
  function Obtener_Ubicacion() {
    if ("geolocation" in navigator) {
      setCargando(true);
      setTextoCarga("Obteniendo tu ubicación actual...");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const longitud = position.coords.longitude;
            const latitud = position.coords.latitude;
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitud}&lon=${longitud}`;
            const respuesta = await fetch(url);
            const datos = await respuesta.json();
            const calle = datos.address.road || "Calle no identificada";
            const colonia = datos.address.suburb || datos.address.neighbourhood || "";
            const direccionReal = `${calle}`;
            const codigoPostal = datos.address.postcode || "C.P. no disponible";

            setZonaActual(direccionReal);

            if (mapRef.current) {
              mapRef.current.flyTo([latitud, longitud], 15);
              if (!markerRef.current) {
                markerRef.current = window.L.marker([latitud, longitud])
                  .addTo(mapRef.current)
                  .bindPopup(`Zona: ${direccionReal}`)
                  .openPopup();
              } else {
                markerRef.current.setLatLng([latitud, longitud]);
              }
            }
            await mandar_ubicacion(longitud, latitud, colonia, calle, codigoPostal);
          } catch (err) {
            console.error("Error procesando coordenadas:", err);
          } finally {
            setCargando(false);
          }
        },
        (error) => {
          console.error("Error al obtener la ubicación:", error.message);
          setCargando(false);
          alert("No se pudo obtener tu ubicación. Verifica los permisos del navegador.");
        },
        { enableHighAccuracy: true, timeout: 50000, maximumAge: 0 }
      );
    } else {
      console.error("Tu navegador no soporta la geolocalización.");
    }
  }

  const generarReporte = async () => {
    const tieneUbicacionUsuario = await tiene_ubicacion_usuario();
    if (tieneUbicacionUsuario === true) {
      setIsModalOpen(true);
    } else {
      alert('Tienes que guardar primero tu ubicacion');
    }
  };

  const guardarReporte = async (nuevoReporte) => {
    setCargando(true);
    setTextoCarga("Publicando reporte...");

    try {
      const url = '/api/guardar-reporte/';
      const config = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(nuevoReporte)
      };
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Respuesta del servidor no válida" }));
        alert(`⚠️ Error de Django (${response.status}): ${JSON.stringify(errorData)}`);
        return;
      }

      alert("¡Su reporte se ha guardado exitosamente!");
      setIsModalOpen(false);

      // Refresca la lista automáticamente sin necesidad de salir y volver a entrar
      await cargarListaReportes();
    } catch (error) {
      alert("❌ Error al enviar la petición: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const manejarLogin = async (e) => {
    e.preventDefault();
    const correoInput = document.getElementById('email-login').value;
    const passwordInput = document.getElementById('password-login').value;

    setCargando(true);
    setTextoCarga("Iniciando sesión...");

    try {
      const peticion = await fetch('/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ correo_electronico: correoInput, password: passwordInput })
      });
      const respuesta = await peticion.json();
      if (peticion.ok) {
        localStorage.setItem('token', respuesta.token);
        localStorage.setItem('nombre', respuesta.nombre);
        localStorage.setItem('correo', respuesta.correo);
        localStorage.setItem('es_chofer', respuesta.es_chofer ? 'true' : 'false');
        cambiarVista('home');
      } else {
        alert(respuesta.error || "Correo o contraseña incorrectos");
      }
    } catch (error) {
      alert("No se pudo conectar con el servidor de Django.");
    } finally {
      setCargando(false);
    }
  };

  const keydown_password_login = (e) => {
    if (e.key === 'Enter') manejarLogin(e);
  };

  const manejarRegistro = async (e) => {
    e.preventDefault();
    const nombreInput = document.getElementById('reg-name').value;
    const correoInput = document.getElementById('reg-email').value;
    const passwordInput = document.getElementById('reg-password').value;
    const passwordConfirmInput = document.getElementById('reg-password-confirm').value;

    if (passwordInput !== passwordConfirmInput) {
      alert("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    setTextoCarga("Creando cuenta...");

    try {
      const peticion = await fetch('/api/registro/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ nombre: nombreInput, correo_electronico: correoInput, password: passwordInput })
      });
      const respuesta = await peticion.json();
      if (peticion.ok) {
        localStorage.setItem('token', respuesta.token);
        localStorage.setItem('nombre', respuesta.nombre);
        localStorage.setItem('correo', respuesta.correo);
        localStorage.setItem('es_chofer', 'false');
        cambiarVista('home');
      } else {
        alert(JSON.stringify(respuesta));
      }
    } catch (error) {
      alert("No se pudo conectar con el servidor de Django.");
    } finally {
      setCargando(false);
    }
  };

  // --- RENDERIZADO DEL CONTROLADOR (SWITCH) ---
  const renderizarPantalla = () => {
    switch (vistaActual) {
      case 'login':
        return (
          <div id="login-view" className="view active">
            <video autoPlay muted loop playsInline id="video-fondo">
              <source src="tu_video_de_fondo.mp4" type="video/mp4" />
            </video>
            <div className="overlay"></div>
            <div className="login-container">
              <h1>Trash Routes🚛🚮</h1>
              <p>Rastreo de recolección en tiempo real</p>
              <form id="login-form">
                <input type="email" id="email-login" placeholder="Correo electrónico" required />
                <input type="password" onKeyDown={keydown_password_login} id="password-login" placeholder="Contraseña" required />
                <button type="button" onClick={manejarLogin}>Iniciar Sesión</button>
              </form>
              <p className="register-link">
                <button id="link-to-register" onClick={() => cambiarVista('register')}>¿No tienes cuenta? Regístrate aquí</button>
              </p>
            </div>
          </div>
        );

      case 'register':
        return (
          <div id="register-view" className="view active">
            <video autoPlay muted loop playsInline id="video-fondo-reg">
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
                <button type="button" id="btn-register" onClick={manejarRegistro}>Registrarse</button>
              </form>
              <p className="register-link">
                <a href="#" id="link-to-login" onClick={(e) => { e.preventDefault(); cambiarVista('login'); }}>¿Ya tienes cuenta? Inicia sesión</a>
              </p>
            </div>
          </div>
        );

      case 'home':
        if (esChofer) {
          return <PanelChofer setVistaActual={cambiarVista} />;
        }

        return (
          <div id="home-view" className="view active" style={{ position: 'relative' }}>
            {menuAbierto && (
              <div onClick={() => setMenuAbierto(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500 }}></div>
            )}

            <div id="sidebar" className={`sidebar ${menuAbierto ? 'active' : ''}`} style={{ zIndex: 2000 }}>
              <button onClick={() => setMenuAbierto(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
              <div className="profile-info">
                <div className="avatar">👤</div>
                <h3 id="user-name">{localStorage.getItem('nombre') || 'Usuario'}</h3>
                <p id="user-email">{localStorage.getItem('correo') || 'correo@ejemplo.com'}</p>
              </div>
              <hr />
              <button id="btn-ver-reportes" className="report-btn" onClick={async () => {
                cambiarVista('reportes');
                setMenuAbierto(false);
                setIsModalOpen(false);
                await cargarListaReportes();
              }}>Ver Reportes</button>

              <button id="btn-ver-perfil" className="profile-btn" onClick={() => {
                cambiarVista('perfil');
                setMenuAbierto(false);
              }}>Ver Perfil</button>

              <button id="logout-btn" className="logout-btn" onClick={() => {
                localStorage.clear();
                setVistaActual('login');
                setMenuAbierto(false);
              }}>Cerrar Sesión</button>
            </div>

            <nav className="navbar">
              <button id="menu-btn" className="menu-btn" onClick={() => setMenuAbierto(!menuAbierto)}>☰</button>
              <h2>Bienvenido {localStorage.getItem('nombre') || 'Usuario'} a Trash Routes🚛</h2>
              <button id="btn-generar-reportes" className="report-btn" onClick={generarReporte}>Generar Reportes</button>
            </nav>

            <main className="main-content">
              <div id="map-container">
                <div id="map" style={{ height: '400px', width: '100%' }}></div>
              </div>
              <div className="info-panel">
                <div className="location-header">
                  <h3>📍 Zona: <span id="current-zone">{zonaActual}</span></h3>
                </div>
                <div className="route-selector">
                  <label htmlFor="rutas-cercanas">Rutas cercanas:</label>
                  <div className="selector-row">
                    <select id="rutas-cercanas"><option>Ruta 1 - Tecnológico</option></select>
                    <button id="btn-mi-ubicacion" onClick={Obtener_Ubicacion}>📍 Mi ubicación</button>
                  </div>
                  <p id="mis-coordenadas" className="coordenadas-text">Coordenadas: Buscando...</p>
                  <p id="eta-text" className="eta-text hidden">Llegada estimada del camión: Calculando...</p>
                </div>
                <div className="schedule-info" style={{ marginTop: '10px' }}>
                  <h4>Horario de recolección</h4>
                  <p><strong>Días:</strong> <span id="route-days">Lunes, Miércoles, Viernes</span></p>
                  <p><strong>Horario:</strong> <span id="route-time">08:00 AM - 12:00 PM</span></p>
                </div>
                <ModalReporte isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={guardarReporte} />
              </div>
            </main>
          </div>
        );

      case 'perfil':
        return <VistaPerfil setVistaActual={cambiarVista} />;

      case 'reportes':
        return (
          <div id="reportes-view" className="view active" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button onClick={() => cambiarVista('home')}>← Volver al mapa</button>
              <h2 style={{ margin: 0 }}>Publicaciones de la zona</h2>
              <button onClick={generarReporte}>+ Nuevo Reporte</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {reportes.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'gray', marginTop: '50px' }}>No hay reportes publicados aún.</p>
              ) : (
                reportes.map((reporte, index) => (
                  <div key={reporte.id || index} style={{ border: '1px solid #e1e8ed', borderRadius: '10px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#DDF0FE', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex' }}>
                        <p> <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#098DF0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0" /></svg></p>
                        <p style={{ color: 'black', fontWeight: 'bold', fontSize: '18px' }}>{reporte.calle}</p>
                      </div>
                      <span style={{ fontSize: '0.85em', color: '#098DF0', fontWeight: 'bold' }}>{reporte.fechaPublicado}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                        <strong style={{ color: 'black' }}>{reporte.nombreUsuario}</strong>
                      </div>
                      <p style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }} onClick={() => {
                        const numeroGobierno = "528689800960";
                        const mensaje = `🚛 *Nuevo Reporte Ciudadano - Trash Routes* 🚛\n\n${reporte.titulo}\n\n ${reporte.texto}\n\n🔗 Puedes ver la ubicación y foto aquí:\n${window.location.href}`;
                        const enlaceWhatsApp = `https://wa.me/${numeroGobierno}?text=${encodeURIComponent(mensaje)}`;
                        window.open(enlaceWhatsApp, '_blank', 'noopener,noreferrer');
                      }}><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#009903" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" /><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" /></svg></p>
                    </div>
                    <h4 style={{ margin: '5px 0 0 0', color: 'black' }}>{reporte.titulo}</h4>
                    <img src={obtenerUrlImagen(reporte.imagen)} style={{ maxWidth: '100%', height: 'auto' }} />
                    <p style={{ margin: '0', whiteSpace: 'pre-wrap', color: 'black' }}>{reporte.texto}</p>
                  </div>
                ))
              )}
            </div>
            <ModalReporte isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={guardarReporte} />
          </div>
        );

      default:
        return <div>Página no encontrada</div>;
    }
  };

  return (
    <div>
      <ModalCarga isOpen={cargando} texto={textoCarga} />
      {renderizarPantalla()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);  