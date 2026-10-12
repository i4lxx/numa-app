import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  actualizarEventoCalendarioCita,
  actualizarNotificacionCita,
  agregarCita,
  Cita,
  eliminarCita,
  listarCitas,
} from "../db/database";
import { cancelarNotificacion, programarNotificacion } from "../notificaciones";
import { crearEventoCalendario, eliminarEventoCalendario } from "../calendario";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";

export default function CitasScreen() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(""); // YYYY-MM-DD
  const [hora, setHora] = useState(""); // HH:MM
  const [notas, setNotas] = useState("");

  const cargar = useCallback(async () => {
    setCitas(await listarCitas());
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleAgregar() {
    if (!titulo.trim() || !fecha.trim()) return;

    const id = await agregarCita(titulo.trim(), fecha.trim(), hora.trim(), notas.trim());

    if (fecha.trim()) {
      const fechaHora = new Date(`${fecha.trim()}T${hora.trim() || "09:00"}:00`);
      const notifId = await programarNotificacion(
        "📅 Cita próxima",
        `${titulo.trim()}${hora.trim() ? ` a las ${hora.trim()}` : ""}`,
        fechaHora
      );
      if (notifId) {
        await actualizarNotificacionCita(id, notifId);
        registrarEvento("notificacion_programada", { tipo: "cita" });
      }

      const eventoId = await crearEventoCalendario(
        titulo.trim(),
        fechaHora,
        notas.trim() || undefined
      );
      if (eventoId) await actualizarEventoCalendarioCita(id, eventoId);
    }

    registrarEvento("cita_agregada");
    setTitulo("");
    setFecha("");
    setHora("");
    setNotas("");
    cargar();
  }

  async function handleEliminar(item: Cita) {
    await cancelarNotificacion(item.notification_id);
    await eliminarEventoCalendario(item.calendario_evento_id);
    await eliminarCita(item.id);
    cargar();
  }

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="citas"
        titulo="📅 Citas"
        texto="Agrega tus citas con título, fecha y hora. Numa te manda un aviso antes de que llegue, y también la agrega a tu calendario del celular automáticamente."
      />
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Título (ej. Dr. Ramírez)"
          placeholderTextColor="#666"
          value={titulo}
          onChangeText={setTitulo}
        />
        <TextInput
          style={styles.input}
          placeholder="Fecha (AAAA-MM-DD, ej. 2026-09-15)"
          placeholderTextColor="#666"
          value={fecha}
          onChangeText={setFecha}
        />
        <TextInput
          style={styles.input}
          placeholder="Hora (HH:MM, ej. 17:30)"
          placeholderTextColor="#666"
          value={hora}
          onChangeText={setHora}
        />
        <TextInput
          style={styles.input}
          placeholder="Notas (opcional)"
          placeholderTextColor="#666"
          value={notas}
          onChangeText={setNotas}
        />
        <Pressable style={styles.addButton} onPress={handleAgregar}>
          <Text style={styles.addButtonText}>+ Agregar cita</Text>
        </Pressable>
      </View>

      <FlatList
        data={citas}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no tienes citas guardadas</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.titulo}</Text>
              <Text style={styles.rowSubtitle}>
                {item.fecha} {item.hora ? `· ${item.hora}` : ""}
              </Text>
            </View>
            <Pressable onPress={() => handleEliminar(item)}>
              <Text style={styles.deleteText}>Eliminar</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", paddingTop: 20, paddingHorizontal: 20 },
  form: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: "#4CAF93",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  list: { flex: 1 },
  empty: { textAlign: "center", color: "#222", marginTop: 20, fontSize: 16 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: "#222" },
  rowSubtitle: { fontSize: 15, color: "#333", marginTop: 2 },
  deleteText: { color: "#E0708A", fontWeight: "600", fontSize: 13 },
});
