
  document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // --- VARIABLES GLOBALES Y DEL DOM ---
    // ==========================================
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const homeView = document.getElementById('home-view');
    const reportsView = document.getElementById('reports-view');
    
    // Panel del Mapa
    const selectRutas = document.getElementById('rutas-cercanas');
    const labelZona = document.getElementById('current-zone');
    const labelDias = document.getElementById('route-days');
    const labelHorario = document.getElementById('route-time');

    let map = null;
    let rutaBorde = null;  // Borde oscuro de la ruta (Estilo Didi)
    let rutaCentro = null; // Centro brillante de la ruta (Estilo Didi)
    let truckMarker = null; 
    let userMarker = null; // Marcador GPS del usuario

    // ==========================================
    // --- ESTRUCTURA DE RUTAS (CON TU ZIG-ZAG) ---
    // ==========================================
    const rutas = {
        "Tecnológico (Av. Lauro Villar)": {
            puntos: [
                L.latLng(25.843183, -97.451762), // Frente al Tecnológico de Matamoros
                L.latLng(25.837274, -97.452111),
                L.latLng(25.837264, -97.455109),
                L.latLng(25.836632, -97.455164),
                L.latLng(25.836592, -97.452155),
                L.latLng(25.836148, -97.452177),
                L.latLng(25.836187, -97.455208),
                L.latLng(25.835752, -97.455219),
                L.latLng(25.835673, -97.452166)  // Hacia el este
            ],
            dias: "Lunes, Miércoles y Viernes", 
            horario: "08:00 AM - 10:30 AM"
        },
        // Puedes agregar más rutas aquí abajo
        "Av. Camino Real (Ejemplo)": {
            puntos: [
                L.latLng(25.8450, -97.5020),
                L.latLng(25.8350, -97.5050)
            ],
            dias: "Martes, Jueves y Sábado", 
            horario: "07:00 AM - 09:30 AM"
        }
    };

    // ==========================================
    // --- LÓGICA DE NAVEGACIÓN (LOGIN Y REGISTRO) ---
    // ==========================================
    document.getElementById('link-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.remove('active');
        registerView.classList.add('active');
    });

    document.getElementById('link-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.remove('active');
        loginView.classList.add('active');
    });

    // Validar checkbox de Términos y Condiciones
    const acceptTycCheckbox = document.getElementById('accept-tyc');
    const btnRegister = document.getElementById('btn-register');
    
    acceptTycCheckbox.addEventListener('change', (e) => {
        btnRegister.disabled = !e.target.checked;
    });

    document.getElementById('link-tyc').addEventListener('click', (e) => {
        e.preventDefault();
        alert("TÉRMINOS Y CONDICIONES:\n\n1. Permitir el uso de GPS.\n2. Reportes con fotos reales y honestas.\n3. Aceptas políticas de privacidad.");
    });

    // Envío del Formulario de Registro
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const pass1 = document.getElementById('reg-password').value;
        const pass2 = document.getElementById('reg-password-confirm').value;

        if(pass1 !== pass2) {
            alert("Las contraseñas no coinciden. Inténtalo de nuevo.");
            return;
        }

        // Simulación de registro (Aquí irá la conexión a Django)
        document.getElementById('user-name').textContent = document.getElementById('reg-name').value;
        document.getElementById('user-email').textContent = document.getElementById('reg-email').value;
        
        registerView.classList.remove('active');
        homeView.classList.add('active');
        setTimeout(inicializarMapaYDatos, 300);
    });

    // Envío del Formulario de Login
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('user-email').textContent = document.getElementById('email').value;
        loginView.classList.remove('active');
        homeView.classList.add('active');
        setTimeout(inicializarMapaYDatos, 300);
    });

    // ==========================================
    // --- LÓGICA DEL MENÚ LATERAL (SIDEBAR) ---
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    document.getElementById('menu-btn').addEventListener('click', (e) => {
        sidebar.classList.add('open');
        e.stopPropagation();
    });

    // Cerrar si das clic afuera
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', () => {
        sidebar.classList.remove('open');
        homeView.classList.remove('active');
        loginView.classList.add('active');
        document.getElementById('login-form').reset();
    });

    // ==========================================
    // --- INICIALIZACIÓN DEL MAPA Y RUTAS ---
    // ==========================================
    function inicializarMapaYDatos() {
        if (map !== null) return; 
        
        // Iniciar mapa en el primer punto de tu ruta
        map = L.map('map').setView([25.843164, -97.451853], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19 
        }).addTo(map);

        // Llenar selector
        selectRutas.innerHTML = '';
        for (const nombreRuta in rutas) {
            selectRutas.innerHTML += `<option value="${nombreRuta}">${nombreRuta}</option>`;
        }
        selectRutas.addEventListener('change', (e) => cargarRutaForzada(e.target.value));
        
        cargarRutaForzada(Object.keys(rutas)[0]);
    }

    // --- TRAZADO ESTILO DIDI (FORZADO MULTICAPA) ---
    function cargarRutaForzada(nombreRuta) {
        const datosRuta = rutas[nombreRuta];
        labelZona.textContent = nombreRuta;
        labelDias.textContent = datosRuta.dias;
        labelHorario.textContent = datosRuta.horario;

        // Limpiar el mapa
        if (rutaBorde) map.removeLayer(rutaBorde);
        if (rutaCentro) map.removeLayer(rutaCentro);
        if (truckMarker) map.removeLayer(truckMarker);

        // Borde oscuro
        rutaBorde = L.polyline(datosRuta.puntos, {
            color: '#0f172a',
            weight: 9,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);

        // Centro brillante
        rutaCentro = L.polyline(datosRuta.puntos, {
            color: '#14b8a6',
            weight: 5,
            opacity: 1,
            lineJoin: 'round'
        }).addTo(map);

        // Ajustar zoom para que quepa todo el zig-zag
        map.fitBounds(rutaBorde.getBounds(), { padding: [30, 30] });

        // Marcador del camión al inicio
        truckMarker = L.marker(datosRuta.puntos[0], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#14b8a6; padding:8px; border-radius:50%; text-align:center; font-size:18px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); border: 2px solid white;'>🚚</div>",
                iconSize: [38, 38], 
                iconAnchor: [19, 19]
            })
        }).addTo(map);
        
        truckMarker.bindPopup("<b>Camión Recolector</b><br>" + nombreRuta).openPopup();
    }

    // ==========================================
    // --- MI UBICACIÓN GPS EN TIEMPO REAL ---
    // ==========================================
    const btnMiUbicacion = document.getElementById('btn-mi-ubicacion');
    const labelCoordenadas = document.getElementById('mis-coordenadas');
    const labelEta = document.getElementById('eta-text');

    btnMiUbicacion.addEventListener('click', () => {
        labelCoordenadas.textContent = "Obteniendo ubicación satelital...";
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                labelCoordenadas.textContent = `Coordenadas: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
                map.flyTo([lat, lng], 16);

                if (userMarker) map.removeLayer(userMarker);
                userMarker = L.circleMarker([lat, lng], {
                    radius: 8, fillColor: "#3b82f6", color: "#ffffff", weight: 3, fillOpacity: 1
                }).addTo(map).bindPopup("<b>Tu ubicación actual</b>").openPopup();

                labelEta.classList.remove('hidden');
                labelEta.textContent = "Calculando distancia con el camión...";
                
                setTimeout(() => {
                    labelEta.textContent = "🚚 El camión llegará en aprox. 14 minutos a tu zona.";
                }, 2000);

            }, (error) => {
                labelCoordenadas.textContent = "Error: Activa el GPS y da permisos en tu navegador.";
                alert("No se pudo obtener la ubicación. Verifica los permisos de tu navegador.");
            });
        } else {
            labelCoordenadas.textContent = "El GPS no es compatible con este dispositivo.";
        }
    });

    // ==========================================
    // --- LÓGICA DE REPORTES (CHAT) ---
    // ==========================================
    const btnVerReportes = document.getElementById('btn-ver-reportes');
    const btnRegresarMapa = document.getElementById('back-to-map-btn');
    const formReporte = document.getElementById('new-report-form');
    const inputFotos = document.getElementById('report-photos');
    const fileCountText = document.getElementById('file-count-text');

    btnVerReportes.addEventListener('click', () => {
        homeView.classList.remove('active');
        reportsView.classList.add('active');
        document.getElementById('report-zone-title').textContent = selectRutas.value;
        cargarHistorialReportes();
    });

    btnRegresarMapa.addEventListener('click', () => {
        reportsView.classList.remove('active');
        homeView.classList.add('active');
    });

    function cargarHistorialReportes() {
        const chatHistory = document.getElementById('chat-history');
        chatHistory.innerHTML = `
            <div class="date-group">
                <div class="date-header" onclick="this.parentElement.classList.toggle('open')">Fechas Anteriores</div>
                <div class="date-content">
                    <div class="chat-bubble other-report">
                        <p>Basura regada en la esquina del parque principal.</p>
                        <span class="bubble-time">Ayer - 09:15</span>
                    </div>
                </div>
            </div>
            <div class="date-group open" id="grupo-hoy">
                <div class="date-header" onclick="this.parentElement.classList.toggle('open')">Hoy</div>
                <div class="date-content" id="contenido-hoy">
                    <div class="chat-bubble other-report">
                        <p>El camión va muy lleno, no quiso llevarse las bolsas negras.</p>
                        <span class="bubble-time">10:05</span>
                    </div>
                </div>
            </div>
        `;
    }

    inputFotos.addEventListener('change', function() {
        const cantidad = this.files.length;
        fileCountText.textContent = `${cantidad} foto(s) seleccionada(s) (Mínimo 2)`;
        fileCountText.style.color = cantidad >= 2 ? "var(--accent-color)" : "#ef4444";
    });

    formReporte.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (inputFotos.files.length < 2) {
            alert("⚠️ Por favor, adjunta al menos 2 fotografías reales.");
            return;
        }

        const textoReporte = document.getElementById('report-text').value;
        const horaActual = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const nuevoReporteHTML = `
            <div class="chat-bubble own-report">
                <p>${textoReporte}</p>
                <div class="bubble-photos">
                    <div class="photo-mock">📷</div>
                    <div class="photo-mock">📷</div>
                </div>
                <span class="bubble-time">${horaActual} (Tú)</span>
            </div>
        `;
        document.getElementById('contenido-hoy').insertAdjacentHTML('beforeend', nuevoReporteHTML);

        // Bloqueo de envío
        document.getElementById('report-text').value = "";
        document.getElementById('report-text').placeholder = "Envío bloqueado por 24 hrs...";
        document.getElementById('report-text').disabled = true;
        document.getElementById('send-report-btn').disabled = true;
        document.getElementById('send-report-btn').style.background = "#475569";
        inputFotos.disabled = true;
        fileCountText.textContent = "Límite de reportes alcanzado.";
        fileCountText.style.color = "#94a3b8";

        mostrarNotificacion();

        const chatContainer = document.getElementById('chat-history');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });

    function mostrarNotificacion() {
        const toast = document.getElementById('push-notification');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 400); 
        }, 5000);
    }
});