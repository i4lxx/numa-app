// Cliente que habla DIRECTO con OpenRouter desde el celular (sin pasar por Render).
// Cada usuario usa su propia clave gratuita de OpenRouter.

// Respaldo por si no se puede consultar la lista actual de OpenRouter.
// Todos estos aceptan imágenes.
const MODELOS_VISION_RESPALDO = [
  "qwen/qwen2.5-vl-72b-instruct:free",
  "qwen/qwen2.5-vl-32b-instruct:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

const MODELOS_TEXTO = ["openrouter/free"];

const MAX_MODELOS_A_PROBAR = 8;
const TIMEOUT_MS = 45000;

type ErrorIA = Error & { status?: number };

// ---------- Descubrir modelos gratuitos que SÍ leen imágenes ----------

type ModeloInfo = {
  id: string;
  context_length?: number;
  architecture?: { input_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
};

// Prioridad aproximada: los que suelen leer mejor letra manuscrita van primero
function puntaje(m: ModeloInfo): number {
  const id = m.id.toLowerCase();
  let p = 0;
  if (/gemini/.test(id)) p += 40;
  if (/qwen.*vl/.test(id)) p += 35;
  if (/llama-4|llama-3\.2-90b/.test(id)) p += 30;
  if (/pixtral|mistral-small/.test(id)) p += 20;
  if (/gemma-3/.test(id)) p += 15;
  if (/72b|90b|70b/.test(id)) p += 10;
  p += Math.min((m.context_length || 0) / 100000, 5);
  return p;
}

let cacheVision: { ids: string[]; hora: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 horas

async function obtenerModelosVision(): Promise<string[]> {
  if (cacheVision && Date.now() - cacheVision.hora < CACHE_MS) {
    return cacheVision.ids;
  }

  try {
    const respuesta = await fetch("https://openrouter.ai/api/v1/models");
    if (!respuesta.ok) throw new Error(`status ${respuesta.status}`);
    const datos = await respuesta.json();

    const modelos: ModeloInfo[] = (datos.data || []).filter((m: ModeloInfo) => {
      const aceptaImagen = m.architecture?.input_modalities?.includes("image");
      const esGratis =
        m.id.endsWith(":free") ||
        (m.pricing?.prompt === "0" && m.pricing?.completion === "0");
      return aceptaImagen && esGratis;
    });

    modelos.sort((a, b) => puntaje(b) - puntaje(a));

    const dinamicos = modelos.map((m) => m.id);
    // Primero los de la lista actual; los de respaldo al final (sin repetir)
    const ids = [...dinamicos, ...MODELOS_VISION_RESPALDO.filter((r) => !dinamicos.includes(r))];

    cacheVision = { ids, hora: Date.now() };
    return ids;
  } catch (e) {
    console.log("No se pudo consultar la lista de modelos, uso el respaldo", e);
    return MODELOS_VISION_RESPALDO;
  }
}

// ---------- Llamadas a OpenRouter ----------

function extraerJSON(texto: string | null): any {
  if (!texto) return null;
  const limpio = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1) return null;
  try {
    return JSON.parse(limpio.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

async function llamarOpenRouter(apiKey: string, modelo: string, messages: any[]) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: modelo, messages }),
      signal: controlador.signal,
    });

    if (!respuesta.ok) {
      const texto = await respuesta.text().catch(() => "");
      const error: ErrorIA = new Error(
        `OpenRouter (${respuesta.status}): ${texto.slice(0, 200)}`
      );
      error.status = respuesta.status;
      throw error;
    }

    const datos = await respuesta.json();
    return datos.choices?.[0]?.message?.content ?? null;
  } finally {
    clearTimeout(temporizador);
  }
}

async function llamarConModelos(apiKey: string, modelos: string[], messages: any[]) {
  let ultimoError: any;

  for (const modelo of modelos.slice(0, MAX_MODELOS_A_PROBAR)) {
    try {
      const contenido = await llamarOpenRouter(apiKey, modelo, messages);
      if (contenido) return contenido;
      ultimoError = new Error(`${modelo} regresó una respuesta vacía`);
    } catch (e: any) {
      ultimoError = e;
      // Si la clave es inválida o no hay saldo, probar otros modelos no sirve de nada
      if (e.status === 401 || e.status === 402) {
        throw new Error(
          e.status === 401
            ? "Tu clave de OpenRouter no es válida. Revísala en Ajustes."
            : "Tu cuenta de OpenRouter no tiene saldo o permiso para este modelo."
        );
      }
      console.log(`${modelo} falló, probando el siguiente...`, e.message);
    }
  }

  throw new Error(
    `Ningún modelo pudo responder ahora mismo. Intenta de nuevo en unos minutos. (${ultimoError?.message || "sin detalle"})`
  );
}

// ---------- Clasificar mensaje de texto ----------

export type DatosEvento = {
  categoria: "otro" | "evento_familiar" | "cita_medica" | "evento_personal" | "recordatorio_llamada";
  titulo?: string;
  fecha?: string;
  hora?: string;
  persona?: string;
  detalle?: string;
};

export async function clasificarMensaje(texto: string, apiKey: string): Promise<DatosEvento> {
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const prompt = `Eres el clasificador de un bot personal de agenda llamado Numa. No eres doctor ni das consejo medico: solo organizas la informacion que la persona ya te da (agendar, recordar), sin opinar ni sugerir nada medico. Hoy es ${fechaHoy}.

El usuario mando este mensaje: "${texto}"

Determina a cual de estas categorias pertenece y extrae los datos. Responde UNICAMENTE con un JSON valido, sin texto adicional antes ni despues:

{
  "categoria": "evento_familiar" | "cita_medica" | "evento_personal" | "recordatorio_llamada" | "otro",
  "titulo": "titulo corto del evento/recordatorio",
  "fecha": "YYYY-MM-DD o null si no se menciona",
  "hora": "HH:MM en formato 24h, o null si no se menciona",
  "detalle": "descripcion o contexto adicional, o null",
  "persona": "nombre de la persona involucrada si aplica (ej. a quien llamar), o null"
}

Si el mensaje no encaja en ninguna categoria util para el bot, usa "categoria": "otro".`;

  const contenido = await llamarConModelos(apiKey, MODELOS_TEXTO, [
    { role: "user", content: prompt },
  ]);

  const json = extraerJSON(contenido);
  if (!json) {
    return { categoria: "otro", titulo: texto };
  }
  return json;
}

// ---------- Leer receta (foto) ----------

export type MedicamentoDetectado = {
  nombre: string;
  dosis?: string;
  frecuencia_horas?: number;
  duracion_dias?: number;
  indicaciones?: string;
  campos_inciertos?: string[];
};

export type DatosReceta = {
  es_receta: boolean;
  medicamentos: MedicamentoDetectado[];
  doctor?: string;
  fecha_receta?: string;
  notas?: string;
};

export async function leerRecetaFoto(base64Image: string, apiKey: string): Promise<DatosReceta> {
  const prompt = `Eres una herramienta de TRANSCRIPCION de documentos para un bot personal de recordatorios. NO eres doctor, NO das consejo medico, NO diagnosticas, y NO decides tratamientos. Tu unica funcion es transcribir con la mayor fidelidad posible lo que YA esta escrito en una receta que un doctor con licencia ya emitio.

Primero determina si la imagen es una RECETA MEDICA (documento, manuscrito o impreso, con medicamentos recetados por un doctor).

Reglas para transcribir:
- Da tu MEJOR lectura para cada dato, incluso si la letra no es perfecta.
- Puedes interpretar abreviaturas ESTANDAR: "c/8h" = cada 8 horas; "BID" = cada 12 horas; "TID" = cada 8 horas; "QID" = cada 6 horas; "c/24h" o "QD" = cada 24 horas.
- Marca un campo en "campos_inciertos" SOLO cuando de verdad no puedas aventurar ninguna lectura razonable.
- Nunca inventes un dato que no esta en la imagen.
- Si el documento tiene membrete/sello de doctor y una lista de medicamentos, marca "es_receta": true.

Responde UNICAMENTE con un JSON valido, con esta forma exacta:

{
  "es_receta": true o false,
  "doctor": "nombre del doctor si aparece, o null",
  "fecha_receta": "fecha en formato YYYY-MM-DD si aparece, o null",
  "medicamentos": [
    {
      "nombre": "nombre del medicamento",
      "dosis": "ej. 500mg, o null",
      "frecuencia_horas": numero_de_horas_entre_cada_toma_o_null,
      "duracion_dias": numero_de_dias_o_null,
      "indicaciones": "instrucciones adicionales, o null",
      "campos_inciertos": ["campos que no se pudieron leer"]
    }
  ],
  "notas": "cualquier otra observacion, o null"
}

Si "es_receta" es false, deja "medicamentos" como un arreglo vacio.`;

  const modelosVision = await obtenerModelosVision();

  const contenido = await llamarConModelos(apiKey, modelosVision, [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
      ],
    },
  ]);

  const json = extraerJSON(contenido);
  if (!json) {
    return { es_receta: false, medicamentos: [], notas: "No se pudo interpretar la imagen." };
  }

  if (json.medicamentos && Array.isArray(json.medicamentos)) {
    for (const m of json.medicamentos) {
      if (!Array.isArray(m.campos_inciertos)) m.campos_inciertos = [];
      const frecuenciaIncierta = m.campos_inciertos.includes("frecuencia_horas");
      if (!m.frecuencia_horas && !frecuenciaIncierta) m.frecuencia_horas = 24;
    }
  }

  return json;
}
