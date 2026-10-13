import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Calendar from "expo-calendar/legacy";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  actualizarNotificacionCita,
  actualizarNotificacionMedicamento,
  agregarCita,
  agregarMedicamento,
  agregarPersona,
  borrarTodo,
  cambiarTipoUsuario,
  hoyLocal,
  listarCitas,
  listarPersonas,
  obtenerPerfil,
  TipoUsuario,
} from "../db/database";
import {
  hablar,
  programarMedicamento,
  programarNotificacion,
  programarRecordatoriosCita,
  vozActivada,
} from "../notificaciones";
import {
  crearEventoCalendario,
  eliminarEventoCalendario,
  obtenerCalendarioInfo,
} from "../calendario";
import { registrarEvento } from "../analytics";
import { activarAdmin } from "../admin";

const TIPOS: TipoUsuario[] = ["estudiante", "adulto", "adulto_mayor", "cuidador"];

function Boton({ texto, onPress, peligro }: { texto: string; onPress: () => void; peligro?: boolean }) {
  return (
    <Pressable style={[styles.boton, peligro && styles.botonPeligro]} onPress={onPress}>
      <Text style={[styles.botonTexto, peligro && { color: "#fff" }]}>{texto}</Text>
    </Pressable>
  );
}

function cuandoSeDispara(trigger: any): string {
  if (!trigger) return "?";
  let ms: number | null = null;
  if (typeof trigger.value === "number") ms = trigger.value; // Android
  else if (trigger.date) ms = new Date(trigger.date).getTime();
  else if (trigger.dateComponents) {
    const c = trigger.dateComponents; // iPhone
    ms = new Date(c.year, (c.month || 1) - 1, c.day, c.hour || 0, c.minute || 0, c.second || 0).getTime();
  }
  if (ms === null || isNaN(ms)) return "sin fecha";
  return new Date(ms).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fechaLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function AdminScreen() {
  const router = useRouter();
  const [log, setLog] = useState<string[]>([]);
  const [eventoPrueba, setEventoPrueba] = useState<string | null>(null);

  function anotar(linea: string) {
    const hora = new Date().toLocaleTimeString("es-MX");
    setLog((prev) => [`${hora}  ${linea}`, ...prev].slice(0, 40));
  }

  // ---------- Estado ----------
  async function verEstado() {
    const notif = await Notifications.getPermissionsAsync();
    const cal = await Calendar.getCalendarPermissionsAsync();
    const info = cal.status === "granted" ? await obtenerCalendarioInfo() : null;
    const perfil = await obtenerPerfil();
    anotar(`Notificaciones: ${notif.status} · Calendario: ${cal.status}`);
    anotar(
      info
        ? `Calendario elegido: "${info.nombre}" (${info.fuente})`
        : "Calendario elegido: ninguno (¿permiso?)"
    );
    anotar(`Voz: ${(await vozActivada()) ? "activada" : "apagada"} · Perfil: ${perfil?.tipo_usuario || "-"}`);
    anotar(
      `Canal: ${Updates.channel || "-"} · Runtime: ${Updates.runtimeVersion || "-"} · Update: ${
        Updates.updateId ? Updates.updateId.slice(0, 8) : "embebido"
      }`
    );
  }

  // ---------- Notificaciones ----------
  async function probarAviso(conVoz: boolean) {
    const id = await programarNotificacion(
      "🧪 Aviso de prueba",
      conVoz ? "Paracetamol (500mg)" : "Si ves esto, las notificaciones funcionan",
      new Date(Date.now() + 5000),
      conVoz ? "Es hora de que tomes Paracetamol, quinientos miligramos" : undefined
    );
    anotar(
      id
        ? `Aviso programado en 5 s${conVoz ? " (habla solo si activaste la voz en Ajustes)" : ""}. Si quieres ver el banner, deja la app abierta o bloquea el teléfono.`
        : "No se pudo programar"
    );
  }

  async function probarRecordatorio12h() {
    // Cita ficticia a 12 h + 20 s: el aviso de "12 horas antes" suena en ~20 s
    const cita = new Date(Date.now() + 12 * 60 * 60 * 1000 + 20 * 1000);
    const ids = await programarRecordatoriosCita("Cita de prueba", cita, null);
    const n = ids ? ids.split(",").length : 0;
    anotar(`Cita de prueba para ${cita.toLocaleString("es-MX")}: ${n} avisos programados.`);
    anotar("El de 12 horas debe sonar en unos 20 segundos. Los de 1 h y a la hora quedan en la lista.");
  }

  async function verProgramadas() {
    const todas = await Notifications.getAllScheduledNotificationsAsync();
    anotar(`Notificaciones programadas: ${todas.length}`);
    todas
      .map((n) => ({ t: n.content.title, c: n.content.body, cuando: cuandoSeDispara(n.trigger) }))
      .slice(0, 15)
      .forEach((n) => anotar(`• ${n.cuando} — ${n.t} · ${n.c}`));
  }

  async function cancelarTodas() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    anotar("Todas las notificaciones programadas fueron canceladas.");
  }

  // ---------- Voz ----------
  function probarVoz() {
    hablar("Hola, soy Numa. Es hora de que tomes tu medicamento.");
    anotar("Voz de prueba reproducida (si no se oye, revisa el volumen y el modo silencio).");
  }

  // ---------- Calendario ----------
  async function crearEventoDePrueba() {
    const id = await crearEventoCalendario(
      "Numa: evento de prueba",
      new Date(Date.now() + 60 * 60 * 1000),
      "Creado desde el modo administrador"
    );
    setEventoPrueba(id);
    anotar(id ? `Evento creado en tu calendario (id ${id}). Ábrelo en la app Calendario.` : "No se pudo crear (revisa el permiso de Calendario).");
  }

  async function borrarEventoDePrueba() {
    await eliminarEventoCalendario(eventoPrueba);
    anotar(eventoPrueba ? "Evento de prueba borrado." : "No hay evento de prueba.");
    setEventoPrueba(null);
  }

  // ---------- Datos ----------
  async function cargarEjemplos() {
    let personas = await listarPersonas();
    let mama = personas.find((p) => p.nombre === "Mamá");
    if (!mama) {
      const id = await agregarPersona("Mamá");
      mama = { id, nombre: "Mamá", creado_en: "" };
    }

    const med1 = await agregarMedicamento("Paracetamol", "500mg", 8, null);
    await actualizarNotificacionMedicamento(
      med1,
      await programarMedicamento("Paracetamol", "500mg", null, new Date(Date.now() + 8 * 3600 * 1000))
    );
    const med2 = await agregarMedicamento("Losartán", "50mg", 12, mama.id);
    await actualizarNotificacionMedicamento(
      med2,
      await programarMedicamento("Losartán", "50mg", "Mamá", new Date(Date.now() + 12 * 3600 * 1000))
    );

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const enTres = new Date();
    enTres.setDate(enTres.getDate() + 3);

    const casos = [
      { titulo: "Dr. Ramírez (cardiólogo)", dia: manana, hora: "10:00", persona: mama },
      { titulo: "Cita dental", dia: enTres, hora: "17:30", persona: null },
    ];
    for (const c of casos) {
      const id = await agregarCita(c.titulo, fechaLocal(c.dia), c.hora, "Cita de ejemplo", c.persona?.id ?? null);
      const fh = new Date(`${fechaLocal(c.dia)}T${c.hora}:00`);
      await actualizarNotificacionCita(id, await programarRecordatoriosCita(c.titulo, fh, c.persona?.nombre));
    }
    anotar("Datos de ejemplo cargados: 2 medicamentos, 2 citas y la persona Mamá.");
  }

  async function cambiarTipo(t: TipoUsuario) {
    await cambiarTipoUsuario(t);
    anotar(`Perfil cambiado a: ${t}. Vuelve al inicio para ver cómo cambia.`);
  }

  function probarAnalytics() {
    registrarEvento("admin_prueba", { momento: new Date().toISOString() });
    anotar("Evento 'admin_prueba' enviado a PostHog.");
  }

  function restablecer() {
    Alert.alert(
      "¿Borrar todo?",
      "Se borran perfil, medicamentos, citas, avisos y los eventos de calendario creados por Numa. La app vuelve a empezar desde el principio.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: async () => {
            for (const c of await listarCitas()) await eliminarEventoCalendario(c.calendario_evento_id);
            await eliminarEventoCalendario(eventoPrueba);
            await Notifications.cancelAllScheduledNotificationsAsync();
            await borrarTodo();
            // Las ventanitas de ayuda vuelven a salir como la primera vez
            const claves = await AsyncStorage.getAllKeys();
            await AsyncStorage.multiRemove(claves.filter((k) => k.startsWith("ayuda_vista_")));
            router.replace("/onboarding");
          },
        },
      ]
    );
  }

  async function salirDeAdmin() {
    await activarAdmin(false);
    router.replace("/");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.titulo}>🧪 Modo administrador</Text>
      <Text style={styles.sub}>Herramientas para probar todo sin esperar. Hoy local: {hoyLocal()}</Text>

      <Text style={styles.seccion}>Estado</Text>
      <Boton texto="Ver permisos, calendario y versión" onPress={verEstado} />

      <Text style={styles.seccion}>Avisos</Text>
      <Boton texto="🔔 Aviso de prueba en 5 s" onPress={() => probarAviso(false)} />
      <Boton texto="🔔 Aviso de medicamento en 5 s (con voz)" onPress={() => probarAviso(true)} />
      <Boton texto="⏰ Probar recordatorio de 12 h antes" onPress={probarRecordatorio12h} />
      <Boton texto="📋 Ver avisos programados" onPress={verProgramadas} />
      <Boton texto="🧹 Cancelar todos los avisos" onPress={cancelarTodas} />

      <Text style={styles.seccion}>Voz y calendario</Text>
      <Boton texto="🗣️ Probar voz ahora" onPress={probarVoz} />
      <Boton texto="📅 Crear evento de prueba (en 1 h)" onPress={crearEventoDePrueba} />
      <Boton texto="🗑️ Borrar evento de prueba" onPress={borrarEventoDePrueba} />

      <Text style={styles.seccion}>Datos y perfil</Text>
      <Boton texto="📦 Cargar datos de ejemplo" onPress={cargarEjemplos} />
      <View style={styles.fila}>
        {TIPOS.map((t) => (
          <Pressable key={t} style={styles.ficha} onPress={() => cambiarTipo(t)}>
            <Text style={styles.fichaTexto}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Boton texto="📊 Enviar evento de prueba a PostHog" onPress={probarAnalytics} />
      <Boton texto="♻️ Borrar todo y empezar de cero" onPress={restablecer} peligro />
      <Boton texto="Salir del modo administrador" onPress={salirDeAdmin} />

      <Text style={styles.seccion}>Resultados</Text>
      <View style={styles.logBox}>
        {log.length === 0 ? (
          <Text style={styles.logVacio}>Aquí aparece lo que va pasando.</Text>
        ) : (
          log.map((l, i) => (
            <Text key={i} style={styles.logLinea}>
              {l}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  titulo: { fontSize: 24, fontWeight: "700", color: "#222" },
  sub: { fontSize: 14, color: "#333", marginTop: 4, marginBottom: 6 },
  seccion: { fontSize: 14, fontWeight: "700", color: "#222", textTransform: "uppercase", marginTop: 22, marginBottom: 8 },
  boton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#C9D6F5",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  botonPeligro: { backgroundColor: "#E0708A", borderColor: "#E0708A" },
  botonTexto: { color: "#222", fontSize: 15, fontWeight: "600" },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  ficha: { borderWidth: 1, borderColor: "#C9D6F5", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#EEF3FF" },
  fichaTexto: { color: "#333", fontSize: 13, fontWeight: "600" },
  logBox: { backgroundColor: "#222", borderRadius: 12, padding: 12, minHeight: 80 },
  logVacio: { color: "#aaa", fontSize: 13 },
  logLinea: { color: "#E8F0FF", fontSize: 12.5, marginBottom: 6, lineHeight: 17 },
});
