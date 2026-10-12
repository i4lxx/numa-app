import * as Calendar from "expo-calendar/legacy";
import { Platform } from "react-native";

export async function pedirPermisoCalendario(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

/**
 * Busca un calendario donde se puedan escribir eventos. Si el celular tiene
 * una cuenta de Google agregada, prefiere ese calendario (para que los
 * eventos se sincronicen solos con Google Calendar). Si no encuentra uno de
 * Google, usa el primer calendario editable que encuentre.
 */
export async function obtenerCalendarioId(): Promise<string | null> {
  const calendarios = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const editables = calendarios.filter((c) => c.allowsModifications);

  if (editables.length === 0) return null;

  const deGoogle = editables.find(
    (c) => c.source?.name?.toLowerCase().includes("google") || c.source?.type === "com.google"
  );

  return (deGoogle || editables[0]).id;
}

/**
 * Crea un evento en el calendario del celular. Regresa el id del evento
 * (para poder borrarlo despues), o null si no hay permiso/calendario.
 */
export async function crearEventoCalendario(
  titulo: string,
  fechaHoraInicio: Date,
  notas?: string
): Promise<string | null> {
  const tienePermiso = await pedirPermisoCalendario();
  if (!tienePermiso) return null;

  const calendarioId = await obtenerCalendarioId();
  if (!calendarioId) return null;

  const fechaHoraFin = new Date(fechaHoraInicio.getTime() + 60 * 60 * 1000); // 1 hora de duración

  const eventoId = await Calendar.createEventAsync(calendarioId, {
    title: titulo,
    startDate: fechaHoraInicio,
    endDate: fechaHoraFin,
    notes: notas || undefined,
    timeZone: Platform.OS === "android" ? undefined : "America/Mexico_City",
  });

  return eventoId;
}

export async function eliminarEventoCalendario(id: string | null | undefined) {
  if (!id) return;
  try {
    await Calendar.deleteEventAsync(id);
  } catch {
    // ya no existía, no pasa nada
  }
}
