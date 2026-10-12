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
  actualizarNotificacionMedicamento,
  agregarMedicamento,
  eliminarMedicamento,
  listarMedicamentos,
  Medicamento,
} from "../db/database";
import { cancelarNotificacion, programarNotificacion } from "../notificaciones";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";

export default function MedicamentosScreen() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [nombre, setNombre] = useState("");
  const [dosis, setDosis] = useState("");
  const [frecuencia, setFrecuencia] = useState("");

  const cargar = useCallback(async () => {
    const datos = await listarMedicamentos();
    setMedicamentos(datos);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleAgregar() {
    if (!nombre.trim() || !frecuencia.trim()) return;
    const frecuenciaHoras = parseInt(frecuencia, 10) || 24;

    const id = await agregarMedicamento(nombre.trim(), dosis.trim(), frecuenciaHoras);

    // Programa el aviso de la primera próxima toma, a partir de ahora
    const proximaToma = new Date(Date.now() + frecuenciaHoras * 60 * 60 * 1000);
    const notifId = await programarNotificacion(
      "💊 Hora de tu medicamento",
      `${nombre.trim()}${dosis.trim() ? ` (${dosis.trim()})` : ""}`,
      proximaToma
    );
    if (notifId) {
      await actualizarNotificacionMedicamento(id, notifId);
      registrarEvento("notificacion_programada", { tipo: "medicamento" });
    }
    registrarEvento("medicamento_agregado");

    setNombre("");
    setDosis("");
    setFrecuencia("");
    cargar();
  }

  async function handleEliminar(item: Medicamento) {
    await cancelarNotificacion(item.notification_id);
    await eliminarMedicamento(item.id);
    cargar();
  }

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="medicamentos"
        titulo="💊 Administrar medicamentos"
        texto="Aquí agregas cada medicamento con su nombre, dosis y cada cuántas horas se toma. Numa te va a avisar solo cuando toque la siguiente dosis. Para borrar uno, toca 'Eliminar' en la lista."
      />
      <Text style={styles.title}>Administrar medicamentos</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre (ej. Paracetamol)"
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
        />
        <TextInput
          style={styles.input}
          placeholder="Dosis (ej. 500mg)"
          placeholderTextColor="#666"
          value={dosis}
          onChangeText={setDosis}
        />
        <TextInput
          style={styles.input}
          placeholder="Cada cuántas horas (ej. 8)"
          placeholderTextColor="#666"
          value={frecuencia}
          onChangeText={setFrecuencia}
          keyboardType="numeric"
        />
        <Pressable style={styles.addButton} onPress={handleAgregar}>
          <Text style={styles.addButtonText}>+ Agregar medicamento</Text>
        </Pressable>
      </View>

      <FlatList
        data={medicamentos}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no tienes medicamentos guardados</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.nombre}</Text>
              <Text style={styles.rowSubtitle}>
                {item.dosis ? `${item.dosis} · ` : ""}cada {item.frecuencia_horas}h
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
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 20,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
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
    backgroundColor: "#5B8DEF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  empty: {
    textAlign: "center",
    color: "#222",
    marginTop: 20,
  },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  rowSubtitle: {
    fontSize: 13,
    color: "#333",
    marginTop: 2,
  },
  deleteText: {
    color: "#E0708A",
    fontWeight: "600",
    fontSize: 13,
  },
});
