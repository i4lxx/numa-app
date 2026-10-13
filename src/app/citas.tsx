import { useCallback, useState } from "react";
import {
  Alert,
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
  listarPersonas,
  Persona,
} from "../db/database";
import { cancelarNotificacion, programarRecordatoriosCita } from "../notificaciones";
import { crearEventoCalendario, eliminarEventoCalendario } from "../calendario";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";
import SelectorFechaHora from "../components/SelectorFechaHora";
import SelectorPersona from "../components/SelectorPersona";

export default function CitasScreen() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(""); // AAAA-MM-DD
  const [hora, setHora] = useState(""); // HH:MM
  const [notas, setNotas] = useState("");

  const cargar = useCallback(async () => {
    setCitas(await listarCitas());
    setPersonas(await listarPersonas());
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleAgregar() {
    if (!titulo.trim() || !fecha) {
      Alert.alert("Falta información", "Escribe el título y elige la fecha.");
      return;
    }

    const horaFinal = hora || "09:00";
    const persona = personas.find((p) => p.id === personaId) || null;
    const id = await agregarCita(titulo.trim(), fecha, hora, notas.trim(), personaId);
    const fechaHora = new Date(`${fecha}T${horaFinal}:00`);

    // Avisos: 12 h antes, 1 h antes y a la hora de la cita
    const ids = await programarRecordatoriosCita(titulo.trim(), fechaHora, persona?.nombre);
    if (ids) {
      await actualizarNotificacionCita(id, ids);
      registrarEvento("notificacion_programada", { tipo: "cita" });
    }

    // Evento en el calendario del celular (iPhone: app Calendario / iCloud)
    const eventoId = await crearEventoCalendario(
      persona ? `${persona.nombre}: ${titulo.trim()}` : titulo.trim(),
      fechaHora,
      notas.trim() || undefined
    );
    if (eventoId) await actualizarEventoCalendarioCita(id, eventoId);

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

  const formulario = (
    <View style={styles.form}>
      <SelectorPersona personas={personas} valor={personaId} onChange={setPersonaId} />
      <TextInput
        style={styles.input}
        placeholder="Título (ej. Dr. Ramírez)"
        placeholderTextColor="#666"
        value={titulo}
        onChangeText={setTitulo}
      />
      <SelectorFechaHora modo="fecha" valor={fecha} onChange={setFecha} placeholder="Elegir fecha" />
      <SelectorFechaHora modo="hora" valor={hora} onChange={setHora} placeholder="Elegir hora" />
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
      <Text style={styles.nota}>
        Numa te avisa 12 horas antes, 1 hora antes y a la hora de la cita.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="citas"
        titulo="📅 Citas"
        texto="Agrega tus citas eligiendo la fecha en el calendario y la hora en el reloj. Numa te avisa 12 horas antes, 1 hora antes y a la hora de la cita, y también la agrega a tu calendario del celular."
      />
      <FlatList
        data={citas}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={formulario}
        ListEmptyComponent={<Text style={styles.empty}>Aún no tienes citas guardadas</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.titulo}</Text>
              <Text style={styles.rowSubtitle}>
                {item.fecha} {item.hora ? `· ${item.hora}` : ""}
              </Text>
              {item.persona_nombre ? (
                <Text style={styles.rowPersona}>👤 {item.persona_nombre}</Text>
              ) : null}
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
  nota: { color: "#333", fontSize: 13, textAlign: "center", marginTop: 10 },
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
  rowPersona: { fontSize: 13, color: "#5B8DEF", marginTop: 3, fontWeight: "600" },
  deleteText: { color: "#E0708A", fontWeight: "600", fontSize: 13 },
});
