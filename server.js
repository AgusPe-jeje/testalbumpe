const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 
const path = require('path');

const BITACORAS_SALA_CACHE = {};

const app = express();
app.set('trust proxy', true);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* ========================================================================
   🛠️ CONFIGURACIÓN DE MODO MANTENIMIENTO / ACCESO SELECTIVO TESTERS
   ======================================================================== */
const MODO_MANTENIMIENTO = false; 
const TESTERS_PERMITIDOS = ["aguspe", "tintin"]; 

app.use((req, res, next) => {
    if (!MODO_MANTENIMIENTO) return next();

    if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.jpg'))) {
        return next();
    }

    if (req.path.startsWith('/api/login')) {
        const { username } = req.body;
        if (username && TESTERS_PERMITIDOS.includes(username.trim().toLowerCase())) {
            return next();
        }
        return res.status(503).json({ 
            error: "🚧 La Arena está en mantenimiento por reformas de infraestructura. ¡Volvé más tarde, pa! 🏗️" 
        });
    }

    if (req.path.startsWith('/api/registro')) {
        return res.status(503).json({ 
            error: "🚧 La Arena está en mantenimiento. El registro de nuevas cuentas está cerrado por el momento." 
        });
    }

    next();
});

app.use(express.static(path.join(__dirname)));

/* ========================================================================
   📦 BASE DE DATOS E INICIALIZACIÓN
   ======================================================================== */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('❌ Error de conexión a Neon:', err.message);
    else console.log('📦 Conectado con éxito a PostgreSQL en Neon.');
});

async function inicializarTablas() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            monedas INTEGER DEFAULT 200,
            puntos_ranking INTEGER DEFAULT 0,
            ultimo_tiro_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            tiros_hoy INTEGER DEFAULT 10,
            ip_registro VARCHAR(45) DEFAULT '',
            ultimo_giro_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            timbas_hoy INTEGER DEFAULT 10,
            copas_mundiales INTEGER DEFAULT 0,
            ultima_timba_mundial TIMESTAMP WITH TIME ZONE DEFAULT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) UNIQUE NOT NULL,
            pais VARCHAR(50) NOT NULL,
            bandera VARCHAR(10) NOT NULL,
            posicion VARCHAR(50) NOT NULL,
            foto TEXT NOT NULL,
            rareza VARCHAR(20) NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS usuario_progreso (
            usuario_id INTEGER REFERENCES usuarios(id),
            jugador_id INTEGER REFERENCES jugadores(id),
            cantidad INTEGER DEFAULT 1,
            PRIMARY KEY (usuario_id, jugador_id)
        )`);

        const checkJugadores = await pool.query("SELECT COUNT(*) as count FROM jugadores");

        if (parseInt(checkJugadores.rows[0].count) === 0) {

            const granListaJugadores = [


            ];



            for (const j of granListaJugadores) {

                await pool.query(

                    `INSERT INTO jugadores (nombre, pais, bandera, posicion, foto, rareza) 

                     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (nombre) DO NOTHING`,

                    [j[0], j[1], j[2], j[3], j[4], j[5]]

                );

            }

            console.log(`✅ Base de datos inicializada: ${granListaJugadores.length} jugadores cargados.`);

        }


        
    } catch (err) {
        console.error("❌ Error al inicializar estructuras en Neon:", err.message);
    }
}
inicializarTablas();

/* ========================================================================
   👤 ENDPOINTS DE AUTENTICACIÓN Y USUARIOS
   ======================================================================== */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userCheck = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username]);
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: "❌ El usuario no existe. ¡Registrate primero!" });
        }

        const user = userCheck.rows[0];
        if (user.password === password) {
            console.log(`🔑 [LOGIN] El usuario "${username.toUpperCase()}" ingresó a la Arena.`);
            return res.json({ mensaje: "Login exitoso", usuario: user });
        } else {
            return res.status(400).json({ error: "❌ Contraseña incorrecta." });
        }
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/registro', async (req, res) => {
    const { username, password } = req.body;
    const ipCliente = req.ip;

    if (!username || username.trim().length > 14) {
        return res.status(400).json({ error: "❌ El nombre de usuario no puede tener más de 14 caracteres." });
    }
    try {
        const userCheck = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username]);
        if (userCheck.rows.length > 0) return res.status(400).json({ error: "❌ Ese nombre de usuario ya está ocupado." });

        if (ipCliente && ipCliente !== '::1' && ipCliente !== '127.0.0.1') {
            const ipCheck = await pool.query("SELECT * FROM usuarios WHERE ip_registro = $1", [ipCliente]);
            if (ipCheck.rows.length > 0) return res.status(400).json({ error: "❌ Límite excedido: Ya se creó una cuenta desde esta conexión." });
        }

        const nuevoUsuario = await pool.query(
            "INSERT INTO usuarios (username, password, ip_registro) VALUES ($1, $2, $3) RETURNING *", 
            [username, password, ipCliente]
        );
        console.log(`✨ [REGISTRO] Nuevo usuario: "${username.toUpperCase()}"`);
        return res.json({ mensaje: "Registrado con éxito", usuario: nuevoUsuario.rows[0] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/logout', (req, res) => {
    const { username } = req.body;
    if (username) console.log(`🚪 [LOGOUT] El usuario "${username.toUpperCase()}" salió.`);
    res.json({ success: true, mensaje: "Sesión cerrada en servidor" });
});

app.post('/api/actualizar-progreso', async (req, res) => {
    const { usuario_id, monedas, puntos } = req.body;
    if (!usuario_id) return res.status(400).json({ error: "Falta el usuario_id." });
    try {
        await pool.query(`UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3`, [monedas, puntos, usuario_id]);
        const result = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        return res.json({ datos: result.rows[0] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

/* ========================================================================
   📖 ÁLBUM PANINI Y TIENDA DE SOBRES
   ======================================================================== */
app.get('/api/album/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    const query = `
        SELECT j.*, COALESCE(up.cantidad, 0) as obtenido 
        FROM jugadores j
        LEFT JOIN usuario_progreso up ON j.id = up.jugador_id AND up.usuario_id = $1
        ORDER BY j.pais ASC, j.id ASC
    `;
    try {
        const result = await pool.query(query, [usuarioId]);
        return res.json({ album: result.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/comprar-sobre', async (req, res) => {
    const { usuario_id, tipoCofre } = req.body;
    let costo = 250; let probLegendaria = 0.015; let probEpica = 0.10; let probRara = 0.25;

    if (tipoCofre === 'plata') {
        costo = 100; probLegendaria = 0.001; probEpica = 0.03; probRara = 0.15;    
    } else if (tipoCofre === 'legendario') {
        costo = 500; probLegendaria = 0.08; probEpica = 0.30; probRara = 0.40;    
    }

    try {
        const userCheck = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        if (userCheck.rows[0].monedas < costo) return res.json({ error_oro: true, mensaje: "🪙 No tenés suficiente Oro." });

        const jugadoresCheck = await pool.query("SELECT * FROM jugadores");
        const todosLosJugadores = jugadoresCheck.rows;
        if (todosLosJugadores.length === 0) return res.status(400).json({ error: "No hay jugadores en la DB" });

        let sobreAbierto = [];
        for (let i = 0; i < 5; i++) {
            let rand = Math.random();
            let rarezaElegida = 'comun';
            if (rand < probLegendaria) rarezaElegida = 'legendaria';
            else if (rand < probLegendaria + probEpica) rarezaElegida = 'epica';
            else if (rand < probLegendaria + probEpica + probRara) rarezaElegida = 'rara';

            let poolFiltrado = todosLosJugadores.filter(j => j.rareza === rarezaElegida);
            if (poolFiltrado.length === 0) poolFiltrado = todosLosJugadores.filter(j => j.rareza === 'comun');
            
            sobreAbierto.push({ ...poolFiltrado[Math.floor(Math.random() * poolFiltrado.length)] });
        }

        const nuevoOro = userCheck.rows[0].monedas - costo;
        await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [nuevoOro, usuario_id]);

        for (let jugador of sobreAbierto) {
            const progCheck = await pool.query("SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugador.id]);
            if (progCheck.rows.length > 0) {
                await pool.query("UPDATE usuario_progreso SET cantidad = cantidad + 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugador.id]);
                jugador.obtenido = progCheck.rows[0].cantidad + 1;
            } else {
                await pool.query("INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)", [usuario_id, jugador.id]);
                jugador.obtenido = 1;
            }
        }
        return res.json({ success: true, sobre: sobreAbierto, monedas: nuevoOro });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

/* ========================================================================
   ⚽ JUEGO DE PENALES & RANKINGS
   ======================================================================== */
const MAX_TIRES = 10; const MILISEGUNDOS_POR_TIRO = 6 * 60 * 1000; 

function calcularTirosActuales(usuario) {
    const ahora = new Date();
    if (!usuario.ultimo_tiro_timestamp) return { tirosActuales: MAX_TIRES, tiempoParaSiguiente: 0 };
    const transcurrido = ahora - new Date(usuario.ultimo_tiro_timestamp);
    const regenerados = Math.floor(transcurrido / MILISEGUNDOS_POR_TIRO);
    let tirosActuales = usuario.tiros_hoy + regenerados;
    if (tirosActuales >= MAX_TIRES) return { tirosActuales: MAX_TIRES, tiempoParaSiguiente: 0 };
    return { tirosActuales, tiempoParaSiguiente: MILISEGUNDOS_POR_TIRO - (transcurrido % MILISEGUNDOS_POR_TIRO) };
}

app.get('/api/tiros-restantes/:usuarioId', async (req, res) => {
    try {
        const result = await pool.query("SELECT ultimo_tiro_timestamp, tiros_hoy FROM usuarios WHERE id = $1", [req.params.usuarioId]);
        if (result.rows.length === 0) return res.json({ tiros: MAX_TIRES, siguienteIn: 0 });
        const { tirosActuales, tiempoParaSiguiente } = calcularTirosActuales(result.rows[0]);
        return res.json({ tiros: tirosActuales, siguienteIn: tiempoParaSiguiente });
    } catch (err) { return res.json({ tiros: MAX_TIRES, siguienteIn: 0 }); }
});

app.post('/api/jugar-penal', async (req, res) => {
    const { usuario_id, gano } = req.body;
    try {
        const result = await pool.query("SELECT monedas, puntos_ranking, ultimo_tiro_timestamp, tiros_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        let { tirosActuales, tiempoParaSiguiente } = calcularTirosActuales(result.rows[0]);

        if (tirosActuales <= 0) return res.json({ error_limite: true, mensaje: "❌ ¡Te quedaste sin energía! Esperá. ⏱️" });

        const nuevosTiros = tirosActuales - 1;
        let mon = gano ? 100 : 0; let pts = gano ? 15 : 0;

        await pool.query(`UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2, ultimo_tiro_timestamp = NOW(), tiros_hoy = $3 WHERE id = $4`, [mon, pts, nuevosTiros, usuario_id]);
        const u = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        return res.json({ success: true, tiros_restantes: nuevosTiros, siguienteIn: nuevosTiros >= MAX_TIRES ? 0 : MILISEGUNDOS_POR_TIRO, datos: u.rows[0] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.get('/api/ranking', async (req, res) => {
    try {
        const result = await pool.query("SELECT username, puntos_ranking FROM usuarios ORDER BY puntos_ranking DESC LIMIT 10");
        return res.json({ ranking: result.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.get('/api/ranking-mundiales', async (req, res) => {
    try {
        const result = await pool.query("SELECT username, copas_mundiales FROM usuarios WHERE copas_mundiales > 0 ORDER BY copas_mundiales DESC, puntos_ranking DESC LIMIT 10");
        return res.json({ ranking: result.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

/* ========================================================================
   🎰 SISTEMA DE TIMBAS (MONEDAS / CROMOS)
   ======================================================================== */
const MAX_TIMBAS = 10; const MILISEGUNDOS_POR_TIMBA = 6 * 60 * 1000;
const apuestasActivasServidor = {};

function calcularTimbasActuales(usuario) {
    const ahora = new Date();
    if (!usuario.ultimo_giro_timestamp) return { timbasActuales: MAX_TIMBAS, tiempoParaSiguienteTimba: 0 };
    const transcurrido = ahora - new Date(usuario.ultimo_giro_timestamp);
    const regen = Math.floor(transcurrido / MILISEGUNDOS_POR_TIMBA);
    let timbasActuales = usuario.timbas_hoy + regen;
    if (timbasActuales >= MAX_TIMBAS) return { timbasActuales: MAX_TIMBAS, tiempoParaSiguienteTimba: 0 };
    return { timbasActuales, tiempoParaSiguienteTimba: MILISEGUNDOS_POR_TIMBA - (transcurrido % MILISEGUNDOS_POR_TIMBA) };
}

function generarGolesServidor() {
    const r = Math.random();
    if (r < 0.25) return 0; if (r < 0.55) return 1; if (r < 0.80) return 2; if (r < 0.93) return 3;
    return Math.floor(Math.random() * 3) + 4;
}

app.get('/api/timbas-restantes/:usuarioId', async (req, res) => {
    try {
        const result = await pool.query("SELECT ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [req.params.usuarioId]);
        if (result.rows.length === 0) return res.json({ timbas: MAX_TIMBAS, siguienteIn: 0 });
        const { timbasActuales, tiempoParaSiguienteTimba } = calcularTimbasActuales(result.rows[0]);
        return res.json({ timbas: timbasActuales, siguienteIn: tiempoParaSiguienteTimba });
    } catch (err) { return res.json({ timbas: MAX_TIMBAS, siguienteIn: 0 }); }
});

app.post('/api/timba/preparar', async (req, res) => {
    const { usuario_id, tipoApuesta, montoApuesta, jugadorIdApostado } = req.body;
    try {
        const userCheck = await pool.query("SELECT monedas, ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
        const usuario = userCheck.rows[0];

        if (tipoApuesta === "monedas") {
            if (usuario.monedas < montoApuesta || montoApuesta <= 0) return res.json({ ok: false, error_oro: true, mensaje: "🪙 Oro insuficiente." });
        } else {
            const progCheck = await pool.query("SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
            if (progCheck.rows.length === 0 || progCheck.rows[0].cantidad <= 1) return res.json({ ok: false, mensaje: "❌ No tenés stock de repetidas." });
        }

        let { timbasActuales, tiempoParaSiguienteTimba } = calcularTimbasActuales(usuario);
        if (timbasActuales <= 0) return res.json({ ok: false, error_limite: true, mensaje: "❌ Sin energía. ⏱️" });

        const nuevasTimbas = timbasActuales - 1;
        await pool.query(`UPDATE usuarios SET ultimo_giro_timestamp = NOW(), timbas_hoy = $1 WHERE id = $2`, [nuevasTimbas, usuario_id]);

        const golesLReal = generarGolesServidor(); const golesVReal = generarGolesServidor();
        const signoReal = golesLReal > golesVReal ? 'L' : (golesLReal < golesVReal ? 'V' : 'E');

        const combinacionesUsadas = new Set([`${golesLReal}-${golesVReal}`]);
        const poolOpciones = [{ label: `${golesLReal} - ${golesVReal}`, tipo: 'exacto' }];

        for (let i = 0; i < 2; i++) {
            let glSigno = generarGolesServidor(); let gvSigno = generarGolesServidor();
            let combo = `${glSigno}-${gvSigno}`;
            let signoOpc = glSigno > gvSigno ? 'L' : (glSigno < gvSigno ? 'V' : 'E');
            while (combinacionesUsadas.has(combo) || signoOpc !== signoReal) {
                glSigno = generarGolesServidor(); gvSigno = generarGolesServidor();
                combo = `${glSigno}-${gvSigno}`; signoOpc = glSigno > gvSigno ? 'L' : (glSigno < gvSigno ? 'V' : 'E');
            }
            combinacionesUsadas.add(combo); poolOpciones.push({ label: combo.replace('-', ' - '), tipo: 'signo' });
        }

        for (let i = 0; i < 3; i++) {
            let glErr = generarGolesServidor(); let gvErr = generarGolesServidor();
            let combo = `${glErr}-${gvErr}`;
            let signoOpc = glErr > gvErr ? 'L' : (glErr < gvErr ? 'V' : 'E');
            while (combinacionesUsadas.has(combo) || signoOpc === signoReal) {
                glErr = generarGolesServidor(); gvErr = generarGolesServidor();
                combo = `${glErr}-${gvErr}`; signoOpc = glErr > gvErr ? 'L' : (glErr < gvErr ? 'V' : 'E');
            }
            combinacionesUsadas.add(combo); poolOpciones.push({ label: combo.replace('-', ' - '), tipo: 'error' });
        }

        apuestasActivasServidor[usuario_id] = { golesLReal, golesVReal, tipoApuesta, montoApuesta, jugadorIdApostado, mapeoOpciones: poolOpciones };
        return res.json({ ok: true, opciones: poolOpciones.map((opc, idx) => ({ idOpcion: idx, label: opc.label })).sort(() => Math.random() - 0.5), timbas_restantes: nuevasTimbas, siguienteIn: nuevasTimbas >= MAX_TIMBAS ? 0 : MILISEGUNDOS_POR_TIMBA });
    } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error en preparación." }); }
});

app.post('/api/timba/procesar', async (req, res) => {
    const { usuario_id, idOpcionElegida } = req.body;
    const apuesta = apuestasActivasServidor[usuario_id];
    if (!apuesta) return res.status(400).json({ ok: false, mensaje: "No hay apuesta preparada." });

    const { golesLReal, golesVReal, tipoApuesta, montoApuesta, jugadorIdApostado, mapeoOpciones } = apuesta;
    const opcionReal = mapeoOpciones[idOpcionElegida];
    let balanceMonedas = 0; let puntosAsignados = 0; let mensajeResultado = "";

    try {
        if (tipoApuesta === "monedas") {
            if (opcionReal.tipo === 'exacto') {
                balanceMonedas = montoApuesta * 3; puntosAsignados = 20;
                mensajeResultado = `¡RESULTADO EXACTO (${golesLReal}-${golesVReal})! Ganaste 🪙${montoApuesta * 3}.`;
            } else if (opcionReal.tipo === 'signo') {
                balanceMonedas = Math.round(montoApuesta * 0.5); puntosAsignados = 10;
                mensajeResultado = `¡ACERTASTE GANADOR (${golesLReal}-${golesVReal})! Ganaste 🪙${balanceMonedas}.`;
            } else {
                balanceMonedas = -montoApuesta;
                mensajeResultado = `¡ERRASTE! Salió ${golesLReal}-${golesVReal}. Perdiste 🪙${montoApuesta}.`;
            }
            await pool.query(`UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3`, [balanceMonedas, puntosAsignados, usuario_id]);
        } else {
            const cardQuery = await pool.query("SELECT nombre, rareza FROM jugadores WHERE id = $1", [jugadorIdApostado]);
            const cromo = cardQuery.rows[0]; const rareza = cromo.rareza.toLowerCase();

            if (opcionReal.tipo === 'exacto' || opcionReal.tipo === 'signo') {
                await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                if (rareza === "legendaria") {
                    let oro = opcionReal.tipo === 'exacto' ? 2500 : 1000;
                    await pool.query("UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + 15 WHERE id = $2", [oro, usuario_id]);
                    mensajeResultado = `👑 ¡ÉPICO! Apostaste a ${cromo.nombre} y ganaste 🪙${oro} monedas.`;
                } else {
                    let rarezaPremio = rareza;
                    if (opcionReal.tipo === 'exacto') {
                        if (rareza === "comun") rarezaPremio = "rara";
                        else if (rareza === "rara") rarezaPremio = "epica";
                        else if (rareza === "epica") rarezaPremio = "legendaria";
                    }
                    const poolP = await pool.query("SELECT id, nombre, rareza FROM jugadores WHERE rareza = $1 ORDER BY RANDOM() LIMIT 1", [rarezaPremio]);
                    const ganado = poolP.rows[0];
                    await pool.query(`INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1) ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + 1`, [usuario_id, ganado.id]);
                    mensajeResultado = `🔥 ¡GANASTE! Recibís a: ${ganado.nombre.toUpperCase()} [${ganado.rareza.toUpperCase()}].`;
                }
            } else {
                await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                mensajeResultado = `❌ ¡CROMO PERDIDO! Perdiste 1 copia de ${cromo.nombre.toUpperCase()}.`;
            }
        }
        const check = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        delete apuestasActivasServidor[usuario_id];
        return res.json({ ok: true, mensajeResultado, golesLReal, golesVReal, datos: check.rows[0] });
    } catch (err) { return res.status(500).json({ ok: false, mensaje: "Error procesando." }); }
});

/* ========================================================================
   🏆 MÓDULO MINIMUNDIAL SINGLE-PLAYER
   ======================================================================== */
const COOLDOWN_MUNDIAL_MS = 3 * 60 * 60 * 1000;
const VALOR_STATS_RAREZA = { 'comun': 60, 'especial': 68, 'rara': 75, 'epica': 85, 'legendaria': 96 };

app.get('/api/mundial/estado/:usuarioId', async (req, res) => {
    try {
        const u = await pool.query("SELECT copas_mundiales, ultima_timba_mundial FROM usuarios WHERE id = $1", [req.params.usuarioId]);
        if (u.rows.length === 0) return res.status(404).json({ error: "No existe" });
        let rest = 0;
        if (u.rows[0].ultima_timba_mundial) {
            const diff = new Date() - new Date(u.rows[0].ultima_timba_mundial);
            if (diff < COOLDOWN_MUNDIAL_MS) rest = COOLDOWN_MUNDIAL_MS - diff;
        }
        return res.json({ copas: u.rows[0].copas_mundiales, siguienteIn: rest });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/mundial/preparar', async (req, res) => {
    const { usuario_id } = req.body;
    try {
        const check = await pool.query("SELECT monedas, ultima_timba_mundial FROM usuarios WHERE id = $1", [usuario_id]);
        if (check.rows.length === 0) return res.json({ ok: false, mensaje: "Usuario inválido." });

        if (check.rows[0].ultima_timba_mundial && (new Date() - new Date(check.rows[0].ultima_timba_mundial) < COOLDOWN_MUNDIAL_MS)) {
            return res.json({ ok: false, elVestuarioEstaCerrado: true, mensaje: `⏳ Vestuario cerrado.` });
        }
        if (check.rows[0].monedas < 500) return res.json({ ok: false, mensaje: "🪙 No tenés suficiente Oro (Cuesta 500)." });

        const pValidos = await pool.query(`SELECT j.pais FROM usuario_progreso up JOIN jugadores j ON up.jugador_id = j.id WHERE up.usuario_id = $1 AND up.cantidad > 0 GROUP BY j.pais HAVING COUNT(j.id) >= 3`, [usuario_id]);
        const candidatos = pValidos.rows.map(r => r.pais);
        if (candidatos.length === 0) return res.json({ ok: false, mensaje: "❌ Necesitás al menos 3 jugadores de un mismo país." });

        const nuevoOro = check.rows[0].monedas - 500;
        await pool.query("UPDATE usuarios SET monedas = $1, ultima_timba_mundial = NOW() WHERE id = $2", [nuevoOro, usuario_id]);

        const terna =  mezclarArray([...candidatos]).slice(0, 3);
        let rival = SELECCIONES_BOTS[Math.floor(Math.random() * SELECCIONES_BOTS.length)];
        while (terna.includes(rival)) rival = SELECCIONES_BOTS[Math.floor(Math.random() * SELECCIONES_BOTS.length)];

        return res.json({ ok: true, terna, rivalClasificacion: rival, monedasActualizadas: nuevoOro });
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
});

const SELECCIONES_BOTS = [
    "Francia", "Brasil", "Alemania", "España", "Italia", "Inglaterra", "Países Bajos", "Portugal", "Uruguay", "Croacia", 
    "Bélgica", "Marruecos", "Japón", "Senegal", "Estados Unidos", "Colombia", "México", "Argentina", "Ecuador", "Perú"
];

app.post('/api/mundial/jugar', async (req, res) => {
    const { usuario_id, seleccionElegida, rivalClasificacion, jugadorIds } = req.body;
    try {
        const jCheck = await pool.query("SELECT j.rareza FROM usuario_progreso up JOIN jugadores j ON up.jugador_id = j.id WHERE up.usuario_id = $1 AND up.jugador_id = ANY($2) AND up.cantidad > 0", [usuario_id, jugadorIds]);
        if (jCheck.rows.length !== 3) return res.json({ ok: false, mensaje: "❌ Jugadores no disponibles." });

        const suma = jCheck.rows.reduce((acc, row) => acc + VALOR_STATS_RAREZA[row.rareza.toLowerCase()], 0) / 3;
        let est = 1;
        if (suma >= 90) est = 5; else if (suma >= 79) est = 4; else if (suma >= 70) est = 3; else if (suma >= 62) est = 2;
        const chance = 0.20 + (est * 0.10);

        if (Math.random() > chance) {
            return res.json({ ok: true, progreso: { ganoClasificacion: false }, mensaje: `❌ Eliminado por ${rivalClasificacion}.` });
        }

        let bots = mezclarArray(SELECCIONES_BOTS.filter(s => s !== seleccionElegida));
        const r1 = bots[0]; const r2 = bots[1]; const r3 = bots[2];
        const integrantesGrupo = [seleccionElegida, r1, r2, r3];

        function simMatch(e1, e2, esU) {
            let g1 = Math.floor(Math.random() * 3); let g2 = Math.floor(Math.random() * 3);
            if (esU) {
                if (Math.random() <= chance && g1 <= g2) g1 = g2 + Math.floor(Math.random() * 2) + 1;
                else if (Math.random() > chance && g2 <= g1) g2 = g1 + Math.floor(Math.random() * 2) + 1;
            }
            return { goles1: g1, goles2: g2 };
        }

        let bitacoraGrupo = [];
        let m1 = simMatch(seleccionElegida, r1, true); let m2 = simMatch(r2, r3, false);
        bitacoraGrupo.push({ fecha: 1, local: seleccionElegida, visitante: r1, gL: m1.goles1, gV: m1.goles2, botL: r2, botV: r3, gBL: m2.goles1, gBV: m2.goles2 });
        m1 = simMatch(seleccionElegida, r2, true); m2 = simMatch(r1, r3, false);
        bitacoraGrupo.push({ fecha: 2, local: seleccionElegida, visitante: r2, gL: m1.goles1, gV: m1.goles2, botL: r1, botV: r3, gBL: m2.goles1, gBV: m2.goles2 });
        m1 = simMatch(seleccionElegida, r3, true); m2 = simMatch(r1, r2, false);
        bitacoraGrupo.push({ fecha: 3, local: seleccionElegida, visitante: r3, gL: m1.goles1, gV: m1.goles2, botL: r1, botV: r2, gBL: m2.goles1, gBV: m2.goles2 });

        let tP = {}; integrantesGrupo.forEach(p => { tP[p] = { pts: 0, gf: 0, gc: 0, pais: p }; });
        bitacoraGrupo.forEach(f => {
            const add = (l, v, gl, gv) => {
                tP[l].gf += gl; tP[l].gc += gv; tP[v].gf += gv; tP[v].gc += gl;
                if (gl > gv) tP[l].pts += 3; else if (gl < gv) tP[v].pts += 3; else { tP[l].pts += 1; tP[v].pts += 1; }
            };
            add(f.local, f.visitante, f.gL, f.gV); add(f.botL, f.botV, f.gBL, f.gBV);
        });

        let tO = Object.values(tP).sort((a,b) => b.pts !== a.pts ? b.pts - a.pts : (b.gf-b.gc) - (a.gf-a.gc));
        let posU = tO.findIndex(r => r.pais === seleccionElegida) + 1;
        let clasifica = posU <= 2;

        let bitacoraPlayoffs = []; let campeon = false; let faseAlcanzada = "Fase de Grupos";
        if (clasifica) {
            const llaves = [{r:"Octavos", riv:bots[3]}, {r:"Cuartos", riv:bots[4]}, {r:"Semi", riv:bots[5]}, {r:"Final", riv:bots[6]}];
            campeon = true;
            for (let ll of llaves) {
                faseAlcanzada = ll.r;
                if (Math.random() <= chance) bitacoraPlayoffs.push({ ronda: ll.r, rival: ll.riv, resultado: "Ganaste ✅" });
                else { campeon = false; bitacoraPlayoffs.push({ ronda: ll.r, rival: ll.riv, resultado: "Perdiste ❌" }); break; }
            }
        }

        if (campeon) await pool.query("UPDATE usuarios SET monedas = monedas + 4500, copas_mundiales = copas_mundiales + 1, puntos_ranking = puntos_ranking + 50 WHERE id = $1", [usuario_id]);
        const fU = await pool.query("SELECT monedas, puntos_ranking, copas_mundiales FROM usuarios WHERE id = $1", [usuario_id]);
        return res.json({ ok: true, progreso: { ganoClasificacion: true, integrantesGrupo, bitacoraGrupo, clasifico: clasifica, posicionFinalGrupo: posU, campeon, faseAlcanzada, bitacoraPlayoffs }, datosActualizados: fU.rows[0] });
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
});

/* ========================================================================
   🏆 MÓDULO MULTIJUGADOR CORE - REFORMADO CON FASES EN VIVO & INTERACTIVO
   ======================================================================== */

// Sincronizado dinámicamente con tu columna real up.cantidad
app.post('/api/multijugador/preparar-draft', async (req, res) => {
    const { usuario_id } = req.body;
    try {
        // ✨ Corregido: j.id = up.jugador_id (antes decía jogador_id)
        const pValidos = await pool.query(`
            SELECT j.pais FROM usuario_progreso up JOIN jugadores j ON up.jugador_id = j.id 
            WHERE up.usuario_id = $1 AND up.cantidad > 0 GROUP BY j.pais HAVING COUNT(j.id) >= 3
        `, [usuario_id]);
        
        const candidatos = pValidos.rows.map(r => r.pais);
        if (candidatos.length === 0) return res.json({ ok: false, mensaje: "❌ Requisito insuficiente: Necesitás al menos 3 jugadores de un mismo país desbloqueados." });
        return res.json({ ok: true, terna: mezclarArray([...candidatos]).slice(0, 3) });
    } catch (err) { 
        console.error("❌ Error en preparar-draft:", err.message); // Esto te va a tirar el log exacto en Render si pasa algo más
        return res.status(500).json({ ok: false, error: err.message }); 
    }
});

app.post('/api/multijugador/crear', async (req, res) => {
    const { usuario_id, seleccion, jugador_ids, tipo_apuesta, apuesta_oro } = req.body;
    if (!jugador_ids || jugador_ids.length !== 3) return res.json({ ok: false, mensaje: "❌ Seleccioná 3 jugadores." });
    const codigo = generarCodigoSala(); const mod = tipo_apuesta ? tipo_apuesta.toLowerCase() : 'amistoso';
    const monto = parseInt(apuesta_oro) || 0;

    try {
        const user = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        let oroHost = user.rows[0].monedas; let pozo = 0;

        if (mod === 'oro') {
            if (oroHost < monto) return res.json({ ok: false, mensaje: `🪙 Oro insuficiente.` });
            oroHost -= monto; pozo = monto;
            await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [oroHost, usuario_id]);
        } else if (mod === 'carta') {
            const rep = await pool.query("SELECT jugador_id FROM usuario_progreso WHERE usuario_id = $1 AND cantidad > 1 LIMIT 1", [usuario_id]);
            if (rep.rows.length === 0) return res.json({ ok: false, mensaje: "🃏 Sin copas repetidas." });
            await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, rep.rows[0].jugador_id]);
        }

        // Tabla real: mundial_salas. Seteamos por defecto fase_actual = 'GRUPOS'
        const sRes = await pool.query(`INSERT INTO mundial_salas (codigo_sala, creador_id, tipo_apuesta, apuesta_oro, pozo_total, estado, fase_actual) VALUES ($1, $2, $3, $4, $5, 'esperando', 'GRUPOS') RETURNING id`, [codigo, usuario_id, mod, monto, pozo]);
        await pool.query(`INSERT INTO sala_participantes (sala_id, usuario_id, seleccion, jugador_ids, sigue_competencia, listo_proxima_fase) VALUES ($1, $2, $3, $4::INTEGER[], TRUE, FALSE)`, [sRes.rows[0].id, usuario_id, seleccion, `{${jugador_ids.join(',')}}`]);

        return res.json({ ok: true, sala_id: sRes.rows[0].id, codigo_sala: codigo, monedasActualizadas: oroHost });
    } catch (e) { return res.status(500).json({ ok: false, mensaje: e.message }); }
});

app.post('/api/multijugador/unirse', async (req, res) => {
    const { usuario_id, codigo_sala, seleccion, jugador_ids, carta_apuesta_id } = req.body;
    try {
        const sCheck = await pool.query("SELECT id, tipo_apuesta, apuesta_oro, estado FROM mundial_salas WHERE codigo_sala = $1", [codigo_sala.toUpperCase()]);
        if (sCheck.rows.length === 0 || sCheck.rows[0].estado !== 'esperando') return res.json({ ok: false, mensaje: "Sala inaccesible." });
        const sala = sCheck.rows[0];

        const user = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        let oroUser = user.rows[0].monedas; const mod = sala.tipo_apuesta.toLowerCase();

        if (mod === 'oro') {
            if (oroUser < sala.apuesta_oro) return res.json({ ok: false, mensaje: "🪙 Oro insuficiente." });
            oroUser -= sala.apuesta_oro;
            await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [oroUser, usuario_id]);
            await pool.query("UPDATE mundial_salas SET pozo_total = pozo_total + $1 WHERE id = $2", [sala.apuesta_oro, sala.id]);
        } else if (mod === 'carta') {
            const cCheck = await pool.query("SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2 AND cantidad > 1", [usuario_id, carta_apuesta_id]);
            if (cCheck.rows.length === 0) return res.json({ ok: false, mensaje: "❌ Cromo repetido no válido." });
            await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, carta_apuesta_id]);
        }

        await pool.query(`INSERT INTO sala_participantes (sala_id, usuario_id, seleccion, jugador_ids, sigue_competencia, listo_proxima_fase) VALUES ($1, $2, $3, $4::INTEGER[], TRUE, FALSE)`, [sala.id, usuario_id, seleccion, `{${jugador_ids.join(',')}}`]);
        return res.json({ ok: true, sala_id: sala.id, monedasActualizadas: oroUser });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/multijugador/sala/:codigo', async (req, res) => {
    try {
        const sQ = await pool.query("SELECT id, creador_id, tipo_apuesta, apuesta_oro, pozo_total, estado, fase_actual FROM mundial_salas WHERE codigo_sala = $1", [req.params.codigo.toUpperCase()]);
        if (sQ.rows.length === 0) return res.json({ ok: false });
        const pQ = await pool.query("SELECT sp.usuario_id, u.username, sp.seleccion, sp.listo_proxima_fase, sp.sigue_competencia FROM sala_participantes sp JOIN usuarios u ON sp.usuario_id = u.id WHERE sp.sala_id = $1", [sQ.rows[0].id]);
        return res.json({ ok: true, ...sQ.rows[0], participantes: pQ.rows });
    } catch (e) { return res.status(500).json({ ok: false }); }
});

/* ========================================================================
   🏁 CONTROL INTERACTIVO DE FASES MULTIJUGADOR (POLLING VOTE)
   ======================================================================== */
app.post('/api/multijugador/voto-listo', async (req, res) => {
    const { usuario_id, sala_id } = req.body;
    try {
        await pool.query("UPDATE sala_participantes SET listo_proxima_fase = TRUE WHERE sala_id = $1 AND usuario_id = $2", [sala_id, usuario_id]);
        res.json({ ok: true, mensaje: "Voto asentado." });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.post('/api/multijugador/avanzar-fase', async (req, res) => {
    const { sala_id } = req.body;
    try {
        const pend = await pool.query("SELECT id FROM sala_participantes WHERE sala_id = $1 AND sigue_competencia = TRUE AND listo_proxima_fase = FALSE", [sala_id]);
        if (pend.rows.length > 0) return res.json({ ok: false, mensaje: "Quedan usuarios pendientes." });

        const s = await pool.query("SELECT fase_actual FROM mundial_salas WHERE id = $1", [sala_id]);
        let nF = 'FINALIZADO';
        if (s.rows[0].fase_actual === 'GRUPOS') nF = 'SEMIFINAL';
        else if (s.rows[0].fase_actual === 'SEMIFINAL') nF = 'FINAL';

        await pool.query("UPDATE mundial_salas SET fase_actual = $1, estado = 'jugando' WHERE id = $2", [nF, sala_id]);
        await pool.query("UPDATE sala_participantes SET listo_proxima_fase = FALSE WHERE sala_id = $1", [sala_id]);
        res.json({ ok: true, nuevaFase: nF });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.post('/api/multijugador/jugar', async (req, res) => {
    const { sala_id } = req.body;
    try {
        const sQ = await pool.query("SELECT * FROM mundial_salas WHERE id = $1", [sala_id]);
        const sala = sQ.rows[0];
        const fase = sala.fase_actual || 'GRUPOS';

        const pQ = await pool.query("SELECT sp.usuario_id, u.username, sp.seleccion FROM sala_participantes sp JOIN usuarios u ON sp.usuario_id = u.id WHERE sp.sala_id = $1 AND sp.sigue_competencia = TRUE", [sala_id]);
        let comp = pQ.rows; let bitacora = [];

        if (fase === 'GRUPOS') {
            for (let i = 0; i < comp.length; i++) {
                for (let j = i + 1; j < comp.length; j++) {
                    bitacora.push(simCruceLg(comp[i], comp[j], "Fase de Grupos"));
                }
            }
            if (comp.length > 2) {
                await pool.query("UPDATE sala_participantes SET sigue_competencia = FALSE WHERE sala_id = $1 AND usuario_id = $2", [sala_id, comp[comp.length - 1].usuario_id]);
            }
            await pool.query("UPDATE mundial_salas SET estado = 'esperando_votos' WHERE id = $1", [sala_id]);
            BITACORAS_SALA_CACHE[sala_id] = { bitacora, premio: null, fase: "GRUPOS" };
            return res.json({ ok: true, bitacora, premio: null, fase: "GRUPOS" });
        }

        if (comp.length < 2) return res.json({ ok: false, mensaje: "Falta de jugadores." });
        let playoff = simCruceLg(comp[0], comp[1], fase); bitacora.push(playoff);
        const ganoL = playoff.golesLocal > playoff.golesVisitante || (playoff.definicionPenales && playoff.penalesLocal > playoff.penalesVisitante);
        const champ = ganoL ? comp[0] : comp[1]; const loser = ganoL ? comp[1] : comp[0];

        await pool.query("UPDATE sala_participantes SET sigue_competencia = FALSE WHERE sala_id = $1 AND usuario_id = $2", [sala_id, loser.usuario_id]);
        let premio = null;

        if (fase === 'FINAL' || comp.length <= 2) {
            await pool.query("UPDATE mundial_salas SET estado = 'finalizado' WHERE id = $1", [sala_id]);
            if (sala.tipo_apuesta === 'oro') {
                await pool.query("UPDATE usuarios SET monedas = monedas + $1 WHERE id = $2", [sala.pozo_total, champ.usuario_id]);
                premio = { tipo_apuesta: 'oro', ganador_username: champ.username, pozo: sala.pozo_total, ganoBot: false };
            } else if (sala.tipo_apuesta === 'carta') {
                const check = await pool.query("SELECT jugador_id FROM usuario_progreso WHERE usuario_id = $1 AND cantidad > 0 LIMIT 1", [loser.usuario_id]);
                if (check.rows.length > 0) {
                    const tid = check.rows[0].jugador_id;
                    await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [loser.usuario_id, tid]);
                    await pool.query("INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1) ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + 1", [champ.usuario_id, tid]);
                }
                premio = { tipo_apuesta: 'carta', ganador_username: champ.username, nombreCartaPremio: "Cromo Rival Transferido", ganoBot: false };
            }
        } else {
            await pool.query("UPDATE mundial_salas SET estado = 'esperando_votos' WHERE id = $1", [sala_id]);
        }

        BITACORAS_SALA_CACHE[sala_id] = { bitacora, premio, fase };
        return res.json({ ok: true, bitacora, premio, fase });
    } catch (e) { return res.status(500).json({ ok: false }); }
});

app.get('/api/multijugador/resultado-invitado/:sala_id', async (req, res) => {
    const cache = BITACORAS_SALA_CACHE[req.params.sala_id];
    if (cache) return res.json({ ok: true, bitacora: cache.bitacora, premio: cache.premio, fase: cache.fase });
    return res.json({ ok: false, mensaje: "⏳ Esperando host..." });
});

function simCruceLg(c1, c2, rLabel) {
    let g1 = Math.floor(Math.random() * 4); let g2 = Math.floor(Math.random() * 4);
    let p1 = null; let p2 = null; let deP = false;
    if (g1 === g2 && rLabel !== "Fase de Grupos") {
        deP = true; while (p1 === p2) { p1 = Math.floor(Math.random() * 5) + 1; p2 = Math.floor(Math.random() * 5) + 1; }
    }
    return { ronda: rLabel, local: c1.seleccion, localUsername: c1.username, visitante: c2.seleccion, visitanteUsername: c2.username, golesLocal: g1, golesVisitante: g2, penalesLocal: p1, penalesVisitante: p2, definicionPenales: deP, ganadorUsername: (g1 > g2 || (deP && p1 > p2)) ? c1.username : c2.username };
}

/* ========================================================================
   🎛️ FUNCIONES AUXILIARES: GENERADOR DE CÓDIGO Y MEZCLADOR
   ======================================================================== */

// 🎲 1. Genera el código alfanumérico único de 6 caracteres para la sala
function generarCodigoSala() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

// 🔀 2. Algoritmo Fisher-Yates para mezclar la terna del draft
function mezclarArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/* ========================================================================
   🚨 ANUNCIOS GLOBAL & INICIALIZACIÓN
   ======================================================================== */
const CONFIG_ANUNCIO_SERVIDOR = { activo: true, tipo: "video", titulo: "¡ACTUALIZACIÓN DE TEMPORADA!", texto: "Prendete a los nuevos torneos en vivo. Calibramos el MiniMundial para que sea más justo.", urlImagen: "https://albumpe.onrender.com/assets/novedad.png", urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ" };

app.get('/api/anuncio-actual', (req, res) => res.json(CONFIG_ANUNCIO_SERVIDOR));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
