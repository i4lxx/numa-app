// Chat general de Numa (preguntas del tipo "¿para qué sirve tal medicamento?",
// "necesito investigar tal cosa"). Usa una clave de Gemini COMPARTIDA que vive
// a salvo en un Worker de Cloudflare — la app nunca ve esa clave directamente.

// ⚠️ Pon aquí la URL de tu Worker (la que copiaste al hacer Deploy)
const WORKER_URL = "https://numachat.holasoyale4.workers.dev";

export type MensajeHistorial = { autor: "user" | "numa"; texto: string };

export async function preguntarNuma(
  texto: string,
  historial: MensajeHistorial[] = []
): Promise<string> {
  const respuesta = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, historial }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`No se pudo responder (${respuesta.status}): ${detalle.slice(0, 150)}`);
  }

  const datos = await respuesta.json();
  if (!datos.respuesta) throw new Error("Numa no regresó ninguna respuesta");
  return datos.respuesta;
}
