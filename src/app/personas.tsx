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
  agregarPersona,
  eliminarPersona,
  listarCitas,
  listarMedicamentos,
  listarPersonas,
  Persona,
} from "../db/database";
import { cancelarNotificacion } from "../notificaciones";
import { eliminarEventoCalendario } from "../calendario";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";

export default function PersonasScreen() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [nombre, setNombre] = useState("");

  const cargar = useCallback(async () => {
    setPersonas(await listarPersonas());
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleAgregar() {
    if (!nombre.trim()) return;
    await agregarPersona(nombre.trim());
    registrarEvento("persona_agregada");
    setNombre("");
    cargar();
  }

  function handleEliminar(p: Persona) {
    Alert.alert(
      `¿Quitar a ${p.nombre}?`,
      "También se borrarán sus medicamentos y citas, y sus avisos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            // Limpia avisos y eventos de calendario antes de borrar
            for (const m of await listarMedicamentos()) {
              if (m.persona_id === p.id) await cancelarNotificacion(m.notification_id);
            }
            for (const c of await listarCitas()) {
              if (c.persona_id === p.id) {
                await cancelarNotificacion(c.notification_id);
                await eliminarEventoCalendario(c.calendario_evento_id);
              }
            }
            await eliminarPersona(p.id);
            cargar();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="personas"
        titulo="👥 Personas a cargo"
        texto="Si cuidas a alguien (tu mamá, tu abuelo...), agrégalo aquí. Después, al crear un medicamento o una cita, eliges para quién es. Los avisos dirán su nombre para que sepas a quién le toca."
      />
      <Text style={styles.title}>Personas a cargo</Text>
      <Text style={styles.help}>Agrega a la persona que cuidas y administra sus medicamentos y citas.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre (ej. Mamá, Abuelo Juan)"
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
        />
        <Pressable style={styles.addButton} onPress={handleAgregar}>
          <Text style={styles.addButtonText}>+ Agregar persona</Text>
        </Pressable>
      </View>

      <FlatList
        data={personas}
        keyExtractor={(p) => String(p.id)}
        ListEmptyComponent={<Text style={styles.empty}>Aún no tienes personas a cargo</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>👤 {item.nombre}</Text>
            <Pressable onPress={() => handleEliminar(item)}>
              <Text style={styles.deleteText}>Quitar</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", paddingTop: 20, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#222", marginBottom: 6 },
  help: { fontSize: 15, color: "#333", marginBottom: 16, lineHeight: 21 },
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
  addButton: { backgroundColor: "#6C63FF", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { textAlign: "center", color: "#222", marginTop: 20, fontSize: 16 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: "#222" },
  deleteText: { color: "#E0708A", fontWeight: "600", fontSize: 13 },
});
