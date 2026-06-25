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

                    ['Nicolas Gonzalez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_gonzalez.jpg', 'comun'],

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

                    ['Kevin de Bruyne', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_bruyne.jpg', 'legendaria'],

                    ['Timothy Castagne', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_castagne.jpg', 'rara'],

                    ['Maxim de Cuyper', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_cuyper.jpg', 'comun'],

                    ['Zeno Debast', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_debast.jpg', 'rara'],

                    ['Jeremy Doku', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_doku.jpg', 'epica'],

                    ['Romelu Lukaku', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_lukaku.jpg', 'legendaria'],

                    ['Brandon Mechele', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_mechele.jpg', 'comun'],

                    ['Thomas Meunier', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_meunier.jpg', 'rara'],

                    ['Amadou Onana', 'Bélgica', 'bel', 'Arquero', 'fotos/bel_onana.jpg', 'epica'],

                    ['Lois Openda', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_openda.jpg', 'epica'],

                    ['Nicolas Raskin', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_raskin.jpg', 'comun'],

                    ['Alexis Saelemaekers', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_saelemaekers.jpg', 'rara'],

                    ['Arthur Theate', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_theate.jpg', 'rara'],

                    ['Youri Tielemans', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_tielemans.jpg', 'epica'],

                    ['Hans Vanaken', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_vanaken.jpg', 'comun'],



                    // --- CHEQUIA ---

                    ['Vaclav Cerny', 'Chequia', 'che', 'Delantero', 'fotos/che_cerny.jpg', 'rara'],

                    ['Lukas Cerv', 'Chequia', 'che', 'Mediocampista', 'fotos/che_cerv.jpg', 'comun'],

                    ['Tomas Chory', 'Chequia', 'che', 'Delantero', 'fotos/che_chory.jpg', 'comun'],

                    ['Adam Hlozek', 'Chequia', 'che', 'Delantero', 'fotos/che_hlozek.jpg', 'epica'],

                    ['Tomas Holes', 'Chequia', 'che', 'Mediocampista', 'fotos/che_holes.jpg', 'rara'],

                    ['Matej Kovar', 'Chequia', 'che', 'Arquero', 'fotos/che_kovar.jpg', 'rara'],

                    ['Ladislav Krejci', 'Chequia', 'che', 'Defensor', 'fotos/che_krejci.jpg', 'epica'],

                    ['Lukas Provod', 'Chequia', 'che', 'Mediocampista', 'fotos/che_provod.jpg', 'rara'],

                    ['Michal Sadilek', 'Chequia', 'che', 'Mediocampista', 'fotos/che_sadilek.jpg', 'rara'],

                    ['Patrik Schick', 'Chequia', 'che', 'Delantero', 'fotos/che_schick.jpg', 'legendaria'],

                    ['Jindrich Stanek', 'Chequia', 'che', 'Arquero', 'fotos/che_stanek.jpg', 'comun'],

                    ['Pavel Sulc', 'Chequia', 'che', 'Mediocampista', 'fotos/che_sulc.jpg', 'comun'],

                    ['Matej Vydra', 'Chequia', 'che', 'Delantero', 'fotos/che_vydra.jpg', 'comun'],

                    ['Jaroslav Zeleny', 'Chequia', 'che', 'Defensor', 'fotos/che_zeleny.jpg', 'comun'],

                    ['David Zima', 'Chequia', 'che', 'Defensor', 'fotos/che_zima.jpg', 'rara'],



                    // --- COSTA DE MARFIL ---

                    ['Simon Adingra', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_adingra.jpg', 'rara'],

                    ['Emmanuel Agbadou', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_agbadou.jpg', 'comun'],

                    ['Willy Boly', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_boly.jpg', 'rara'],

                    ['Amad Diallo', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_diallo.jpg', 'epica'],

                    ['Yan Diomande', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_diomande.jpg', 'epica'],

                    ['Ousmane Diomande', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_diomande--.jpg', 'epica'],

                    ['Yahia Fofana', 'Costa de Marfil', 'cm', 'Arquero', 'fotos/cm_fofana.jpg', 'epica'],

                    ['Seko Fofana', 'Costa de Marfil', 'cm', 'Mediocampista', 'fotos/cm_fofana-.jpg', ''],

                    ['Sébastien Haller', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_haller.jpg', 'legendaria'],

                    ['Ghislain Konan', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_konan.jpg', 'comun'],

                    ['Odilon Kossounou', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_kossounou.jpg', 'rara'],

                    ['Evan Ndicka', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_ndicka.jpg', 'epica'],

                    ['Wilfried Singo', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_singo.jpg', 'rara'],



                    // --- COLOMBIA ---

                    ['Jhon Arias', 'Colombia', 'col', 'Defensor', 'fotos/col_arias.jpg', 'epica'],

                    ['Santiago Arias', 'Colombia', 'col', 'Defensor', 'fotos/col_arias-.jpg', ''],

                    ['Jorge Carrascal', 'Colombia', 'col', 'Mediocampista', 'fotos/col_carrascal.jpg', 'rara'],

                    ['Kevin Castaño', 'Colombia', 'col', 'Mediocampista', 'fotos/col_castaño.jpg', 'comun'],

                    ['Jhon Córdoba', 'Colombia', 'col', 'Delantero', 'fotos/col_cordoba.jpg', 'rara'],

                    ['Luis Díaz', 'Colombia', 'col', 'Delantero', 'fotos/col_diaz.jpg', 'legendaria'],

                    ['Jefferson Lerma', 'Colombia', 'col', 'Mediocampista', 'fotos/col_lerma.jpg', 'epica'],

                    ['Daniel Muñoz', 'Colombia', 'col', 'Defensor', 'fotos/col_muñoz.jpg', 'epica'],

                    ['David Ospina', 'Colombia', 'col', 'Arquero', 'fotos/col_ospina.jpg', 'rara'],

                    ['Juan Fernando Quintero', 'Colombia', 'col', 'Mediocampista', 'fotos/col_quintero.jpg', 'epica'],

                    ['Richard Ríos', 'Colombia', 'col', 'Mediocampista', 'fotos/col_rios.jpg', 'epica'],

                    ['James Rodríguez', 'Colombia', 'col', 'Mediocampista', 'fotos/col_rodriguez.jpg', 'legendaria'],

                    ['Jhon Durán', 'Colombia', 'col', 'Delantero', 'fotos/col_suarez.jpg', 'epica'],

                    ['Camilo Vargas', 'Colombia', 'col', 'Arquero', 'fotos/col_vargas.jpg', 'epica'],



                    // --- ECUADOR ---

                    ['Nilson Angulo', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_angulo.jpg', 'comun'],

                    ['Moises Caicedo', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_caicedo.jpg', 'legendaria'],

                    ['Leonardo Campana', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_campana.jpg', 'rara'],

                    ['Alan Franco', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_franco.jpg', 'rara'],

                    ['Hernán Galíndez', 'Ecuador', 'ecu', 'Arquero', 'fotos/ecu_galindez.jpg', 'epica'],

                    ['Alan Minda', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_minda.jpg', 'rara'],

                    ['Joel Ordóñez', 'Ecuador', 'ecu', 'Defensor', 'fotos/ecu_ordoñez.jpg', 'rara'],

                    ['Kendry Páez', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_paez.jpg', 'epica'],

                    ['Gonzalo Plata', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_plata.jpg', 'epica'],

                    ['Kevin Rodríguez', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_rodriguez.jpg', 'comun'],

                    ['Enner Valencia', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_valencia.jpg', 'legendaria'],

                    ['Gonzalo Valle', 'Ecuador', 'ecu', 'Arquero', 'fotos/ecu_valle.jpg', 'comun'],

                    ['Pedro Vite', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_vite.jpg', 'rara'],

                    ['John Yeboah', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_yeboah.jpg', 'rara'],



                    // --- ESPAÑA ---

                    ['Dani Carvajal', 'España', 'esp', 'Defensor', 'fotos/esp_carvajal.jpg', 'legendaria'],

                    ['Marc Cucurella', 'España', 'esp', 'Defensor', 'fotos/esp_cucurella.jpg', 'epica'],

                    ['Mikel Merino', 'España', 'esp', 'Mediocampista', 'fotos/esp_merino.jpg', 'rara'],

                    ['Álvaro Morata', 'España', 'esp', 'Delantero', 'fotos/esp_morata.jpg', 'rara'],

                    ['Dani Olmo', 'España', 'esp', 'Mediocampista', 'fotos/esp_olmo.jpg', 'epica'],

                    ['Mikel Oyarzabal', 'España', 'esp', 'Delantero', 'fotos/esp_oyarzabal.jpg', 'rara'],

                    ['Pedri', 'España', 'esp', 'Mediocampista', 'fotos/esp_pedri.jpg', 'epica'],

                    ['Rodri', 'España', 'esp', 'Mediocampista', 'fotos/esp_rodri.jpg', 'legendaria'],

                    ['Fabian Ruiz', 'España', 'esp', 'Mediocampista', 'fotos/esp_ruiz.jpg', 'epica'],

                    ['Unai Simón', 'España', 'esp', 'Arquero', 'fotos/esp_simon.jpg', 'epica'],

                    ['Ferran Torres', 'España', 'esp', 'Delantero', 'fotos/esp_torres.jpg', 'rara'],

                    ['Nico Williams', 'España', 'esp', 'Delantero', 'fotos/esp_williams.jpg', 'legendaria'],

                    ['Lamine Yamal', 'España', 'esp', 'Delantero', 'fotos/esp_yamal.jpg', 'legendaria'],

                    ['Martin Zubimendi', 'España', 'esp', 'Mediocampista', 'fotos/esp_zubimendi.jpg', 'rara'],

                    

                    // --- FRANCIA ---

                    ['Bradley Barcola', 'Francia', 'fra', 'Delantero', 'fotos/fra_barcola.jpg', 'epica'],

                    ['Eduardo Camavinga', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_camavinga.jpg', 'epica'],

                    ['Kingsley Coman', 'Francia', 'fra', 'Delantero', 'fotos/fra_coman.jpg', 'rara'],

                    ['Ousmane Dembélé', 'Francia', 'fra', 'Delantero', 'fotos/fra_dembele.jpg', 'legendaria'],

                    ['Lucas Digne', 'Francia', 'fra', 'Defensor', 'fotos/fra_digne.jpg', 'rara'],

                    ['Desiré Doué', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_doue.jpg', 'rara'],

                    ['Hugo Ekitike', 'Francia', 'fra', 'Delantero', 'fotos/fra_ekitike.jpg', 'rara'],

                    ['Manu Koné', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_kone.jpg', 'comun'],

                    ['Mike Maignan', 'Francia', 'fra', 'Arquero', 'fotos/fra_maignan.jpg', 'epica'],

                    ['Kylian Mbappé', 'Francia', 'fra', 'Delantero', 'fotos/fra_mbappe.jpg', 'legendaria'],

                    ['Michael Olise', 'Francia', 'fra', 'Delantero', 'fotos/fra_olise.jpg', 'epica'],

                    ['Adrien Rabiot', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_rabiot.jpg', 'rara'],

                    ['Aurélien Tchouaméni', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_tchuamani.jpg', 'epica'],

                    ['Dayot Upamecano', 'Francia', 'fra', 'Defensor', 'fotos/fra_upamecano.jpg', 'rara'],



                    // --- INGLATERRA ---

                    ['Jude Bellingham', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_bellingham.jpg', 'legendaria'],

                    ['Dan Burn', 'Inglaterra', 'ing', 'Defensor', 'fotos/ing_burn.jpg', 'rara'],

                    ['Phil Foden', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_foden.jpg', 'legendaria'],

                    ['Anthony Gordon', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_gordon.jpg', 'rara'],

                    ['Marc Guéhi', 'Inglaterra', 'ing', 'Defensor', 'fotos/ing_guehi.jpg', 'epica'],

                    ['Dean Henderson', 'Inglaterra', 'ing', 'Arquero', 'fotos/ing_henderson.jpg', 'rara'],

                    ['Harry Kane', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_kane.jpg', 'legendaria'],

                    ['Cole Palmer', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_palmer.jpg', 'legendaria'],

                    ['Jordan Pickford', 'Inglaterra', 'ing', 'Arquero', 'fotos/ing_pickford.jpg', 'epica'],

                    ['Marcus Rashford', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_rashford.jpg', 'epica'],

                    ['Declan Rice', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_rice.jpg', 'epica'],

                    ['Morgan Rogers', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_rogers.jpg', 'comun'],

                    ['Bukayo Saka', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_saka.jpg', 'legendaria'],

                    ['John Stones', 'Inglaterra', 'ing', 'Defensor', 'fotos/ing_stones.jpg', 'epica'],

                    ['Ollie Watkins', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_watkins.jpg', 'epica'],



                    // --- MEXICO ---

                    ['Luis Malagon', 'México', '🇲🇽', 'Arquero', 'fotos/mex_malagon.jpg', 'rara'],

                    ['Edson Álvarez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_alvarez.jpg', 'epica'],

                    ['Chucky Lozano', 'México', '🇲🇽', 'Delantero', 'fotos/mex_lozano.jpg', 'rara'],

                    ['César Montes', 'México', '🇲🇽', 'Defensor', 'fotos/mex_montes.jpg', 'comun'],

                    ['Carlos Rodriguez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_rodriguez.jpg', 'comun'],

                    ['Diego Lainez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_lainez.jpg', 'comun'],

                    ['Erick Sanchez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_sanchez.jpg', 'comun'],

                    ['Israel Reyes', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_reyes.jpg', 'comun'],

                    ['Jesus Gallardo', 'México', '🇲🇽', 'Delantero', 'fotos/mex_gallardo.jpg', 'comun'],

                    ['Marcelo Ruiz', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_ruiz.jpg', 'comun'],

                    ['Santiago Gimenez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_gimenez.jpg', 'epica'],

                    ['Raul Jimenez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_jimenez.jpg', 'rara'],

                    ['Johan Vasquez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_vasquez.jpg', 'comun'],

                    ['Jorge Sanchez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_sanchez1.jpg', 'comun'],

                    ['Orbelin Pineda', 'México', '🇲🇽', 'Delantero', 'fotos/mex_pineda.jpg', 'comun'],



                    // --- JAPÓN ---

                    ['Junya Ito', 'Japón', 'jap', 'Delantero', 'fotos/jap_ito.jpg', 'epica'],

                    ['Daichi Kamada', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_kamada.jpg', 'epica'],

                    ['Takefusa Kubo', 'Japón', 'jap', 'Delantero', 'fotos/jap_kubo.jpg', 'legendaria'],

                    ['Shuto Machino', 'Japón', 'jap', 'Delantero', 'fotos/jap_machino.jpg', 'comun'],

                    ['Takumi Minamino', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_minamino.jpg', 'epica'],

                    ['Keito Nakamura', 'Japón', 'jap', 'Delantero', 'fotos/jap_nakamura.jpg', 'rara'],

                    ['Kaishu Sano', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_sano.jpg', 'comun'],

                    ['Yuki Soma', 'Japón', 'jap', 'Delantero', 'fotos/jap_soma.jpg', 'comun'],

                    ['Zion Suzuki', 'Japón', 'jap', 'Arquero', 'fotos/jap_suzuki.jpg', 'rara'],

                    ['Ao Tanaka', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_tanaka.jpg', 'rara'],

                    ['Shogo Taniguchi', 'Japón', 'jap', 'Defensor', 'fotos/jap_taniguchi.jpg', 'rara'],

                    ['Ayase Ueda', 'Japón', 'jap', 'Delantero', 'fotos/jap_ueda.jpg', 'epica'],

                    ['Kota Watanabe', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_watanabe.jpg', 'comun'],



                    // --- NORUEGA ---

                    ['Kristoffer Ajer', 'Noruega', 'nor', 'Defensor', 'fotos/nor_ajer.jpg', 'rara'],

                    ['', 'Noruega', 'nor', '', 'fotos/nor_ajer-.jpg', ''],

                    ['Patrick Berg', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_berg.jpg', 'comun'],

                    ['Sander Berge', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_berge.jpg', 'rara'],

                    ['Oscar Bobb', 'Noruega', 'nor', 'Delantero', 'fotos/nor_bobb.jpg', 'epica'],

                    ['Aron Dønnum', 'Noruega', 'nor', 'Delantero', 'fotos/nor_donnum.jpg', 'comun'],

                    ['Erling Haaland', 'Noruega', 'nor', 'Delantero', 'fotos/nor_haaland.jpg', 'legendaria'],

                    ['Torbiørn Heggem', 'Noruega', 'nor', 'Defensor', 'fotos/nor_heggem.jpg', 'comun'],

                    ['Jørgen Strand Larsen', 'Noruega', 'nor', 'Delantero', 'fotos/nor_larsen.jpg', 'rara'],

                    ['Antonio Nusa', 'Noruega', 'nor', 'Delantero', 'fotos/nor_nusa.jpg', 'epica'],

                    ['Martin Ødegaard', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_odegaard.jpg', 'legendaria'],

                    ['Leo Østigård', 'Noruega', 'nor', 'Defensor', 'fotos/nor_ostigard.jpg', 'rara'],

                    ['Andreas Schjelderup', 'Noruega', 'nor', 'Delantero', 'fotos/nor_schjelderup.jpg', 'rara'],

                    ['Morten Thorsby', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_thorsby.jpg', 'rara'],

                    ['David Møller Wolfe', 'Noruega', 'nor', 'Defensor', 'fotos/nor_wolfe.jpg', 'comun'],



                    // --- PAÍSES BAJOS ---

                    ['Memphis Depay', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_depay.jpg', 'epica'],

                    ['Virgil van Dijk', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_dijk.jpg', 'legendaria'],

                    ['Denzel Dumfries', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_dumfries.jpg', 'epica'],

                    ['Ryan Gravenberch', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_gravenberch.jpg', 'rara'],

                    ['Jan Paul van Hecke', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_hecke.jpg', 'comun'],

                    ['Frenkie de Jong', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_jong.jpg', 'legendaria'],

                    ['Justin Kluivert', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_kluivert.jpg', 'rara'],

                    ['Teun Koopmeiners', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_koopmeiners.jpg', 'epica'],

                    ['Donyell Malen', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_malen.jpg', 'rara'],

                    ['Tijjani Reijnders', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_reijnders.jpg', 'epica'],

                    ['Xavi Simons', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_simons.jpg', 'legendaria'],

                    ['Micky van de Ven', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_ven.jpg', 'epica'],

                    ['Bart Verbruggen', 'Países Bajos', 'pai', 'Arquero', 'fotos/pai_verbruggen.jpg', 'epica'],

                    ['Wout Weghorst', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_weghorst.jpg', 'rara'],



                    // --- PORTUGAL ---

                    ['João Cancelo', 'Portugal', 'por', 'Defensor', 'fotos/por_cancelo.jpg', 'epica'],

                    ['Diogo Costa', 'Portugal', 'por', 'Arquero', 'fotos/por_costa.jpg', 'epica'],

                    ['Diogo Dalot', 'Portugal', 'por', 'Defensor', 'fotos/por_dalot.jpg', 'rara'],

                    ['Rúben Dias', 'Portugal', 'por', 'Defensor', 'fotos/por_dias.jpg', 'legendaria'],

                    ['João Félix', 'Portugal', 'por', 'Delantero', 'fotos/por_felix.jpg', 'rara'],

                    ['Bruno Fernandes', 'Portugal', 'por', 'Mediocampista', 'fotos/por_fernandes.jpg', 'legendaria'],

                    ['Gonçalo Inácio', 'Portugal', 'por', 'Defensor', 'fotos/por_inacio.jpg', 'rara'],

                    ['Nuno Mendes', 'Portugal', 'por', 'Defensor', 'fotos/por_mendes.jpg', 'epica'],

                    ['Rúben Neves', 'Portugal', 'por', 'Mediocampista', 'fotos/por_neves-.jpg', 'rara'],

                    ['Joao Neves', 'Portugal', 'por', 'Mediocampista', 'fotos/por_neves.jpg', 'epica'],

                    ['Cristiano Ronaldo', 'Portugal', 'por', 'Delantero', 'fotos/por_ronaldo.jpg', 'legendaria'],

                    ['Bernardo Silva', 'Portugal', 'por', 'Mediocampista', 'fotos/por_silva.jpg', 'legendaria'],

                    ['Trincão', 'Portugal', 'por', 'Delantero', 'fotos/por_trincao.jpg', 'comun'],

                    ['Vitinha', 'Portugal', 'por', 'Mediocampista', 'fotos/por_vitinha.jpg', 'epica'],



                    // --- ESTADOS UNIDOS ---

                    ['Brenden Aaronson', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_aaronson.jpg', 'comun'],

                    ['Tyler Adams', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_adams.jpg', 'rara'],

                    ['Cristian Roldan', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_roldan.jpg', 'comun'],

                    ['Diego Luna', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_luna.jpg', 'rara'],

                    ['Folarin Balogun', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_balogun.jpg', 'rara'],

                    ['Alejandro Zendejas', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_freeman.jpg', 'comun'],

                    ['Matt Freese', 'Estados Unidos', '🇺🇸', 'Arquero', 'fotos/usa_freese.jpg', 'comun'],  

                    ['Weston McKennie', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_mckennie.jpg', 'rara'],

                    ['Mark McKenzie', 'Estados Unidos', '🇺🇸', 'Defensor', 'fotos/usa_mckenzie.jpg', 'comun'],

                    ['Ricardo Pepi', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_pepi.jpg', 'comun'],

                    ['Christian Pulisic', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_pulisic.jpg', 'epica'],

                    ['Chris Richards', 'Estados Unidos', '🇺🇸', 'Defensor', 'fotos/usa_richards.jpg', 'comun'],

                    ['Antonee Robinson', 'Estados Unidos', '🇺🇸', 'Defensor', 'fotos/usa_robinson.jpg', 'comun'],

                    ['Tanner Tessmann', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_tessmann.jpg', 'comun'],

                    ['Tim Weah', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_weah.jpg', 'comun'],



                    // --- CATAR ---

                    ['Ahmed Alaaeldin', 'Catar', 'qat', 'Delantero', 'fotos/qat_ahmed.jpg', 'comun'],

                    ['Sultan Al-Brake', 'Catar', 'qat', 'Defensor', 'fotos/qat_albrake.jpg', 'comun'],

                    ['Almoez Ali', 'Catar', 'qat', 'Delantero', 'fotos/qat_ali.jpg', 'legendaria'],

                    ['Karim Boudiaf', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_boudiaf.jpg', 'rara'],

                    ['Homam Ahmed', 'Catar', 'qat', 'Defensor', 'fotos/qat_ganehi.jpg', 'comun'],

                    ['Abdulaziz Hatem', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_hatem.jpg', 'rara'],

                    ['Hassan Al-Haydos', 'Catar', 'qat', 'Delantero', 'fotos/qat_haydos.jpg', 'epica'],

                    ['Boualem Khoukhi', 'Catar', 'qat', 'Defensor', 'fotos/qat_khoukhi.jpg', 'epica'],

                    ['Assim Madibo', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_madibo.jpg', 'comun'],

                    ['Lucas Mendes', 'Catar', 'qat', 'Defensor', 'fotos/qat_mendes.jpg', 'rara'],

                    ['Pedro Miguel', 'Catar', 'qat', 'Defensor', 'fotos/qat_miguel.jpg', 'rara'],

                    ['Tarek Salman', 'Catar', 'qat', 'Defensor', 'fotos/qat_salman.jpg', 'comun'],

                    ['Mohammed Waad', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_waad.jpg', 'rara'],

                    

                    // --- CANADÁ ---

                    ['Alphonso Davies', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_davies.jpg', 'epica'],

                    ['Samuel Adekugbe', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_adekugbe.jpg', 'comun'],

                    ['Moise Bombito', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_bombito.jpg', 'rara'],

                    ['Tajon Buchanan', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_buchanan.jpg', 'rara'],

                    ['Mathieu Choiniere', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_choiniere.jpg', 'comun'],

                    ['Derek Cornelius', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_cornelius.jpg', 'comun'],

                    ['Cyle Larin', 'Canadá', '🇨🇦', 'Delantero', 'fotos/can_larin.jpg', 'comun'],

                    ['Jonathan David', 'Canadá', '🇨🇦', 'Delantero', 'fotos/can_david.jpg', 'rara'],

                    ['Dayne St. Clair', 'Canadá', '🇨🇦', 'Arquero', 'fotos/can_clair.jpg', 'comun'],

                    ['Stephen Eustaquio', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_eustaquio.jpg', 'rara'],

                    ['Ismael Kone', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_kone.jpg', 'comun'],

                    ['Liam Millar', 'Canadá', '🇨🇦', 'Delantero', 'fotos/can_millar.jpg', 'comun'],

                    ['Kamal Miller', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_miller.jpg', 'comun'],

                    ['Jonathan Osorio', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_osorio.jpg', 'comun'],



                    // --- BRASIL ---

                    ['Alisson Becker', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_becker.jpg', 'epica'],

                    ['Gleison Bremer', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_bremer.jpg', 'rara'],

                    ['Casemiro', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_casemiro.jpg', 'epica'],

                    ['Matheus Cunha', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_cunha.jpg', 'comun'],

                    ['Danilo', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_danilo.jpg', 'comun'],

                    ['Danilo', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_danilo-.jpg', 'comun'],

                    ['Endrick', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_endrick.jpg', 'rara'],

                    ['Fabinho', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_fabinho.jpg', 'comun'],

                    ['Bruno Guimarães', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_guimaraes.jpg', 'rara'],

                    ['Henrique', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_henriqe.jpg', 'comun'],

                    ['Roger Ibáñez', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_ibañez.jpg', 'comun'],

                    ['Gabriel Magalhães', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_magalhaes.jpg', 'rara'],

                    ['Marquinhos', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_marquinhos.jpg', 'epica'],

                    ['Gabriel Martinelli', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_martinelli.jpg', 'rara'],

                    ['Ederson Moraes', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_moraes.jpg', 'rara'],

                    ['Neymar Jr', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_neymar.jpg', 'legendaria'],

                    ['Lucas Paquetá', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_paqueta.jpg', 'rara'],

                    ['Andreas Pereira', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_pereira.jpg', 'comun'],

                    ['Raphinha', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_raphinha.jpg', 'epica'],

                    ['Rayan', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_rayan.jpg', 'comun'],

                    ['Alex Sandro', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_sandro.jpg', 'comun'],

                    ['Santos', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_santos.jpg', 'comun'],

                    ['Igor Thiago', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_thiago.jpg', 'comun'],

                    ['Vinícius Jr', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_vinicius.jpg', 'legendaria'],

                    ['Weverton', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_weverton.jpg', 'comun'],

                    ['Wesley', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_wesley.jpg', 'comun'],



                    // --- ESCOCIA ---

                    ['Ryan Christie', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_christie.jpg', 'rara'],

                    ['Lyndon Dykes', 'Escocia', 'esc', 'Delantero', 'fotos/esc_dykes.jpg', 'rara'],

                    ['Lewis Ferguson', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_ferguson.jpg', 'rara'],

                    ['Angus Gunn', 'Escocia', 'esc', 'Arquero', 'fotos/esc_gunn.jpg', 'epica'],

                    ['Grant Hanley', 'Escocia', 'esc', 'Defensor', 'fotos/esc_hanley.jpg', 'comun'],

                    ['Jack Hendry', 'Escocia', 'esc', 'Defensor', 'fotos/esc_hendry.jpg', 'rara'],

                    ['John McGinn', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_mcginn.jpg', 'epica'],

                    ['Scott McKenna', 'Escocia', 'esc', 'Defensor', 'fotos/esc_mckenna.jpg', 'comun'],

                    ['Kenny McLean', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_mclean.jpg', 'comun'],

                    ['Scott McTominay', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_mctominay.jpg', 'legendaria'],

                    ['Anthony Ralston', 'Escocia', 'esc', 'Defensor', 'fotos/esc_ralston.jpg', 'comun'],

                    ['John Souttar', 'Escocia', 'esc', 'Defensor', 'fotos/esc_souttar.jpg', 'rara'],

                    

                    // --- HAITÍ ---

                    ['Ricardo Adé', 'Haití', 'hai', 'Delantero', 'fotos/hai_ade.jpg', 'comun'],

                    ['Carlens Arcus', 'Haití', 'hai', 'Defensor', 'fotos/hai_arcus.jpg', 'comun'],

                    ['Christopher Attvs', 'Haití', 'hai', 'Defensor', 'fotos/hai_attvs.jpg', 'comun'], 

                    ['Jean-Ricner Bellegarde', 'Haití', 'hai', 'Mediocampista', 'fotos/hai_bellegarde.jpg', 'epica'],

                    ['Josué Casimir', 'Haití', 'hai', 'Defensor', 'fotos/hai_casimir.jpg', 'comun'],

                    ['Don Deedson Louicius', 'Haití', 'hai', 'Delantero', 'fotos/hai_deedson.jpg', 'comun'],

                    ['Hannes Delcroix', 'Haití', 'hai', 'Defensor', 'fotos/hai_delcroix.jpg', 'comun'],

                    ['Jean-Kévin Duverne', 'Haití', 'hai', 'Defensor', 'fotos/hai_duverne.jpg', 'rara'],

                    ['Derrick Etienne Jr.', 'Haití', 'hai', 'Mediocampista', 'fotos/hai_etienne_Jr.jpg', 'comun'],

                    ['Martin Experience', 'Haití', 'hai', 'Defensor', 'fotos/hai_experience.jpg', 'comun'],

                    ['Danley Jean Jacques', 'Haití', 'hai', 'Mediocampista', 'fotos/hai_jacques.jpg', 'comun'],

                    ['Duke Lacroix', 'Haití', 'hai', 'Defensor', 'fotos/hai_lacroix.jpg', 'comun'],

                    ['Duckens Nazon', 'Haití', 'hai', 'Delantero', 'fotos/hai_nazon.jpg', 'rara'],

                    ['Leverton Pierre', 'Haití', 'hai', 'Delantero', 'fotos/hai_pierre.jpg', 'comun'],

                    ['Johny Placide', 'Haití', 'hai', 'Arquero', 'fotos/hai_placide.jpg', 'rara'],



                    // --- COREA DEL SUR ---

                    ['Jens Castrop', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_castrop.jpg', 'comun'],

                    ['Yumin Cho', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_cho.jpg', 'comun'],

                    ['Heechan Hwang', 'Corea del Sur', 'kor', 'Delantero', 'fotos/kor_hwang.jpg', 'epica'],

                    ['Jaesung Lee', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_jLee.jpg', 'rara'],

                    ['Hyeonwoo Jo', 'Corea del Sur', 'kor', 'Arquero', 'fotos/kor_jo.jpg', 'rara'],

                    ['Seunggyu Kim', 'Corea del Sur', 'kor', 'Arquero', 'fotos/kor_kim.jpg', 'rara'],

                    ['Kangin Lee', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_kLee.jpg', 'epica'],

                    ['Hanbeom Lee', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_lee.jpg', 'comun'],

                    ['Myungjae Lee', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_mLee.jpg', 'comun'],

                    ['Hyeongyu Oh', 'Corea del Sur', 'kor', 'Delantero', 'fotos/kor_oh.jpg', 'comun'],

                    ['Seungho Paik', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_paik.jpg', 'comun'],

                    ['Youngwoo Seol', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_seol.jpg', 'comun'],

                    ['Heungmin Son', 'Corea del Sur', 'kor', 'Delantero', 'fotos/kor_son.jpg', 'legendaria'],



                    // --- PARAGUAY ---

                    ['Omar Alderete', 'Paraguay', 'par', 'Defensor', 'fotos/par_alderete.jpg', 'rara'],

                    ['Miguel Almirón', 'Paraguay', 'par', 'Delantero', 'fotos/par_almiron.jpg', 'epica'],

                    ['Junior Alonso', 'Paraguay', 'par', 'Defensor', 'fotos/par_alonso.jpg', 'comun'],

                    ['Fabián Balbuena', 'Paraguay', 'par', 'Defensor', 'fotos/par_balbuena.jpg', 'comun'],

                    ['Juan José Cáceres', 'Paraguay', 'par', 'Defensor', 'fotos/par_caceres.jpg', 'comun'],

                    ['Andrés Cubas', 'Paraguay', 'par', 'Mediocampista', 'fotos/par_cubas.jpg', 'comun'],

                    ['Julio Enciso', 'Paraguay', 'par', 'Delantero', 'fotos/par_enciso.jpg', 'epica'],

                    ['Roberto Fernández', 'Paraguay', 'par', 'Arquero', 'fotos/par_fernandez.jpg', 'comun'],

                    ['Gustavo Gómez', 'Paraguay', 'par', 'Defensor', 'fotos/par_gGomez.jpg', 'rara'],

                    ['Orlando Gill', 'Paraguay', 'par', 'Arquero', 'fotos/par_gill.jpg', 'comun'],

                    ['Diego Gómez', 'Paraguay', 'par', 'Mediocampista', 'fotos/par_gomez.jpg', 'rara'],

                    ['Ángel Romero', 'Paraguay', 'par', 'Delantero', 'fotos/par_romero.jpg', 'comun'],

                    ['Ramón Sosa', 'Paraguay', 'par', 'Delantero', 'fotos/par_sosa.jpg', 'rara'],

                    ['Mathías Villasanti', 'Paraguay', 'par', 'Mediocampista', 'fotos/par_villasanti.jpg', 'comun'],



                    // --- SUIZA ---

                    ['Michel Aebischer', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_aebischer.jpg', 'rara'],

                    ['Manuel Akanji', 'Suiza', 'sui', 'Defensor', 'fotos/sui_akanji.jpg', 'legendaria'],

                    ['Zeki Amdouni', 'Suiza', 'sui', 'Delantero', 'fotos/sui_amdouni.jpg', 'rara'],

                    ['Aurèle Amenda', 'Suiza', 'sui', 'Defensor', 'fotos/sui_amenda.jpg', 'comun'],

                    ['Nico Elvedi', 'Suiza', 'sui', 'Defensor', 'fotos/sui_elvedi.jpg', 'rara'],

                    ['Remo Freuler', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_freuler.jpg', 'epica'],

                    ['Gregor Kobel', 'Suiza', 'sui', 'Arquero', 'fotos/sui_kobel.jpg', 'legendaria'],

                    ['Joel Monteiro', 'Suiza', 'sui', 'Delantero', 'fotos/sui_manzambi.jpg', 'comun'],

                    ['Dan Ndoye', 'Suiza', 'sui', 'Delantero', 'fotos/sui_ndoye.jpg', 'epica'],

                    ['Fabian Rieder', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_rieder.jpg', 'rara'],

                    ['Ricardo Rodríguez', 'Suiza', 'sui', 'Defensor', 'fotos/sui_rodriguez.jpg', 'epica'],

                    ['Ruben Vargas', 'Suiza', 'sui', 'Delantero', 'fotos/sui_vargas.jpg', 'epica'],

                    ['Silvan Widmer', 'Suiza', 'sui', 'Defensor', 'fotos/sui_widmer.jpg', 'rara'],

                    ['Granit Xhaka', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_xhaka.jpg', 'legendaria'],

                    ['Denis Zakaria', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_zakaria.jpg', 'epica'],



                    // --- TÚNEZ ---

                    ['Ali Abdi', 'Túnez', 'tun', 'Defensor', 'fotos/tun_abdi.jpg', 'rara'],

                    ['Elias Achouri', 'Túnez', 'tun', 'Delantero', 'fotos/tun_achouri.jpg', 'rara'],

                    ['Aymen Dahmen', 'Túnez', 'tun', 'Arquero', 'fotos/tun_dahmen.jpg', 'comun'],

                    ['Ismaël Gharbi', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_gharbi.jpg', 'rara'],

                    ['Aïssa Laïdouni', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_laidouni.jpg', 'epica'],

                    ['Sayfallah Ltaief', 'Túnez', 'tun', 'Delantero', 'fotos/tun_ltaief.jpg', 'comun'],

                    ['Rani Mastouri', 'Túnez', 'tun', 'Delantero', 'fotos/tun_mastouri.jpg', 'comun'],

                    ['Hannibal Mejbri', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_mejbri.jpg', 'epica'],

                    ['Yassine Meriah', 'Túnez', 'tun', 'Defensor', 'fotos/tun_meriah.jpg', 'rara'],

                    ['Haythem Jouini', 'Túnez', 'tun', 'Delantero', 'fotos/tun_saad.jpg', 'comun'],

                    ['Ferjani Sassi', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_sassi.jpg', 'rara'],

                    ['Ellyes Skhiri', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_skhiri.jpg', 'legendaria'],

                    ['Naïm Sliti', 'Túnez', 'tun', 'Delantero', 'fotos/tun_sliti.jpg', 'rara'],

                    ['Montassar Talbi', 'Túnez', 'tun', 'Defensor', 'fotos/tun_talbi.jpg', 'epica'],

                    ['Yan Valery', 'Túnez', 'tun', 'Defensor', 'fotos/tun_valery.jpg', 'rara'],



                    // --- ALEMANIA ---

                    ['Jamal Musiala', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_musiala.jpg', 'legendaria'],

                    ['Florian Wirtz', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_wirtz.jpg', 'legendaria'],

                    ['Kai Havertz', 'Alemania', 'ger', 'Delantero', 'fotos/ale_havertz.jpg', 'rara'],

                    ['Leon Goretzka', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_goretzka.jpg', 'rara'],

                    ['Joshua Kimmich', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_kimmich.jpg', 'epica'],

                    ['Antonio Rüdiger', 'Alemania', 'ger', 'Defensor', 'fotos/ale_rudiger.jpg', 'epica'],

                    ['Marc-André ter Stegen', 'Alemania', 'ger', 'Arquero', 'fotos/ale_stegen.jpg', 'epica'],

                    ['Serge Gnabry', 'Alemania', 'ger', 'Delantero', 'fotos/ale_gnabry.jpg', 'rara'],

                    ['Maximilian Mittelstädt', 'Alemania', 'ger', 'Defensor', 'fotos/ale_mittle.jpg', 'comun'],

                    ['Felix Nmecha', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_nmecha.jpg', 'comun'],

                    ['Ridle Baku', 'Alemania', 'ger', 'Defensor', 'fotos/ale_baku.jpg', 'comun'],

                    ['Nico Schlotterbeck', 'Alemania', 'ger', 'Defensor', 'fotos/ale_schlotterbeck.jpg', 'comun'],

                    ['Nick Woltemade', 'Alemania', 'ger', 'Delantero', 'fotos/ale_woltemade.jpg', 'comun'],

                    ['Jonathan Tah', 'Alemania', 'ger', 'Defensor', 'fotos/ale_tah.jpg', 'comun'],



                    // --- URUGUAY ---

                    ['Ronald Araújo', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_araujo.jpg', 'legendaria'],

                    ['Maxi Araujo', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_araujo-.jpg', 'comun'],

                    ['Rodrigo Bentancur', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_bentancur.jpg', 'epica'],

                    ['Sebastián Cáceres', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_caceres.jpg', 'rara'],

                    ['José María Giménez', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_gimenez.jpg', 'epica'],

                    ['Alan Matturro', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_miele.jpg', 'comun'],

                    ['Nahitan Nández', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_nandez.jpg', 'epica'],

                    ['Darwin Núñez', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_nuñez.jpg', 'legendaria'],

                    ['Mathías Olivera', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_olivera.jpg', 'rara'],

                    ['Facundo Pellistri', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_pellistri.jpg', 'epica'],

                    ['Sergio Rochet', 'Uruguay', 'uru', 'Arquero', 'fotos/uru_rochet.jpg', 'epica'],

                    ['Manuel Ugarte', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_ugarte.jpg', 'epica'],

                    ['Federico Valverde', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_valverde.jpg', 'legendaria'],

                    ['Guillermo Varela', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_varela.jpg', 'rara'],

                    ['Federico Viñas', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_viñas.jpg', 'rara'],



                    // --- TURQUÍA ---

                    ['Yunus Akgun', 'Turquía', 'tur', 'Delantero', 'fotos/tur_akgun.jpg', 'comun'],

                    ['Kerem Akturkoglu', 'Turquía', 'tur', 'Delantero', 'fotos/tur_akturkoglu.jpg', 'epica'],

                    ['Kaan Ayhan', 'Turquía', 'tur', 'Defensor', 'fotos/tur_ayhan.jpg', 'comun'],

                    ['Abdulkerim Bardakci', 'Turquía', 'tur', 'Defensor', 'fotos/tur_bardakci.jpg', 'comun'],

                    ['Ugurcan Cakir', 'Turquía', 'tur', 'Arquero', 'fotos/tur_cakir.jpg', 'comun'],

                    ['Zeki Celik', 'Turquía', 'tur', 'Defensor', 'fotos/tur_celik.jpg', 'comun'],

                    ['Merih Demiral', 'Turquía', 'tur', 'Defensor', 'fotos/tur_demiral.jpg', 'rara'],

                    ['Irfan Can Kahveci', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_kahveci.jpg', 'comun'],

                    ['Arda Guler', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_guler.jpg', 'epica'],

                    ['Orkun Kokcu', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_kokcu.jpg', 'rara'],

                    ['Mert Muldur', 'Turquía', 'tur', 'Defensor', 'fotos/tur_muldur.jpg', 'comun'],

                    ['Caglar Soyuncu', 'Turquía', 'tur', 'Defensor', 'fotos/tur_soyuncu.jpg', 'rara'],

                    ['Can Uzun', 'Turquía', 'tur', 'Delantero', 'fotos/tur_uzun.jpg', 'comun'],

                    ['Kenan Yildiz', 'Turquía', 'tur', 'Delantero', 'fotos/tur_yildiz.jpg', 'rara'],

                    ['Baris Alper Yilmaz', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_yilmaz.jpg', 'comun'],



                    // --- UZBEKISTÁN ---

                    ['Khojiakbar Alijonov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_alijonov.jpg', 'comun'],

                    ['Khusniddin Aliqulov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_aliqulov.jpg', 'rara'],

                    ['Rustam Ashurmatov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_ashurmatov.jpg', 'comun'],

                    ['Khojimat Erkinov', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_erkinov.jpg', 'rara'],

                    ['Umar Eshmurodov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_eshmurodov.jpg', 'comun'],

                    ['Abbosbek Fayzullaev', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_fayzullaev.jpg', 'epica'],

                    ['Jamshid Iskanderov', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_iskanderov.jpg', 'comun'],

                    ['Jaloliddin Masharipov', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_masharipov.jpg', 'rara'],

                    ['Sherzod Nasrullaev', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_nasrullaev.jpg', 'comun'],

                    ['Farrukh Sayfiev', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_sayfiev.jpg', 'rara'],

                    ['Igor Sergeev', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_sergeev.jpg', 'rara'],

                    ['Eldor Shomurodov', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_shomurodov.jpg', 'legendaria'],

                    ['Otabek Shukurov', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_shukurov.jpg', 'epica'],

                    ['Azizbek Turgunboev', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_turgunboev.jpg', 'rara'],

                    ['Oston Urunov', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_urunov.jpg', 'rara'],

                    



                    // --- MARRUECOS ---

                    ['Nayef Aguerd', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_aguerd.jpg', 'rara'],

                    ['Sofyan Amrabat', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_amrabat.jpg', 'rara'],

                    ['Yassine Bounou', 'Marruecos', 'mar', 'Arquero', 'fotos/mar_bounou.jpg', 'epica'],

                    ['Brahim Díaz', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_diaz.jpg', 'epica'],

                    ['Abde Ezzalzouli', 'Marruecos', 'mar', 'Delantero', 'fotos/mar_ezzalzouli.jpg', 'comun'],

                    ['Ayoub El Kaabi', 'Marruecos', 'mar', 'Delantero', 'fotos/mar_kaabi.jpg', 'rara'],

                    ['Bilal El Khannouss', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_khannouss.jpg', 'comun'],

                    ['Adam Masina', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_masina.jpg', 'comun'],

                    ['Youssef En-Nesyri', 'Marruecos', 'mar', 'Delantero', 'fotos/mar_nesyri.jpg', 'comun'],

                    ['Ismael Saibari', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_saibari.jpg', 'comun'],

                    ['Romain Saiss', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_saiss.jpg', 'comun'],

                    ['Eliesse Ben Seghir', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_seghir.jpg', 'comun'],

                    ['Jawad El Yamiq', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_yamiq.jpg', 'comun'],





    // --- ARGELIA ---

                    ['Houssem Aouar', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_aquar.jpg', 'rara'],

                    ['Youcef Atal', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_atal.jpg', 'comun'],

                    ['Ismaël Bennacer', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_bennacer.jpg', 'epica'],

                    ['Saïd Benrahma', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_benrahma.jpg', 'rara'],

                    ['Ramy Bensebaini', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_bensebaini.jpg', 'rara'],

                    ['Hicham Boudaoui', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_boudaqui.jpg', 'comun'],

                    ['Baghdad Bounedjah', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_bounedjah.jpg', 'comun'],

                    ['Farès Chaïbi', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_chaibi.jpg', 'comun'],

                    ['Amine Gouiri', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_gouiri.jpg', 'rara'],

                    ['Mustapha Zeghba', 'Argelia', '🇩🇿', 'Arquero', 'fotos/arg_guendouz.jpg', 'comun'],

                    ['Riyad Mahrez', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_mahrez.jpg', 'legendaria'],

                    ['Aïssa Mandi', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_mandi.jpg', 'rara'],

                    ['Nadjib Amine Tougai', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_tougai.jpg', 'comun'],

                    ['Ramiz Zerrouki', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_zerrouki.jpg', 'comun'],



    // --- AUSTRIA ---

                    ['David Alaba', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_alaba.jpg', 'legendaria'],

                    ['Christoph Baumgartner', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_baumgartner.jpg', 'rara'],

                    ['Kevin Danso', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_danso.jpg', 'rara'],

                    ['Michael Gregoritsch', 'Austria', '🇦🇹', 'Delantero', 'fotos/aus_gregoritsch.jpg', 'comun'],

                    ['Konrad Laimer', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_laimer.jpg', 'epica'],

                    ['Philipp Lienhart', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_lienhart.jpg', 'comun'],

                    ['Patrick Pentz', 'Austria', '🇦🇹', 'Arquero', 'fotos/aus_pentz.jpg', 'comun'],

                    ['Stefan Posch', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_posch.jpg', 'rara'],

                    ['Alexander Prass', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_prass.jpg', 'comun'],

                    ['Marcel Sabitzer', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_sabitzer.jpg', 'epica'],

                    ['Xaver Schlager', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_schlager-.jpg', 'rara'],

                    ['Alexander Schlager', 'Austria', '🇦🇹', 'Arquero', 'fotos/aus_schlager.jpg', 'comun'], // REPETIDA - COMPLETAR

                    ['Romano Schmid', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_schmid.jpg', 'comun'],

                    ['Nicolas Seiwald', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_seiwald.jpg', 'comun'],

                    ['Patrick Wimmer', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_wimmer.jpg', 'comun'],



    // --- ARABIA SAUDITA ---

                    ['Saud Abdulhamid', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_abdulhamid.jpg', 'rara'],

                    ['Salem Al-Dawsari', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_aldawsari.jpg', 'legendaria'],

                    ['Nasser Aldawsari', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_aldawsari-.jpg', 'comun'], // REPETIDA - COMPLETAR

                    ['Moteb Al-Harbi', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_alharbi.jpg', 'comun'],

                    ['Fahad Al-Johani', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_aljohani.jpg', 'comun'],

                    ['Musab Al-Juwayr', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_aljuwayr.jpg', 'comun'],

                    ['Abdullah Al-Khaibari', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_alkhaibari.jpg', 'rara'],

                    ['Abdulelah Al-Amri', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_alobud.jpg', 'rara'],

                    ['Marwan Al-Sahafi', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_alsahafi.jpg', 'comun'],

                    ['Ahmed Al-Ghamdi', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_alsanbi.jpg', 'comun'],

                    ['Mohammed Al-Shamat', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_alshamat.jpg', 'comun'],

                    ['Saleh Al-Shehri', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_alsheri.jpg', 'epica'],

                    ['Hassan Al-Tambakti', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_altambakti.jpg', 'rara'],

                    ['Ayman Yahya', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_thikri.jpg', 'comun'],



    // --- REPÚBLICA DEMOCRÁTICA DEL CONGO ---

                    ['Cédric Bakambu', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_bakambu.jpg', 'epica'],

                    ['Aaron Wan-Bissaka', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_bissaka.jpg', 'epica'],

                    ['Brian Cipenga', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_cipenga.jpg', 'comun'], // Nota: El archivo dice cipenga pero la figu es Sadiki

                    ['Meschack Elia', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_elia.jpg', 'rara'],

                    ['Joris Kayembe', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_kayembe.jpg', 'rara'],

                    ['Edo Kayembe', 'Congo', '🇨🇩', 'Mediocampista', 'fotos/con_kayembe-.jpg', 'comun'], // REPETIDA - COMPLETAR

                    ['Arthur Masuaku', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_masuaku.jpg', 'rara'],

                    ['Fiston Mayele', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_mayele.jpg', 'comun'],

                    ['Chancel Mbemba', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_mbemba.jpg', 'legendaria'],

                    ['Nathanaël Mbuku', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_mbuku.jpg', 'comun'],

                    ['Lionel Mpasi', 'Congo', '🇨🇩', 'Arquero', 'fotos/con_mpasi.jpg', 'comun'],

                    ['Ngal\'ayel Mukau', 'Congo', '🇨🇩', 'Mediocampista', 'fotos/con_mukau.jpg', 'comun'],

                    ['Charles Pickel', 'Congo', '🇨🇩', 'Mediocampista', 'fotos/con_pickel.jpg', 'comun'],

                    ['Axel Tuanzebe', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_tuanzebe.jpg', 'rara'],

                    ['Yoane Wissa', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_wissa.jpg', 'epica'],



    // --- EGIPTO ---

                    ['Mohamed El-Shenawy', 'Egipto', '🇪🇬', 'Arquero', 'fotos/egi_elshenawy.jpg', 'epica'],

                    ['Ahmed Fatouh', 'Egipto', '🇪🇬', 'Defensor', 'fotos/egi_fatouh.jpg', 'rara'],

                    ['Mohamed Hany', 'Egipto', '🇪🇬', 'Defensor', 'fotos/egi_handy.jpg', 'rara'], // Nota: El archivo dice handy pero es Hany

                    ['Mohanad Lasheen', 'Egipto', '🇪🇬', 'Mediocampista', 'fotos/egi_laheen.jpg', 'comun'], // Nota: El archivo dice laheen pero es Ahmed Hassan (Kouka)

                    ['Omar Marmoush', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_marniysh.jpg', 'epica'],

                    ['Ramy Rabia', 'Egipto', '🇪🇬', 'Defensor', 'fotos/egi_rabia.jpg', 'comun'],

                    ['Mohamed Salah', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_salah.jpg', 'legendaria'],

                    ['Ramadan Sobhi', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_sobhi.jpg', 'rara'],

                    ['Trézéguet', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_trezeguet.jpg', 'epica'],



    // --- JORDANIA ---

                    ['Abualnadi', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_abualnadi.jpg', 'comun'],

                    ['Yazeed Abulaila', 'Jordania', '🇯🇴', 'Arquero', 'fotos/jor_abulaila.jpg', 'rara'],

                    ['Ihsan Haddad', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_haddad.jpg', 'rara'],

                    ['Mohammad Abu Jamous', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_jamous.jpg', 'comun'],

                    ['Mahmoud Al-Mardi', 'Jordania', '🇯🇴', 'Mediocampista', 'fotos/jor_mardi.jpg', 'rara'],

                    ['Yazan Al-Naimat', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_naimat.jpg', 'rara'],

                    ['Obaid', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_obaid.jpg', 'comun'],

                    ['Ali Olwan', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_olwan.jpg', 'comun'],

                    ['Abdallah Rashdan', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_rashdan.jpg', 'comun'],

                    ['Noor Al-Rawabdeh', 'Jordania', '🇯🇴', 'Mediocampista', 'fotos/jor_rawabdeh.jpg', 'comun'],

                    ['Ibrahim Sadeh', 'Jordania', '🇯🇴', 'Mediocampista', 'fotos/jor_saadeh.jpg', 'comun'], // Nota: Basado en saadeh

                    ['Koubaib Al-Sabra', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_sabra.jpg', 'comun'],

                    ['Mousa Al-Tamari', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_taamari.jpg', 'epica'],

                    ['Moouath Taha', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_taha.jpg', 'comun'],

                    ['Mohammad Abu Zrayq', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_zrayq.jpg', 'comun'],





    // --- SUDÁFRICA ---

                    ['Oswin Appollis', 'Sudáfrica', '🇿🇦', 'Delantero', 'fotos/sud_appollis.jpg', 'rara'],

                    ['Sipho Chaine', 'Sudáfrica', '🇿🇦', 'Arquero', 'fotos/sud_cahine.jpg', 'comun'], // Nota: Basado en el archivo de Chaine

                    ['Samukele Kabini', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_kabini.jpg', 'comun'], // Nota: Basado en el archivo de Kabini

                    ['Thalente Mbatha', 'Sudáfrica', '🇿🇦', 'Mediocampista', 'fotos/sud_mbatha.jpg', 'comun'], // Nota: Basado en el archivo de Maseko/Mbatha

                    ['Sipho Mbule', 'Sudáfrica', '🇿🇦', 'Mediocampista', 'fotos/sud_mbule.jpg', 'comun'],

                    ['Khuliso Mudau', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_mudau.jpg', 'rara'],

                    ['Khulumani Ndamane', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_ndamane.jpg', 'rara'], // Nota: Basado en el archivo de Modiba/Ndamane

                    ['Siyabonga Ngezana', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_negezana.jpg', 'rara'],

                    ['Mohau Nkota', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_nkota.jpg', 'comun'], // Nota: Basado en el archivo de Nkota/Sibisi

                    ['Iqraam Rayners', 'Sudáfrica', '🇿🇦', 'Delantero', 'fotos/sud_rayners.jpg', 'comun'],

                    ['Ronwen Williams', 'Sudáfrica', '🇿🇦', 'Arquero', 'fotos/sud_williams.jpg', 'epica'],



    // --- TURQUÍA ---

                    ['Bariş Alper Yilmaz', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_akgun.jpg', 'rara'], // Nota: Basado en el archivo akgun/Yılmaz

                    ['Kerem Aktürkoğlu', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_akturkoglu.jpg', 'epica'],

                    ['Kaan Ayhan', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_ayhan.jpg', 'rara'],

                    ['Abdülkerim Bardakci', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_bardakci.jpg', 'rara'],

                    ['Uğurcan Çakir', 'Turquía', '🇹🇷', 'Arquero', 'fotos/tur_cakir.jpg', 'rara'],

                    ['Zeki Çelik', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_celik.jpg', 'rara'],

                    ['Merih Demiral', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_demiral.jpg', 'epica'],

                    ['Arda Güler', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_guler.jpg', 'legendaria'],

                    ['İrfan Can Kahveci', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_kahveci.jpg', 'rara'],

                    ['Orkun Kökçü', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_kokcu.jpg', 'epica'],

                    ['Mert Müldür', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_muldur.jpg', 'comun'],

                    ['Çağlar Söyüncü', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_soyuncu.jpg', 'epica'],

                    ['Semih Kiliçsoy', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_uzun.jpg', 'comun'], // Nota: Basado en el archivo uzun/Kılıçsoy

                    ['Kenan Yildiz', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_yildiz.jpg', 'legendaria'],

                    ['Hakan Çalhanoğlu', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_yilmaz.jpg', 'legendaria'], // Nota: Basado en el archivo yilmaz/Çalhanoğlu



    // --- CABO VERDE ---

                    ['Patrick Andrade', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_andrade.jpg', 'comun'],

                    ['Bebé', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_bebe.jpg', 'epica'],

                    ['Jovane Cabral', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_cabral.jpg', 'epica'],

                    ['Logan Costa', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_costa.jpg', 'rara'],

                    ['Diney', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_dinev.jpg', 'comun'], // Nota: Basado en el archivo dinev

                    ['Deroy Duarte', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_duarte.jpg', 'rara'],

                    ['Dailon Livramento', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_livramento.jpg', 'comun'], // Nota: Basado en el archivo livramento

                    ['Ryan Mendes', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_mendes.jpg', 'legendaria'],

                    ['Steven Moreira', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_moreira.jpg', 'rara'],

                    ['João Paulo', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_paulo.jpg', 'comun'],

                    ['Pico', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_pico.jpg', 'rara'],

                    ['Jamiro Monteiro', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_pina.jpg', 'rara'], // Nota: Basado en el archivo pina

                    ['Semedo', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_semedo.jpg', 'comun'],

                    ['Wagner Pina', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_semedo-.jpg', 'comun'], // REPETIDA - COMPLETAR

                    ['Vozinha', 'Cabo Verde', '🇨🇻', 'Arquero', 'fotos/ver_vozinha.jpg', 'rara'],



    // --- NUEVA ZELANDA ---

                    ['Kosta Barbarouses', 'Nueva Zelanda', '🇳🇿', 'Delantero', 'fotos/zel_barbarouses.jpg', 'rara'], //

                    ['Joe Bell', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_bell.jpg', 'rara'], //

                    ['Michael Boxall', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_boxall.jpg', 'comun'], //

                    ['Liberato Cacace', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_cacace.jpg', 'epica'], //

                    ['Max Crocombe', 'Nueva Zelanda', '🇳🇿', 'Arquero', 'fotos/zel_crocombe.jpg', 'comun'], //

                    ['Matthew Garbett', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_garbett.jpg', 'rara'], //

                    ['Callum McCowatt', 'Nueva Zelanda', '🇳🇿', 'Delantero', 'fotos/zel_mccowatt.jpg', 'comun'], //

                    ['Alex Paulsen', 'Nueva Zelanda', '🇳🇿', 'Arquero', 'fotos/zel_paulsen.jpg', 'rara'], //

                    ['Tim Payne', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_payne.jpg', 'comun'], //

                    ['Marko Stamenic', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_stamenic.jpg', 'epica'], //

                    ['Finn Surman', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_surman.jpg', 'comun'], // Nota: Basado en su archivo surman

                    ['Ryan Thomas', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_thomas.jpg', 'comun'], //

                    ['Francis de Vries', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_vries.jpg', 'comun'], //

                    ['Chris Wood', 'Nueva Zelanda', '🇳🇿', 'Delantero', 'fotos/zel_wood.jpg', 'legendaria'], //



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
        const pValidos = await pool.query(`
            SELECT j.pais FROM usuario_progreso up JOIN jugadores j ON up.jugador_id = j.id 
            WHERE up.usuario_id = $1 AND up.cantidad > 0 GROUP BY j.pais HAVING COUNT(j.id) >= 3
        `, [usuario_id]);
        const candidatos = pValidos.rows.map(r => r.pais);
        if (candidatos.length === 0) return res.json({ ok: false, mensaje: "❌ Requisito insuficiente: Necesitás al menos 3 jugadores de un mismo país desbloqueados." });
        return res.json({ ok: true, terna: mezclarArray([...candidatos]).slice(0, 3) });
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
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
   🚨 ANUNCIOS GLOBAL & INICIALIZACIÓN
   ======================================================================== */
const CONFIG_ANUNCIO_SERVIDOR = { activo: true, tipo: "video", titulo: "¡ACTUALIZACIÓN DE TEMPORADA!", texto: "Prendete a los nuevos torneos en vivo. Calibramos el MiniMundial para que sea más justo.", urlImagen: "https://albumpe.onrender.com/assets/novedad.png", urlVideo: "https://www.youtube.com/embed/dQw4w9WgXcQ" };

app.get('/api/anuncio-actual', (req, res) => res.json(CONFIG_ANUNCIO_SERVIDOR));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
