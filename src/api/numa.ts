// Cliente para hablar con el backend de Numa (Render)

const BASE_URL = "https://numa-7gz3.onrender.com";

// ⚠️ IMPORTANTE: pon aquí EXACTAMENTE la misma clave que pusiste
// en APP_API_KEY en tu .env y en Render
const API_KEY = "numa2026clave-secreta-xyz";

async function llamarApi(path: string, body: unknown) {
  const respuesta = await fetch(`${BASE_URL}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => "");
    throw new Error(`Error del servidor (${respuesta.status}): ${texto}`);
  }

  return respuesta.json();
}

// ---------- Chat / mensajes de texto ----------

export type DatosEvento = {
  categoria: "otro" | "evento_familiar" | "cita_medica" | "evento_personal" | "recordatorio_llamada";
  titulo?: string;
  fecha?: string;
  hora?: string;
  persona?: string;
  detalle?: string;
};

export async function clasificarMensaje(texto: string): Promise<DatosEvento> {
  const res = await llamarApi("/mensaje", { texto });
  return res.datos;
}

export async function confirmarEvento(tipo: string, datos: DatosEvento) {
  return llamarApi("/confirmar-evento", { tipo, datos });
}

// ---------- Recetas (fotos) ----------

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

export async function leerRecetaFoto(imageBase64: string): Promise<DatosReceta> {
  const res = await llamarApi("/receta", { imageBase64 });
  return res.datos;
}

export async function confirmarReceta(
  medicamentos: MedicamentoDetectado[],
  doctor?: string,
  fechaReceta?: string
) {
  return llamarApi("/confirmar-receta", {
    medicamentos,
    doctor,
    fecha_receta: fechaReceta,
  });
}
