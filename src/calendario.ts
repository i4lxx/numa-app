import * as Calendar from "expo-calendar/legacy";
import { Platform } from "react-native";

export async function pedirPermisoCalendario(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

type InfoCalendario = { id: string; nombre: string; fuente: string };

/**
 * Busca un calendario donde se puedan escribir eventos.
 * - iPhone: usa el calendario predeterminado (el que ya sincroniza con iCloud
 *   y con tu app Calendario); si no hay, uno de iCloud; si no, el primero editable.
 * - Android: prefiere el de Google; si no, el primero editable.
 */
export async function obtenerCalendarioInfo(): Promise<InfoCalendario | null> {
  const calendarios = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const editables = calendarios.filter((c) => c.allowsModifications);
  const info = (c: (typeof editables)[number]): InfoCalendario => ({
    id: c.id,
    nombre: c.title,
    fuente: c.source?.name || "desconocida",
  });

  if (Platform.OS === "ios") {
    try {
      const predeterminado = await Calendar.getDefaultCalendarAsync();
      if (predeterminado?.allowsModifications) return info(predeterminado);
    } catch {
      // seguimos con la búsqueda manual
    }
    const icloud = editables.find((c) => c.source?.name?.toLowerCase().includes("icloud"));
    if (icloud) return info(icloud);
  } else {
    const deGoogle = editables.find(
      (c) => c.source?.name?.toLowerCase().includes("google") || c.source?.type === "com.google"
    );
    if (deGoogle) return info(deGoogle);
  }

  return editables.length ? info(editables[0]) : null;
}

export async function obtenerCalendarioId(): Promise<string | null> {
  return (await obtenerCalendarioInfo())?.id || null;
}

/**
 * Crea un evento en el calendario del celular (con alertas 12 h y 1 h antes).
 * Regresa el id del evento (para poder borrarlo despues), o null si no hay
 * permiso/calendario o algo falló (nunca truena: la cita se guarda igual).
 */
export async function crearEventoCalendario(
  titulo: string,
  fechaHoraInicio: Date,
  notas?: string
): Promise<string | null> {
  try {
    const tienePermiso = await pedirPermisoCalendario();
    if (!tienePermiso) return null;

    const calendarioId = await obtenerCalendarioId();
    if (!calendarioId) return null;

    const fechaHoraFin = new Date(fechaHoraInicio.getTime() + 60 * 60 * 1000); // 1 hora de duración

    return await Calendar.createEventAsync(calendarioId, {
      title: titulo,
      startDate: fechaHoraInicio,
      endDate: fechaHoraFin,
      notes: notas || undefined,
      alarms: [{ relativeOffset: -720 }, { relativeOffset: -60 }],
      timeZone: Platform.OS === "android" ? undefined : "America/Mexico_City",
    });
  } catch (e) {
    console.warn("No se pudo crear el evento en el calendario:", e);
    return null;
  }
}

export async function eliminarEventoCalendario(id: string | null | undefined) {
  if (!id) return;
  try {
    await Calendar.deleteEventAsync(id);
  } catch {
    // ya no existía, no pasa nada
  }
}
