import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Le dice al sistema cómo comportarse cuando llega una notificación
// mientras la app está abierta (mostrarla igual, con sonido).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

/**
 * Programa una notificación para una fecha exacta en el futuro.
 * Regresa el id de la notificación (para poder cancelarla despues),
 * o null si la fecha ya pasó (no tiene caso programarla).
 */
export async function programarNotificacion(
  titulo: string,
  cuerpo: string,
  fecha: Date
): Promise<string | null> {
  if (fecha.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fecha,
    },
  });
  return id;
}

/** Cancela una notificación programada, si existe. No truena si ya no existe. */
export async function cancelarNotificacion(id: string | null | undefined) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    // ya no existía o ya se disparó, no pasa nada
  }
}
