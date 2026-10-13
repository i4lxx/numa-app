import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;

function generarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fecha de hoy en hora LOCAL del celular, formato AAAA-MM-DD. */
export function hoyLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("numa.db");
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        creado_en TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        dosis TEXT,
        frecuencia_horas INTEGER NOT NULL,
        notification_id TEXT,
        persona_id INTEGER,
        creado_en TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT,
        notas TEXT,
        notification_id TEXT,
        calendario_evento_id TEXT,
        persona_id INTEGER,
        creado_en TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tomas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicamento_id INTEGER,
        medicamento_nombre TEXT NOT NULL,
        fecha_hora TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS perfil (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        usuario_id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        openrouter_api_key TEXT,
        tipo_usuario TEXT,
        creado_en TEXT NOT NULL
      );
    `);

    // Migraciones: agregan columnas nuevas si la base de datos ya existía
    // de una version anterior de la app (sin tronar si ya existen).
    const migraciones = [
      "ALTER TABLE perfil ADD COLUMN openrouter_api_key TEXT;",
      "ALTER TABLE perfil ADD COLUMN tipo_usuario TEXT;",
      "ALTER TABLE medicamentos ADD COLUMN notification_id TEXT;",
      "ALTER TABLE medicamentos ADD COLUMN persona_id INTEGER;",
      "ALTER TABLE citas ADD COLUMN notification_id TEXT;",
      "ALTER TABLE citas ADD COLUMN calendario_evento_id TEXT;",
      "ALTER TABLE citas ADD COLUMN persona_id INTEGER;",
    ];
    for (const sql of migraciones) {
      try {
        await dbInstance.execAsync(sql);
      } catch (e) {
        // la columna ya existía, no hay nada que hacer
      }
    }
  }
  return dbInstance;
}

// ---------- Perfil / onboarding ----------

export type TipoUsuario = "estudiante" | "adulto" | "adulto_mayor" | "cuidador";

export type Perfil = {
  usuario_id: string;
  nombre: string;
  openrouter_api_key: string | null;
  tipo_usuario: TipoUsuario | null;
};

export async function obtenerPerfil(): Promise<Perfil | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<Perfil>(
    "SELECT usuario_id, nombre, openrouter_api_key, tipo_usuario FROM perfil WHERE id = 1"
  );
  return fila || null;
}

export async function guardarPerfil(
  nombre: string,
  apiKey?: string,
  tipoUsuario?: TipoUsuario
): Promise<Perfil> {
  const db = await getDb();
  const usuarioId = generarId();
  await db.runAsync(
    "INSERT OR REPLACE INTO perfil (id, usuario_id, nombre, openrouter_api_key, tipo_usuario, creado_en) VALUES (1, ?, ?, ?, ?, ?)",
    [usuarioId, nombre, apiKey || null, tipoUsuario || null, new Date().toISOString()]
  );
  return {
    usuario_id: usuarioId,
    nombre,
    openrouter_api_key: apiKey || null,
    tipo_usuario: tipoUsuario || null,
  };
}

export async function guardarApiKey(apiKey: string) {
  const db = await getDb();
  await db.runAsync("UPDATE perfil SET openrouter_api_key = ? WHERE id = 1", [apiKey]);
}

export async function cambiarTipoUsuario(tipo: TipoUsuario) {
  const db = await getDb();
  await db.runAsync("UPDATE perfil SET tipo_usuario = ? WHERE id = 1", [tipo]);
}

/** Borra TODO (perfil incluido). La app vuelve a empezar desde el onboarding. */
export async function borrarTodo() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM tomas;
    DELETE FROM citas;
    DELETE FROM medicamentos;
    DELETE FROM personas;
    DELETE FROM perfil;
  `);
}

// ---------- Personas a cargo (perfil cuidador) ----------

export type Persona = {
  id: number;
  nombre: string;
  creado_en: string;
};

export async function listarPersonas(): Promise<Persona[]> {
  const db = await getDb();
  return db.getAllAsync<Persona>("SELECT * FROM personas ORDER BY nombre ASC");
}

export async function agregarPersona(nombre: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO personas (nombre, creado_en) VALUES (?, ?)",
    [nombre, new Date().toISOString()]
  );
  return r.lastInsertRowId;
}

/** Borra a la persona junto con sus medicamentos y citas. */
export async function eliminarPersona(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM medicamentos WHERE persona_id = ?", [id]);
  await db.runAsync("DELETE FROM citas WHERE persona_id = ?", [id]);
  await db.runAsync("DELETE FROM personas WHERE id = ?", [id]);
}

// ---------- Medicamentos ----------

export type Medicamento = {
  id: number;
  nombre: string;
  dosis: string | null;
  frecuencia_horas: number;
  notification_id: string | null;
  persona_id: number | null;
  persona_nombre?: string | null;
  creado_en: string;
};

export async function listarMedicamentos(): Promise<Medicamento[]> {
  const db = await getDb();
  return db.getAllAsync<Medicamento>(
    `SELECT m.*, p.nombre AS persona_nombre
     FROM medicamentos m LEFT JOIN personas p ON p.id = m.persona_id
     ORDER BY m.creado_en DESC`
  );
}

export async function agregarMedicamento(
  nombre: string,
  dosis: string,
  frecuenciaHoras: number,
  personaId?: number | null
): Promise<number> {
  const db = await getDb();
  const resultado = await db.runAsync(
    "INSERT INTO medicamentos (nombre, dosis, frecuencia_horas, persona_id, creado_en) VALUES (?, ?, ?, ?, ?)",
    [nombre, dosis, frecuenciaHoras, personaId ?? null, new Date().toISOString()]
  );
  return resultado.lastInsertRowId;
}

export async function actualizarNotificacionMedicamento(id: number, notificationId: string | null) {
  const db = await getDb();
  await db.runAsync("UPDATE medicamentos SET notification_id = ? WHERE id = ?", [notificationId, id]);
}

export async function eliminarMedicamento(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM medicamentos WHERE id = ?", [id]);
}

// ---------- Citas ----------

export type Cita = {
  id: number;
  titulo: string;
  fecha: string;
  hora: string | null;
  notas: string | null;
  notification_id: string | null; // puede traer varios ids separados por coma
  calendario_evento_id: string | null;
  persona_id: number | null;
  persona_nombre?: string | null;
  creado_en: string;
};

const SELECT_CITAS = `SELECT c.*, p.nombre AS persona_nombre
  FROM citas c LEFT JOIN personas p ON p.id = c.persona_id`;

export async function listarCitas(): Promise<Cita[]> {
  const db = await getDb();
  return db.getAllAsync<Cita>(`${SELECT_CITAS} ORDER BY c.fecha ASC, c.hora ASC`);
}

export async function listarCitasDeHoy(): Promise<Cita[]> {
  const db = await getDb();
  return db.getAllAsync<Cita>(
    `${SELECT_CITAS} WHERE c.fecha = ? ORDER BY c.hora ASC`,
    [hoyLocal()]
  );
}

export async function listarCitasPasadas(): Promise<Cita[]> {
  const db = await getDb();
  return db.getAllAsync<Cita>(
    `${SELECT_CITAS} WHERE c.fecha < ? ORDER BY c.fecha DESC, c.hora DESC`,
    [hoyLocal()]
  );
}

export async function agregarCita(
  titulo: string,
  fecha: string,
  hora: string,
  notas: string,
  personaId?: number | null
): Promise<number> {
  const db = await getDb();
  const resultado = await db.runAsync(
    "INSERT INTO citas (titulo, fecha, hora, notas, persona_id, creado_en) VALUES (?, ?, ?, ?, ?, ?)",
    [titulo, fecha, hora, notas, personaId ?? null, new Date().toISOString()]
  );
  return resultado.lastInsertRowId;
}

export async function actualizarNotificacionCita(id: number, notificationId: string | null) {
  const db = await getDb();
  await db.runAsync("UPDATE citas SET notification_id = ? WHERE id = ?", [notificationId, id]);
}

export async function actualizarEventoCalendarioCita(id: number, eventoId: string | null) {
  const db = await getDb();
  await db.runAsync("UPDATE citas SET calendario_evento_id = ? WHERE id = ?", [eventoId, id]);
}

export async function eliminarCita(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM citas WHERE id = ?", [id]);
}

// ---------- Tomas (seguimiento de medicamentos) ----------

export type Toma = {
  id: number;
  medicamento_id: number | null;
  medicamento_nombre: string;
  fecha_hora: string;
};

export async function registrarToma(medicamentoId: number, nombre: string) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO tomas (medicamento_id, medicamento_nombre, fecha_hora) VALUES (?, ?, ?)",
    [medicamentoId, nombre, new Date().toISOString()]
  );
}

export async function listarTomas(limite = 50): Promise<Toma[]> {
  const db = await getDb();
  return db.getAllAsync<Toma>(
    "SELECT * FROM tomas ORDER BY fecha_hora DESC LIMIT ?",
    [limite]
  );
}

export async function ultimaTomaDe(medicamentoId: number): Promise<Toma | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<Toma>(
    "SELECT * FROM tomas WHERE medicamento_id = ? ORDER BY fecha_hora DESC LIMIT 1",
    [medicamentoId]
  );
  return fila || null;
}
