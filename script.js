/* ========================================================================
   ===          🏆 VIRTUAL ALBUM MUNDIAL - ENGINE MULTI-FASE UI         ===
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
     } catch (err) { console.error('Error al actualizar créditos de timba:', err); }
}

/* ========================================================================
   🎛️ 1. CONTROL DE MÓDULOS DE LA UI
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
          actualizarTimbasRestantesUI(); // ✨ Corregido: antes decía allTimbasRestantesUI
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
   ⏱️ REGENERACIÓN DE TIROS - PENALES
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
               
               filtroEstadoActual = 'todas';
               filtroRarezaActual = 'todas';
               
               actualizarInterfazUI();
               cargarAlbumLocal();
               actualizarTimbasRestantesUI();
               iniciarControladorAnunciosSeguro(); 
               
               if (accion === 'login') alert(`⚔️ ¡Bienvenido de vuelta, ${usuarioActual.username}!`);
               else alert(`🎉 ¡Cuenta creada con éxito! Empezás con 200 monedas.`);
          }
     } catch (err) { console.error(err); ocultarCarga(); }
}

function actualizarInterfazUI() {
     if (!usuarioActual) return;
     document.getElementById("lbl-usuario").innerText = usuarioActual.username.toUpperCase();
     document.getElementById("lbl-monedas").innerText = usuarioActual.monedas;
     document.getElementById("lbl-ranking").innerText = usuarioActual.puntos_ranking;
     
     const lblMundiales = document.getElementById("lbl-copas-mundiales");
     if (lblMundiales) lblMundiales.innerText = usuarioActual.copas_mundiales || 0;
}

/* ========================================================================
   📖 3. ÁLBUM MUNDIAL (SISTEMA PANINI)
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
               info.complete = figusDeEstePais.every(f => f.obtenido > 0);
          });

          contenedorPaises.innerHTML = "";
          if (!paisSeleccionado && countriesMap.size > 0) paisSeleccionado = countriesMap.keys().next().value;

          countriesMap.forEach((info, pais) => {
               const btn = document.createElement("button");
               btn.className = `btn-pais ${pais === paisSeleccionado ? 'activo' : ''} ${info.complete ? 'pais-completo' : ''}`;
               btn.innerHTML = `<span>${info.bandera}</span> ${pais.toUpperCase()}${info.complete ? " 👑" : ""}`;
               
               btn.onclick = () => {
                    paisSeleccionado = pais;
                    document.querySelectorAll('.btn-pais').forEach(b => b.classList.remove('activo'));
                    btn.classList.add('activo');
                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
     aplicarFiltrosCruzadosUI();
}

/* ========================================================================
   🍿 PACK OPENING ASÍNCRONO
   ======================================================================== */
let colaCartasPack = []; let indiceCartaActualPack = 0; let sobreAbiertoCompletoCache = []; let animacionCartaEnCurso = false; 

async function comprarSobreEspecifico(tipoCofre) {
     if (!usuarioActual) return alert("❌ Error.");
     mostrarCarga(`Adquiriendo derechos de pack ${tipoCofre.toUpperCase()}...`);

     try {
          const res = await fetch(`${URL_BASE}/comprar-sobre`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id, tipoCofre })
          });
          const data = await res.json();
          ocultarCarga();

          if (data.error_oro) return alert(data.mensaje);
          if (data.error) return alert("❌ Error: " + data.error);

          usuarioActual.monedas = data.monedas;
          actualizarInterfazUI();

          colaCartasPack = data.sobre; sobreAbiertoCompletoCache = data.sobre; indiceCartaActualPack = 0;
          document.getElementById("grid-sobre-abierto").innerHTML = "";
          
          const contenedorOpening = document.getElementById("contenedor-pack-opening");
          contenedorOpening.style.display = "flex";
          contenedorOpening.scrollIntoView({ behavior: 'smooth', block: 'center' });

          ejecutarSecuenciaReveladoCarta();
     } catch (err) { console.error(err); ocultarCarga(); }
}

async function ejecutarSecuenciaReveladoCarta() {
    if (indiceCartaActualPack >= colaCartasPack.length) {
        document.getElementById("contenedor-pack-opening").style.display = "none";
        renderizarGrillaFinalSobres(); animacionCartaEnCurso = false; return;
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
    pBandera.innerText = carta.bandera || "🃏"; pBandera.classList.add("revelada");

    await new Promise(r => setTimeout(r, 600));
    let posText = "DEL"; const posFiltro = carta.posicion ? carta.posicion.toUpperCase() : "";
    if (posFiltro.includes("DEF") || posFiltro.includes("ARQ") || posFiltro.includes("POR")) posText = "DEF";
    else if (posFiltro.includes("MED") || posFiltro.includes("VOL") || posFiltro.includes("CC")) posText = "MED";
    pPosicion.innerText = posText; pPosicion.classList.add("revelada");

    await new Promise(r => setTimeout(r, 600));
    pRareza.innerText = carta.rareza.toUpperCase(); pRareza.classList.add("revelada");

    await new Promise(r => setTimeout(r, 500));
    const divCarta = document.createElement("div");
    divCarta.className = `carta-clash ${carta.rareza.toLowerCase()} caminante-entrada`;
    
    let rarezaColor = "#8e9bb0";
    if (carta.rareza === "rara") rarezaColor = "#0074e8";
    else if (carta.rareza === "epica") rarezaColor = "#a335ee";
    else if (carta.rareza === "legendaria") rarezaColor = "#ffb100";

    divCarta.innerHTML = `
        ${carta.obtenido > 1 ? `<div class="badge-repetidas">x${carta.obtenido}</div>` : ''}
        <img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}">
        <div style="position: absolute; top: 0; left: 0; width: 18px; height: 100%; background: linear-gradient(90deg, ${rarezaColor} 0%, rgba(0,0,0,0) 100%); opacity: 0.4; z-index: 3;"></div>
        <div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>
    `;
    wrapper.appendChild(divCarta);
    await new Promise(r => setTimeout(r, 400));
    animacionCartaEnCurso = false; if (btnSiguiente) btnSiguiente.disabled = false; 
}

function mostrarSiguienteCartaSecuencia() {
     if (animacionCartaEnCurso) return; 
     indiceCartaActualPack++; ejecutarSecuenciaReveladoCarta();
}

async function renderizarGrillaFinalSobres() {
     const contenedorSobre = document.getElementById("grid-sobre-abierto");
     contenedorSobre.innerHTML = "";

     sobreAbiertoCompletoCache.forEach((figu, indice) => {
          const divCarta = document.createElement("div");
          divCarta.className = `carta-clash ${figu.rareza.toLowerCase()}`;
          divCarta.style.animationDelay = `${indice * 0.1}s`;
          divCarta.innerHTML = `
              ${figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : ''}
              <img src="${figu.foto}" class="carta-foto" alt="${figu.nombre}">
              <div class="rareza-vertical">${figu.rareza.toUpperCase()}</div>
          `;
          contenedorSobre.appendChild(divCarta);
     });
     if (usuarioActual) await cargarAlbumLocal();
}

/* ========================================================================
   ⚽ 5. DUELO DE PENALES
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
               resTexto.style.color = "var(--rojo)"; resTexto.innerText = "❌ ¡NO TE QUEDAN TIROS!";
               if (btnProximo) btnProximo.disabled = true;
               if (escenario) escenario.classList.add("bloqueado-energia");
               direccionGanadora = "";
          } else {
               resTexto.style.color = "white"; resTexto.innerText = `⚽ ¡PREPARÁ EL DISPARO! — Quedan ${data.tiros} tiros.`;
               if (btnProximo) btnProximo.disabled = false;
               if (escenario) escenario.classList.remove("bloqueado-energia");
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
               direccionGanadora = ['IZQUIERDA', 'CENTRO', 'DERECHA'][Math.floor(Math.random() * 3)];
          }
          arrancarCronometroVisual(data.siguienteIn);
     } catch (err) { console.error(err); }
     
     const balon = document.getElementById('balon-animado'); const arquero = document.getElementById('arquero-animado');
     if (balon && arquero) { balon.style.transform = 'translate(0, 0) scale(1)'; arquero.style.transform = 'translateX(0px)'; }
}

async function ejecutarPenalLocal(direccionElegida) {
     if (!usuarioActual || !direccionGanadora) return;
     const esMovil = window.innerWidth <= 768; const fX = esMovil ? 0.55 : 1.0; const fY = esMovil ? 0.65 : 1.0; 

     const mapaAnimaciones = {
          'SUP_IZQUIERDA': { balon: `translate(${-185*fX}px, ${-185*fY}px)`, arquero: `translate(${-185*fX}px, ${-65*fY}px) rotate(-25deg)` },
          'SUP_CENTRO': { balon: `translate(0px, ${-205*fY}px)`, arquero: `translate(0px, ${-75*fY}px) rotate(0deg)` },
          'SUP_DERECHA': { balon: `translate(${185*fX}px, ${-185*fY}px)`, arquero: `translate(${185*fX}px, ${-65*fY}px) rotate(25deg)` },
          'INF_IZQUIERDA': { balon: `translate(${-185*fX}px, ${-20*fY}px)`, arquero: `translate(${-185*fX}px, ${95*fY}px) rotate(-15deg)` },
          'INF_CENTRO': { balon: `translate(0px, ${-35*fY}px)`, arquero: `translate(0px, ${85*fY}px) rotate(0deg)` },
          'INF_DERECHA': { balon: `translate(${185*fX}px, ${-20*fY}px)`, arquero: `translate(${185*fX}px, ${95*fY}px) rotate(15deg)` }
     };

     const direccionArquero = Object.keys(mapaAnimaciones)[Math.floor(Math.random() * 6)];
     document.getElementById('arquero-animado').style.transform = mapaAnimaciones[direccionArquero].arquero;
     document.getElementById('balon-animado').style.transform = mapaAnimaciones[direccionElegida].balon;

     document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "none");
     await new Promise(r => setTimeout(r, 600));

     const esGol = direccionElegida !== direccionArquero;
     const resTexto = document.getElementById("resultado-penal");
     resTexto.style.color = esGol ? "var(--celeste)" : "var(--rojo)";
     resTexto.innerText = esGol ? "¡GOOOL! 🪙 +100 Oro" : "¡ATAJADO POR EL ARQUERO! 🧤";
     
     direccionGanadora = "";
     try {
          const res = await fetch(`${URL_BASE}/jugar-penal`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id, gano: esGol })
          });
          const data = await res.json();
          if (data.error_limite) return alert(data.mensaje);

          usuarioActual.monedas = data.datos.monedas;
          usuarioActual.puntos_ranking = data.datos.puntos_ranking;
          actualizarInterfazUI(); cargarRankingLocal();
          
          resTexto.innerText += ` — Te quedan ${data.tiros_restantes} tiros.`;
          if (data.tiros_restantes > 0) document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
          arrancarCronometroVisual(data.siguienteIn);
     } catch (err) { console.error(err); document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto"); }
}

/* ========================================================================
   🏆 Leaderboards y Cierre de Sesión
   ======================================================================== */
async function cargarRankingLocal() {
     cargarRankingMundialesLocal(); const tbody = document.getElementById("tabla-ranking-body"); if (!tbody) return;
     try {
          const res = await fetch(`${URL_BASE}/ranking`); const data = await res.json(); tbody.innerHTML = "";
          data.ranking.forEach((user, index) => {
               const tr = document.createElement("tr"); if (usuarioActual && user.username === usuarioActual.username) tr.className = "fila-usuario-actual";
               let pos = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
               tr.innerHTML = `<td><b>${pos}</b></td><td>${user.username}</td><td style="color:#ff4a4a; font-weight:bold;">${user.puntos_ranking}</td>`;
               tbody.appendChild(tr);
          });
     } catch (err) { console.error(err); }
}

async function cargarRankingMundialesLocal() {
     const tbody = document.getElementById("tabla-ranking-mundiales-body"); if (!tbody) return;
     try {
          const res = await fetch(`${URL_BASE}/ranking-mundiales`); const data = await res.json(); tbody.innerHTML = "";
          if (!data.ranking || data.ranking.length === 0) {
               tbody.innerHTML = `<tr><td colspan="3" style="color:#777; padding: 15px;">🌟 Todavía no hay campeones. 👑</td></tr>`; return;
          }
          data.ranking.forEach((user, index) => {
               const tr = document.createElement("tr"); if (usuarioActual && user.username === usuarioActual.username) tr.className = "fila-usuario-actual";
               let pos = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
               tr.innerHTML = `<td><b>${pos}</b></td><td>${user.username.toUpperCase()}</td><td style="color:var(--dorado); font-weight:bold;">🏆 ${user.copas_mundiales}</td>`;
               tbody.appendChild(tr);
          });
     } catch (err) { console.error(err); }
}

async function cerrarSesionLocal() {
     if (!usuarioActual) return;
     if (!confirm(`¿Estás seguro de que querés salir, ${usuarioActual.username}?`)) return;
     try {
          await fetch(`${URL_BASE}/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usuarioActual.username }) });
     } catch (e) { console.error(e); }

     clearInterval(intervaloCronometro); usuarioActual = null; direccionGanadora = ""; albumCompleto = []; paisSeleccionado = "";
     document.getElementById("interfaz-juego").style.display = "none"; document.getElementById("seccion-login").style.display = "block";
     alert("🚪 Sesión cerrada correctamente.");
}

/* ========================================================================
   🎰 SISTEMA DE TIMBA (MONEDAS / CROMOS)
   ======================================================================== */
const LISTA_SELECCIONES_TIMBA = [
     { nombre: "ARGENTINA", bandera: "🇦🇷" }, { nombre: "BRASIL", bandera: "🇧🇷" }, { nombre: "URUGUAY", bandera: "🇺🇾" }, { nombre: "ALEMANIA", bandera: "🇩🇪" },
     { nombre: "FRANCIA", bandera: "🇫🇷" }, { nombre: "ESPAÑA", bandera: "🇪🇸" }, { nombre: "ITALIA", bandera: "🇮🇹" }, { nombre: "INGLATERRA", bandera: "🏴" }
];
var historialPartidosSimulados = [];

function rotarPartidoTimba() {
     let local = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
     let visitante = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
     while (local.nombre === visitante.nombre) visitante = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
     
     document.getElementById("timba-bandera-local").innerText = local.bandera; document.getElementById("timba-local").innerText = local.nombre;
     document.getElementById("timba-bandera-visitante").innerText = visitante.bandera; document.getElementById("timba-visitante").innerText = visitante.nombre;
}

function conmutarControlesTimbaUI() {
     const tipo = document.getElementById("select-tipo-apuesta").value;
     document.getElementById("wrapper-apuesta-monedas").style.display = tipo === "monedas" ? "flex" : "none";
     document.getElementById("wrapper-apuesta-cromo").style.display = tipo === "cromo" ? "flex" : "none";
     if (tipo !== "monedas") cargarRepetidasEnDesplegableUI();
}

function cargarRepetidasEnDesplegableUI() {
     const select = document.getElementById("select-cromo-repetido"); if (!select) return; select.innerHTML = "";
     const repetidas = (window.albumCompleto || albumCompleto || []).filter(f => f && f.obtenido > 1);
     if (repetidas.length === 0) { select.innerHTML = "<option value=''>❌ Sin repetidas</option>"; return; }

     repetidas.forEach(figu => {
          const opt = document.createElement("option"); opt.value = figu.id;
          opt.innerText = `${figu.bandera} ${figu.nombre.toUpperCase()} (x${figu.obtenido}) [${figu.rareza.toUpperCase()}]`;
          select.appendChild(opt);
     });
}

function actualizarHistorialUI(infoPartido) {
     historialPartidosSimulados.unshift(infoPartido); if (historialPartidosSimulados.length > 3) historialPartidosSimulados.pop();
     const contenedor = document.getElementById("lista-historial-timba"); if (!contenedor) return; contenedor.innerHTML = "";
     historialPartidosSimulados.forEach(p => { contenedor.innerHTML += `<li class='item-historial-partido'><span>⚔️ ${p.local} vs ${p.visitor}</span> <b style='color:var(--celeste);'>${p.res}</b></li>`; });
}

async function prepararOpcionesApuesta() {
     if (!usuarioActual) return alert("❌ Iniciá sesión.");
     const tipo = document.getElementById("select-tipo-apuesta").value;
     let monto = 0; let jid = null;

     if (tipo === "monedas") {
          monto = parseInt(document.getElementById("input-monto-apuesta").value);
          if (isNaN(monto) || monto <= 0 || usuarioActual.monedas < monto) return alert("❌ Fondos o monto inválido.");
     } else {
          jid = document.getElementById("select-cromo-repetido").value; if (!jid) return alert("❌ Elegí un cromo.");
     }

     mostrarCarga("Estudiando probabilidades...");
     try {
          const res = await fetch(`${URL_BASE}/timba/preparar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioActual.id, tipoApuesta: tipo, montoApuesta: monto, jugadorIdApostado: jid ? parseInt(jid) : null }) });
          const data = await res.json(); ocultarCarga();

          if (!data.ok) return alert(data.mensaje);
          const cont = document.getElementById("contenedor-opciones-goles"); cont.innerHTML = ""; cont.style.display = "grid";
          data.opciones.forEach(opc => {
               const btn = document.createElement("button"); btn.className = "btn-estadio btn-opcion-resultado"; btn.innerText = opc.label;
               btn.onclick = () => procesarEleccionTimbaSegura(opc.idOpcion); cont.appendChild(btn);
          });
          timbaPreparada = true; actualizarTimbasRestantesUI();
     } catch (err) { ocultarCarga(); }
}

async function procesarEleccionTimbaSegura(idOpcionElegida) {
    if (!timbaPreparada) return;
    const bL = document.getElementById("timba-bandera-local").innerText; const nL = document.getElementById("timba-local").innerText;
    const bV = document.getElementById("timba-bandera-visitante").innerText; const nV = document.getElementById("timba-visitante").innerText;

    mostrarCarga("Procesando tu jugada...");
    try {
        const res = await fetch(`${URL_BASE}/timba/procesar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioActual.id, idOpcionElegida }) });
        const data = await res.json(); ocultarCarga();

        if (!data.ok) return alert(data.mensaje);
        usuarioActual.monedas = data.datos.monedas; usuarioActual.puntos_ranking = data.datos.puntos_ranking;
        actualizarInterfazUI(); alert(`⚽ RESULTADO ⚽\n\n${data.mensajeResultado}`);

        document.getElementById("contenedor-opciones-goles").style.display = "none";
        await cargarAlbumLocal(); timbaPreparada = false; rotarPartidoTimba();
        actualizarHistorialUI({ local: `${bL} ${nL}`, visitor: `${bV} ${nV}`, res: `${data.golesLReal} - ${data.golesVReal}` });
    } catch (err) { ocultarCarga(); }
}

/* ========================================================================
   🏆 ENGINE MINIMUNDIAL SINGLE-PLAYER (POR FASES)
   ======================================================================== */
let mundialTernaPaises = []; let mundialRivalClasif = ""; let jugadoresSeleccionadosDraft = []; let intervaloCronometroMundial = null;
const MAPA_PUNTOS_RAREZA = { 'comun': 60, 'especial': 68, 'rara': 75, 'epica': 85, 'legendaria': 96 };

async function actualizarEstadoMundialUI() {
     if (!usuarioActual) return;
     try {
          const res = await fetch(`${URL_BASE}/mundial/estado/${usuarioActual.id}`); const data = await res.json();
          arrancarCronometroMundialVisual(data.siguienteIn);
     } catch (err) { console.error(err); }
}

function arrancarCronometroMundialVisual(ms) {
     clearInterval(intervaloCronometroMundial);
     const lblReloj = document.getElementById("cronometro-mundial"); const btnIniciar = document.getElementById("btn-preparar-mundial");
     if (ms <= 0) {
          lblReloj.innerText = "🔋 ¡Inscripción abierta!"; lblReloj.style.color = "var(--verde-match)";
          if (btnIniciar) btnIniciar.style.display = "inline-block"; return;
     }
     if (btnIniciar) btnIniciar.style.display = "none";
     let temp = ms;
     intervaloCronometroMundial = setInterval(() => {
          temp -= 1000;
          if (temp <= 0) { clearInterval(intervaloCronometroMundial); actualizarEstadoMundialUI(); return; }
          const tot = Math.floor(temp / 1000); const hrs = Math.floor(tot / 3600); const mins = Math.floor((tot % 3600) / 60); const segs = tot % 60;
          lblReloj.innerText = `⏱️ Próximo torneo en: ${hrs}h ${mins.toString().padStart(2,'0')}m ${segs.toString().padStart(2,'0')}s`;
     }, 1000);
}

async function prepararInscripcionMundialMulti() {
     if (!usuarioActual) return;
     mostrarCarga("Conectando con la central Online...");
     try {
          // ✨ Forzamos el método POST con su cabecera y body correspondientes
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
          document.querySelector(".nav-modulos-estadio").style.display = "none"; 
          document.querySelector(".btn-logout-kick").style.display = "none";

          mundialTernaPaises = data.terna; 
          jugadoresSeleccionadosDraft = [];
          const cont = document.getElementById("multi-zona-eleccion-pais"); 
          cont.innerHTML = "";
          
          data.terna.forEach(pais => {
               const btn = document.createElement("button"); 
               btn.className = "btn-estadio btn-modulo-match"; 
               btn.innerText = `⚽ ${pais.toUpperCase()}`;
               btn.onclick = () => iniciarDraftJugadoresMundialMulti(pais); 
               cont.appendChild(btn);
          });
     } catch (err) { 
          console.error("Error al conectar con preparar-draft:", err);
          ocultarCarga(); 
     }
}

function iniciarDraftJugadoresMundial(paisElegido) {
     window.mundialSeleccionUsuario = paisElegido;
     document.getElementById("fase-inscripcion-mundial").style.display = "none";
     document.getElementById("fase-draft-mundial").style.display = "block";
     document.getElementById("lbl-tu-seleccion-mundial").innerText = paisElegido.toUpperCase();
     document.getElementById("lbl-rival-clasificacion-mundial").innerText = mundialRivalClasif.toUpperCase();
     actualizarEstrellasVisualesDraft(); renderGridDraft(paisElegido);
}

function renderGridDraft(paisElegido) {
     const grid = document.getElementById("grid-cartas-draft-mundial"); grid.innerHTML = "";
     const filtradas = albumCompleto.filter(f => f.obtenido > 0 && f.pais.toLowerCase() === paisElegido.toLowerCase());
     filtradas.forEach(carta => {
          const card = document.createElement("div"); const sel = jugadoresSeleccionadosDraft.includes(carta.id);
          card.className = `carta-clash ${carta.rareza.toLowerCase()} ${sel ? 'activo-draft' : ''}`;
          card.innerHTML = `<img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}"><div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>`;
          card.onclick = () => {
               if (jugadoresSeleccionadosDraft.includes(carta.id)) jugadoresSeleccionadosDraft = jugadoresSeleccionadosDraft.filter(id => id !== carta.id);
               else { if (jugadoresSeleccionadosDraft.length >= 3) return alert("❌ Alineación completa."); jugadoresSeleccionadosDraft.push(carta.id); }
               renderGridDraft(paisElegido); actualizarEstrellasVisualesDraft();
          };
          grid.appendChild(card);
     });
}

function actualizarEstrellasVisualesDraft() {
     const lbl = document.getElementById("lbl-estrellas-equipo-mundial"); if (!lbl) return;
     if (jugadoresSeleccionadosDraft.length !== 3) { lbl.innerText = "⚠️ Alineá 3 jugadores"; return; }
     const cartas = albumCompleto.filter(f => jugadoresSeleccionadosDraft.includes(f.id));
     const prom = cartas.reduce((acc, c) => acc + MAPA_PUNTOS_RAREZA[c.rareza.toLowerCase()], 0) / 3;
     let est = prom >= 90 ? 5 : prom >= 79 ? 4 : prom >= 70 ? 3 : prom >= 62 ? 2 : 1;
     lbl.innerText = "⭐".repeat(est) + ` (${est}/5 Estrellas)`;
}

async function ejecutarTorneoMundial() {
    const faseDraftOnline = document.getElementById("multi-fase-draft");
    if (faseDraftOnline && faseDraftOnline.style.display === "block") {
        if (jugadoresSeleccionadosDraft.length !== 3) return alert("❌ Completá la alineación de 3 jugadores.");
        confirmarInscripcionMultiServidor(window.mundialSeleccionUsuario, jugadoresSeleccionadosDraft); return;
    }
    if (jugadoresSeleccionadosDraft.length !== 3) return alert("❌ Alineación incompleta.");
    mostrarCarga("Simulando Torneo...");

     try {
          const res = await fetch(`${URL_BASE}/mundial/jugar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioActual.id, seleccionElegida: window.mundialSeleccionUsuario, rivalClasificacion: mundialRivalClasif, jugadorIds: jugadoresSeleccionadosDraft }) });
          const data = await res.json(); ocultarCarga();

          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "block";
          const cont = document.getElementById("lista-cruces-mundial-simulacion"); cont.innerHTML = "";

          if (!data.progreso.ganoClasificacion) {
               cont.innerHTML = `<div class='item-historial-partido' style='color:var(--rojo); text-align:center;'><span>❌ Eliminado en eliminatorias. Volvé en 3hs.</span></div>`;
               liberarNavegacionArenaUI(); return;
          }

          // Lógica básica de simulación un jugador acelerada para simplificar grilla visual
          cont.innerHTML = `<h3>📊 Fixture Completado con Éxito</h3>`;
          data.progreso.bitacoraPlayoffs.forEach(p => {
              cont.innerHTML += `<div class='item-historial-partido'><span>${p.ronda}: ${p.rival}</span> <b>${p.resultado}</b></div>`;
          });
          if (data.progreso.campeon) cont.innerHTML += `<h2 style='color:var(--dorado); text-align:center;'>🏆 ¡CAMPEÓN DEL MUNDO! +5.000 Oro</h2>`;

          if (data.datosActualizados) {
               usuarioActual.monedas = data.datosActualizados.monedas; usuarioActual.puntos_ranking = data.datosActualizados.puntos_ranking;
               usuarioActual.copas_mundiales = data.datosActualizados.copas_mundiales; actualizarInterfazUI();
          }
          liberarNavegacionArenaUI(); actualizarEstadoMundialUI();
     } catch (err) { ocultarCarga(); liberarNavegacionArenaUI(); }
}

function liberarNavegacionArenaUI() {
     const n = document.querySelector(".nav-modulos-estadio"); if (n) n.style.removeProperty("display");
     const l = document.querySelector(".btn-logout-kick"); if (l) l.style.removeProperty("display");
}

const cambiarModuloOriginal = cambiarModulo;
cambiarModulo = function(idModulo, botonPresionado) {
     cambiarModuloOriginal(idModulo, botonPresionado);
     if (idModulo === 'modulo-minimundial' && usuarioActual) {
          actualizarEstadoMundialUI(); cargarRankingMundialesLocal(); 
          document.getElementById("fase-inscripcion-mundial").style.display = "block";
          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "none";
     }
};

/* ========================================================================
   🚨 ANUNCIOS GLOBAL & MODALS
   ======================================================================== */
function abrirModalAyuda() { const m = document.getElementById("modal-ayuda-juego"); if (m) m.style.display = "flex"; }
function cerrarModalAyuda() { const m = document.getElementById("modal-ayuda-juego"); if (m) m.style.display = "none"; }

async function iniciarControladorAnunciosSeguro() {
    try {
        const res = await fetch(`${URL_BASE}/anuncio-actual`); const anuncio = await res.json();
        if (!anuncio || !anuncio.activo) return;
        document.getElementById('anuncioTitulo').textContent = anuncio.titulo.toUpperCase();
        const body = document.getElementById('anuncioCuerpo'); body.innerHTML = `<p>${anuncio.texto}</p>`;
        if (anuncio.tipo === "video") body.innerHTML += `<div class='anuncio-video-container'><iframe src='${anuncio.urlVideo}' allowfullscreen style='border:none;'></iframe></div>`;
        document.getElementById('modalAnuncioGlobal').style.display = "flex";
    } catch (err) { console.error(err); }
}
function cerrarAnuncioGlobal() { document.getElementById('modalAnuncioGlobal').style.display = "none"; }

/* ========================================================================
   🔍 FILTRADO CRUZA DEL ÁLBUM
   ======================================================================== */
function filtrarAlbumPorEstado(estado, boton) { filtroEstadoActual = estado; actualizarVisualBotonesFiltro(boton); aplicarFiltrosCruzadosUI(); }
function filtrarAlbumPorRareza(rareza, boton) { filtroRarezaActual = rareza; actualizarVisualBotonesFiltro(boton); aplicarFiltrosCruzadosUI(); }

function aplicarFiltrosCruzadosUI() {
     const contenedor = document.getElementById("contenedor-grid-album"); if (!contenedor) return;
     for (let div of contenedor.getElementsByClassName("carta-clash")) {
          const block = div.classList.contains("bloqueada");
          let rareza = div.classList.contains("rara") ? 'rara' : div.classList.contains("epica") ? 'epica' : div.classList.contains("legendaria") ? 'legendaria' : 'comun';
          let cE = filtroEstadoActual === 'todas' || (filtroEstadoActual === 'desbloqueadas' && !block) || (filtroEstadoActual === 'pendientes' && block);
          let cR = filtroRarezaActual === 'todas' || filtroRarezaActual === rareza;
          div.style.display = (cE && cR) ? "block" : "none";
     }
}
function actualizarVisualBotonesFiltro(btn) { for (let b of btn.parentElement.getElementsByClassName("btn-filtro-tv")) b.classList.remove("activo"); btn.classList.add("activo"); }

/* ========================================================================
   🏆 9B. ENGINE MULTIJUGADOR ONLINE (CORE COMPLETAMENTE INTERACTIVO POR FASES)
   ======================================================================== */
window.multiTipoApuestaActual = 'amistoso';

async function abrirDraftMulti(esCreador) {
    multiEsCreador = esCreador;
    if (!esCreador) {
        const cod = document.getElementById("multi-input-codigo").value.trim().toUpperCase();
        if (cod.length !== 6) return alert("❌ Código inválido. Debe tener 6 caracteres.");
        multiCodigoSala = cod;

        mostrarCarga("Validando credenciales de la sala...");
        try {
            const res = await fetch(`${URL_BASE}/multijugador/sala/${cod}`);
            const data = await res.json(); ocultarCarga();
            if (!data.ok) return alert(data.mensaje);
            
            window.multiTipoApuestaActual = data.tipo_apuesta ? data.tipo_apuesta.toLowerCase() : 'amistoso';
            multiSalaId = data.sala_id;
        } catch (e) { ocultarCarga(); return alert("Error de conexión con la sala."); }
    } else {
        multiApuestaFijada = parseInt(document.getElementById("multi-input-apuesta")?.value) || 0;
        window.multiTipoApuestaActual = document.getElementById("multi-select-tipo-apuesta")?.value.toLowerCase() || 'amistoso';
    }

    document.getElementById("multi-menu-inicial").style.display = "none";
    document.getElementById("multi-fase-inscripcion").style.display = "block";
    prepararInscripcionMundialMulti();
}

async function prepararInscripcionMundialMulti() {
     if (!usuarioActual) return;
     mostrarCarga("Conectando con la central Online...");
     try {
          const res = await fetch(`${URL_BASE}/multijugador/preparar-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioActual.id }) });
          const data = await res.json(); ocultarCarga();

          if (!data.ok) {
               document.getElementById("multi-menu-inicial").style.display = "block";
               document.getElementById("multi-fase-inscripcion").style.display = "none";
               return alert(data.mensaje);
          }
          document.querySelector(".nav-modulos-estadio").style.display = "none"; document.querySelector(".btn-logout-kick").style.display = "none";

          mundialTernaPaises = data.terna; jugadoresSeleccionadosDraft = [];
          const cont = document.getElementById("multi-zona-eleccion-pais"); cont.innerHTML = "";
          
          data.terna.forEach(pais => {
               const btn = document.createElement("button"); btn.className = "btn-estadio btn-modulo-match"; btn.innerText = `⚽ ${pais.toUpperCase()}`;
               btn.onclick = () => iniciarDraftJugadoresMundialMulti(pais); cont.appendChild(btn);
          });
     } catch (err) { ocultarCarga(); }
}

function iniciarDraftJugadoresMundialMulti(paisElegido) {
     window.mundialSeleccionUsuario = paisElegido;
     document.getElementById("multi-fase-inscripcion").style.display = "none";
     document.getElementById("multi-fase-draft").style.display = "block";
     document.getElementById("multi-lbl-tu-seleccion").innerText = paisElegido.toUpperCase();

     const wrapper = document.getElementById("multi-wrapper-apuesta-invitado");
     if (window.multiTipoApuestaActual === 'carta' && !multiEsCreador) {
          if (wrapper) wrapper.style.display = "block";
          const select = document.getElementById("multi-select-carta-apuesta-invitado"); select.innerHTML = "";
          const repetidas = albumCompleto.filter(f => f.obtenido > 1);
          if (repetidas.length === 0) {
               select.innerHTML = "<option value=''>❌ No tenés cartas repetidas</option>";
          } else {
               repetidas.forEach(figu => { select.innerHTML += `<option value='${figu.id}'>🃏 ${figu.nombre.toUpperCase()} (Tenes ${figu.obtenido})</option>`; });
          }
     } else { if (wrapper) wrapper.style.display = "none"; }
     
     actualizarEstrellasVisualesDraftMulti(); renderGridCartasMulti(paisElegido);
}

function renderGridCartasMulti(paisElegido) {
     const grid = document.getElementById("multi-grid-cartas-draft"); grid.innerHTML = "";
     const filtradas = albumCompleto.filter(f => f.obtenido > 0 && f.pais.toLowerCase() === paisElegido.toLowerCase());
     filtradas.forEach(carta => {
          const card = document.createElement("div"); const sel = jugadoresSeleccionadosDraft.includes(carta.id);
          card.className = `carta-clash ${carta.rareza.toLowerCase()} ${sel ? 'activo-draft' : ''}`;
          card.innerHTML = `<img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}"><div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>`;
          card.onclick = () => {
               if (jugadoresSeleccionadosDraft.includes(carta.id)) jugadoresSeleccionadosDraft = jugadoresSeleccionadosDraft.filter(id => id !== carta.id);
               else { if (jugadoresSeleccionadosDraft.length >= 3) return alert("❌ Máximo 3."); jugadoresSeleccionadosDraft.push(carta.id); }
               renderGridCartasMulti(paisElegido); actualizarEstrellasVisualesDraftMulti();
          };
          grid.appendChild(card);
     });
}

function actualizarEstrellasVisualesDraftMulti() {
     const lbl = document.getElementById("multi-lbl-estrellas-equipo"); if (!lbl) return;
     if (jugadoresSeleccionadosDraft.length !== 3) { lbl.innerText = "⚠️ Alineá 3 jugadores"; return; }
     const cartas = albumCompleto.filter(f => jugadoresSeleccionadosDraft.includes(f.id));
     const prom = cartas.reduce((acc, c) => acc + MAPA_PUNTOS_RAREZA[c.rareza.toLowerCase()], 0) / 3;
     let est = prom >= 90 ? 5 : prom >= 79 ? 4 : prom >= 70 ? 3 : prom >= 62 ? 2 : 1;
     lbl.innerText = "⭐".repeat(est) + ` (${est}/5 Estrellas)`;
}

async function confirmarInscripcionMultiServidor(paisElegido, arrayIdsJugadores) {
     if (arrayIdsJugadores.length !== 3) return alert("❌ Debés alinear exactamente 3 jugadores.");
     let jid = null;
     if (window.multiTipoApuestaActual === 'carta') {
          const el = document.getElementById(multiEsCreador ? "multi-select-carta-apuesta" : "multi-select-carta-apuesta-invitado");
          jid = el ? el.value : null; if (!jid) return alert("❌ Elegí tu cromo a apostar.");
          window.multiMiCartaApostadaTexto = el.options[el.selectedIndex].text;
     }

     mostrarCarga("Enviando planilla a los vestuarios...");
     let url = `${URL_BASE}/multijugador/${multiEsCreador ? 'crear' : 'unirse'}`;
     let cuerpo = {
          usuario_id: usuarioActual.id, seleccion: paisElegido, jugador_ids: arrayIdsJugadores,
          tipo_apuesta: window.multiTipoApuestaActual, apuesta_oro: multiApuestaFijada, codigo_sala: multiCodigoSala, carta_apuesta_id: jid ? parseInt(jid) : null
     };

     try {
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
          const data = await res.json();
          if (!data.ok) { ocultarCarga(); return alert(data.mensaje); }

          if (data.monedasActualizadas !== undefined) { usuarioActual.monedas = data.monedasActualizadas; actualizarInterfazUI(); }
          multiSalaId = data.sala_id; if (data.codigo_sala) multiCodigoSala = data.codigo_sala;

          document.getElementById("multi-fase-draft").style.display = "none";
          document.getElementById("multi-lobby-espera").style.display = "block";
          document.getElementById("lobby-txt-codigo").innerText = multiCodigoSala;
          ocultarCarga();

          multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000); actualizarLobbyEnVivo(); 
     } catch (err) { ocultarCarga(); }
}

/* ========================================================================
   🏁 LOOP DE REFRESCO DEL LOBBY EN VIVO (POLLING CON VOTACIÓN INTEGRADA)
   ======================================================================== */
async function actualizarLobbyEnVivo() {
    if (!multiCodigoSala) return;
    try {
        const res = await fetch(`${URL_BASE}/multijugador/sala/${multiCodigoSala}`);
        const data = await res.json();
        if (!data.ok) { clearInterval(multiIntervaloLobby); return; }

        if (data.tipo_apuesta) window.multiTipoApuestaActual = data.tipo_apuesta.toLowerCase();

        // 🚀 CONTROL INTERACTIVO DE PANTALLA SEGÚN EL ESTADO DE LA BASE DE DATOS
        if (data.estado === 'jugando') {
            clearInterval(multiIntervaloLobby);
            document.getElementById("multi-lobby-espera").style.display = "none";
            document.getElementById("multi-pantalla-fixture").style.display = "block";
            if (!multiEsCreador) consultarResultadoInvitado(); // Invitado se acopla al stream caliente
            return;
        }

        const contenedorListado = document.getElementById("lobby-lista-participantes");
        let infoSalaBox = document.getElementById("multi-info-sala-dinamica");
        if (!infoSalaBox && contenedorListado) {
            infoSalaBox = document.createElement("div"); infoSalaBox.id = "multi-info-sala-dinamica";
            contenedorListado.parentNode.insertBefore(infoSalaBox, contenedorListado);
        }

        if (infoSalaBox) {
            let det = window.multiTipoApuestaActual === 'carta' ? `🃏 DUELO DE CROMOS REPETIDAS\n🔒 TU CROMO: ${(window.multiMiCartaApostadaTexto || "Alineado").toUpperCase()}` : window.multiTipoApuestaActual === 'oro' ? `🪙 TIMBA POR ORO` : `🤝 AMISTOSO ONLINE`;
            det += `\n🏟️ FASE ACTUAL DE LA ARENA: [${data.fase_actual || 'LOBBY'}]`;
            infoSalaBox.innerHTML = `<div style="background:rgba(11,17,30,0.8); padding:12px; border-radius:8px; border:1px solid var(--dorado); text-align:center; font-weight:bold; color:var(--dorado); margin-bottom:15px; font-family:'Oswald'; white-space:pre-line;">${det}</div>`;
        }

        document.getElementById("lobby-txt-pozo").innerText = window.multiTipoApuestaActual === 'carta' ? `🎰 Pozo: Cromo Épico/Leg` : window.multiTipoApuestaActual === 'amistoso' ? `⚽ Modo Práctica` : `💰 Pozo: ${data.pozo_total} Oro`;
        document.getElementById("lobby-cnt-jugadores").innerText = data.participantes.length;

        contenedorListado.innerHTML = "";
        data.participantes.forEach(p => {
            const miFila = document.createElement("div");
            const esHost = p.usuario_id === data.creador_id;
            const tListo = p.listo_proxima_fase ? "<span style='color:var(--verde-match);'>[LISTO]</span>" : "<span style='color:#64748b;'>[PREPARANDO]</span>";
            const tEstado = p.sigue_competencia ? tListo : "<span style='color:var(--rojo);'>[ELIMINADO]</span>";

            miFila.style.cssText = "background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-left:4px solid " + (p.sigue_competencia ? "var(--verde-match)":"var(--rojo)");
            miFila.innerHTML = `<span>${esHost ? '👑 ' : ''}${p.username} ${p.usuario_id === usuarioActual.id ? '<b>(Vos)</b>':''}</span> <span>⚽ ${p.seleccion.toUpperCase()} — ${tEstado}</span>`;
            contenedorListado.appendChild(miFila);
        });

        // 🏁 CONTROLADOR DE VOTOS EN VIVO (Muestra u oculta botones según fase)
        const btnJugar = document.getElementById("multi-btn-iniciar-fixture");
        const txtEspera = document.getElementById("multi-txt-espera-host");
        let btnVoto = document.getElementById("multi-btn-votar-listo");

        if (!btnVoto && contenedorListado) {
            btnVoto = document.createElement("button"); btnVoto.id = "multi-btn-votar-listo"; btnVoto.className = "btn-estadio btn-next-shot"; btnVoto.style.cssText = "width:100%; margin-top:10px; background:var(--celeste); border-color:var(--celeste); font-family:'Oswald';";
            btnVoto.innerText = "✓ CONFIRMAR FIXTURE / REVISAR PLANILLA";
            btnVoto.onclick = enviarVotoListoFase;
            contenedorListado.parentNode.appendChild(btnVoto);
        }

        if (data.estado === 'esperando_votos') {
            document.getElementById("multi-lobby-espera").style.display = "block";
            document.getElementById("multi-pantalla-fixture").style.display = "none";
            if (btnVoto) btnVoto.style.display = "block";

            if (multiEsCreador) {
                btnJugar.style.display = "block"; btnJugar.innerText = "🚀 AVANZAR A SIGUIENTE FASE";
                btnJugar.onclick = avanzarFaseTorneoMulti; txtEspera.style.display = "none";
            } else {
                btnJugar.style.display = "none"; txtEspera.style.display = "block"; txtEspera.innerText = "⏳ Esperando que el host de luz verde a la siguiente ronda...";
            }
        } else {
            if (multiEsCreador) {
                btnJugar.style.display = "block"; btnJugar.innerText = "⚡ INICIAR SIMULACIÓN DE ARENA";
                btnJugar.onclick = lanzarSimulacionMulti; txtEspera.style.display = "none"; if (btnVoto) btnVoto.style.display = "none";
            } else {
                btnJugar.style.display = "none"; txtEspera.style.display = "block"; txtEspera.innerText = "⏳ Esperando que el host inicie el silbatazo inicial...";
                if (btnVoto) btnVoto.style.display = "none";
            }
        }
    } catch (err) { console.error(err); }
}

async function enviarVotoListoFase() {
    try {
        const res = await fetch(`${URL_BASE}/multijugador/voto-listo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioActual.id, sala_id: multiSalaId }) });
        const d = await res.json(); if (d.ok) alert("Planilla firmada. Esperando cierre de llaves...");
    } catch(e) {}
}

async function avanzarFaseTorneoMulti() {
    mostrarCarga("Validando firmas del fixture...");
    try {
        const res = await fetch(`${URL_BASE}/multijugador/avanzar-fase`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sala_id: multiSalaId }) });
        const data = await res.json(); ocultarCarga();
        if (!data.ok) return alert(data.mensaje);

        // Relanzamos loop caliente para gatillar la siguiente fase física
        multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000); lanzarSimulacionMulti();
    } catch(e) { ocultarCarga(); }
}

async function lanzarSimulacionMulti() {
     mostrarCarga("Simulando cruces en la Nube...");
     if (multiIntervaloLobby) clearInterval(multiIntervaloLobby);
     try {
          const res = await fetch(`${URL_BASE}/multijugador/jugar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sala_id: multiSalaId, usuario_id: usuarioActual.id }) });
          const data = await res.json(); ocultarCarga();
          if (!data.ok) { alert(data.mensaje); multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000); return; }

          window.renderizarFixturePasoAPaso(data.bitacora, data.premio);
     } catch (err) { ocultarCarga(); }
}

async function consultarResultadoInvitado() {
     try {
          const res = await fetch(`${URL_BASE}/multijugador/resultado-invitado/${multiSalaId}`);
          const data = await res.json();
          if (!data.ok) { setTimeout(consultarResultadoInvitado, 2000); return; } // Polling seguro si el host tarda en inyectar cache

          ocultarCarga(); window.renderizarFixturePasoAPaso(data.bitacora, data.premio);
     } catch(e) { setTimeout(consultarResultadoInvitado, 2000); }
}

/* ========================================================================
   🏁 CINEMÁTICA PASO A PASO DEL TORNEO ONLINE (ADAPTADA A FASES FIJAS)
   ======================================================================== */
window.renderizarFixturePasoAPaso = function(bitacora, premio) {
    document.getElementById("multi-lobby-espera").style.display = "none";
    document.getElementById("multi-pantalla-fixture").style.display = "block";
    const tablero = document.getElementById("multi-cronologia-goles"); tablero.innerHTML = ""; 

    let seq = Promise.resolve();
    bitacora.forEach((partido, index) => {
         seq = seq.then(() => {
              return new Promise((resolveCruce) => {
                   const bloque = document.createElement("div"); bloque.className = "item-historial-partido";
                   bloque.style.cssText = "flex-direction: column; align-items: stretch; background: #0b111e; margin-bottom:15px; border-left:4px solid var(--dorado);";
                   bloque.innerHTML = `
                       <div style="display:flex; justify-content:space-between; color:var(--dorado); font-size:0.9rem; border-bottom:1px solid #1a2436; padding-bottom:4px;">
                           <span>📋 ${partido.ronda.toUpperCase()}</span> <span id="multi-reloj-${index}">⏱️ 00:00</span>
                       </div>
                       <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                           <span style="font-size:1.1rem; width:40%; text-align:left;">⚽ ${partido.local.toUpperCase()} <small style='color:#64748b;'>(${partido.localUsername})</small></span>
                           <span id="multi-score-${index}" style="font-family:'Oswald'; font-size:1.4rem; background:#000; padding:2px 12px; border-radius:4px; color:var(--verde-match);">0 - 0</span>
                           <span style="font-size:1.1rem; width:40%; text-align:right;"><small style='color:#64748b;'>(${partido.visitanteUsername})</small> ${partido.visitante.toUpperCase()} ⚽</span>
                       </div>
                       <div id="multi-penales-box-${index}" style="display:none; text-align:center; color:var(--rojo); font-weight:bold; font-size:0.9rem; margin-top:5px;"></div>
                   `;
                   tablero.appendChild(bloque); bloque.scrollIntoView({ behavior: 'smooth' });

                   let min = 0;
                   const timer = setInterval(() => {
                        min += 30; if (min > 90) min = 90;
                        document.getElementById(`multi-reloj-${index}`).innerText = `⏱️ MINUTO ${min}:00`;
                        document.getElementById(`multi-score-${index}`).innerText = `${Math.min(partido.golesLocal, min/30)} - ${Math.min(partido.golesVisitante, min/30)}`;

                        if (min >= 90) {
                             clearInterval(timer);
                             document.getElementById(`multi-score-${index}`).innerText = `${partido.golesLocal} - ${partido.golesVisitante}`;
                             if (partido.definicionPenales) {
                                  const pB = document.getElementById(`multi-penales-box-${index}`); pB.style.display = "block";
                                  pB.innerText = `💥 PENALES: (${partido.penalesLocal} - ${partido.penalesVisitante})`;
                             }
                             bloque.style.borderColor = "var(--verde-match)";
                             bloque.innerHTML += `<div style="text-align:right; font-size:0.85rem; font-weight:bold; color:var(--verde-match);"> GANADOR: ${partido.ganadorUsername.toUpperCase()} ✅</div>`;
                             resolveCruce();
                        }
                   }, 300);
              });
         });
    });

    seq.then(() => {
         const divPremio = document.createElement("div"); divPremio.style.cssText = "text-align:center; margin-top:25px; padding:15px; background:rgba(0,255,136,0.05); border:2px dashed var(--dorado); border-radius:10px;";
         let txt = premio ? `🏆 Torneo Concluido!\n👑 Ganador: ${premio.ganador_username.toUpperCase()}\n` : `🏁 Ronda completada. Volviendo a vestuarios para preparar la siguiente llave...`;
         if (premio?.tipo_apuesta === 'oro') txt += `🎁 Pozo total: 🪙 ${premio.pozo} Oro acreditado!`;
         if (premio?.tipo_apuesta === 'carta') txt += `🎉 Premio: [ ${premio.nombreCartaPremio} ] adjudicado!`;

         divPremio.innerHTML = `<h3 style="color:var(--dorado); font-family:'Oswald';">🏁 RESULTADOS DE LA RFEA</h3><p style="color:#fff; font-weight:bold; white-space:pre-line;">${txt}</p>`;
         
         const btnNext = document.createElement("button"); btnNext.className = "btn-estadio btn-next-shot"; btnNext.style.width = "80%"; btnNext.style.marginTop = "15px";
         btnNext.innerText = premio ? "🔄 REGRESAR A MENÚ ARENA" : "🏁 VOLVER AL LOBBY PARA VOTAR SIGUIENTE PHASE";
         
         btnNext.onclick = () => {
              if (premio) {
                   cancelarMundialMultiLobby(); cambiarModulo('modulo-sobres', document.querySelector("button[onclick*='modulo-sobres']"));
              } else {
                   document.getElementById("multi-pantalla-fixture").style.display = "none";
                   document.getElementById("multi-lobby-espera").style.display = "block";
                   multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000); actualizarLobbyEnVivo();
              }
         };
         divPremio.appendChild(btnNext); tablero.appendChild(divPremio); divPremio.scrollIntoView({ behavior: 'smooth' });
    });
};

function conmutarInputsMultiUI() {
     const tipo = document.getElementById("multi-select-tipo-apuesta")?.value;
     document.getElementById("multi-wrapper-oro").style.display = tipo === 'oro' ? "block" : "none";
     document.getElementById("multi-wrapper-carta").style.display = tipo === 'carta' ? "block" : "none";
     if (tipo === 'carta') {
          const select = document.getElementById("multi-select-carta-apuesta"); select.innerHTML = "";
          const repetidas = (window.albumCompleto || albumCompleto || []).filter(f => f && f.obtenido > 1);
          if (repetidas.length === 0) select.innerHTML = "<option value=''>❌ Sin repetidas</option>";
          else repetidas.forEach(figu => { select.innerHTML += `<option value='${figu.id}'>${figu.bandera} ${figu.nombre.toUpperCase()} (x${figu.obtenido})</option>`; });
     }
}

function cancelarMundialMultiLobby() {
     if (multiIntervaloLobby) clearInterval(multiIntervaloLobby);
     document.getElementById("multi-fase-inscripcion").style.display = "none";
     document.getElementById("multi-fase-draft").style.display = "none";
     document.getElementById("multi-lobby-espera").style.display = "none";
     document.getElementById("multi-pantalla-fixture").style.display = "none";
     document.getElementById("multi-menu-inicial").style.display = "block";

     const n = document.querySelector(".nav-modulos-estadio"); if (n) n.style.removeProperty("display");
     const l = document.querySelector(".btn-logout-kick"); if (l) l.style.removeProperty("display");
     multiSalaId = null; multiCodigoSala = null; multiEsCreador = false; jugadoresSeleccionadosDraft = [];
}

setTimeout(rotarPartidoTimba, 1000);
