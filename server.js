const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // ✨ Migrado a PostgreSQL para Neon
const path = require('path');

const BITACORAS_SALA_CACHE = {};
const app = express();

// ✨ Clave para leer la IP real del cliente detrás del proxy de Render
app.set('trust proxy', true);

// ✨ Render asigna el puerto dinámicamente; si no encuentra, usa el 3000
const PORT = process.env.PORT || 3000;

// IMPORTANTE: Habilitamos CORS y JSON arriba de todo para que el filtro pueda leer los datos
app.use(cors());
app.use(express.json());

// Genera un código de 6 caracteres únicos para las salas
function generarCodigoSala() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    for (let i = 0; i < 6; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

// Mezclador de arrays auxiliar para las ternas aleatorias (Declaración Única Global)
function mezclarArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

/* ========================================================================
   🛠️ CONFIGURACIÓN DE MODO MANTENIMIENTO / ACCESO SELECTIVO TESTERS
   ======================================================================== */
const MODO_MANTENIMIENTO = true; 
// 👥 Agregá o sacá acá los usuarios permitidos en minúscula para las pruebas
const TESTERS_PERMITIDOS = ["aguspe", "tintin", "tester_arena"]; 

app.use((req, res, next) => {
    if (!MODO_MANTENIMIENTO) {
        return next();
    }

    // A. Permitimos descargar los archivos estáticos para que cargue la interfaz visual
    if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.jpg'))) {
        return next();
    }

    // B. Filtro estricto para las rutas de autenticación (Login)
    if (req.path.startsWith('/api/login')) {
        const { username } = req.body;
        
        // Si el usuario está logueado e ingresa un nombre autorizado, pasa de largo
        if (username && TESTERS_PERMITIDOS.includes(username.trim().toLowerCase())) {
            return next();
        }
        
        // Si es cualquier otra cuenta, rebota acá antes de tocar Neon
        return res.status(503).json({ 
            error: "🚧 La Arena está en mantenimiento por reformas de infraestructura. ¡Volvé más tarde, pa! 🏗️" 
        });
    }

    // Bloqueamos el registro por completo para que nadie intente crearse cuentas mientras probás
    if (req.path.startsWith('/api/registro')) {
        return res.status(503).json({ 
            error: "🚧 La Arena está en mantenimiento. El registro de nuevas cuentas está cerrado por el momento." 
        });
    }

    // C. Si la petición viene de adentro (APIs internas), dejamos pasar
    next();
});

// RECIÉN ACÁ ABAJO SE CONFIGURA LA CARPETA ESTÁTICA
app.use(express.static(path.join(__dirname)));

/* ========================================================================
   📦 CONFIGURACIÓN Y CONEXIÓN DE BASE DE DATOS (POSTGRESQL - NEON)
   ======================================================================== */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Requerido obligatoriamente por Neon
});

// Verificamos la conexión al arrancar el proceso
pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('❌ Error de conexión a Neon:', err.message);
    else console.log('📦 Conectado con éxito a PostgreSQL en Neon.');
});

async function inicializarTablas() {
    try {
        // 1. Tabla de Usuarios (Sincronizada con el MiniMundial)
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

        // 2. Tabla de Jugadores
        await pool.query(`CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) UNIQUE NOT NULL,
            pais VARCHAR(50) NOT NULL,
            bandera VARCHAR(10) NOT NULL,
            posicion VARCHAR(50) NOT NULL,
            foto TEXT NOT NULL,
            rareza VARCHAR(20) NOT NULL
        )`);

        // 3. Tabla de Progreso
        await pool.query(`CREATE TABLE IF NOT EXISTS usuario_progreso (
            usuario_id INTEGER REFERENCES usuarios(id),
            jugador_id INTEGER REFERENCES jugadores(id),
            cantidad INTEGER DEFAULT 1,
            PRIMARY KEY (usuario_id, jugador_id)
        )`);

        const checkJugadores = await pool.query("SELECT COUNT(*) as count FROM jugadores");
        if (parseInt(checkJugadores.rows[0].count) === 0) {
            const granListaJugadores = [
                // --- AUSTRALIA ---
                ['Aiden O\'Neill', 'Australia', '🇦🇺', 'Mediocampista', 'fotos/aus_oneill.jpg', 'comun'],
                ['Alessandro Circati', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_circa.jpg', 'comun'],
                ['Aziz Behich', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_behich.jpg', 'rara'],
                ['Cameron Burgess', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_burges.jpg', 'comun'],
                ['Craig Goodwin', 'Australia', '🇦🇺', 'Delantero', 'fotos/aus_goodwin.jpg', 'rara'],
                ['Harry Souttar', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_souttar.jpg', 'rara'],
                ['Jackson Irvine', 'Australia', '🇦🇺', 'Mediocampista', 'fotos/aus_irvine.jpg', 'rara'],
                ['Jordan Bos', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_bos.jpg', 'comun'],
                ['Kusini Yengi', 'Australia', '🇦🇺', 'Delantero', 'fotos/aus_yengi.jpg', 'comun'],
                ['Lewis Miller', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_miller.jpg', 'comun'],
                ['Mathew Ryan', 'Australia', '🇦🇺', 'Arquero', 'fotos/aus_ryan.jpg', 'epica'],
                ['Milos Degenek', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_degenek.jpg', 'comun'],
                ['Nestory Irankunda', 'Australia', '🇦🇺', 'Delantero', 'fotos/aus_irankun.jpg', 'legendaria'],

                // --- ARGENTINA ---
                ['Lionel Messi', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_messi.jpg', 'legendaria'],
                ['Emiliano Martínez', 'Argentina', '🇦🇷', 'Arquero', 'fotos/arg_martinez.jpg', 'epica'],
                ['Rodrigo De Paul', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_paul.jpg', 'epica'],
                ['Julián Álvarez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_alvarez.jpg', 'epica'],
                ['Lautaro Martínez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_martinez-.jpg', 'epica'],
                ['Alexis Mac Allister', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_allister.jpg', 'rara'],
                ['Enzo Fernández', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_fernandez.jpg', 'rara'],
                ['Cristian Romero', 'Argentina', '🇦🇷', 'Defensor', 'fotos/arg_romero.jpg', 'epica'],
                ['Nico Gonzalez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_gonzalez.jpg', 'comun'],
                ['Franco Mastantuono', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_mastantuono.jpg', 'rara'],
                ['Exequiel Palacios', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_palacios.jpg', 'comun'],
                ['Leandro Paredes', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_paredes.jpg', 'rara'],
                ['Nico Paz', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_paz.jpg', 'rara'],
                ['Giuliano Simeone', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_simeone.jpg', 'comun'],

                // --- BOSNIA Y HERZEGOVINA ---
                ['Samed Baždar', 'Bosnia y Herzegovina', '🇧🇦', 'Delantero', 'fotos/bos_bazdar.jpg', 'comun'],
                ['Benjamin Tahirović', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_tahirovic.jpg', 'rara'],
                ['Edin Džeko', 'Bosnia y Herzegovina', '🇧🇦', 'Delantero', 'fotos/bos_dzeko.jpg', 'epica'],
                ['Amir Hadžiahmetović', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_hadziahmetovic.jpg', 'comun'],
                ['Ivan Bašić', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_basic.jpg', 'comun'],
                ['Sead Kolašinac', 'Bosnia y Herzegovina', '🇧🇦', 'Defensor', 'fotos/bos_kolasinac.jpg', 'rara'],
                ['Amar Memić', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_memic.jpg', 'comun'],
                ['Tarik Muharemovic', 'Bosnia y Herzegovina', '🇧🇦', 'Defensor', 'fotos/bos_muharemovic.jpg', 'comun'],
                ['Nihad Mujakić', 'Bosnia y Herzegovina', '🇧🇦', 'Defensor', 'fotos/bos_mujakic.jpg', 'comun'],
                ['Ivan Šunjić', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_sunjic.jpg', 'comun'],
                ['Haris Tabaković', 'Bosnia y Herzegovina', '🇧🇦', 'Delantero', 'fotos/bos_tabakovic.jpg', 'comun'],
                ['Nikola Vasilj', 'Bosnia y Herzegovina', '🇧🇦', 'Arquero', 'fotos/bos_vasilj.jpg', 'comun'],

                // --- BÉLGICA ---
                ['Kevin de Bruyne', 'Bélgica', '🇧🇪', 'Mediocampista', 'fotos/bel_bruyne.jpg', 'legendaria'],
                ['Timothy Castagne', 'Bélgica', '🇧🇪', 'Defensor', 'fotos/bel_castagne.jpg', 'rara'],
                ['Maxim de Cuyper', 'Bélgica', '🇧🇪', 'Mediocampista', 'fotos/bel_cuyper.jpg', 'comun'],
                ['Zeno Debast', 'Bélgica', '🇧🇪', 'Defensor', 'fotos/bel_debast.jpg', 'rara'],
                ['Jeremy Doku', 'Bélgica', '🇧🇪', 'Delantero', 'fotos/bel_doku.jpg', 'epica'],
                ['Romelu Lukaku', 'Bélgica', '🇧🇪', 'Delantero', 'fotos/bel_lukaku.jpg', 'legendaria'],
                ['Brandon Mechele', 'Bélgica', '🇧🇪', 'Defensor', 'fotos/bel_mechele.jpg', 'comun'],
                ['Thomas Meunier', 'Bélgica', '🇧🇪', 'Defensor', 'fotos/bel_meunier.jpg', 'rara'],
                ['Amadou Onana', 'Bélgica', '🇧🇪', 'Arquero', 'fotos/bel_onana.jpg', 'epica'],
                ['Lois Openda', 'Bélgica', '🇧🇪', 'Delantero', 'fotos/bel_openda.jpg', 'epica'],
                ['Nicolas Raskin', 'Bélgica', '🇧🇪', 'Mediocampista', 'fotos/bel_raskin.jpg', 'comun'],
                ['Alexis Saelemaekers', 'Bélgica', '🇧🇪', 'Delantero', 'fotos/bel_saelemaekers.jpg', 'rara'],
                ['Arthur Theate', 'Bélgica', '🇧🇪', 'Defensor', 'fotos/bel_theate.jpg', 'rara'],
                ['Youri Tielemans', 'Bélgica', '🇧🇪', 'Mediocampista', 'fotos/bel_tielemans.jpg', 'epica'],
                ['Hans Vanaken', 'Bélgica', '🇧🇪', 'Mediocampista', 'fotos/bel_vanaken.jpg', 'comun'],

                // --- BRASIL ---
                ['Alisson Becker', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_becker.jpg', 'epica'],
                ['Gleison Bremer', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_bremer.jpg', 'rara'],
                ['Casemiro', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_casemiro.jpg', 'epica'],
                ['Matheus Cunha', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_cunha.jpg', 'comun'],
                ['Danilo', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_danilo.jpg', 'comun'],
                ['Endrick', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_endrick.jpg', 'rara'],
                ['Bruno Guimarães', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_guimaraes.jpg', 'rara'],
                ['Gabriel Magalhães', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_magalhaes.jpg', 'rara'],
                ['Marquinhos', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_marquinhos.jpg', 'epica'],
                ['Gabriel Martinelli', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_martinelli.jpg', 'rara'],
                ['Ederson Moraes', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_moraes.jpg', 'rara'],
                ['Neymar Jr', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_neymar.jpg', 'legendaria'],
                ['Lucas Paquetá', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_paqueta.jpg', 'rara'],
                ['Raphinha', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_raphinha.jpg', 'epica'],
                ['Vinícius Jr', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_vinicius.jpg', 'legendaria']
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
   👤 ENDPOINTS DE AUTENTICACIÓN Y SISTEMA DE USUARIOS REFORMADO
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
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/registro', async (req, res) => {
    const { username, password } = req.body;
    const ipCliente = req.ip;

    if (!username || username.trim().length > 14) {
        return res.status(400).json({ error: "❌ El nombre de usuario no puede tener más de 14 caracteres." });
    }
    try {
        const userCheck = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "❌ Ese nombre de usuario ya está ocupado." });
        }

        if (ipCliente && ipCliente !== '::1' && ipCliente !== '127.0.0.1') {
            const ipCheck = await pool.query("SELECT * FROM usuarios WHERE ip_registro = $1", [ipCliente]);
            if (ipCheck.rows.length > 0) {
                return res.status(400).json({ error: "❌ Límite excedido: Ya se creó una cuenta desde esta conexión a Internet." });
            }
        }

        const nuevoUsuario = await pool.query(
            "INSERT INTO usuarios (username, password, ip_registro) VALUES ($1, $2, $3) RETURNING *", 
            [username, password, ipCliente]
        );
        console.log(`✨ [REGISTRO] Nuevo usuario creado: "${username.toUpperCase()}" desde la IP: ${ipCliente}`);
        return res.json({ mensaje: "Registrado con éxito", usuario: nuevoUsuario.rows[0] });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', (req, res) => {
    const { username } = req.body;
    if (username) {
        console.log(`🚪 [LOGOUT] El usuario "${username.toUpperCase()}" salió de la Arena.`);
    }
    res.json({ success: true, mensaje: "Sesión cerrada en servidor" });
});

app.post('/api/actualizar-progreso', async (req, res) => {
    const { usuario_id, monedas, puntos } = req.body;
    
    if (!usuario_id) {
        console.error("⚠️ Intento de actualización de progreso sin usuario_id válido.");
        return res.status(400).json({ error: "Falta el usuario_id en la petición." });
    }

    try {
        await pool.query(
            `UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3`, 
            [monedas, puntos, usuario_id]
        );
        const result = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        return res.json({ datos: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ========================================================================
   📖 ENDPOINTS DEL ÁLBUM PANINI Y TIENDA DE COFRES
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
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/comprar-sobre', async (req, res) => {
    const { usuario_id, tipoCofre } = req.body;

    let costo = 250;
    let probLegendaria = 0.015; 
    let probEpica = 0.10;       
    let probRara = 0.25;        

    if (tipoCofre === 'plata') {
        costo = 100;
        probLegendaria = 0.001; 
        probEpica = 0.03;       
        probRara = 0.15;    
    } 
    else if (tipoCofre === 'legendario') {
        costo = 500;
        probLegendaria = 0.08;  
        probEpica = 0.30;       
        probRara = 0.40;    
    }

    try {
        const userCheck = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        
        const usuario = userCheck.rows[0];
        if (usuario.monedas < costo) return res.json({ error_oro: true, mensaje: "🪙 No tenés suficiente Oro." });

        const jugadoresCheck = await pool.query("SELECT * FROM jugadores");
        const todosLosJugadores = jugadoresCheck.rows;
        if (todosLosJugadores.length === 0) return res.status(400).json({ error: "No hay jugadores en la DB" });

        let sobreAbierto = [];
        for (let i = 0; i < 5; i++) {
            let rand = Math.random();
            let rarezaElegida = 'comun';

            if (rand < probLegendaria) {
                rarezaElegida = 'legendaria';
            } else if (rand < probLegendaria + probEpica) {
                rarezaElegida = 'epica';
            } else if (rand < probLegendaria + probEpica + probRara) {
                rarezaElegida = 'rara';
            }

            let poolFiltrado = todosLosJugadores.filter(j => j.rareza === rarezaElegida);
            if (poolFiltrado.length === 0) {
                poolFiltrado = todosLosJugadores.filter(j => j.rareza === 'comun');
            }
            
            let elegido = poolFiltrado[Math.floor(Math.random() * poolFiltrado.length)];
            sobreAbierto.push({ ...elegido });
        }

        const nuevoOro = usuario.monedas - costo;
        await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [nuevoOro, usuario_id]);

        for (let jugador of sobreAbierto) {
            const progCheck = await pool.query(
                "SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2", 
                [usuario_id, jugador.id]
            );
            if (progCheck.rows.length > 0) {
                await pool.query(
                    "UPDATE usuario_progreso SET cantidad = cantidad + 1 WHERE usuario_id = $1 AND jugador_id = $2", 
                    [usuario_id, jugador.id]
                );
                jugador.obtenido = progCheck.rows[0].cantidad + 1;
            } else {
                await pool.query(
                    "INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)", 
                    [usuario_id, jugador.id]
                );
                jugador.obtenido = 1;
            }
        }

        return res.json({ success: true, sobre: sobreAbierto, monedas: nuevoOro });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ========================================================================
   ⚽ ENDPOINTS DEL MÓDULO DE PENALES (SISTEMA DE ENERGÍA POR HORA)
   ======================================================================== */
const MAX_TIROS = 10;
const MILISEGUNDOS_POR_TIRO = 6 * 60 * 1000; 

function calcularTirosActuales(usuario) {
    const ahora = new Date();
    if (!usuario.ultimo_tiro_timestamp) {
        return { tirosActuales: MAX_TIROS, tiempoParaSiguiente: 0 };
    }

    const ultimoTiro = new Date(usuario.ultimo_tiro_timestamp);
    const tiempoTranscurrido = ahora - ultimoTiro;
    const tirosRegenerados = Math.floor(tiempoTranscurrido / MILISEGUNDOS_POR_TIRO);
    let tirosActuales = usuario.tiros_hoy + tirosRegenerados;

    if (tirosActuales >= MAX_TIROS) {
        return { tirosActuales: MAX_TIROS, tiempoParaSiguiente: 0 };
    }

    const tiempoConsumidoEnEsteTiro = tiempoTranscurrido % MILISEGUNDOS_POR_TIRO;
    const tiempoParaSiguiente = MILISEGUNDOS_POR_TIRO - tiempoConsumidoEnEsteTiro;

    return { tirosActuales, tiempoParaSiguiente };
}

app.get('/api/tiros-restantes/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    try {
        const result = await pool.query("SELECT ultimo_tiro_timestamp, tiros_hoy FROM usuarios WHERE id = $1", [usuarioId]);
        if (result.rows.length === 0) return res.json({ tiros: MAX_TIROS, siguienteIn: 0 });

        const { tirosActuales, tiempoParaSiguiente } = calcularTirosActuales(result.rows[0]);
        return res.json({ tiros: tirosActuales, siguienteIn: tiempoParaSiguiente });
    } catch (err) {
        return res.json({ tiros: MAX_TIROS, siguienteIn: 0 });
    }
});

app.post('/api/jugar-penal', async (req, res) => {
    const { usuario_id, gano } = req.body;
    const ahora = new Date();

    try {
        const result = await pool.query("SELECT monedas, puntos_ranking, ultimo_tiro_timestamp, tiros_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const usuario = result.rows[0];
        let { tirosActuales, tiempoParaSiguiente } = calcularTirosActuales(usuario);

        if (tirosActuales <= 0) {
            return res.json({ 
                error_limite: true, 
                mensaje: "❌ ¡Te quedaste sin energía! Esperá a que se recupere un tiro. ⏱️" 
            });
        }

        const nuevosTirosGuardados = tirosActuales - 1;
        let monedasGanadas = gano ? 100 : 0;
        let puntosGanados = gano ? 15 : 0;
        const nuevasMonedas = usuario.monedas + monedasGanadas;
        const nuevosPuntos = usuario.puntos_ranking + puntosGanados;

        await pool.query(
            `UPDATE usuarios SET monedas = $1, puntos_ranking = $2, ultimo_tiro_timestamp = $3, tiros_hoy = $4 WHERE id = $5`,
            [nuevasMonedas, nuevosPuntos, ahora, nuevosTirosGuardados, usuario_id]
        );
        
        const tiempoActualizado = nuevosTirosGuardados >= MAX_TIROS ? 0 : MILISEGUNDOS_POR_TIRO;

        return res.json({
            success: true,
            tiros_restantes: nuevosTirosGuardados,
            siguienteIn: tiempoActualizado,
            datos: { monedas: nuevasMonedas, puntos_ranking: nuevosPuntos }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/ranking', async (req, res) => {
    const query = `SELECT username, puntos_ranking FROM usuarios ORDER BY puntos_ranking DESC LIMIT 10`;
    try {
        const result = await pool.query(query);
        return res.json({ ranking: result.rows });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/ranking-mundiales', async (req, res) => {
    const query = `SELECT username, copas_mundiales FROM usuarios WHERE copas_mundiales > 0 ORDER BY copas_mundiales DESC, puntos_ranking DESC LIMIT 10`;
    try {
        const result = await pool.query(query);
        return res.json({ ranking: result.rows });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ========================================================================
   🎰 CONFIGURACIÓN DE ENERGÍA PARA LA TIMBA
   ======================================================================== */
const MAX_TIMBAS = 10; 
const MILISEGUNDOS_POR_TIMBA = 6 * 60 * 1000; 

function calcularTimbasActuales(usuario) {
    const ahora = new Date();
    if (!usuario.ultimo_giro_timestamp) {
        return { timbasActuales: MAX_TIMBAS, tiempoParaSiguienteTimba: 0 };
    }

    const ultimoGiro = new Date(usuario.ultimo_giro_timestamp);
    const tiempoTranscurrido = ahora - ultimoGiro;
    const timbasRegeneradas = Math.floor(tiempoTranscurrido / MILISEGUNDOS_POR_TIMBA);
    let timbasActuales = usuario.timbas_hoy + timbasRegeneradas;

    if (timbasActuales >= MAX_TIMBAS) {
        return { timbasActuales: MAX_TIMBAS, tiempoParaSiguienteTimba: 0 };
    }

    const tiempoConsumidoEnEsteGiro = tiempoTranscurrido % MILISEGUNDOS_POR_TIMBA;
    const tiempoParaSiguienteTimba = MILISEGUNDOS_POR_TIMBA - tiempoConsumidoEnEsteGiro;

    return { timbasActuales, tiempoParaSiguienteTimba };
}

/* ========================================================================
   🎰 MÓDULO DE LA TIMBA SEGURO E INHACKEABLE
   ======================================================================== */
const apuestasActivasServidor = {};

function generarGolesServidor() {
    const r = Math.random();
    if (r < 0.25) return 0;
    if (r < 0.55) return 1;
    if (r < 0.80) return 2;
    if (r < 0.93) return 3;
    return Math.floor(Math.random() * 3) + 4;
}

app.get('/api/timbas-restantes/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    try {
        const result = await pool.query("SELECT ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [usuarioId]);
        if (result.rows.length === 0) return res.json({ timbas: MAX_TIMBAS, siguienteIn: 0 });

        const { timbasActuales, tiempoParaSiguienteTimba } = calcularTimbasActuales(result.rows[0]);
        return res.json({ timbas: timbasActuales, siguienteIn: tiempoParaSiguienteTimba });
    } catch (err) {
        return res.json({ timbas: MAX_TIMBAS, siguienteIn: 0 });
    }
});

app.post('/api/timba/preparar', async (req, res) => { 
    const { usuario_id, tipoApuesta, montoApuesta, jugadorIdApostado } = req.body;
    if (!usuario_id || !tipoApuesta) {
        return res.status(400).json({ ok: false, mensaje: "Datos inválidos." });
    }

    try {
        const userCheck = await pool.query("SELECT monedas, ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });

        const usuario = userCheck.rows[0];

        if (tipoApuesta === "monedas") {
            if (usuario.monedas < montoApuesta || montoApuesta <= 0) {
                return res.json({ ok: false, error_oro: true, mensaje: "🪙 No tenés suficiente Oro para bancar esa apuesta." });
            }
        } else {
            const progCheck = await pool.query(
                "SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2",
                [usuario_id, jugadorIdApostado]
            );
            if (progCheck.rows.length === 0 || progCheck.rows[0].cantidad <= 1) {
                return res.json({ ok: false, mensaje: "❌ No tenés stock de repetidas de ese cromo para apostar." });
            }
        }

        let { timbasActuales, tiempoParaSiguienteTimba } = calcularTimbasActuales(usuario);
        if (timbasActuales <= 0) {
            return res.json({ 
                ok: false,
                error_limite: true, 
                mensaje: "❌ ¡Te quedaste sin energía para apostar! Esperá a que recargue el cronómetro de la banca. ⏱️" 
            });
        }

        const nuevasTimbasGuardadas = timbasActuales - 1;
        const ahora = new Date();

        await pool.query(
            `UPDATE usuarios SET ultimo_giro_timestamp = $1, timbas_hoy = $2 WHERE id = $3`,
            [ahora, nuevasTimbasGuardadas, usuario_id]
        );

        const golesLReal = generarGolesServidor();
        const golesVReal = generarGolesServidor();
        const signoReal = golesLReal > golesVReal ? 'L' : (golesLReal < golesVReal ? 'V' : 'E');

        const combinacionesUsadas = new Set();
        combinacionesUsadas.add(`${golesLReal}-${golesVReal}`);

        const poolOpciones = [{ label: `${golesLReal} - ${golesVReal}`, tipo: 'exacto' }];

        for (let i = 0; i < 2; i++) {
            let glSigno = generarGolesServidor(); let gvSigno = generarGolesServidor();
            let combo = `${glSigno}-${gvSigno}`;
            let signoOpc = glSigno > gvSigno ? 'L' : (glSigno < gvSigno ? 'V' : 'E');
            let intentos = 0;
            while ((combinacionesUsadas.has(combo) || signoOpc !== signoReal) && intentos < 30) {
                glSigno = generarGolesServidor(); gvSigno = generarGolesServidor();
                if (intentos > 15) {
                    if (signoReal === 'L') { glSigno = golesLReal + 1; gvSigno = golesVReal; }
                    else if (signoReal === 'V') { glSigno = golesLReal; gvSigno = golesVReal + 1; }
                    else { glSigno = golesLReal + 1; gvSigno = golesVReal + 1; }
                }
                combo = `${glSigno}-${gvSigno}`; signoOpc = glSigno > gvSigno ? 'L' : (glSigno < gvSigno ? 'V' : 'E'); intentos++;
            }
            combinacionesUsadas.add(combo); poolOpciones.push({ label: `${glSigno} - ${gvSigno}`, tipo: 'signo' });
        }

        for (let i = 0; i < 3; i++) {
            let glErr = generarGolesServidor(); let gvErr = generarGolesServidor();
            let combo = `${glErr}-${gvErr}`;
            let signoOpc = glErr > gvErr ? 'L' : (glErr < gvErr ? 'V' : 'E');
            let intentos = 0;
            while ((combinacionesUsadas.has(combo) || signoOpc === signoReal) && intentos < 30) {
                glErr = generarGolesServidor(); gvErr = generarGolesServidor();
                if (intentos > 15) {
                    if (signoReal === 'L' || signoReal === 'E') { glErr = 0; gvErr = i + 1; } 
                    else { glErr = i + 1; gvErr = 0; }
                }
                combo = `${glErr}-${gvErr}`; signoOpc = glErr > gvErr ? 'L' : (glErr < gvErr ? 'V' : 'E'); intentos++;
            }
            combinacionesUsadas.add(combo); poolOpciones.push({ label: `${glErr} - ${gvErr}`, tipo: 'error' });
        }

        const poolParaCliente = poolOpciones.map((opc, index) => ({
            idOpcion: index,
            label: opc.label
        })).sort(() => Math.random() - 0.5);

        apuestasActivasServidor[usuario_id] = {
            golesLReal, golesVReal, tipoApuesta, montoApuesta, jugadorIdApostado, mapeoOpciones: poolOpciones
        };

        const tiempoActualizado = nuevasTimbasGuardadas >= MAX_TIMBAS ? 0 : MILISEGUNDOS_POR_TIMBA;
        return res.json({ 
            ok: true, opciones: poolParaCliente, timbas_restantes: nuevasTimbasGuardadas, siguienteIn: tiempoActualizado
        });

    } catch (err) {
        return res.status(500).json({ ok: false, mensaje: "Error en el servidor al preparar." });
    }
});

app.post('/api/timba/procesar', async (req, res) => {
    const { usuario_id, idOpcionElegida } = req.body;
    const apuesta = apuestasActivasServidor[usuario_id];

    if (!apuesta) {
        return res.status(400).json({ ok: false, mensaje: "No hay una apuesta activa preparada." });
    }

    const { golesLReal, golesVReal, tipoApuesta, montoApuesta, jugadorIdApostado, mapeoOpciones } = apuesta;
    const opcionReal = mapeoOpciones[idOpcionElegida];

    let balanceMonedas = 0;
    let puntosAsignados = 0;
    let mensajeResultado = "";

    try {
        if (tipoApuesta === "monedas") {
            if (opcionReal.tipo === 'exacto') {
                balanceMonedas = montoApuesta * 3; puntosAsignados = 20;
                mensajeResultado = `¡QUÉ ANIMAL! Acertaste el resultado exacto (${golesLReal}-${golesVReal}).\nGanaste: ${montoApuesta * 3} monedas.`;
            } else if (opcionReal.tipo === 'signo') {
                balanceMonedas = Math.round(montoApuesta * 0.5);
                mensajeResultado = `¡BIEN AHÍ! Acertaste el ganador (${opcionReal.label}). El resultado fue ${golesLReal}-${golesVReal}.\nGanaste: ${balanceMonedas} monedas.`;
            } else {
                balanceMonedas = -montoApuesta;
                mensajeResultado = `¡ERRASTE! El partido terminó ${golesLReal}-${golesVReal} y elegiste ${opcionReal.label}.\nPerdiste: ${montoApuesta} monedas.`;
            }
            await pool.query(
                `UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3`, 
                [balanceMonedas, puntosAsignados, usuario_id]
            );
        } else {
            const cardQuery = await pool.query("SELECT nombre, rareza FROM jugadores WHERE id = $1", [jugadorIdApostado]);
            const cromoApostado = cardQuery.rows[0];
            const rarezaOriginal = cromoApostado.rareza.toLowerCase();

            if (opcionReal.tipo === 'exacto' || opcionReal.tipo === 'signo') {
                if (rarezaOriginal === "legendaria") {
                    let oroPremio = opcionReal.tipo === 'exacto' ? 2500 : 1000;
                    puntosAsignados = opcionReal.tipo === 'exacto' ? 40 : 20;

                    await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                    await pool.query("UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3", [oroPremio, puntosAsignados, usuario_id]);

                    if (opcionReal.tipo === 'exacto') {
                        mensajeResultado = `👑 ¡DIOS SANTO PE! Apostaste a ${cromoApostado.nombre.toUpperCase()} Legendario y la clavaste al ángulo (${golesLReal}-${golesVReal}).\n\n💰 ¡LA CASA TE PAGA 🪙2.500 MONEDAS!`;
                    } else {
                        mensajeResultado = `💰 ¡BIEN AHÍ! Acertaste el ganador con tu Legendario (${golesLReal}-${golesVReal}).\n\n🎁 ¡Te llevás 🪙1.000 monedas!`;
                    }
                } else {
                    await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                    let rarezaPremio = rarezaOriginal;

                    if (opcionReal.tipo === 'exacto') {
                        if (rarezaOriginal === "comun") rarezaPremio = "rara";
                        else if (rarezaOriginal === "rara" || rarezaOriginal === "epica") rarezaPremio = "epica";
                    }

                    const poolPremio = await pool.query("SELECT id, nombre, rareza FROM jugadores WHERE rareza = $1 ORDER BY RANDOM() LIMIT 1", [rarezaPremio]);
                    const cromoGanado = poolPremio.rows[0];

                    const checkProg = await pool.query("SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, cromoGanado.id]);
                    if (checkProg.rows.length > 0) {
                        await pool.query("UPDATE usuario_progreso SET cantidad = cantidad + 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, cromoGanado.id]);
                    } else {
                        await pool.query("INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)", [usuario_id, cromoGanado.id]);
                    }

                    puntosAsignados = opcionReal.tipo === 'exacto' ? 30 : 15;
                    await pool.query("UPDATE usuarios SET puntos_ranking = puntos_ranking + $1 WHERE id = $2", [puntosAsignados, usuario_id]);

                    if (opcionReal.tipo === 'exacto') {
                        mensajeResultado = `🔥 ¡PRO DISPARO! Acertaste el exacto (${golesLReal}-${golesVReal}).\n🎁 ¡EVOLUCIÓN! Te ganaste un cromo SUPERIOR: ${cromoGanado.nombre.toUpperCase()} [${cromoGanado.rareza.toUpperCase()}]`;
                    } else {
                        mensajeResultado = `⚽ ¡GOOOL! Acertaste el ganador. El partido terminó ${golesLReal}-${golesVReal}.\n🃏 La banca te devuelve otro cromo: ${cromoGanado.nombre.toUpperCase()} [${cromoGanado.rareza.toUpperCase()}]`;
                    }
                }
            } else {
                await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                mensajeResultado = `❌ ¡CROMO PERDIDO! El partido terminó ${golesLReal}-${golesVReal} y tu opción fue ${opcionReal.label}.\nPerdiste 1 copia de ${cromoApostado.nombre.toUpperCase()}.`;
            }
        }

        const userCheck = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        delete apuestasActivasServidor[usuario_id];
        return res.json({
            ok: true, mensajeResultado, golesLReal, golesVReal, datos: userCheck.rows[0]
        });

    } catch (err) {
        return res.status(500).json({ ok: false, mensaje: "Error en DB al procesar." });
    }
});

/* ========================================================================
   🏆 MÓDULO MINIMUNDIAL - ENGINE DE SIMULACIÓN Y CONFIGURACIÓN
   ======================================================================== */
const COOLDOWN_MUNDIAL_MS = 3 * 60 * 60 * 1000; 
const VALOR_STATS_RAREZA = { 'comun': 60, 'especial': 68, 'rara': 75, 'epica': 85, 'legendaria': 96 };

app.get('/api/mundial/estado/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    try {
        const userCheck = await pool.query("SELECT copas_mundiales, ultima_timba_mundial FROM usuarios WHERE id = $1", [usuarioId]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const user = userCheck.rows[0];
        const ahora = new Date();
        let tiempoRestante = 0;

        if (user.ultima_timba_mundial) {
            const ultimaVez = new Date(user.ultima_timba_mundial);
            const transcurrido = ahora - ultimaVez;
            if (transcurrido < COOLDOWN_MUNDIAL_MS) {
                tiempoRestante = COOLDOWN_MUNDIAL_MS - transcurrido;
            }
        }
        return res.json({ copas: user.copas_mundiales, siguienteIn: tiempoRestante });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/mundial/preparar', async (req, res) => {
    const { usuario_id } = req.body;
    try {
        const userCheck = await pool.query("SELECT monedas, ultima_timba_mundial FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario inválido." });

        if (userCheck.rows[0].ultima_timba_mundial) {
            const transcurrido = new Date() - new Date(userCheck.rows[0].ultima_timba_mundial);
            if (transcurrido < COOLDOWN_MUNDIAL_MS) {
                return res.json({ ok: false, elVestuarioEstaCerrado: true, mensaje: `⏳ Vestuario cerrado. Debés esperar a que se cumpla el tiempo.` });
            }
        }

        if (userCheck.rows[0].monedas < 500) {
            return res.json({ ok: false, mensaje: "🪙 No tenés suficiente Oro. La inscripción al MiniMundial cuesta 500 monedas." });
        }

        const paisesValidosQuery = await pool.query(`
            SELECT j.pais FROM usuario_progreso up 
            JOIN jugadores j ON up.jugador_id = j.id 
            WHERE up.usuario_id = $1 AND up.cantidad > 0 
            GROUP BY j.pais HAVING COUNT(j.id) >= 3
        `, [usuario_id]);

        const paisesCandidatos = paisesValidosQuery.rows.map(r => r.pais);
        if (paisesCandidatos.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Requisito insuficiente: Necesitás tener al menos 3 jugadores de un mismo país desbloqueados para poder inscribirte." });
        }

        const nuevoOro = userCheck.rows[0].monedas - 500;
        await pool.query("UPDATE usuarios SET monedas = $1, ultima_timba_mundial = NOW() WHERE id = $2", [nuevoOro, usuario_id]);

        const ternaFiltrada = mezclarArray([...paisesCandidatos]).slice(0, 3);
        let rivalClasificacion = SELECCIONES_BOTS[Math.floor(Math.random() * SELECCIONES_BOTS.length)];
        while (ternaFiltrada.includes(rivalClasificacion)) {
            rivalClasificacion = SELECCIONES_BOTS[Math.floor(Math.random() * SELECCIONES_BOTS.length)];
        }

        return res.json({
            ok: true, terna: ternaFiltrada, rivalClasificacion, monedasActualizadas: nuevoOro
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

const SELECCIONES_BOTS = [
    "Francia", "Brasil", "Alemania", "España", "Italia", "Inglaterra", 
    "Países Bajos", "Portugal", "Uruguay", "Croacia", "Bélgica", "Marruecos", 
    "Japón", "Senegal", "Estados Unidos", "Colombia", "México", "Argentina",
    "Ecuador", "Perú", "Chile", "Paraguay", "Venezuela", "Canadá", "Costa Rica",
    "Nigeria", "Egipto", "Argelia", "Túnez", "Ghana", "Corea del Sur", "Australia",
    "Arabia Saudita", "Irán", "Suiza", "Dinamarca", "Suecia", "Polonia", "Ucrania", "Austria"
];

app.post('/api/mundial/jugar', async (req, res) => {
    const { usuario_id, seleccionElegida, rivalClasificacion, jugadorIds } = req.body;
    if (!jugadorIds || jugadorIds.length !== 3) {
        return res.status(400).json({ ok: false, mensaje: "Debés alinear exactamente 3 jugadores." });
    }

    try {
        const jCheck = await pool.query(
            "SELECT j.rareza FROM usuario_progreso up JOIN jugadores j ON up.jugador_id = j.id WHERE up.usuario_id = $1 AND up.jugador_id = ANY($2) AND up.cantidad > 0",
            [usuario_id, jugadorIds]
        );

        if (jCheck.rows.length !== 3) {
            return res.json({ ok: false, mensaje: "❌ Uno o más jugadores seleccionados no están disponibles." });
        }

        const sumaStats = jCheck.rows.reduce((acc, row) => acc + VALOR_STATS_RAREZA[row.rareza.toLowerCase()], 0);
        const promedio = sumaStats / 3;
        
        let estrellas = 1;
        if (promedio >= 90) estrellas = 5;
        else if (promedio >= 79) estrellas = 4;
        else if (promedio >= 70) estrellas = 3;
        else if (promedio >= 62) estrellas = 2;

        const chanceVictoria = 0.20 + (estrellas * 0.10); 

        if (Math.random() > chanceVictoria) {
            await pool.query("UPDATE usuarios SET ultima_timba_mundial = NOW() WHERE id = $1", [usuario_id]);
            return res.json({
                ok: true, progreso: { ganoClasificacion: false },
                mensaje: `❌ Fuiste eliminado en la Clasificación por ${rivalClasificacion}. Volvé a intentarlo en 3 horas.`
            });
        }

        let botsDisponibles = SELECCIONES_BOTS.filter(s => s !== seleccionElegida);
        botsDisponibles = mezclarArray(botsDisponibles);

        const rivalGrupo1 = botsDisponibles[0];
        const rivalGrupo2 = botsDisponibles[1];
        const rivalGrupo3 = botsDisponibles[2];
        const integrantesGrupo = [seleccionElegida, rivalGrupo1, rivalGrupo2, rivalGrupo3];

        let bitacoraGrupo = [];
        
        function simularMatchCompleto(eq1, eq2, esUsuario) {
            let g1 = Math.floor(Math.random() * 3);
            let g2 = Math.floor(Math.random() * 3);
            if (esUsuario) {
                if (Math.random() <= chanceVictoria && g1 <= g2) g1 = g2 + Math.floor(Math.random() * 2) + 1;
                else if (Math.random() > chanceVictoria && g2 <= g1) g2 = g1 + Math.floor(Math.random() * 2) + 1;
            }
            return { goles1: g1, goles2: g2 };
        }

        let f1_m1 = simularMatchCompleto(seleccionElegida, rivalGrupo1, true);
        let f1_m2 = simularMatchCompleto(rivalGrupo2, rivalGrupo3, false);
        bitacoraGrupo.push({ fecha: 1, local: seleccionElegida, visitante: rivalGrupo1, gL: f1_m1.goles1, gV: f1_m1.goles2, botL: rivalGrupo2, botV: rivalGrupo3, gBL: f1_m2.goles1, gBV: f1_m2.goles2 });

        let f2_m1 = simularMatchCompleto(seleccionElegida, rivalGrupo2, true);
        let f2_m2 = simularMatchCompleto(rivalGrupo1, rivalGrupo3, false);
        bitacoraGrupo.push({ fecha: 2, local: seleccionElegida, visitante: rivalGrupo2, gL: f2_m1.goles1, gV: f2_m1.goles2, botL: rivalGrupo1, botV: rivalGrupo3, gBL: f2_m2.goles1, gBV: f2_m2.goles2 });

        let f3_m1 = simularMatchCompleto(seleccionElegida, rivalGrupo3, true);
        let f3_m2 = simularMatchCompleto(rivalGrupo1, rivalGrupo2, false);
        bitacoraGrupo.push({ fecha: 3, local: seleccionElegida, visitante: rivalGrupo3, gL: f3_m1.goles1, gV: f3_m1.goles2, botL: rivalGrupo1, botV: rivalGrupo2, gBL: f3_m2.goles1, gBV: f3_m2.goles2 });

        let tablaPuntos = {};
        integrantesGrupo.forEach(p => { tablaPuntos[p] = { pais: p, pts: 0, gf: 0, gc: 0 }; });

        function acumular(loc, vis, gl, gv) {
            tablaPuntos[loc].gf += gl; tablaPuntos[loc].gc += gv;
            tablaPuntos[vis].gf += gv; tablaPuntos[vis].gc += gl;
            if (gl > gv) tablaPuntos[loc].pts += 3;
            else if (gl < gv) tablaPuntos[vis].pts += 3;
            else { tablaPuntos[loc].pts += 1; tablaPuntos[vis].pts += 1; }
        }

        bitacoraGrupo.forEach(f => {
            acumular(f.local, f.visitante, f.gL, f.gV);
            acumular(f.botL, f.botV, f.gBL, f.gBV);
        });

        let tablaOrdenada = Object.values(tablaPuntos).sort((a,b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return (b.gf - b.gc) - (a.gf - a.gc);
        });

        let posicionUsuario = tablaOrdenada.findIndex(r => r.pais === seleccionElegida) + 1;
        let clasificaALlaves = posicionUsuario <= 2;

        let bitacoraPlayoffs = [];
        let campeon = false;
        let faseAlcanzada = "Fase de Grupos";

        if (clasificaALlaves) {
            faseAlcanzada = "Octavos de Final";
            const llaves = [
                { ronda: "Octavos de Final", rival: botsDisponibles[3] },
                { ronda: "Cuartos de Final", rival: botsDisponibles[4] },
                { ronda: "Semifinal", rival: botsDisponibles[5] },
                { ronda: "Gran Final del Mundo", rival: botsDisponibles[6] }
            ];

            campeon = true;
            for (let llave of llaves) {
                faseAlcanzada = llave.ronda;
                if (Math.random() <= chanceVictoria) {
                    bitacoraPlayoffs.push({ ronda: llave.ronda, rival: llave.rival, resultado: "Ganaste ✅" });
                } else {
                    campeon = false;
                    bitacoraPlayoffs.push({ ronda: llave.ronda, rival: llave.rival, resultado: "Perdiste ❌" });
                    break;
                }
            }
        }

        const ahora = new Date();
        if (campeon) {
            await pool.query(
                "UPDATE usuarios SET monedas = monedas - 500 + 5000, copas_mundiales = copas_mundiales + 1, puntos_ranking = puntos_ranking + 50, ultima_timba_mundial = $1 WHERE id = $2",
                [ahora, usuario_id]
            );
        } else {
            await pool.query("UPDATE usuarios SET monedas = monedas - 500, ultima_timba_mundial = $1 WHERE id = $2", [ahora, usuario_id]);
        }

        const userFinal = await pool.query("SELECT monedas, puntos_ranking, copas_mundiales FROM usuarios WHERE id = $1", [usuario_id]);
        return res.json({
            ok: true,
            progreso: {
                ganoClasificacion: true, integrantesGrupo, bitacoraGrupo, clasifico: clasificaALlaves, posicionFinalGrupo: posicionUsuario, campeon, faseAlcanzada, bitacoraPlayoffs
            },
            datosActualizados: userFinal.rows[0]
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   ⚽ ENDPOINT PARA EL DRAFT MULTIJUGADOR (SIN COOLDOWN NI COBRO)
   ======================================================================== */
app.post('/api/multijugador/preparar-draft', async (req, res) => {
    const { usuario_id } = req.body;
    try {
        const userCheck = await pool.query("SELECT id FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario inválido." });

        const paisesValidosQuery = await pool.query(`
            SELECT j.pais FROM usuario_progreso up 
            JOIN jugadores j ON up.jugador_id = j.id 
            WHERE up.usuario_id = $1 AND up.cantidad > 0 
            GROUP BY j.pais HAVING COUNT(j.id) >= 3
        `, [usuario_id]);

        const paisesCandidatos = paisesValidosQuery.rows.map(r => r.pais);
        if (paisesCandidatos.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Requisito insuficiente: Necesitás tener al menos 3 jugadores de un mismo país desbloqueados para participar." });
        }

        const ternaFiltrada = mezclarArray([...paisesCandidatos]).slice(0, 3);
        return res.json({ ok: true, terna: ternaFiltrada });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   🏆 MÓDULO MULTIJUGADOR REFORMADO (AMISTOSO, ORO, CARTAS) - FIX SEGURO
   ======================================================================== */
app.post('/api/multijugador/crear', async (req, res) => {
    const { usuario_id, seleccion, jugador_ids, tipo_apuesta, apuesta_oro } = req.body;
    if (!jugador_ids || jugador_ids.length !== 3) {
        return res.json({ ok: false, mensaje: "❌ Debés seleccionar 3 jugadores para tu plantel." });
    }

    const codigo_sala = Math.random().toString(36).substring(2, 8).toUpperCase();
    const modalidad = tipo_apuesta ? tipo_apuesta.toLowerCase() : 'amistoso';
    const montoApuesta = parseInt(apuesta_oro) || 0;

    try {
        const userCheck = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario inválido." });

        const monedasActuales = userCheck.rows[0].monedas;
        let nuevoOroCreador = monedasActuales;
        let pozoInicial = 0;

        if (modalidad === 'oro') {
            if (monedasActuales < montoApuesta) {
                return res.json({ ok: false, mensaje: `🪙 No tenés oro suficiente para fijar esa apuesta de ${montoApuesta} monedas.` });
            }
            nuevoOroCreador = monedasActuales - montoApuesta;
            pozoInicial = montoApuesta;
        } else if (modalidad === 'carta') {
            const miCromoRepetido = await pool.query(
                "SELECT jugador_id FROM usuario_progreso WHERE usuario_id = $1 AND cantidad > 1 LIMIT 1", [usuario_id]
            );
            if (miCromoRepetido.rows.length === 0) {
                return res.json({ ok: false, mensaje: "🃏 No podés crear la sala porque no tenés cartas repetidas para arriesgar." });
            }
            await pool.query(
                "UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2",
                [usuario_id, miCromoRepetido.rows[0].jugador_id]
            );
        }

        if (modalidad === 'oro') {
            await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [nuevoOroCreador, usuario_id]);
        }

        const insertSalaQuery = `
            INSERT INTO mundial_salas (codigo_sala, creador_id, tipo_apuesta, apuesta_oro, pozo_total, estado)
            VALUES ($1, $2, $3, $4, $5, 'esperando') RETURNING id;
        `;
        const salaResult = await pool.query(insertSalaQuery, [codigo_sala, usuario_id, modalidad, montoApuesta, pozoInicial]);
        const sala_id = salaResult.rows[0].id;

        const insertParticipanteQuery = `INSERT INTO sala_participantes (sala_id, usuario_id, seleccion, jugador_ids) VALUES ($1, $2, $3, $4);`;
        const arrayFormateado = `{${jugador_ids.join(',')}}`; 
        await pool.query(insertParticipanteQuery, [sala_id, usuario_id, seleccion, arrayFormateado]);

        return res.json({
            ok: true, sala_id, codigo_sala, monedasActualizadas: nuevoOroCreador, mensaje: "Sala creada con éxito en la Arena."
        });
    } catch (error) {
        return res.status(500).json({ ok: false, mensaje: `Error de Base de Datos: ${error.message}` });
    }
});

app.post('/api/multijugador/unirse', async (req, res) => {
    const { usuario_id, codigo_sala, seleccion, jugador_ids, carta_apuesta_id } = req.body;
    if (!codigo_sala) return res.json({ ok: false, mensaje: "❌ Falta el código de la sala." });
    if (!jugador_ids || jugador_ids.length !== 3) return res.json({ ok: false, mensaje: "❌ Debés seleccionar 3 jugadores." });

    try {
        const salaCheck = await pool.query("SELECT id, tipo_apuesta, apuesta_oro, estado FROM mundial_salas WHERE codigo_sala = $1", [codigo_sala.toUpperCase()]);
        if (salaCheck.rows.length === 0) return res.json({ ok: false, mensaje: "❌ La sala no existe." });
        const sala = salaCheck.rows[0];

        if (sala.estado !== 'esperando') return res.json({ ok: false, mensaje: "🚫 Sala cerrada." });

        const userCheck = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        const monedasActuales = userCheck.rows[0].monedas;
        let nuevoOroUsuario = monedasActuales;
        const tipoSala = sala.tipo_apuesta ? sala.tipo_apuesta.toLowerCase() : 'amistoso';

        if (tipoSala === 'oro') {
            if (monedasActuales < sala.apuesta_oro) return res.json({ ok: false, mensaje: "🪙 No tenés oro suficiente." });
            nuevoOroUsuario = monedasActuales - sala.apuesta_oro;
            await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [nuevoOroUsuario, usuario_id]);
            await pool.query("UPDATE mundial_salas SET pozo_total = pozo_total + $1 WHERE id = $2", [sala.apuesta_oro, sala.id]);
        } 
        else if (tipoSala === 'carta') {
            if (!carta_apuesta_id) return res.json({ ok: false, mensaje: "🃏 Debés seleccionar una carta repetida para apostar." });
            const cromoCheck = await pool.query("SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2 AND cantidad > 1", [usuario_id, carta_apuesta_id]);
            if (cromoCheck.rows.length === 0) return res.json({ ok: false, mensaje: "❌ No tenés ese cromo repetido para arriesgar." });

            await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, carta_apuesta_id]);
        }

        const seleccionCheck = await pool.query("SELECT id FROM sala_participantes WHERE sala_id = $1 AND UPPER(seleccion) = $2", [sala.id, seleccion.toUpperCase()]);
        if (seleccionCheck.rows.length > 0) return res.json({ ok: false, mensaje: `La selección de ${seleccion.toUpperCase()} ya está ocupada.` });

        const arrayFormateadoPostgres = `{${jugador_ids.join(',')}}`;
        await pool.query(`INSERT INTO sala_participantes (sala_id, usuario_id, seleccion, jugador_ids) VALUES ($1, $2, $3, $4)`, [sala.id, usuario_id, seleccion, arrayFormateadoPostgres]);

        return res.json({ ok: true, mensaje: "⚽ ¡Te uniste con éxito!", sala_id: sala.id, monedasActualizadas: nuevoOroUsuario });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/multijugador/sala/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const salaQuery = await pool.query("SELECT id, creador_id, tipo_apuesta, apuesta_oro, pozo_total, estado FROM mundial_salas WHERE codigo_sala = $1", [codigo.toUpperCase()]);
        if (salaQuery.rows.length === 0) return res.json({ ok: false, mensaje: "La sala no existe." });
        const sala = salaQuery.rows[0];

        const participantesQuery = await pool.query(`SELECT sp.usuario_id, u.username, sp.seleccion FROM sala_participantes sp JOIN usuarios u ON sp.usuario_id = u.id WHERE sp.sala_id = $1`, [sala.id]);
        return res.json({ ok: true, sala_id: sala.id, creador_id: sala.creador_id, tipo_apuesta: sala.tipo_apuesta, apuesta_oro: sala.apuesta_oro, pozo_total: sala.pozo_total, estado: sala.estado, participantes: participantesQuery.rows });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

function simularPartidoEliminatorio(equipo1, equipo2) {
    let g1 = Math.floor(Math.random() * 4);
    let g2 = Math.floor(Math.random() * 4);
    let fueAPenales = false;
    let penales1 = 0; let penales2 = 0;
    let ganador;

    if (g1 > g2) ganador = equipo1;
    else if (g2 > g1) ganador = equipo2;
    else {
        fueAPenales = true;
        while (penales1 === penales2) {
            penales1 = Math.floor(Math.random() * 5) + 1;
            penales2 = Math.floor(Math.random() * 5) + 1;
        }
        ganador = (penales1 > penales2) ? equipo1 : equipo2;
    }

    return {
        local: equipo1, visitante: equipo2, golesL: g1, golesV: g2,
        penalesL: fueAPenales ? penales1 : null, penalesV: fueAPenales ? penales2 : null,
        definicionPenales: fueAPenales, ganador
    };
}

app.post('/api/multijugador/jugar', async (req, res) => {
    const { sala_id, usuario_id } = req.body;
    try {
        const salaQuery = await pool.query("SELECT * FROM mundial_salas WHERE id = $1", [sala_id]);
        if (salaQuery.rows.length === 0) return res.json({ ok: false, mensaje: "Sala no encontrada." });
        
        const sala = salaQuery.rows[0];
        if (sala.creador_id !== usuario_id) return res.json({ ok: false, mensaje: "⛔ Solo el creador puede iniciar." });
        if (sala.estado !== 'esperando') return res.json({ ok: false, mensaje: "🚫 Sala cerrada o ya simulada." });

        const participantesQuery = await pool.query(`SELECT sp.usuario_id, u.username, sp.seleccion FROM sala_participantes sp JOIN usuarios u ON sp.usuario_id = u.id WHERE sp.sala_id = $1`, [sala_id]);
        
        let competidores = participantesQuery.rows.map(p => ({ id: p.usuario_id, username: p.username, seleccion: p.seleccion, esBot: false }));
        if (competidores.length < 2) return res.json({ ok: false, mensaje: "❌ Se necesitan al menos 2 jugadores reales." });

        const PAISES_BOTS_BACKUP = ["ALEMANIA", "ITALIA", "ESPAÑA", "INGLATERRA", "PORTUGAL", "HOLANDA", "URUGUAY", "MÉXICO"];
        let botIdx = 0;
        while (competidores.length < 8) {
            let paisBot = PAISES_BOTS_BACKUP[botIdx % PAISES_BOTS_BACKUP.length];
            let yaExiste = competidores.some(c => c.seleccion.toUpperCase() === paisBot.toUpperCase());
            if (!yaExiste) {
                competidores.push({ id: null, username: `🤖 Bot ${paisBot}`, seleccion: paisBot, esBot: true });
            }
            botIdx++;
        }

        competidores = mezclarArray(competidores);
        const modalidadSala = sala.tipo_apuesta ? sala.tipo_apuesta.toLowerCase() : 'amistoso';
        
        if (modalidadSala === 'carta') {
            for (let jugadorReal of competidores.filter(c => !c.esBot)) {
                const cartaCheck = await pool.query("SELECT jugador_id FROM usuario_progreso WHERE usuario_id = $1 AND cantidad > 0 LIMIT 1", [jugadorReal.id]);
                if (cartaCheck.rows.length > 0) {
                    await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [jugadorReal.id, cartaCheck.rows[0].id]);
                }
            }
        }

        let bitacoraPartidosPlana = [];
        let ganadoresCuartos = [];
        let numeroPartido = 1;
        for (let i = 0; i < 8; i += 2) {
            let cruce = simularPartidoEliminatorio(competidores[i], competidores[i+1]);
            bitacoraPartidosPlana.push({
                ronda: `Cuartos de Final (${numeroPartido}/4)`, local: cruce.local.seleccion, visitante: cruce.visitante.seleccion, golesLocal: cruce.golesL, golesVisitante: cruce.golesV, penalesLocal: cruce.penalesL, penalesVisitante: cruce.penalesV, definicionPenales: cruce.definicionPenales, ganadorUsername: cruce.ganador.username
            });
            ganadoresCuartos.push(cruce.ganador);
            numeroPartido++;
        }

        let numeroSemi = 1;
        let ganadoresSemis = [];
        for (let i = 0; i < 4; i += 2) {
            let cruce = simularPartidoEliminatorio(ganadoresCuartos[i], ganadoresCuartos[i+1]);
            bitacoraPartidosPlana.push({
                ronda: `Semifinal (${numeroSemi}/2)`, local: cruce.local.seleccion, visitante: cruce.visitante.seleccion, golesLocal: cruce.golesL, golesVisitante: cruce.golesV, penalesLocal: cruce.penalesL, penalesVisitante: cruce.penalesV, definicionPenales: cruce.definicionPenales, ganadorUsername: cruce.ganador.username
            });
            ganadoresSemis.push(cruce.ganador);
            numeroSemi++;
        }

        let finalCruce = simularPartidoEliminatorio(ganadoresSemis[0], ganadoresSemis[1]);
        const campeonMundial = finalCruce.ganador;
        bitacoraPartidosPlana.push({
            ronda: "Gran Final", local: finalCruce.local.seleccion, visitante: finalCruce.visitante.seleccion, golesLocal: finalCruce.golesL, golesVisitante: finalCruce.golesV, penalesLocal: finalCruce.penalesL, penalesVisitante: finalCruce.penalesV, definicionPenales: finalCruce.definicionPenales, ganadorUsername: finalCruce.ganador.username
        });

        let datosPremio = { ganoBot: true, ganador_username: campeonMundial.username, pozo: sala.pozo_total, tipo_apuesta: sala.tipo_apuesta, nombreCartaPremio: null };
        if (!campeonMundial.esBot) {
            datosPremio.ganoBot = false;
            if (modalidadSala === 'oro') {
                await pool.query("UPDATE usuarios SET monedas = monedas + $1 WHERE id = $2", [sala.pozo_total, campeonMundial.id]);
            } else if (modalidadSala === 'carta') {
                const lootPremio = await pool.query("SELECT id, nombre, rareza FROM jugadores WHERE rareza IN ('epica', 'legendaria') ORDER BY RANDOM() LIMIT 1");
                const cartaRecompensa = lootPremio.rows[0];
                await pool.query(`INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1) ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + 1`, [campeonMundial.id, cartaRecompensa.id]);
                datosPremio.nombreCartaPremio = `${cartaRecompensa.nombre} (${cartaRecompensa.rareza.toUpperCase()})`;
            }
        }

        await pool.query("UPDATE mundial_salas SET estado = 'finalizado' WHERE id = $1", [sala_id]);
        BITACORAS_SALA_CACHE[sala_id] = { bitacora: bitacoraPartidosPlana, premio: datosPremio };

        return res.json({ ok: true, bitacora: bitacoraPartidosPlana, premio: datosPremio });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/multijugador/resultado-invitado/:sala_id', async (req, res) => {
    const { sala_id } = req.params;
    try {
        const salaQuery = await pool.query("SELECT estado, tipo_apuesta, pozo_total FROM mundial_salas WHERE id = $1", [sala_id]);
        if (salaQuery.rows.length === 0) return res.json({ ok: false, mensaje: "Sala no encontrada." });
        const sala = salaQuery.rows[0];

        const datosCache = BITACORAS_SALA_CACHE[sala_id];
        if (datosCache) {
            return res.json({ ok: true, bitacora: datosCache.bitacora, premio: datosCache.premio });
        }

        if (sala.estado === 'finalizado') {
            return res.json({
                ok: true,
                bitacora: [{ ronda: "Torneo Concluido", local: "Arena Online", visitante: "Estadio", golesLocal: 0, golesVisitante: 0, ganadorUsername: "Finalizado" }],
                premio: { ganoBot: false, ganador_username: "Completado", pozo: sala.pozo_total, tipo_apuesta: sala.tipo_apuesta }
            });
        }
        return res.json({ ok: false, mensaje: "⏳ Esperando el procesamiento del silbatazo inicial del host..." });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   🚨 CONFIGURACIÓN Y ENDPOINT SEGURO DE ANUNCIOS GLOBAL
   ======================================================================== */
const CONFIG_ANUNCIO_SERVIDOR = {
    activo: true,       
    tipo: "video",      
    titulo: "¡ACTUALIZACIÓN DE TEMPORADA!",
    texto: "Prendete a los nuevos torneos en vivo. Calibramos el MiniMundial para que sea más justo.",
    urlImagen: "https://albumpe.onrender.com/assets/novedad.png", 
    urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ" 
};

app.get('/api/anuncio-actual', (req, res) => {
    return res.json(CONFIG_ANUNCIO_SERVIDOR);
});

/* ========================================================================
   🚀 INICIALIZACIÓN DEL SERVIDOR
   ======================================================================== */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Espejo Activo en puerto ${PORT}`);
});
