import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ---------- Voz ----------
// Si el usuario activa "Avisos con voz", Numa lee en voz alta el aviso
// (qué medicamento toca, qué cita viene) cuando la notificación llega con la
// app abierta, o cuando el usuario toca la notificación.

const CLAVE_VOZ = "numa_voz";
let vozCache: boolean | null = null;

export async function vozActivada(): Promise<boolean> {
  if (vozCache !== null) return vozCache;
  try {
    vozCache = (await AsyncStorage.getItem(CLAVE_VOZ)) === "1";
  } catch {
    vozCache = false;
  }
  return vozCache;
}

export async function guardarVoz(activa: boolean) {
  vozCache = activa;
  try {
    await AsyncStorage.setItem(CLAVE_VOZ, activa ? "1" : "0");
  } catch {}
}

export function hablar(texto: string) {
  try {
    Speech.stop();
    Speech.speak(texto, { language: "es-MX", rate: 0.9 });
  } catch {}
}

function limpiarParaVoz(texto: string) {
  return texto.replace(/[\p{Extended_Pictographic}️]/gu, "").replace(/\s+/g, " ").trim();
}

// Le dice al sistema cómo comportarse cuando llega una notificación
// mientras la app está abierta (mostrarla igual, con sonido y, si toca, con voz).
Notifications.setNotificationHandler({
  handleNotification: async (notificacion) => {
    const voz = notificacion.request.content.data?.voz;
    if (typeof voz === "string" && (await vozActivada())) hablar(voz);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/** Cuando el usuario TOCA una notificación, se lee en voz alta si la voz está activa. */
export function escucharToquesDeNotificacion() {
  return Notifications.addNotificationResponseReceivedListener(async (resp) => {
    const voz = resp.notification.request.content.data?.voz;
    if (typeof voz === "string" && (await vozActivada())) hablar(voz);
  });
}

// ---------- Permisos ----------

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === "android") {
    // Obligatorio en Android: sin esto, las notificaciones se bloquean en silencio
    await Notifications.setNotificationChannelAsync("default", {
      name: "Numa",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const actual = await Notifications.getPermissionsAsync();
  if (actual.status === "granted") return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === "granted";
}

// ---------- Programar / cancelar ----------

/**
 * Programa una notificación para una fecha exacta en el futuro.
 * Regresa el id de la notificación (para poder cancelarla despues),
 * o null si la fecha ya pasó (no tiene caso programarla).
 * `vozTexto` es lo que se dirá en voz alta (si el usuario activó la voz).
 */
export async function programarNotificacion(
  titulo: string,
  cuerpo: string,
  fecha: Date,
  vozTexto?: string
): Promise<string | null> {
  if (fecha.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      sound: true,
      data: { voz: vozTexto || limpiarParaVoz(`${titulo}. ${cuerpo}`) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fecha,
    },
  });
  return id;
}

/**
 * Avisos de una cita: 12 horas antes, 1 hora antes y a la hora de la cita.
 * Los que ya pasaron se omiten. Regresa los ids separados por coma (o null).
 */
export async function programarRecordatoriosCita(
  titulo: string,
  fechaHora: Date,
  personaNombre?: string | null
): Promise<string | null> {
  const quien = personaNombre ? ` (${personaNombre})` : "";
  const horaTxt = fechaHora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const avisos = [
    { horas: 12, titulo: "📅 Cita en 12 horas", voz: "Tienes una cita en doce horas" },
    { horas: 1, titulo: "📅 Cita en 1 hora", voz: "Tienes una cita en una hora" },
    { horas: 0, titulo: "📅 Es la hora de tu cita", voz: "Es la hora de tu cita" },
  ];

  const ids: string[] = [];
  for (const a of avisos) {
    const cuando = new Date(fechaHora.getTime() - a.horas * 60 * 60 * 1000);
    const id = await programarNotificacion(
      a.titulo,
      `${titulo}${quien} · ${horaTxt}`,
      cuando,
      `${a.voz}${personaNombre ? ` de ${personaNombre}` : ""}: ${limpiarParaVoz(titulo)}`
    );
    if (id) ids.push(id);
  }
  return ids.length ? ids.join(",") : null;
}

/** Aviso de la próxima toma de un medicamento (con voz: "Es hora de que tomes ..."). */
export async function programarMedicamento(
  nombre: string,
  dosis: string | null | undefined,
  personaNombre: string | null | undefined,
  fecha: Date
): Promise<string | null> {
  const detalle = `${nombre}${dosis ? ` (${dosis})` : ""}`;
  const cuerpo = personaNombre ? `${personaNombre}: ${detalle}` : detalle;
  const voz = `Es hora de que ${personaNombre ? `${personaNombre} tome` : "tomes"} ${nombre}${
    dosis ? `, ${dosis}` : ""
  }`;
  return programarNotificacion("💊 Hora de tu medicamento", cuerpo, fecha, voz);
}

/** Cancela una o varias notificaciones (ids separados por coma). No truena si ya no existen. */
export async function cancelarNotificacion(id: string | null | undefined) {
  if (!id) return;
  for (const uno of id.split(",")) {
    try {
      await Notifications.cancelScheduledNotificationAsync(uno);
    } catch (e) {
      // ya no existía o ya se disparó, no pasa nada
    }
  }
}
