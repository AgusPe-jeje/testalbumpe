/* ========================================================================
   ===         🏆 VIRTUAL ALBUM MUNDIAL - ENGINE CORREGIDO 🏆           ===
   ======================================================================== */

const URL_RENDER_SERVICIO = "https://prubaalbumpe.onrender.com";
const URL_BASE = `${URL_RENDER_SERVICIO}/api`;

let usuarioActual = null;
let direccionGanadora = "";
let albumCompleto = [];
let paisSeleccionado = "";
let timbaPreparada = false;
let intervaloCronometro = null;       // Global para evitar crasheos en Penales
let intervaloCronometroTimba = null;  // Reloj global de la Timba

// Variables globales para controlar el estado de los filtros del álbum
let filtroEstadoActual = 'todas'; // 'todas', 'desbloqueadas', 'pendientes'
let filtroRarezaActual = 'todas'; // 'todas', 'comun', 'rara', 'epica', 'legendaria'

let multiSalaId = null;
let multiCodigoSala = null;
let multiEsCreador = false;
let multiIntervaloLobby = null;
let multiApuestaFijada = 0;


/* ========================================================================
   ⏱️ REGENERACIÓN DE ENERGÍA PARA LA TIMBA
   ======================================================================== */
function arrancarCronometroTimbaVisual(milisegundos) {
     clearInterval(intervaloCronometroTimba);
     const lblCronometro = document.getElementById('cronometro-timba');
     
     if (!lblCronometro) return;

     if (milisegundos <= 0) {
          lblCronometro.innerText = '🔋 ¡Apuestas al Máximo (10/10)!';
          return;
     }

     let tiempoRestante = milisegundos;
     intervaloCronometroTimba = setInterval(() => {
          tiempoRestante -= 1000;
          
          if (tiempoRestante <= 0) {
               clearInterval(intervaloCronometroTimba);
               lblCronometro.innerText = '⚡ ¡Apuesta recargada! Actualizando...';
               if (usuarioActual) actualizarTimbasRestantesUI();
               return;
          }

          const totalSegundos = Math.floor(tiempoRestante / 1000);
          const minutos = Math.floor(totalSegundos / 60);
          const segundos = totalSegundos % 60;

          let textoReloj = minutos.toString().padStart(2, '0') + 'm ' + segundos.toString().padStart(2, '0') + 's';
          lblCronometro.innerText = '⏱️ Próxima apuesta en: ' + textoReloj;
     }, 1000);
}

async function actualizarTimbasRestantesUI() {
     if (!usuarioActual) return;
     
     const lblCronometro = document.getElementById('cronometro-timba');
     if (!lblCronometro) return;

     try {
          const res = await fetch(URL_BASE + '/timbas-restantes/' + usuarioActual.id);
          const datos = await res.json();
          
          if (datos.timbas <= 0) {
               lblCronometro.style.borderColor = 'var(--rojo)';
               lblCronometro.style.color = 'var(--rojo)';
               lblCronometro.innerText = '❌ SIN ENERGÍA PARA TIMBEAR ⏱️';
          } else {
               lblCronometro.style.borderColor = 'var(--dorado)';
               lblCronometro.style.color = 'var(--dorado)';
               lblCronometro.innerText = '🎰 Apuestas disponibles: ' + datos.timbas + '/10';
          }

          if (datos.siguienteIn > 0 && datos.timbas < 10) {
               arrancarCronometroTimbaVisual(datos.siguienteIn);
          }
     } catch (err) {
          console.error('Error al actualizar créditos de timba:', err);
     }
}

/* ========================================================================
   🎛️ 1. CONTROL DE MÓDULOS DE LA UI (ADAPTADO A MUNDIAL UI)
   ======================================================================== */
function cambiarModulo(idModulo, botonPresionado) {
     // Oculta tanto los módulos comunes como el multijugador
     document.querySelectorAll('.modulo-contenido, #modulo-mundial-multi').forEach(mod => mod.style.display = 'none');
     document.querySelectorAll('.tile-modulo-fifa, .btn-modulo-match').forEach(btn => btn.classList.remove('activo'));
     
     // Muestra el módulo clickeado
     const modActivo = document.getElementById(idModulo);
     if (modActivo) modActivo.style.display = 'block';
     if (botonPresionado) botonPresionado.classList.add('activo');

     // Lógica de carga interna de cada sección
     if (idModulo === 'modulo-album' && usuarioActual) cargarAlbumLocal();
     if (idModulo === 'modulo-penales' && usuarioActual) iniciarDueloLocal();
     
     if (idModulo === 'modulo-timba' && usuarioActual) {
          rotarPartidoTimba();
          document.getElementById("select-tipo-apuesta").value = "monedas"; 
          conmutarControlesTimbaUI();
          actualizarTimbasRestantesUI();
     }
}

function mostrarCarga(mensaje = "Conectando con la Arena...") {
     document.getElementById("texto-carga-dinamico").innerText = mensaje;
     document.getElementById("pantalla-carga").classList.add("activo");
}

function ocultarCarga() {
     document.getElementById("pantalla-carga").classList.remove("activo");
}

/* ========================================================================
   ⏱️ REGENERACIÓN DE TIROS - PENALES (REPARACIÓN DE BUG DE BLOQUEO)
   ======================================================================== */
function arrancarCronometroVisual(milisegundosFaltantes) {
     clearInterval(intervaloCronometro);
     const lblCronometro = document.getElementById("cronometro-tiros");
     if (!lblCronometro) return;
     
     if (milisegundosFaltantes <= 0) {
          lblCronometro.innerText = "🔋 ¡Energía al Máximo!";
          document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
          return;
     }

     let tiempoRestante = milisegundosFaltantes;

     intervaloCronometro = setInterval(() => {
          tiempoRestante -= 1000;
          if (tiempoRestante <= 0) {
               clearInterval(intervaloCronometro);
               lblCronometro.innerText = "⚡ ¡Tiro recargado! Actualizando...";
               
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
               if (usuarioActual) iniciarDueloLocal();
               return;
          }

          const totalSegundos = Math.floor(tiempoRestante / 1000);
          const horas = Math.floor(totalSegundos / 3600);
          const minutos = Math.floor((totalSegundos % 3600) / 60);
          const segundos = totalSegundos % 60;

          let textoReloj = "";
          if (horas > 0) textoReloj += `${horas}h `;
          textoReloj += `${minutos.toString().padStart(2, '0')}m ${segundos.toString().padStart(2, '0')}s`;

          lblCronometro.innerText = `⏱️ Próximo tiro en: ${textoReloj}`;
     }, 1000);
}

/* ========================================================================
   👤 2. AUTENTICACIÓN Y ESTADO DE USUARIO
   ======================================================================== */
async function autenticarUsuario(accion) {
     const username = document.getElementById("input-usuario").value.trim();
     const password = document.getElementById("input-pass").value;
     
     if (!username || !password) return alert("❌ Completá los datos.");

     const textoSpinner = accion === 'login' ? "Iniciando sesión..." : "Creando tu cuenta en la Arena...";
     const endpointFinal = accion === 'login' ? 'login' : 'registro';

     mostrarCarga(textoSpinner);

     try {
          const res = await fetch(`${URL_BASE}/${endpointFinal}`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ username, password })
          });
          
          const data = await res.json();
          ocultarCarga();

          if (data.error) {
               alert(data.error);
          } else {
               usuarioActual = data.usuario;
               document.getElementById("seccion-login").style.display = "none";
               
               const interfazJuego = document.getElementById("interfaz-juego");
               interfazJuego.style.removeProperty("display");
               interfazJuego.classList.add("mostrar");
               
               // 🔥 Reseteamos filtros a nivel lógico al iniciar sesión por primera vez
               filtroEstadoActual = 'todas';
               filtroRarezaActual = 'todas';
               
               actualizarInterfazUI();
               cargarAlbumLocal();
               actualizarTimbasRestantesUI();
               
               iniciarControladorAnunciosSeguro(); 
               
               if (accion === 'login') {
                    alert(`⚔️ ¡Bienvenido de vuelta, ${usuarioActual.username}!`);
               } else {
                    alert(`🎉 ¡Cuenta creada con éxito! Bienvenido a la Arena, ${usuarioActual.username}. Empezás con 200 monedas.`);
               }
          }
     } catch (err) {
          console.error(err);
          ocultarCarga();
     }
}

function actualizarInterfazUI() {
     if (!usuarioActual) return;
     document.getElementById("lbl-usuario").innerText = usuarioActual.username.toUpperCase();
     document.getElementById("lbl-monedas").innerText = usuarioActual.monedas;
     document.getElementById("lbl-ranking").innerText = usuarioActual.puntos_ranking;
     
     const lblMundiales = document.getElementById("lbl-copas-mundiales");
     if (lblMundiales) {
          lblMundiales.innerText = usuarioActual.copas_mundiales || 0;
     }
}

/* ========================================================================
   📖 3. ÁLBUM MUNDIAL (SISTEMA PANINI CORREGIDO)
   ======================================================================== */
async function cargarAlbumLocal() {
     if (!usuarioActual) return;
     const contenedorPaises = document.getElementById("selector-paises");
     
     try {
          const res = await fetch(`${URL_BASE}/album/${usuarioActual.id}`);
          const data = await res.json();
          
          albumCompleto = data.album;
          window.albumCompleto = data.album;

          const totalJugadores = albumCompleto.length;
          const obtenidosTotales = albumCompleto.filter(figu => figu.obtenido > 0).length;
          const porcentajeGlobal = totalJugadores > 0 ? Math.round((obtenidosTotales / totalJugadores) * 100) : 0;

          document.getElementById("lbl-progreso-numerico").innerText = `${obtenidosTotales} / ${totalJugadores} (${porcentajeGlobal}%)`;
          document.getElementById("barra-progreso-llenado").style.width = `${porcentajeGlobal}%`;

          const countriesMap = new Map();
          albumCompleto.forEach(figu => {
               if (!countriesMap.has(figu.pais)) {
                    countriesMap.set(figu.pais, { bandera: figu.bandera, complete: true });
               }
          });

          countriesMap.forEach((info, pais) => {
               const figusDeEstePais = albumCompleto.filter(f => f.pais === pais);
               const tieneTodas = figusDeEstePais.every(f => f.obtenido > 0);
               info.complete = tieneTodas;
          });

          contenedorPaises.innerHTML = "";
          if (!paisSeleccionado && countriesMap.size > 0) {
               paisSeleccionado = countriesMap.keys().next().value;
          }

          countriesMap.forEach((info, pais) => {
               const btn = document.createElement("button");
               btn.className = `btn-pais ${pais === paisSeleccionado ? 'activo' : ''} ${info.complete ? 'pais-completo' : ''}`;
               const textoCorona = info.complete ? " 👑" : "";
               btn.innerHTML = `<span>${info.bandera}</span> ${pais.toUpperCase()}${textoCorona}`;
               
               btn.onclick = () => {
                    paisSeleccionado = pais;
                    document.querySelectorAll('.btn-pais').forEach(b => b.classList.remove('activo'));
                    btn.classList.add('activo');
                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    
                    // 🔥 Al cambiar de país, mantenemos los filtros activos de forma inteligente
                    mostrarJugadoresPorPais();
               };
               contenedorPaises.appendChild(btn);
          });

          mostrarJugadoresPorPais();

          if (document.getElementById("select-tipo-apuesta") && document.getElementById("select-tipo-apuesta").value === "cromo") {
               cargarRepetidasEnDesplegableUI();
          }
     } catch (err) { console.error("Error al calcular progreso de álbum:", err); }
}

function mostrarJugadoresPorPais() {
     const contenedorGrid = document.getElementById("contenedor-grid-album");
     if (!contenedorGrid) return;
     contenedorGrid.innerHTML = "";
     const jugadoresFiltrados = albumCompleto.filter(figu => figu.pais === paisSeleccionado);

     jugadoresFiltrados.forEach((figu, index) => {
          const esObtenida = figu.obtenido > 0;
          const card = document.createElement("div");
          card.className = `carta-clash ${figu.rareza.toLowerCase()} ${esObtenida ? '' : 'bloqueada'}`;
          card.style.animationDelay = `${(index % 12) * 30}ms`;
          
          card.innerHTML = `
              ${figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : ''}
              <img src="${figu.foto}" class="carta-foto" alt="${figu.nombre}">
              <div class="rareza-vertical">${figu.rareza.toUpperCase()}</div>
          `;
          contenedorGrid.appendChild(card);
     });

     // 🔥 INYECCIÓN ESTRATÉGICA: Forza al HUD a evaluar el estado cruzado inmediatamente
     aplicarFiltrosCruzadosUI();
}

/* ========================================================================
   🍿 LOGICA CINEMÁTICA PACK OPENING ASÍNCRONO (NATIVA INTEGRADA)
   ======================================================================== */
let colaCartasPack = [];
let indiceCartaActualPack = 0;
let sobreAbiertoCompletoCache = []; 

async function comprarSobreEspecifico(tipoCofre) {
     if (!usuarioActual) return alert("❌ Error.");

     mostrarCarga(`Adquiriendo derechos de pack ${tipoCofre.toUpperCase()}...`);

     try {
          const res = await fetch(`${URL_BASE}/comprar-sobre`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id, tipoCofre: tipoCofre })
          });
          
          const data = await res.json();
          ocultarCarga();

          if (data.error_oro) return alert(data.mensaje);
          if (data.error) return alert("❌ Error: " + data.error);

          usuarioActual.monedas = data.monedas;
          actualizarInterfazUI();

          colaCartasPack = data.sobre;
          sobreAbiertoCompletoCache = data.sobre;
          indiceCartaActualPack = 0;

          document.getElementById("grid-sobre-abierto").innerHTML = "";
          
          const contenedorOpening = document.getElementById("contenedor-pack-opening");
          contenedorOpening.style.display = "flex";

          contenedorOpening.scrollIntoView({ behavior: 'smooth', block: 'center' });

          ejecutarSecuenciaReveladoCarta();
          
     } catch (err) {
          console.error("Error en la apertura del pack:", err);
          ocultarCarga();
     }
}

let animacionCartaEnCurso = false; 

async function ejecutarSecuenciaReveladoCarta() {
    if (indiceCartaActualPack >= colaCartasPack.length) {
        document.getElementById("contenedor-pack-opening").style.display = "none";
        renderizarGrillaFinalSobres();
        animacionCartaEnCurso = false; 
        return;
    }

    animacionCartaEnCurso = true;
    const btnSiguiente = document.getElementById("btn-siguiente-carta-pack");
    if (btnSiguiente) btnSiguiente.disabled = true; 

    const carta = colaCartasPack[indiceCartaActualPack];
    const wrapper = document.getElementById("pantalla-carta-presentada");
    
    const pBandera = document.getElementById("pista-bandera");
    const pPosicion = document.getElementById("pista-posicion");
    const pRareza = document.getElementById("pista-rareza");
    
    pBandera.className = "pista-bloque"; pBandera.innerText = "⏳ ?";
    pPosicion.className = "pista-bloque"; pPosicion.innerText = "⚽ ?";
    pRareza.className = "pista-bloque"; pRareza.innerText = "🃏 ?";
    wrapper.innerHTML = ""; 

    await new Promise(r => setTimeout(r, 200));
    pBandera.innerText = carta.bandera || "🃏";
    pBandera.classList.add("revelada");

    await new Promise(r => setTimeout(r, 600));
    let posText = "DEL";
    const posFiltro = carta.posicion ? carta.posicion.toUpperCase() : "";
    if (posFiltro.includes("DEF") || posFiltro.includes("ARQ") || posFiltro.includes("POR")) posText = "DEF";
    else if (posFiltro.includes("MED") || posFiltro.includes("VOL") || posFiltro.includes("CC")) posText = "MED";
    pPosicion.innerText = posText;
    pPosicion.classList.add("revelada");

    await new Promise(r => setTimeout(r, 600));
    
    let rarezaTexto = carta.rareza.toUpperCase();
    if (rarezaTexto === "ESPECIAL") rarezaTexto = "RARA";
    pRareza.innerText = rarezaTexto;
    pRareza.classList.add("revelada");

    await new Promise(r => setTimeout(r, 500));
    
    let rarezaClase = carta.rareza.toLowerCase();
    if (rarezaClase === "especial") rarezaClase = "rara";
    
    const divCarta = document.createElement("div");
    divCarta.className = `carta-clash ${rarezaClase} caminante-entrada`;
    
    let rarezaColor = "#8e9bb0";
    if (rarezaClase === "rara") rarezaColor = "#0074e8";
    else if (rarezaClase === "epica") rarezaColor = "#a335ee";
    else if (rarezaClase === "legendaria") rarezaColor = "#ffb100";

    divCarta.innerHTML = `
        ${carta.obtenido > 1 ? `<div class="badge-repetidas">x${carta.obtenido}</div>` : ''}
        <img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}">
        <div style="position: absolute; top: 0; left: 0; width: 18px; height: 100%; background: linear-gradient(90deg, ${rarezaColor} 0%, rgba(0,0,0,0) 100%); opacity: 0.4; z-index: 3;"></div>
        <div class="rareza-vertical">${rarezaTexto}</div>
    `;
    
    wrapper.appendChild(divCarta);
    await new Promise(r => setTimeout(r, 400));

    animacionCartaEnCurso = false;
    if (btnSiguiente) btnSiguiente.disabled = false; 
}

function mostrarSiguienteCartaSecuencia() {
     if (animacionCartaEnCurso) return; 
     indiceCartaActualPack++;
     ejecutarSecuenciaReveladoCarta();
}

async function renderizarGrillaFinalSobres() {
     const contenedorSobre = document.getElementById("grid-sobre-abierto");
     contenedorSobre.innerHTML = "";

     sobreAbiertoCompletoCache.forEach((figu, indice) => {
          const itemContenedor = document.createElement("div");
          itemContenedor.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 8px;";

          let rarezaClaseFinal = figu.rareza.toLowerCase();
          if (rarezaClaseFinal === "especial") rarezaClaseFinal = "rara";

          let rarezaTextoFinal = figu.rareza.toUpperCase();
          if (rarezaTextoFinal === "ESPECIAL") rarezaTextoFinal = "RARA";

          const divCarta = document.createElement("div");
          divCarta.className = `carta-clash ${rarezaClaseFinal}`;
          divCarta.style.animationDelay = `${indice * 0.1}s`;
          
          divCarta.innerHTML = `
              ${figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : ''}
              <img src="${figu.foto}" class="carta-foto" alt="${figu.nombre}">
              <div class="rareza-vertical">${rarezaTextoFinal}</div>
          `;

          itemContenedor.appendChild(divCarta);
          contenedorSobre.appendChild(itemContenedor);
     });

     if (usuarioActual) {
          await cargarAlbumLocal();
     }
}

/* ========================================================================
   ⚽ 5. DUELO DE PENALES (CONTROL DE CLICS RECALIBRADO)
   ======================================================================== */
async function iniciarDueloLocal() {
     if (!usuarioActual) return alert("❌ Iniciá sesión.");
     const resTexto = document.getElementById("resultado-penal");
     const btnProximo = document.querySelector("button[onclick='iniciarDueloLocal()']");
     const escenario = document.getElementById("escenario-penal");

     cargarRankingLocal();

     try {
          const res = await fetch(`${URL_BASE}/tiros-restantes/${usuarioActual.id}`);
          const data = await res.json();
          
          if (data.tiros <= 0) {
               resTexto.style.color = "var(--rojo)";
               resTexto.innerText = "❌ ¡NO TE QUEDAN TIROS! Esperá que recargue energía.";
               if (btnProximo) btnProximo.disabled = true;
               if (escenario) escenario.classList.add("bloqueado-energia");
               direccionGanadora = "";
          } else {
               resTexto.style.color = "white";
               resTexto.innerText = `⚽ ¡PREPARÁ EL DISPARO! — Te quedan ${data.tiros} tiros.`;
               if (btnProximo) btnProximo.disabled = false;
               if (escenario) escenario.classList.remove("bloqueado-energia");
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");

               const opciones = ['IZQUIERDA', 'CENTRO', 'DERECHA'];
               direccionGanadora = opciones[Math.floor(Math.random() * opciones.length)];
          }

          arrancarCronometroVisual(data.siguienteIn);
          
     } catch (err) {
          console.error("Error al verificar tiros iniciales:", err);
     }
     
     const balon = document.getElementById('balon-animado');
     const arquero = document.getElementById('arquero-animado');
     if (balon && arquero) {
          balon.style.transform = 'translate(0, 0) scale(1)';
          arquero.style.transform = 'translateX(0px)';
     }
}

async function ejecutarPenalLocal(direccionElegida) {
     if (!usuarioActual || !direccionGanadora) return;

     const esMovil = window.innerWidth <= 768;
     const fX = esMovil ? 0.55 : 1.0; 
     const fY = esMovil ? 0.65 : 1.0; 

     const mapaAnimaciones = {
          'SUP_IZQUIERDA': {
               balon: `translate(${ -185 * fX }px, ${ -185 * fY }px)`,
               arquero: `translate(${ -185 * fX }px, ${ -65 * fY }px) rotate(-25deg)`
          },
          'SUP_CENTRO': {
               balon: `translate(0px, ${ -205 * fY }px)`,
               arquero: `translate(0px, ${ -75 * fY }px) rotate(0deg)`
          },
          'SUP_DERECHA': {
               balon: `translate(${ 185 * fX }px, ${ -185 * fY }px)`,
               arquero: `translate(${ 185 * fX }px, ${ -65 * fY }px) rotate(25deg)`
          },
          'INF_IZQUIERDA': {
               balon: `translate(${ -185 * fX }px, ${ -20 * fY }px)`,
               arquero: `translate(${ -185 * fX }px, ${ 95 * fY }px) rotate(-15deg)`
          },
          'INF_CENTRO': {
               balon: `translate(0px, ${ -35 * fY }px)`,
               arquero: `translate(0px, ${ 85 * fY }px) rotate(0deg)`
          },
          'INF_DERECHA': {
               balon: `translate(${ 185 * fX }px, ${ -20 * fY }px)`,
               arquero: `translate(${ 185 * fX }px, ${ 95 * fY }px) rotate(15deg)`
          }
     };

     const direccionesPosibles = Object.keys(mapaAnimaciones);
     const direccionArquero = direccionesPosibles[Math.floor(Math.random() * direccionesPosibles.length)];

     const arquero = document.getElementById('arquero-animado');
     if (arquero) {
          arquero.style.zIndex = "5"; 
          arquero.style.transform = mapaAnimaciones[direccionArquero].arquero;
     }

     const balon = document.getElementById('balon-animado');
     if (balon) {
          balon.style.zIndex = "10"; 
          balon.style.transform = mapaAnimaciones[direccionElegida].balon;
     }

     document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "none");

     await new Promise(r => setTimeout(r, 600));

     const fueAtajado = direccionElegida === direccionArquero;
     const esGol = !fueAtajado;

     const resTexto = document.getElementById("resultado-penal");
     if (fueAtajado) {
          resTexto.style.color = "var(--rojo)";
          resTexto.innerText = "¡ATAJADO POR EL ARQUERO! 🧤";
     } else {
          resTexto.style.color = "var(--celeste)";
          resTexto.innerText = "¡GOOOL! 🪙 +100 Oro";
     }
     
     direccionGanadora = "";

     try {
          const res = await fetch(`${URL_BASE}/jugar-penal`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id, gano: esGol })
          });
          const data = await res.json();
          
          if (data.error_limite) {
               alert(data.mensaje);
               resTexto.style.color = "var(--rojo)";
               resTexto.innerText = "¡SIN ENERGÍA! ⏱️";
               return;
          }

          usuarioActual.monedas = data.datos.monedas;
          usuarioActual.puntos_ranking = data.datos.puntos_ranking;
          actualizarInterfazUI();
          cargarRankingLocal();
          
          resTexto.innerText += ` — Te quedan ${data.tiros_restantes} tiros.`;
          const btnProximo = document.querySelector("button[onclick='iniciarDueloLocal()']");
          
          if (data.tiros_restantes <= 0) {
               if (btnProximo) btnProximo.disabled = true;
          } else {
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
          }
          
          arrancarCronometroVisual(data.siguienteIn);

     } catch (err) {
          console.error(err);
          document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
     }
}

/* ========================================================================
   🏆 6. RANKING DE LA ARENA (LEADERBOARD)
   ======================================================================== */
async function cargarRankingLocal() {
     cargarRankingMundialesLocal();
     const tbody = document.getElementById("tabla-ranking-body");
     if (!tbody) return;

     try {
          const res = await fetch(`${URL_BASE}/ranking`);
          const data = await res.json();
          tbody.innerHTML = "";

          if (!data.ranking || data.ranking.length === 0) {
               tbody.innerHTML = `<tr><td colspan="3" style="color:#777;">No hay jugadores en la arena</td></tr>`;
               return;
          }

          data.ranking.forEach((user, index) => {
               const tr = document.createElement("tr");
               if (usuarioActual && user.username === usuarioActual.username) {
                    tr.className = "fila-usuario-actual";
               }

               let posicionText = index + 1;
               if (index === 0) posicionText = "🥇";
               if (index === 1) posicionText = "🥈";
               if (index === 2) posicionText = "🥉";

               tr.innerHTML = `
                    <td><b>${posicionText}</b></td>
                    <td style="text-align: left; padding-left: 15px;">
                         ${user.username} ${usuarioActual && user.username === usuarioActual.username ? '<span style="color:var(--celeste); font-size:0.8rem;">(Vos)</span>' : ''}
                    </td>
                    <td style="color: #ff4a4a; font-weight: bold;">${user.puntos_ranking}</td>
               `;
               tbody.appendChild(tr);
          });
     } catch (err) { console.error(err); }
}

/* ========================================================================
   🏆 6B. RANKING EXCLUSIVO DE CAMPEONES MUNDIALES
   ======================================================================== */
async function cargarRankingMundialesLocal() {
     const tbody = document.getElementById("tabla-ranking-mundiales-body");
     if (!tbody) return;

     try {
          const res = await fetch(`${URL_BASE}/ranking-mundiales`);
          const data = await res.json();
          tbody.innerHTML = "";

          if (!data.ranking || data.ranking.length === 0) {
               tbody.innerHTML = `<tr><td colspan="3" style="color:#777; padding: 15px;">🌟 Todavía no hay campeones en la Arena. ¡Sé el primero! 👑</td></tr>`;
               return;
          }

          data.ranking.forEach((user, index) => {
               const tr = document.createElement("tr");
               if (usuarioActual && user.username === usuarioActual.username) {
                    tr.className = "fila-usuario-actual";
               }

               let posicionText = index + 1;
               if (index === 0) posicionText = "🥇";
               if (index === 1) posicionText = "🥈";
               if (index === 2) posicionText = "🥉";

               tr.innerHTML = `
                    <td><b>${posicionText}</b></td>
                    <td style="text-align: left; padding-left: 15px;">
                         ${user.username.toUpperCase()} ${usuarioActual && user.username === usuarioActual.username ? '<span style="color:var(--celeste); font-size:0.8rem;">(Vos)</span>' : ''}
                    </td>
                    <td style="color: var(--dorado); font-weight: bold; font-size: 1.2rem;">🏆 ${user.copas_mundiales}</td>
               `;
               tbody.appendChild(tr);
          });
     } catch (err) { 
          console.error("Error al cargar ranking de mundiales:", err); 
     }
}

/* ========================================================================
   🚪 7. CERRAR SESIÓN (CON AVISO AL SERVIDOR)
   ======================================================================== */
async function cerrarSesionLocal() {
     if (!usuarioActual) return;

     const confirmar = confirm(`¿Estás seguro de que querés salir, ${usuarioActual.username}?`);
     if (!confirmar) return;

     try {
          await fetch(`${URL_BASE}/logout`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ username: usuarioActual.username })
          });
     } catch (err) { console.error("Error al avisar logout al servidor:", err); }

     clearInterval(intervaloCronometro);
     usuarioActual = null;
     direccionGanadora = "";
     albumCompleto = [];
     window.albumCompleto = [];
     paisSeleccionado = "";

     document.getElementById("input-usuario").value = "";
     document.getElementById("input-pass").value = "";

     const interfazJuego = document.getElementById("interfaz-juego");
     interfazJuego.classList.remove("mostrar");
     interfazJuego.style.display = "none";
     document.getElementById("seccion-login").style.display = "block";

     alert("🚪 Sesión cerrada correctamente. Volviste al menú local.");
}

/* ========================================================================
   🎰 8. SISTEMA DE TIMBA MULTI-APUESTA ( MONEDAS Y CROMOS )
   ======================================================================== */
const LISTA_SELECCIONES_TIMBA = [
     { nombre: "ARGENTINA", bandera: "🇦🇷" }, { nombre: "BRASIL", bandera: "🇧🇷" },
     { nombre: "URUGUAY", bandera: "🇺🇾" },     { nombre: "ALEMANIA", bandera: "🇩🇪" },
     { nombre: "FRANCIA", bandera: "🇫🇷" },     { nombre: "ESPAÑA", bandera: "🇪🇸" },
     { nombre: "ITALIA", bandera: "🇮🇹" },       { nombre: "INGLATERRA", bandera: "🏴" },
     { nombre: "PORTUGAL", bandera: "🇵🇹" },     { nombre: "HOLANDA", bandera: "🇳🇱" },
     { nombre: "COLOMBIA", bandera: "🇨🇴" },     { nombre: "CHILE", bandera: "🇨🇱" },
     { nombre: "MÉXICO", bandera: "🇲🇽" },       { nombre: "JAPÓN", bandera: "🇯🇵" },
     { nombre: "MARRUECOS", bandera: "🇲🇦" },    { nombre: "CROACIA", bandera: "🇭🇷" },
     { nombre: "BÉLGICA", bandera: "🇧🇪" },      { nombre: "SENEGAL", bandera: "🇸🇳" },
     { nombre: "ESTADOS UNIDOS", bandera: "🇺🇸" }, { nombre: "ARABIA SAUDITA", bandera: "🇸🇦" }
];

var historialPartidosSimulados = [];

function rotarPartidoTimba() {
     let local = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
     let visitante = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
     
     while (local.nombre === visitante.nombre) {
          visitante = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
     }
     
     document.getElementById("timba-bandera-local").innerText = local.bandera;
     document.getElementById("timba-local").innerText = local.nombre;
     document.getElementById("timba-bandera-visitante").innerText = visitante.bandera;
     document.getElementById("timba-visitante").innerText = visitante.nombre;
}

function conmutarControlesTimbaUI() {
     const tipo = document.getElementById("select-tipo-apuesta").value;
     if (tipo === "monedas") {
          document.getElementById("wrapper-apuesta-monedas").style.display = "flex";
          document.getElementById("wrapper-apuesta-cromo").style.display = "none";
     } else {
          document.getElementById("wrapper-apuesta-monedas").style.display = "none";
          document.getElementById("wrapper-apuesta-cromo").style.display = "flex";
          cargarRepetidasEnDesplegableUI();
     }
}

function cargarRepetidasEnDesplegableUI() {
     const select = document.getElementById("select-cromo-repetido");
     if (!select) return;
     select.innerHTML = "";

     const miAlbumReal = window.albumCompleto || albumCompleto;

     if (!miAlbumReal || !Array.isArray(miAlbumReal)) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.innerText = "⏳ Cargando inventario...";
          select.appendChild(opt);
          return;
     }

     const repetidas = miAlbumReal.filter(f => f && f.obtenido > 1);

     if (repetidas.length === 0) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.innerText = "❌ No tenés cromos repetidos";
          select.appendChild(opt);
          return;
     }

     repetidas.forEach(figu => {
          if (!figu) return;
          
          const nombrePlayer = figu.nombre || "Jugador";
          const copas = figu.obtenido || 2;
          const bandera = figu.bandera || "🃏";
          const rareza = figu.rareza || "común";
          const idCarta = figu.id;

          const opt = document.createElement("option");
          opt.value = idCarta;
          opt.innerText = `${bandera} ${nombrePlayer.toUpperCase()} (x${copas}) [${rareza.toUpperCase()}]`;
          select.appendChild(opt);
     });
}

function actualizarHistorialUI(infoPartido) {
     historialPartidosSimulados.unshift(infoPartido);
     if (historialPartidosSimulados.length > 3) historialPartidosSimulados.pop();

     const contenedorLista = document.getElementById("lista-historial-timba");
     if (!contenedorLista) return;
     contenedorLista.innerHTML = "";

     historialPartidosSimulados.forEach(p => {
          const li = document.createElement("li");
          li.className = "item-historial-partido";
          li.innerHTML = `<span>⚔️ ${p.local} vs ${p.visitante}</span> <b style="color: var(--celeste);">${p.res}</b>`;
          contenedorLista.appendChild(li);
     });
}

async function prepararOpcionesApuesta() {
     if (!usuarioActual) return alert("❌ Iniciá sesión para timbear.");
     
     const tipoApuesta = document.getElementById("select-tipo-apuesta").value;
     let montoApuesta = 0;
     let jugadorIdApostado = null;

     if (tipoApuesta === "monedas") {
          montoApuesta = parseInt(document.getElementById("input-monto-apuesta").value);
          if (isNaN(montoApuesta) || montoApuesta <= 0) {
               return alert("❌ Ingresá un monto de oro válido.");
          }
          if (usuarioActual.monedas < montoApuesta) {
               return alert("🪙 No tenés suficiente Oro.");
          }
     } else {
          jugadorIdApostado = document.getElementById("select-cromo-repetido").value;
          if (!jugadorIdApostado) {
               return alert("❌ Debés seleccionar un cromo repetido válido de la lista.");
          }
     }

     mostrarCarga("Estudiando probabilidades...");

     try {
          const res = await fetch(`${URL_BASE}/timba/preparar`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                    usuario_id: usuarioActual.id,
                    tipoApuesta,
                    montoApuesta,
                    jugadorIdApostado: jugadorIdApostado ? parseInt(jugadorIdApostado) : null
               })
          });
          const data = await res.json();
          ocultarCarga();

          if (data.error_limite) {
               alert(data.mensaje);
               actualizarTimbasRestantesUI();
               return;
          }

          if (!data.ok) return alert(data.mensaje);

          const contenedor = document.getElementById("contenedor-opciones-goles");
          if (!contenedor) return;
          contenedor.innerHTML = "";
          contenedor.style.display = "grid";

          data.opciones.forEach(opc => {
               const btn = document.createElement("button");
               btn.type = "button";
               btn.className = "btn-estadio btn-opcion-resultado";
               btn.style.margin = "5px";
               btn.innerText = opc.label;
               btn.onclick = () => procesarEleccionTimbaSegura(opc.idOpcion);
               contenedor.appendChild(btn);
          });

          timbaPreparada = true;
          actualizarTimbasRestantesUI();

     } catch (err) {
          console.error("Error al preparar opciones seguras:", err);
          ocultarCarga();
     }
}

async function procesarEleccionTimbaSegura(idOpcionElegida) {
    if (!timbaPreparada) return;

    const bandLoc = document.getElementById("timba-bandera-local").innerText;
    const nomLoc = document.getElementById("timba-local").innerText;
    const bandVis = document.getElementById("timba-bandera-visitante").innerText;
    const nomVis = document.getElementById("timba-visitante").innerText;

    mostrarCarga("Procesando tu jugada...");

    try {
        const res = await fetch(`${URL_BASE}/timba/procesar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioActual.id, idOpcionElegida })
        });
        const data = await res.json();
        ocultarCarga();

        if (!data.ok) return alert(data.mensaje);

        usuarioActual.monedas = data.datos.monedas;
        usuarioActual.puntos_ranking = data.datos.puntos_ranking;
        actualizarInterfazUI();

        alert(`⚽ RESULTADO DE LA TIMBA ⚽\n\n${data.mensajeResultado}`);

        document.getElementById("contenedor-opciones-goles").style.display = "none";
        
        await cargarAlbumLocal();
        
        if (document.getElementById("select-tipo-apuesta").value === "cromo") {
            cargarRepetidasEnDesplegableUI();
        }

        actualizarHistorialUI({
            local: `${bandLoc} ${nomLoc}`,
            visitor: `${bandVis} ${nomVis}`,
            res: `${data.golesLReal} - ${data.golesVReal}`
        });

        timbaPreparada = false;
        rotarPartidoTimba();

    } catch (err) {
        console.error("Error al procesar jugada segura:", err);
        ocultarCarga();
    }
}

setTimeout(rotarPartidoTimba, 1000);

/* ========================================================================
   🏆 9. ENGINE INTERACTIVO DEL MINIMUNDIAL (COOLDOWN + DRAFT + GRUPOS EN VIVO)
   ======================================================================== */
let mundialTernaPaises = [];
let mundialRivalClasif = "";
let jugadoresSeleccionadosDraft = [];
let intervaloCronometroMundial = null;

const MAPA_PUNTOS_RAREZA = { 'comun': 60, 'especial': 68, 'rara': 75, 'epica': 85, 'legendaria': 96 };

async function actualizarEstadoMundialUI() {
     if (!usuarioActual) return;
     try {
          const res = await fetch(`${URL_BASE}/mundial/estado/${usuarioActual.id}`);
          const data = await res.json();
          
          const lblCopas = document.getElementById("lbl-copas-mundiales");
          if (lblCopas) lblCopas.innerText = data.copas || 0;

          arrancarCronometroMundialVisual(data.siguienteIn);
     } catch (err) { console.error("Error al pedir estado del Mundial:", err); }
}

function arrancarCronometroMundialVisual(ms) {
     clearInterval(intervaloCronometroMundial);
     const lblReloj = document.getElementById("cronometro-mundial");
     const btnIniciar = document.getElementById("btn-preparar-mundial");
     const contenedorOpcionesPaises = document.getElementById("zona-eleccion-pais-mundial");
     if (!lblReloj) return;

     if (ms <= 0) {
          lblReloj.innerText = "🔋 ¡Inscripción abierta para el MiniMundial!";
          lblReloj.style.color = "var(--verde-match)";
          if (btnIniciar) btnIniciar.style.display = "inline-block";
          return;
     }

     if (btnIniciar) btnIniciar.style.display = "none";
     if (contenedorOpcionesPaises) contenedorOpcionesPaises.innerHTML = "";
     
     let tiempoRestante = ms;
     intervaloCronometroMundial = setInterval(() => {
          tiempoRestante -= 1000;
          if (tiempoRestante <= 0) {
               clearInterval(intervaloCronometroMundial);
               lblReloj.innerText = "⚡ ¡Vestuarios listos! Actualizando...";
               if (btnIniciar) btnIniciar.style.display = "inline-block";
               return;
          }
          const totalSegundos = Math.floor(tiempoRestante / 1000);
          const horas = Math.floor(totalSegundos / 3600);
          const minutos = Math.floor((totalSegundos % 3600) / 60);
          const segundos = totalSegundos % 60;
          lblReloj.innerText = `⏱️ Próximo torneo en: ${horas}h ${minutos.toString().padStart(2,'0')}m ${segundos.toString().padStart(2,'0')}s`;
          lblReloj.style.color = "var(--rojo)";
     }, 1000);
}

async function prepararInscripcionMundial() {
     if (!usuarioActual) return;
     mostrarCarga("Inscribiendo equipo y debitando arancel de la FIFA...");

     try {
          const res = await fetch(`${URL_BASE}/mundial/preparar`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id })
          });
          const data = await res.json();
          ocultarCarga();

          if (!data.ok) return alert(data.mensaje);

          if (data.monedasActualizadas !== undefined) {
               usuarioActual.monedas = data.monedasActualizadas;
               actualizarInterfazUI();
          } else {
               usuarioActual.monedas -= 500;
               actualizarInterfazUI();
          }

          const barraNavegacion = document.querySelector(".nav-modulos-estadio");
          if (barraNavegacion) {
               barraNavegacion.style.display = "none"; 
          }
          const btnSalir = document.querySelector(".btn-logout-kick");
          if (btnSalir) btnSalir.style.display = "none";

          mundialTernaPaises = data.terna;
          mundialRivalClasif = data.rivalClasificacion;
          jugadoresSeleccionadosDraft = [];

          const contenedorTerna = document.getElementById("zona-eleccion-pais-mundial");
          contenedorTerna.innerHTML = "";
          
          document.getElementById("fase-inscripcion-mundial").style.display = "block";
          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "none";

          data.terna.forEach(pais => {
               const btn = document.createElement("button");
               btn.className = "btn-estadio btn-modulo-match";
               btn.style.margin = "8px";
               btn.innerText = `⚽ ${pais.toUpperCase()}`;
               btn.onclick = () => iniciarDraftJugadoresMundial(pais);
               contenedorTerna.appendChild(btn);
          });

     } catch (err) { 
          console.error(err); 
          ocultarCarga(); 
     }
}

function iniciarDraftJugadoresMundial(paisElegido) {
     window.mundialSeleccionUsuario = paisElegido;
     
     document.getElementById("fase-inscripcion-mundial").style.display = "none";
     document.getElementById("fase-draft-mundial").style.display = "block";
     
     document.getElementById("lbl-tu-seleccion-mundial").innerText = paisElegido.toUpperCase();
     document.getElementById("lbl-rival-clasificacion-mundial").innerText = mundialRivalClasif.toUpperCase();

     actualizarEstrellasVisualesDraft();
     renderizarGridCartasDisponiblesDraft(paisElegido);
}

function renderizarGridCartasDisponiblesDraft(paisElegido) {
     const grid = document.getElementById("grid-cartas-draft-mundial");
     if (!grid) return;
     grid.innerHTML = "";

     const cartasFiltradas = albumCompleto.filter(f => f.obtenido > 0 && f.pais.toLowerCase() === paisElegido.toLowerCase());

     cartasFiltradas.forEach(carta => {
          const card = document.createElement("div");
          const estaElegida = jugadoresSeleccionadosDraft.includes(carta.id);
          
          card.className = `carta-clash ${carta.rareza.toLowerCase()} ${estaElegida ? 'activo-draft' : ''}`;

          card.innerHTML = `
              <img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}">
              <div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>
          `;

          card.onclick = () => {
               if (jugadoresSeleccionadosDraft.includes(carta.id)) {
                    jugadoresSeleccionadosDraft = jugadoresSeleccionadosDraft.filter(id => id !== carta.id);
               } else {
                    if (jugadoresSeleccionadosDraft.length >= 3) {
                         return alert("❌ Alineación completa (Máximo 3).");
                    }
                    jugadoresSeleccionadosDraft.push(carta.id);
               }
               renderizarGridCartasDisponiblesDraft(paisElegido);
               actualizarEstrellasVisualesDraft();
          };

          grid.appendChild(card);
     });
}

function actualizarEstrellasVisualesDraft() {
     const lblEstrellas = document.getElementById("lbl-estrellas-equipo-mundial");
     if (!lblEstrellas) return;

     if (jugadoresSeleccionadosDraft.length !== 3) {
          lblEstrellas.innerText = "⚠️ Alineá 3 jugadores para calcular poder";
          return;
     }

     const cartasElegidas = albumCompleto.filter(f => jugadoresSeleccionadosDraft.includes(f.id));
     const suma = cartasElegidas.reduce((acc, c) => acc + MAPA_PUNTOS_RAREZA[c.rareza.toLowerCase()], 0);
     const promedio = suma / 3;

     let numEstrellas = 1;
     if (promedio >= 90) numEstrellas = 5;
     else if (promedio >= 79) numEstrellas = 4;
     else if (promedio >= 70) numEstrellas = 3;
     else if (promedio >= 62) numEstrellas = 2;

     lblEstrellas.innerText = "⭐".repeat(numEstrellas) + ` (${numEstrellas}/5 Estrellas)`;
}

async function ejecutarTorneoMundial() {
    // 🔥 PARCHE DE BIEN CLAVADO EN EL ENTORNO ONLINE:
    const faseDraftOnline = document.getElementById("multi-fase-draft");
    if (faseDraftOnline && faseDraftOnline.style.display === "block") {
        if (jugadoresSeleccionadosDraft.length !== 3) {
            return alert("❌ Completá la alineación de 3 jugadores.");
        }
        confirmarInscripcionMultiServidor(window.mundialSeleccionUsuario, jugadoresSeleccionadosDraft);
        return; // Frenamos acá para no tocar el torneo un jugador
    }
     if (jugadoresSeleccionadosDraft.length !== 3) {
          return alert("❌ Completá la alineación de 3 jugadores.");
     }

     mostrarCarga("Pidiendo autorización de planilla a la FIFA...");

     try {
          const res = await fetch(`${URL_BASE}/mundial/jugar`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                    usuario_id: usuarioActual.id,
                    seleccionElegida: window.mundialSeleccionUsuario,
                    rivalClasificacion: mundialRivalClasif,
                    jugadorIds: jugadoresSeleccionadosDraft
               })
          });
          const data = await res.json();
          ocultarCarga();

          if (!data.ok) return alert(data.mensaje);

          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "block";

          const contenedorLista = document.getElementById("lista-cruces-mundial-simulacion");
          contenedorLista.innerHTML = "";

          if (!data.progreso.ganoClasificacion) {
               contenedorLista.innerHTML = `
                    <div class="item-historial-partido" style="color:var(--rojo); border-color:var(--rojo); text-align:center;">
                         <span>❌ Quedaste afuera del torneo por falta de puntos en las eliminatorias mundialistas. Volvé a intentarlo en 3hs.</span>
                    </div>
               `;
               usuarioActual.monedas = data.datosActualizados?.monedas || usuarioActual.monedas;
               actualizarInterfazUI();
               actualizarEstadoMundialUI();
               
               liberarNavegacionArenaUI();
               return;
          }

          const wrapperTabla = document.createElement("div");
          wrapperTabla.style.cssText = "background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #1a2436;";
          wrapperTabla.innerHTML = `
              <h4 style="color:var(--dorado); margin:0 0 10px 0; font-family:'Oswald'; text-align:center;">📊 TABLA EN VIVO - GRUPO</h4>
              <table style="width:100%; border-collapse:collapse; text-align:center; font-weight:bold; font-size:1.1rem;">
                  <thead>
                      <tr style="color:#64748b; font-size:0.85rem;"><th>POS</th><th style="text-align:left;">SELECCIÓN</th><th>GF</th><th>GC</th><th>PTS</th></tr>
                  </thead>
                  <tbody id="tbody-tabla-grupo-live"></tbody>
              </table>
          `;
          contenedorLista.appendChild(wrapperTabla);

          const renderizarTablaGrupoLive = (tablaEstado) => {
               const tbody = document.getElementById("tbody-tabla-grupo-live");
               if (!tbody) return;
               
               let listaOrdenada = Object.values(tablaEstado).sort((a,b) => {
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    return (b.gf - b.gc) - (a.gf - a.gc);
               });

               tbody.innerHTML = "";
               listaOrdenada.forEach((fila, idx) => {
                    const esTuPais = fila.pais === window.mundialSeleccionUsuario;
                    const tr = document.createElement("tr");
                    tr.style.color = esTuPais ? "var(--verde-match)" : "#fff";
                    if (idx < 2) tr.style.background = "rgba(0,255,136,0.03)"; 
                    
                    tr.innerHTML = `
                        <td style="padding:6px 0; color:${idx < 2 ? 'var(--verde-match)':'var(--rojo)'};">${idx + 1}</td>
                        <td style="text-align:left;">⚽ ${fila.pais.toUpperCase()}</td>
                        <td>${fila.gf}</td>
                        <td>${fila.gc}</td>
                        <td style="color:var(--dorado); font-size:1.2rem;">${fila.pts}</td>
                    `;
                    tbody.appendChild(tr);
               });
          };

          let estadoTablaMundial = {};
          data.progreso.integrantesGrupo.forEach(p => {
               estadoTablaMundial[p] = { pais: p, pts: 0, gf: 0, gc: 0 };
          });
          renderizarTablaGrupoLive(estadoTablaMundial);

          for (let f = 0; f < data.progreso.bitacoraGrupo.length; f++) {
               const fechaData = data.progreso.bitacoraGrupo[f];
               
               const divFecha = document.createElement("div");
               divFecha.style.cssText = "background:#0b111e; padding:12px; border-radius:8px; border-left:4px solid var(--celeste); margin-bottom:15px;";
               divFecha.innerHTML = `
                    <div style="color:var(--celeste); font-size:0.9rem; font-weight:bold; margin-bottom:6px;">📅 FECHA ${fechaData.fecha} DEL GRUPO</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span>🇦🇷 ${fechaData.local} vs ${fechaData.visitante}</span>
                        <span id="goles-m1-f${f}" style="color:var(--verde-match); font-family:'Oswald';">0 - 0</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>🤖 ${fechaData.botL} vs ${fechaData.botV}</span>
                        <span id="goles-m2-f${f}" style="color:#aaa; font-family:'Oswald';">0 - 0</span>
                    </div>
                    <div id="reloj-f${f}" style="text-align:center; font-size:0.8rem; margin-top:5px; color:#64748b;">⏱️ 00:00</div>
               `;
               contenedorLista.appendChild(divFecha);
               divFecha.scrollIntoView({ behavior: 'smooth' });

               await new Promise((resolveFecha) => {
                    let segV = 0;
                    let g1_L = 0; let g1_V = 0;
                    let g2_L = 0; let g2_V = 0;

                    const tGroup = setInterval(() => {
                         segV += 9; 
                         if (segV > 90) segV = 90;

                         if (g1_L < fechaData.gL && Math.random() < 0.2) g1_L++;
                         if (g1_V < fechaData.gV && Math.random() < 0.2) g1_V++;
                         if (g2_L < fechaData.gBL && Math.random() < 0.2) g2_L++;
                         if (g2_V < fechaData.gBV && Math.random() < 0.2) g2_V++;

                         if (segV === 90) {
                             g1_L = fechaData.gL; g1_V = fechaData.gV;
                             g2_L = fechaData.gBL; g2_V = fechaData.gBV;
                         }

                         document.getElementById(`goles-m1-f${f}`).innerText = `${g1_L} - ${g1_V}`;
                         document.getElementById(`goles-m2-f${f}`).innerText = `${g2_L} - ${g2_V}`;
                         document.getElementById(`reloj-f${f}`).innerText = `⏱️ MINUTO ${segV}:00`;

                         if (segV >= 90) {
                              clearInterval(tGroup);
                              
                              const acumLive = (loc, vis, gl, gv) => {
                                  estadoTablaMundial[loc].gf += gl; estadoTablaMundial[loc].gc += gv;
                                  estadoTablaMundial[vis].gf += gv; estadoTablaMundial[vis].gc += gl;
                                  if (gl > gv) estadoTablaMundial[loc].pts += 3;
                                  else if (gl < gv) estadoTablaMundial[vis].pts += 3;
                                  else { estadoTablaMundial[loc].pts += 1; estadoTablaMundial[vis].pts += 1; }
                              };
                              acumLive(fechaData.local, fechaData.visitante, fechaData.gL, fechaData.gV);
                              acumLive(fechaData.botL, fechaData.botV, fechaData.gBL, fechaData.gBV);
                              
                              renderizarTablaGrupoLive(estadoTablaMundial);
                              resolveFecha();
                         }
                    }, 1000);
               });
          }

          if (!data.progreso.clasifico) {
               const cartelEliminado = document.createElement("div");
               cartelEliminado.style.cssText = "text-align:center; padding:15px; border:2px solid var(--rojo); color:var(--rojo); font-weight:bold; border-radius:8px; margin-top:10px;";
               cartelEliminado.innerText = `❌ Quedaste fuera del Mundial en Fase de Grupos (Puesto #${data.progreso.posicionFinalGrupo}). Volvé a intentarlo en 3hs.`;
               contenedorLista.appendChild(cartelEliminado);

               usuarioActual.monedas = data.datosActualizados?.monedas || usuarioActual.monedas;
               actualizarInterfazUI();
               actualizarEstadoMundialUI();

               liberarNavegacionArenaUI();
               return;
          }

          const tituloPlayoffs = document.createElement("h3");
          tituloPlayoffs.style.cssText = "color:var(--dorado); text-align:center; font-family:'Oswald'; margin:20px 0 10px 0;";
          tituloPlayoffs.innerText = "🔥 ¡CLASIFICASTE! EMPIEZAN LAS LLAVES DE PLAY-OFFS";
          contenedorLista.appendChild(tituloPlayoffs);

          for (let i = 0; i < data.progreso.bitacoraPlayoffs.length; i++) {
               const partido = data.progreso.bitacoraPlayoffs[i];
               const ganoEsteCruce = partido.resultado.includes("Ganaste");
               
               await simularMarcadorPantalla(contenedorLista, partido.ronda, window.mundialSeleccionUsuario, partido.rival, ganoEsteCruce);
               if (!ganoEsteCruce) break; 
          }

          if (data.progreso.campeon) {
               const corona = document.createElement("div");
               corona.style.cssText = "text-align:center; margin-top:20px; color:var(--dorado); font-size:1.4rem; font-weight:bold;";
               corona.innerText = "🏆 ¡CAMPEÓN DEL MUNDO! 🏆\n🎁 ¡Premio de 5.000 de Oro depositado!";
               corona.scrollIntoView({ behavior: 'smooth' });
               contenedorLista.appendChild(corona);
          }

          if (data.datosActualizados) {
               usuarioActual.monedas = data.datosActualizados.monedas;
               usuarioActual.puntos_ranking = data.datosActualizados.puntos_ranking;
               usuarioActual.copas_mundiales = data.datosActualizados.copas_mundiales;
               actualizarInterfazUI();
               cargarRankingMundialesLocal();
          }

          actualizarEstadoMundialUI();
          liberarNavegacionArenaUI();

     } catch (err) { 
          console.error(err); 
          ocultarCarga();
          liberarNavegacionArenaUI();
     }
}

function liberarNavegacionArenaUI() {
     const barraNavegacion = document.querySelector(".nav-modulos-estadio");
     if (barraNavegacion) {
          barraNavegacion.style.removeProperty("display");
     }
     const btnSalir = document.querySelector(".btn-logout-kick");
     if (btnSalir) {
          btnSalir.style.removeProperty("display");
     }
}

function simularMarcadorPantalla(contenedor, ronda, tuPais, rival, ganoUsuario) {
    return new Promise(async (resolve) => {
        const esFinal = ronda.toLowerCase().includes("final") && !ronda.toLowerCase().includes("octavos") && !ronda.toLowerCase().includes("cuartos") && !ronda.toLowerCase().includes("semi");
        const duracionTotalSegundos = esFinal ? 30 : 10;

        const filaPartido = document.createElement("div");
        filaPartido.className = "item-historial-partido";
        filaPartido.style.flexDirection = "column";
        filaPartido.style.alignItems = "stretch";
        filaPartido.style.background = "#0b111e";
        
        filaPartido.innerHTML = `
            <div style="display:flex; justify-content:space-between; color:var(--dorado); font-size:0.9rem; border-bottom:1px solid #1a2436; padding-bottom:4px;">
                <span>📋 ${ronda.toUpperCase()}</span>
                <span id="reloj-vivo-${ronda.replace(/ /g,'')}">⏱️ 00:00</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span style="font-size:1.1rem; width:40%; text-align:left;">🇦🇷 ${tuPais}</span>
                <span id="score-vivo-${ronda.replace(/ /g,'')}" style="font-family:'Oswald'; font-size:1.4rem; background:#000; padding:2px 12px; border-radius:4px; color:var(--verde-match);">0 - 0</span>
                <span style="font-size:1.1rem; width:40%; text-align:right;">${rival} 🤖</span>
            </div>
        `;
        contenedor.appendChild(filaPartido);
        filaPartido.scrollIntoView({ behavior: 'smooth' });

        let golesTu = Math.floor(Math.random() * 3);
        let golesRival = Math.floor(Math.random() * 3);
        
        if (ganoUsuario && golesTu <= golesRival) {
            golesTu = golesRival + Math.floor(Math.random() * 2) + 1;
        } else if (!ganoUsuario && golesRival <= golesTu) {
            golesRival = golesTu + Math.floor(Math.random() * 2) + 1;
        }

        let golesTuActuales = 0;
        let golesRivalActuales = 0;
        let segundoVirtual = 0;

        const incrementoSegundos = 90 / (duracionTotalSegundos * 2); 

        const timer = setInterval(() => {
            segundoVirtual += incrementoSegundos;
            if (segundoVirtual > 90) segundoVirtual = 90;

            if (golesTuActuales < golesTu && Math.random() < 0.15) golesTuActuales++;
            if (golesRivalActuales < golesRival && Math.random() < 0.15) golesRivalActuales++;

            if (segundoVirtual === 90) {
                golesTuActuales = golesTu;
                golesRivalActuales = golesRival;
            }

            document.getElementById(`reloj-vivo-${ronda.replace(/ /g,'')}`).innerText = `⏱️ ${Math.floor(segundoVirtual).toString().padStart(2,'0')}:00`;
            document.getElementById(`score-vivo-${ronda.replace(/ /g,'')}`).innerText = `${golesTuActuales} - ${golesRivalActuales}`;

            if (segundoVirtual >= 90) {
                clearInterval(timer);
                filaPartido.style.borderColor = ganoUsuario ? "var(--verde-match)" : "var(--rojo)";
                const finLabel = document.createElement("div");
                finLabel.style.cssText = `text-align:right; font-size:0.85rem; font-weight:bold; margin-top:5px; color:${ganoUsuario ? 'var(--verde-match)' : 'var(--rojo)'};`;
                finLabel.innerText = ganoUsuario ? "FINALIZADO - AVANZAS ✅" : "FINALIZADO - ELIMINADO ❌";
                filaPartido.appendChild(finLabel);
                resolve();
            }
        }, 500);
    });
}

// 🔥 Se ejecuta de forma segura al seleccionar pestañas de torneos
const cambiarModuloOriginal = cambiarModulo;
cambiarModulo = function(idModulo, botonPresionado) {
     cambiarModuloOriginal(idModulo, botonPresionado);
     if (idModulo === 'modulo-minimundial' && usuarioActual) {
          actualizarEstadoMundialUI();
          cargarRankingMundialesLocal(); 
          document.getElementById("fase-inscripcion-mundial").style.display = "block";
          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "none";
     }
};

/* ========================================================================
   ❓ 10. CONTROL DEL MODAL DE AYUDA Y REGLAS
   ======================================================================== */
function abrirModalAyuda() {
     const modal = document.getElementById("modal-ayuda-juego");
     if (modal) modal.style.display = "flex";
}

function cerrarModalAyuda() {
     const modal = document.getElementById("modal-ayuda-juego");
     if (modal) modal.style.display = "none";
}

/* ========================================================================
   🚨 CONTROLADOR SEGURO DE ANUNCIOS GLOBAL (ANTI-F12)
   ======================================================================== */
async function iniciarControladorAnunciosSeguro() {
    try {
        const res = await fetch(`${URL_BASE}/anuncio-actual`);
        const anuncio = await res.json();

        if (!anuncio || !anuncio.activo) return;

        const modal = document.getElementById('modalAnuncioGlobal');
        const tituloHtml = document.getElementById('anuncioTitulo');
        const cuerpoHtml = document.getElementById('anuncioCuerpo');

        if (!modal || !tituloHtml || !cuerpoHtml) return;

        tituloHtml.textContent = anuncio.titulo.toUpperCase();
        cuerpoHtml.innerHTML = ""; 

        if (anuncio.texto) {
            const p = document.createElement('p');
            p.textContent = anuncio.texto;
            cuerpoHtml.appendChild(p);
        }

        if (anuncio.tipo === "imagen" && anuncio.urlImagen) {
            const img = document.createElement('img');
            img.src = anuncio.urlImagen;
            img.className = "anuncio-media";
            img.alt = "Novedades de la Arena";
            cuerpoHtml.appendChild(img);
        } 
        else if (anuncio.tipo === "video" && anuncio.urlVideo) {
            const containerVideo = document.createElement('div');
            containerVideo.className = "anuncio-video-container";
            
            const iframe = document.createElement('iframe');
            iframe.src = anuncio.urlVideo;
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.style.border = "none";

            containerVideo.appendChild(iframe);
            cuerpoHtml.appendChild(containerVideo);
        }

        modal.style.display = "flex";

    } catch (err) {
        console.error("Error al validar el banner de novedades de la Arena:", err);
    }
}

function cerrarAnuncioGlobal() {
    const modal = document.getElementById('modalAnuncioGlobal');
    if (modal) {
        modal.style.display = "none";
        document.getElementById('anuncioCuerpo').innerHTML = "";
    }
}

/* ========================================================================
   🔍 11. MÓDULO DE FILTRADO DE ÁLBUM INTERACTIVO (SISTEMA CRUZADO HUD)
   ======================================================================== */
function filtrarAlbumPorEstado(estado, boton) {
     filtroEstadoActual = estado;
     actualizarVisualBotonesFiltro(boton, 'estado');
     aplicarFiltrosCruzadosUI();
}

function filtrarAlbumPorRareza(rareza, boton) {
     filtroRarezaActual = rareza;
     actualizarVisualBotonesFiltro(boton, 'rareza');
     aplicarFiltrosCruzadosUI();
}

function aplicarFiltrosCruzadosUI() {
     const contenedor = document.getElementById("contenedor-grid-album");
     if (!contenedor) return;
     
     const cartas = contenedor.getElementsByClassName("carta-clash");
     let contadorVisibles = 0;

     for (let divCarta of cartas) {
          const estaBloqueada = divCarta.classList.contains("bloqueada");
          
          let rarezaCarta = 'comun';
          if (divCarta.classList.contains("rara")) rarezaCarta = 'rara';
          else if (divCarta.classList.contains("epica")) rarezaCarta = 'epica';
          else if (divCarta.classList.contains("legendaria")) rarezaCarta = 'legendaria';

          let cumpleEstado = false;
          if (filtroEstadoActual === 'todas') cumpleEstado = true;
          else if (filtroEstadoActual === 'desbloqueadas' && !estaBloqueada) cumpleEstado = true;
          else if (filtroEstadoActual === 'pendientes' && estaBloqueada) cumpleEstado = true;

          let cumpleRareza = false;
          if (filtroRarezaActual === 'todas') cumpleRareza = true;
          else if (filtroRarezaActual === rarezaCarta) cumpleRareza = true;

          if (cumpleEstado && cumpleRareza) {
               divCarta.style.display = "block";
               contadorVisibles++;
          } else {
               divCarta.style.display = "none";
          }
     }
     
     console.log(`🔎 Filtro aplicado: Estado [${filtroEstadoActual}] | Rareza [${filtroRarezaActual}]. Mostrando ${contadorVisibles} figuras.`);
}

function actualizarVisualBotonesFiltro(botonClasificado, tipoGrupo) {
     const botonesHermanos = botonClasificado.parentElement.getElementsByClassName("btn-filtro-tv");
     for (let btn of botonesHermanos) {
          btn.classList.remove("activo");
     }
     botonClasificado.classList.add("activo");
}

/* ========================================================================
   ⚽ 9B. ENGINE MULTIJUGADOR ONLINE (CARRIL 100% INDEPENDIENTE Y SEGURO)
   ======================================================================== */

// Variable global de control para saber si la sala actual cuesta oro o es gratis
window.multiTipoApuestaActual = 'amistoso';

// 1. Abre el selector de países exclusivo del Multijugador (ADAPTADO ANTI-TRAMPAS)
async function abrirDraftMulti(esCreador) {
    multiEsCreador = esCreador;
    
    if (!esCreador) {
        const cod = document.getElementById("multi-input-codigo").value.trim().toUpperCase();
        if (cod.length !== 6) return alert("❌ Código inválido. Debe tener 6 caracteres.");
        multiCodigoSala = cod;

        // 🔍 EL INVITADO LE PREGUNTA A LA SALA QUÉ SE ESTÁ APOSTANDO ANTES DE ENTRAR
        mostrarCarga("Validando credenciales de la sala...");
        try {
            const res = await fetch(`${URL_BASE}/multijugador/sala/${cod}`);
            const data = await res.json();
            ocultarCarga();

            if (!data.ok) return alert(data.mensaje);
            
            window.multiTipoApuestaActual = data.tipo_apuesta ? data.tipo_apuesta.toLowerCase() : 'amistoso';
            multiSalaId = data.sala_id;
        } catch (e) {
            ocultarCarga();
            return alert("Error de conexión con la sala.");
        }
    } else {
        const inputApuesta = document.getElementById("multi-input-apuesta");
        multiApuestaFijada = inputApuesta ? (parseInt(inputApuesta.value) || 0) : 0;
        
        const selectTipo = document.getElementById("multi-select-tipo-apuesta");
        window.multiTipoApuestaActual = selectTipo ? selectTipo.value.toLowerCase() : 'amistoso';
    }

    document.getElementById("multi-menu-inicial").style.display = "none";
    document.getElementById("multi-fase-inscripcion").style.display = "block";
    
    prepararInscripcionMundialMulti();
}

// 2. Trae la terna de países desde Neon usando el bypass libre de cobros individuales
async function prepararInscripcionMundialMulti() {
     if (!usuarioActual) return;
     mostrarCarga("Conectando con la central de la Arena Online...");

     try {
          const res = await fetch(`${URL_BASE}/multijugador/preparar-draft`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id })
          });
          const data = await res.json();
          ocultarCarga();

          if (!data.ok) {
               document.getElementById("multi-menu-inicial").style.display = "block";
               document.getElementById("multi-fase-inscripcion").style.display = "none";
               return alert(data.mensaje);
          }

          // 🛡️ Ocultamos la barra superior para centrar la atención en el Draft, sin romper sesión
          const barraNavegacion = document.querySelector(".nav-modulos-estadio");
          if (barraNavegacion) barraNavegacion.style.display = "none"; 
          const btnSalir = document.querySelector(".btn-logout-kick");
          if (btnSalir) btnSalir.style.display = "none";

          mundialTernaPaises = data.terna;
          jugadoresSeleccionadosDraft = [];

          const contenedorTerna = document.getElementById("multi-zona-eleccion-pais");
          if (!contenedorTerna) return;
          contenedorTerna.innerHTML = "";
          
          data.terna.forEach(pais => {
               const btn = document.createElement("button");
               btn.className = "btn-estadio btn-modulo-match";
               btn.style.margin = "8px";
               btn.innerText = `⚽ ${pais.toUpperCase()}`;
               btn.onclick = () => iniciarDraftJugadoresMundialMulti(pais);
               contenedorTerna.appendChild(btn);
          });

     } catch (err) { 
          console.error("Error en draft multi frontend:", err); 
          ocultarCarga(); 
     }
}

// 3. Inicializa el tablero gráfico de descarte sin romper la Grid de selección
function iniciarDraftJugadoresMundialMulti(paisElegido) {
     window.mundialSeleccionUsuario = paisElegido;
     
     document.getElementById("multi-fase-inscripcion").style.display = "none";
     document.getElementById("multi-fase-draft").style.display = "block";
     document.getElementById("multi-lbl-tu-seleccion").innerText = paisElegido.toUpperCase();

     const wrapperApuestaInvitado = document.getElementById("multi-wrapper-apuesta-invitado");

     // 🎰 Si la sala es modalidad cartas y es el invitado, mostramos el contenedor fijo
     if (window.multiTipoApuestaActual === 'carta' && !multiEsCreador) {
          if (wrapperApuestaInvitado) wrapperApuestaInvitado.style.display = "block";

          const selectCromo = document.getElementById("multi-select-carta-apuesta-invitado");
          if (selectCromo) {
              selectCromo.innerHTML = "";
              // Filtramos las repetidas del álbum real del usuario
              const repetidas = albumCompleto.filter(f => f.obtenido > 1);
              
              if (repetidas.length === 0) {
                  const opt = document.createElement("option");
                  opt.value = "";
                  opt.innerText = "❌ No tenés cartas repetidas para arriesgar";
                  selectCromo.appendChild(opt);
              } else {
                  repetidas.forEach(figu => {
                      const opt = document.createElement("option");
                      opt.value = figu.id;
                      opt.innerText = `🃏 ${figu.nombre.toUpperCase()} (Tenes ${figu.obtenido})`;
                      selectCromo.appendChild(opt);
                  });
              }
          }
     } else {
          // Si es amistoso, oro o es el creador, ocultamos el selector del invitado
          if (wrapperApuestaInvitado) wrapperApuestaInvitado.style.display = "none";
     }
     
     // Lanzamos el renderizado normal de jugadores de la selección elegida sin bloqueos
     actualizarEstrellasVisualesDraftMulti();
     renderizarGridCartasDisponiblesDraftMulti(paisElegido);
}

// 4. Pinta tu inventario real filtrado en el contenedor multi exclusivo
function renderizarGridCartasDisponiblesDraftMulti(paisElegido) {
     const grid = document.getElementById("multi-grid-cartas-draft");
     if (!grid) return;
     grid.innerHTML = "";

     const cartasFiltradas = albumCompleto.filter(f => f.obtenido > 0 && f.pais.toLowerCase() === paisElegido.toLowerCase());

     if (cartasFiltradas.length === 0) {
          grid.innerHTML = `<div style="color:var(--rojo); padding:15px; text-align:center; font-weight:bold;">❌ No tenés jugadores de este país en tu álbum colector.</div>`;
          return;
     }

     cartasFiltradas.forEach(carta => {
          const card = document.createElement("div");
          const estaElegida = jugadoresSeleccionadosDraft.includes(carta.id);
          card.className = `carta-clash ${carta.rareza.toLowerCase()} ${estaElegida ? 'activo-draft' : ''}`;

          card.innerHTML = `
              <img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}">
              <div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>
          `;

          card.onclick = () => {
               if (jugadoresSeleccionadosDraft.includes(carta.id)) {
                    jugadoresSeleccionadosDraft = jugadoresSeleccionadosDraft.filter(id => id !== carta.id);
               } else {
                    if (jugadoresSeleccionadosDraft.length >= 3) return alert("❌ La alineación ya está completa (Máximo 3).");
                    jugadoresSeleccionadosDraft.push(carta.id);
               }
               renderizarGridCartasDisponiblesDraftMulti(paisElegido);
               actualizarEstrellasVisualesDraftMulti();
          };
          grid.appendChild(card);
     });
}

// 5. Mide el poder de las cartas en el entorno multi
function actualizarEstrellasVisualesDraftMulti() {
     const lblEstrellas = document.getElementById("multi-lbl-estrellas-equipo");
     if (!lblEstrellas) return;

     if (jugadoresSeleccionadosDraft.length !== 3) {
          lblEstrellas.innerText = "⚠️ Alineá 3 jugadores para calcular poder";
          return;
     }

     const cartasElegidas = albumCompleto.filter(f => jugadoresSeleccionadosDraft.includes(f.id));
     const promedio = cartasElegidas.reduce((acc, c) => acc + MAPA_PUNTOS_RAREZA[c.rareza.toLowerCase()], 0) / 3;

     let numEstrellas = 1;
     if (promedio >= 90) numEstrellas = 5;
     else if (promedio >= 79) numEstrellas = 4;
     else if (promedio >= 70) numEstrellas = 3;
     else if (promedio >= 62) numEstrellas = 2;

     lblEstrellas.innerText = "⭐".repeat(numEstrellas) + ` (${numEstrellas}/5 Estrellas)`;
}

// 6. Impacta la planilla mandando la carta seleccionada
async function confirmarInscripcionMultiServidor(paisElegido, arrayIdsJugadores) {
    if (arrayIdsJugadores.length !== 3) return alert("❌ Debés alinear exactamente 3 jugadores.");

     let cartaIdSeleccionada = null;
     if (window.multiTipoApuestaActual === 'carta') {
     const idSelect = multiEsCreador ? "multi-select-carta-apuesta" : "multi-select-carta-apuesta-invitado";
     const selectElement = document.getElementById(idSelect);
     
     cartaIdSeleccionada = selectElement ? selectElement.value : null;
     if (!cartaIdSeleccionada) return alert("❌ Debés elegir tu cromo a arriesgar.");

     // 🔥 CAPTURAMOS EL TEXTO (Ej: "🃏 MESSI (Tienes x2)") PARA EL CARTEL
     window.multiMiCartaApostadaTexto = selectElement.options[selectElement.selectedIndex].text;
     } else {
     window.multiMiCartaApostadaTexto = null;
     }

    mostrarCarga("Enviando planilla de vestuarios a la Arena Online...");
    
    let url = `${URL_BASE}/multijugador/crear`;
    let cuerpo = {
        usuario_id: usuarioActual.id,
        seleccion: paisElegido,
        jugador_ids: arrayIdsJugadores,
        tipo_apuesta: window.multiTipoApuestaActual,
        apuesta_oro: multiApuestaFijada,
        carta_apuesta_id: cartaIdSeleccionada ? parseInt(cartaIdSeleccionada) : null
    };

    if (!multiEsCreador) {
        url = `${URL_BASE}/multijugador/unirse`;
        cuerpo = {
            usuario_id: usuarioActual.id,
            seleccion: paisElegido,
            jugador_ids: arrayIdsJugadores,
            codigo_sala: multiCodigoSala,
            carta_apuesta_id: cartaIdSeleccionada ? parseInt(cartaIdSeleccionada) : null
        };
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo)
        });
        const data = await res.json();

        if (!data.ok) {
            ocultarCarga();
            return alert(data.mensaje);
        }

        if (data.monedasActualizadas !== undefined) {
            usuarioActual.monedas = data.monedasActualizadas;
            if (typeof actualizarInterfazUI === "function") actualizarInterfazUI();
        }

        multiSalaId = data.sala_id;
        if (data.codigo_sala) multiCodigoSala = data.codigo_sala;

        document.getElementById("multi-fase-draft").style.display = "none";
        document.getElementById("multi-lobby-espera").style.display = "block";
        document.getElementById("lobby-txt-codigo").innerText = multiCodigoSala;
        ocultarCarga();

        multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000);
        actualizarLobbyEnVivo(); 

    } catch (err) {
        console.error(err);
        ocultarCarga();
    }
}

// 7. Loop de refresco del Lobby de Espera (Polling) - SINCRONIZADO CON INFO DE APUESTAS
async function actualizarLobbyEnVivo() {
    if (!multiCodigoSala) return;

    try {
        const res = await fetch(`${URL_BASE}/multijugador/sala/${multiCodigoSala}`);
        const data = await res.json();

        if (!data.ok) {
            clearInterval(multiIntervaloLobby);
            return console.log(data.mensaje);
        }

        // Sincronizamos dinámicamente el tipo de apuesta real desde la base de datos
        if (data.tipo_apuesta) {
            window.multiTipoApuestaActual = data.tipo_apuesta.toLowerCase();
        }

        if (data.estado === 'finalizado' || data.estado === 'jugando') {
            clearInterval(multiIntervaloLobby);
            if (!multiEsCreador) {
                 // 🔥 Nos aseguramos de sincronizar el ID de sala real antes de consultar
                 multiSalaId = data.sala_id; 
                 consultarResultadoInvitado();
            }
            return;
        }

        // ========================================================================
        // 🎨 CARD INFORMATIVA DE APUESTAS EN VIVO (Muerte Súbita o Torneo)
        // ========================================================================
        const contenedorListado = document.getElementById("lobby-lista-participantes");
        
        // Buscamos si ya existe nuestra barra informativa, si no, la creamos arriba de la lista
        let infoSalaBox = document.getElementById("multi-info-sala-dinamica");
        if (!infoSalaBox && contenedorListado) {
            infoSalaBox = document.createElement("div");
            infoSalaBox.id = "multi-info-sala-dinamica";
            contenedorListado.parentNode.insertBefore(infoSalaBox, contenedorListado);
        }

          if (infoSalaBox) {
          let detalle = `🪙 MODALIDAD: TIMBA POR ORO`;
          
          if (window.multiTipoApuestaActual === 'carta') {
               // 🔥 Tomamos la carta guardada en el Paso 1
               let miCartaInfo = window.multiMiCartaApostadaTexto || "Seleccionada en Vestuario";
               
               detalle = `🃏 MODALIDAD: DUELO DE CARTAS REPETIDAS\n⚠️ ¡Muerte Súbita! El perdedor descarta.\n\n🔒 TÚ APUESTA FIJADA: ${miCartaInfo.toUpperCase()}`;
          } else if (window.multiTipoApuestaActual === 'amistoso') {
               detalle = `🤝 MODALIDAD: AMISTOSO ONLINE`;
          }
          
          infoSalaBox.innerHTML = `
               <div style="background:rgba(11,17,30,0.8); padding:12px; border-radius:8px; border:1px solid var(--dorado); text-align:center; font-weight:bold; color:var(--dorado); margin-bottom:15px; font-family:'Oswald'; white-space:pre-line;">
                    ${detalle}
               </div>
          `;
          }

        // Renderizado del HUD estándar del lobby
        const txtPozo = document.getElementById("lobby-txt-pozo");
        if (txtPozo) {
            // Si es por cartas o amistoso, no tiene sentido matemático mostrar "Pozo: 0 Oro", queda mejor adaptado
            if (window.multiTipoApuestaActual === 'carta') {
                txtPozo.innerText = `🎰 Pozo: 1 Cromo Épico/Leg Mínimo`;
            } else if (window.multiTipoApuestaActual === 'amistoso') {
                txtPozo.innerText = `⚽ Modo de Práctica`;
            } else {
                txtPozo.innerText = `💰 Pozo Actual: ${data.pozo_total} Oro`;
            }
        }
        
        document.getElementById("lobby-cnt-jugadores").innerText = data.participantes.length;

        // Limpiamos y re-pintamos la lista de jugadores conectados
        contenedorListado.innerHTML = "";

        data.participantes.forEach(p => {
            const div = document.createElement("div");
            div.style.cssText = "background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--verde-match); margin-bottom:6px;";
            
            const esHost = p.usuario_id === data.creador_id;
            div.innerHTML = `
                <span style="font-weight:bold; color:#fff;">${esHost ? '👑 ' : ''}${p.username}</span>
                <span style="color:var(--dorado); font-family:'Oswald';">⚽ ${p.seleccion.toUpperCase()}</span>
            `;
            contenedorListado.appendChild(div);
        });

        if (multiEsCreador) {
            document.getElementById("multi-btn-iniciar-fixture").style.display = "block";
            document.getElementById("multi-txt-espera-host").style.display = "none";
        } else {
            document.getElementById("multi-btn-iniciar-fixture").style.display = "none";
            document.getElementById("multi-txt-espera-host").style.display = "block";
        }

    } catch (err) {
        console.error("Error en loop del lobby:", err);
    }
}

// 8. Disparador del Creador (Lanza la simulación en Neon)
async function lanzarSimulacionMulti() {
    mostrarCarga("Sorteando las llaves y cerrando las planillas online...");
    clearInterval(multiIntervaloLobby);

    try {
        const res = await fetch(`${URL_BASE}/multijugador/jugar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sala_id: multiSalaId,
                usuario_id: usuarioActual.id
            })
        });
        const data = await res.json();
        ocultarCarga();

        if (!data.ok) {
            alert(data.mensaje);
            multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000);
            return;
        }

        window.renderizarFixturePasoAPaso(data.bitacora, data.premio);

    } catch (err) {
        console.error(err);
        ocultarCarga();
    }
}

// 9. Conexión del invitado: Consulta el fixture con sistema anti-desincronización (REINTENTO SEGURO)
async function consultarResultadoInvitado(intento = 1) {
     if (intento === 1) {
         mostrarCarga("¡El Torneo comenzó! Recibiendo transmisión oficial del fixture...");
     }
     
     try {
          // Usamos el ID de sala global que guardaste al unirte
          const res = await fetch(`${URL_BASE}/multijugador/resultado-invitado/${multiSalaId}`);
          const data = await res.json();
          
          // 🛡️ CONTROL DE CACHÉ CALIENTE: Si el servidor responde ok pero la bitácora no se asentó todavía...
          if (data.ok && (!data.bitacora || data.bitacora.length <= 1)) {
               if (intento <= 3) {
                   console.log(`⏳ Bitácora en proceso de cálculo en Neon. Reintentando pase en 800ms (Intento ${intento}/3)...`);
                   setTimeout(() => consultarResultadoInvitado(intento + 1), 800);
                   return;
               }
          }

          ocultarCarga();
          
          if (!data.ok) {
               alert(data.mensaje || "Error al sincronizar el torneo.");
               cancelarMundialMultiLobby();
               return;
          }
          
          // 🔥 Lanza la cinemática definitiva idéntica al host
          window.renderizarFixturePasoAPaso(data.bitacora, data.premio);

     } catch(e) {
          console.error("Error crítico al consultar fixture el invitado:", e);
          ocultarCarga();
     }
}

// 🔥 10. FUNCIÓN MAESTRA MULTIJUGADOR: TRANSMISIÓN 100% SINCRONIZADA CON TEXTO DE APUESTAS SIMPLES INTERACTIVA
window.renderizarFixturePasoAPaso = function(bitacora, premio, apuestasTexto) {
    document.getElementById("multi-lobby-espera").style.display = "none";
    document.getElementById("multi-pantalla-fixture").style.display = "block";

    const tablero = document.getElementById("multi-cronologia-goles");
    if (!tablero) return;
    tablero.innerHTML = ""; 

    // ========================================================================
    // 🃏 DETALLE TEXTUAL DE LAS CARTAS REPETIDAS EN JUEGO (SIMPLE)
    // ========================================================================
    if (apuestasTexto && Array.isArray(apuestasTexto) && apuestasTexto.length > 0) {
        const bloqueTextoApuestas = document.createElement("div");
        bloqueTextoApuestas.style.cssText = "background: rgba(255, 0, 0, 0.05); border: 1px solid var(--rojo); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; color: #fff; font-size: 0.95rem; text-align: center; font-family: sans-serif; line-height: 1.5; box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);";
        bloqueTextoApuestas.innerHTML = `⚠️ <span style="color: var(--rojo); font-family: 'Oswald';">CROMOS ARRIESGADOS EN ESTA ARENA:</span><br>${apuestasTexto.join('<br>')}`;
        tablero.appendChild(bloqueTextoApuestas);
    }

    if (!bitacora || !Array.isArray(bitacora) || bitacora.length === 0) {
        console.warn("⚠️ No se recibió bitácora válida.");
        return;
    }

    let secuenciaPromesas = Promise.resolve();
    let ultimaRondaProcesada = null;

    bitacora.forEach((partido, index) => {
        const loc = partido.local || "Local";
        const vis = partido.visitante || "Rival";
        const rondaNombre = partido.ronda || `PARTIDO #${index + 1}`;
        
        const golesLocalDefinitivos = partido.golesLocal || 0;
        const golesVisitanteDefinitivos = partido.golesVisitante || 0;

        // 🛑 DETECTOR DE CAMBIO DE FASE: Si la ronda cambia, inyectamos una pausa interactiva
        if (ultimaRondaProcesada && ultimaRondaProcesada !== rondaNombre) {
            secuenciaPromesas = secuenciaPromesas.then(() => {
                return new Promise((resolvePausa) => {
                    const bloquePausa = document.createElement("div");
                    bloquePausa.style.cssText = "text-align:center; background:#111a2e; border: 1px dashed var(--celeste); padding: 15px; border-radius: 8px; margin: 20px 0; box-shadow: 0 0 15px rgba(0, 200, 255, 0.15); animation: pulse 2s infinite;";
                    bloquePausa.innerHTML = `
                        <h4 style="color:var(--celeste); font-family:'Oswald'; margin:0 0 5px 0; font-size: 1.1rem;">⏳ ¡ETAPA TERMINADA!</h4>
                        <p style="color:#bbb; font-size:0.9rem; margin:0 0 12px 0;">Todos los cruces de la fase anterior han concluido en vivo.</p>
                        <button type="button" id="btn-continuar-fase-${index}" class="btn-estadio" style="width:70%; margin:0 auto; padding: 8px 15px; background:var(--celeste); border-color:var(--celeste); font-size:0.9rem; cursor:pointer; font-weight:bold; text-transform:uppercase;">
                            ⏩ CONTINUAR CON LA SIGUIENTE FASE
                        </button>
                    `;
                    tablero.appendChild(bloquePausa);
                    bloquePausa.scrollIntoView({ behavior: 'smooth' });

                    document.getElementById(`btn-continuar-fase-${index}`).onclick = function() {
                        this.disabled = true;
                        this.innerText = "⏳ CARGANDO ETAPA...";
                        bloquePausa.style.opacity = "0.6";
                        resolvePausa();
                    };
                });
            });
        }

        ultimaRondaProcesada = rondaNombre;

        // ⚽ EJECUCIÓN NORMAL VIRTUAL DEL PARTIDO 90 MINUTOS
        secuenciaPromesas = secuenciaPromesas.then(() => {
            return new Promise((resolveCruce) => {
                const bloquePartido = document.createElement("div");
                bloquePartido.className = "item-historial-partido";
                bloquePartido.style.cssText = "flex-direction: column; align-items: stretch; background: #0b111e; margin-bottom:15px; border-left:4px solid var(--dorado);";
                
                bloquePartido.innerHTML = `
                    <div style="display:flex; justify-content:space-between; color:var(--dorado); font-size:0.9rem; border-bottom:1px solid #1a2436; padding-bottom:4px;">
                        <span>📋 ${rondaNombre.toUpperCase()}</span>
                        <span id="multi-reloj-${index}">⏱️ 00:00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <span style="font-size:1.1rem; width:40%; text-align:left;">⚽ ${loc.toUpperCase()}</span>
                        <span id="multi-score-${index}" style="font-family:'Oswald'; font-size:1.4rem; background:#000; padding:2px 12px; border-radius:4px; color:var(--verde-match);">0 - 0</span>
                        <span style="font-size:1.1rem; width:40%; text-align:right;">${vis.toUpperCase()} ⚽</span>
                    </div>
                    <div id="multi-penales-box-${index}" style="display:none; text-align:center; color:var(--rojo); font-weight:bold; font-size:0.9rem; margin-top:5px;"></div>
                `;
                tablero.appendChild(bloquePartido);
                bloquePartido.scrollIntoView({ behavior: 'smooth' });

                let minVirtual = 0;
                let gL_act = 0;
                let gV_act = 0;

                const timerMulti = setInterval(() => {
                    minVirtual += 15; 
                    if (minVirtual > 90) minVirtual = 90;

                    if (minVirtual >= 30 && gL_act < golesLocalDefinitivos && golesLocalDefinitivos > 0) gL_act++;
                    if (minVirtual >= 60 && gV_act < golesVisitanteDefinitivos && golesVisitanteDefinitivos > 0) gV_act++;

                    if (minVirtual === 90) {
                        gL_act = golesLocalDefinitivos;
                        gV_act = golesVisitanteDefinitivos;
                    }

                    const relojElement = document.getElementById(`multi-reloj-${index}`);
                    const scoreElement = document.getElementById(`multi-score-${index}`);
                    
                    if (relojElement) relojElement.innerText = `⏱️ MINUTO ${minVirtual}:00`;
                    if (scoreElement) scoreElement.innerText = `${gL_act} - ${gV_act}`;

                    if (minVirtual >= 90) {
                        clearInterval(timerMulti);
                        
                        if (partido.definicionPenales) {
                            const pBox = document.getElementById(`multi-penales-box-${index}`);
                            if (pBox) {
                                pBox.style.display = "block";
                                pBox.innerText = `💥 TANDA DE PENALES: (${partido.penalesLocal} - ${partido.penalesVisitante})`;
                            }
                        }

                        bloquePartido.style.borderColor = "var(--verde-match)";
                        const finTexto = document.createElement("div");
                        finTexto.style.cssText = "text-align:right; font-size:0.85rem; font-weight:bold; margin-top:5px; color:var(--verde-match);";
                        finTexto.innerText = ` GANADOR: ${partido.ganadorUsername.toUpperCase()} ✅`;
                        bloquePartido.appendChild(finTexto);
                        
                        resolveCruce(); 
                    }
                }, 400);
            });
        });
    });

    // ========================================================================
    // 🏁 CIERRE Y PANTALLA DE PREMIOS FINALES
    // ========================================================================
    secuenciaPromesas.then(() => {
         const bloquePremio = document.createElement("div");
         bloquePremio.style.cssText = "text-align:center; margin-top:25px; padding:15px; background:rgba(0,255,136,0.05); border:2px dashed var(--dorado); border-radius:10px;";
         
         let textoPremio = `👑 ¡Fin de la transmisión de la Arena!\n🎁 El torneo ha concluido exitosamente.`;
         
         if (premio && !premio.ganoBot) {
              if (premio.tipo_apuesta === 'oro') {
                   textoPremio = `🏆 ¡FIN DEL TORNEO! 🏆\n👑 Campeón: ${premio.ganador_username.toUpperCase()}\n🎁 ¡Se lleva el pozo acumulado de 🪙 ${premio.pozo} de Oro!`;
              } else if (premio.tipo_apuesta === 'carta') {
                   textoPremio = `🏆 ¡FIN DEL TORNEO! 🏆\n👑 Campeón: ${premio.ganador_username.toUpperCase()}\n\n🎉 ¡Conservás tu cromo apostado y ganaste un nuevo crack:\n🌟 [ ${premio.nombreCartaPremio || 'Jugador Épico'} ] transferido al inventario!\n\n💀 Los competidores derrotados perdieron su cromo permanentemente.`;
              }
         } else if (premio && premio.ganoBot) {
              if (premio.tipo_apuesta === 'carta') {
                   textoPremio = `🤖 ¡El torneo fue conquistado por un Bot (${premio.ganador_username.toUpperCase()})!\n\n💀 ¡CRÍTICO! Ningún usuario real ganó. Ambos jugadores perdieron sus cartas apostadas de forma permanente.`;
              } else {
                   textoPremio = `🤖 ¡El torneo fue conquistado por un Bot!\n👑 Campeón: ${premio.ganador_username.toUpperCase()}\n💸 El pozo de la Arena se ha disuelto.`;
              }
         }
         
         bloquePremio.innerHTML = `
              <h3 style="color:var(--dorado); font-family:'Oswald'; margin:0 0 10px 0;">🏁 CRÓNICA DEFINITIVA</h3>
              <p style="color:#fff; font-weight:bold; white-space:pre-line; font-size:1.05rem;">${textoPremio}</p>
              <button type="button" id="btn-regresar-limpio-multi" class="btn-estadio btn-next-shot" style="width:80%; margin:15px auto 0; background:var(--celeste); border-color:var(--celeste);">
                   🔄 REGRESAR A LA HOME DE LA ARENA
              </button>
         `;
         tablero.appendChild(bloquePremio);
         bloquePremio.scrollIntoView({ behavior: 'smooth' });

         document.getElementById("btn-regresar-limpio-multi").onclick = () => {
             document.getElementById("multi-pantalla-fixture").style.display = "none";
             document.getElementById("multi-menu-inicial").style.display = "block";
             
             const moduloMulti = document.getElementById("modulo-mundial-multi");
             if (moduloMulti) moduloMulti.style.display = "block";

             const barraNavegacion = document.querySelector(".nav-modulos-estadio");
             if (barraNavegacion) barraNavegacion.style.removeProperty("display");
             
             const btnSalir = document.querySelector(".btn-logout-kick");
             if (btnSalir) btnSalir.style.removeProperty("display");

             multiSalaId = null;
             multiCodigoSala = null;
             multiEsCreador = false;

             if (typeof cambiarModulo === "function") {
                 const btnTienda = document.querySelector("button[onclick*='modulo-sobres']");
                 cambiarModulo('modulo-sobres', btnTienda);
             }
         };
    });
};

// 🛠️ CONTROLADOR VISUAL: Alterna los inputs de Oro y Cartas según la modalidad seleccionada
function conmutarInputsMultiUI() {
    const selector = document.getElementById("multi-select-tipo-apuesta");
    if (!selector) return;

    const tipo = selector.value;
    const divOro = document.getElementById("multi-wrapper-oro");
    const divCarta = document.getElementById("multi-wrapper-carta");

    if (tipo === 'oro') {
        if (divOro) divOro.style.display = "block";
        if (divCarta) divCarta.style.display = "none";
    } else if (tipo === 'carta') {
        if (divOro) divOro.style.display = "none";
        if (divCarta) divCarta.style.display = "block";
        // Cargamos las cartas repetidas reales usando la función del juego colector
        if (typeof cargarRepetidasEnDesplegableUI === 'function') {
            // Adaptamos la lista al input del multi
            const selectCromoMulti = document.getElementById("multi-select-carta-apuesta");
            if (selectCromoMulti) {
                selectCromoMulti.innerHTML = "";
                const miAlbumReal = window.albumCompleto || albumCompleto || [];
                const repetidas = miAlbumReal.filter(f => f && f.obtenido > 1);

                if (repetidas.length === 0) {
                    const opt = document.createElement("option");
                    opt.value = "";
                    opt.innerText = "❌ Sin cromos repetidos en el álbum";
                    selectCromoMulti.appendChild(opt);
                } else {
                    repetidas.forEach(figu => {
                        const opt = document.createElement("option");
                        opt.value = figu.id;
                        opt.innerText = `${figu.bandera || '🃏'} ${figu.nombre.toUpperCase()} (x${figu.obtenido})`;
                        selectCromoMulti.appendChild(opt);
                    });
                }
            }
        }
    } else {
        // Modo Amistoso / Gratis: Ocultamos ambos campos
        if (divOro) divOro.style.display = "none";
        if (divCarta) divCarta.style.display = "none";
    }
}

// 🚪 FUNCIÓN DE ESCAPE: Resetea el flujo multijugador y vuelve a prender el HUD de navegación
function cancelarMundialMultiLobby() {
    // Apagamos los intervalos de consulta del lobby si estaban corriendo
    if (multiIntervaloLobby) clearInterval(multiIntervaloLobby);

    // Ocultamos las fases avanzadas de juego
    document.getElementById("multi-fase-inscripcion").style.display = "none";
    document.getElementById("multi-fase-draft").style.display = "none";
    document.getElementById("multi-lobby-espera").style.display = "none";
    document.getElementById("multi-pantalla-fixture").style.display = "none";

    // Regresamos al menú inicial limpio de salas
    document.getElementById("multi-menu-inicial").style.display = "block";

    // 🔥 PRENDEMOS DE VUELTA EL LOGOUT Y LA NAVEGACIÓN SUPERIOR
    const barraNavegacion = document.querySelector(".nav-modulos-estadio");
    if (barraNavegacion) barraNavegacion.style.removeProperty("display");
    
    const btnSalir = document.querySelector(".btn-logout-kick");
    if (btnSalir) btnSalir.style.removeProperty("display");

    // Limpieza lógica de variables de control
    multiSalaId = null;
    multiCodigoSala = null;
    multiEsCreador = false;
    jugadoresSeleccionadosDraft = [];
    
    console.log("🚪 Salida de la sala confirmada. Interfaz unificada restablecida.");
}
