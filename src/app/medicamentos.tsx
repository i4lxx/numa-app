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
  listarPersonas,
  Medicamento,
  Persona,
} from "../db/database";
import { cancelarNotificacion, programarMedicamento } from "../notificaciones";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";
import SelectorPersona from "../components/SelectorPersona";

export default function MedicamentosScreen() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [dosis, setDosis] = useState("");
  const [frecuencia, setFrecuencia] = useState("");

  const cargar = useCallback(async () => {
    setMedicamentos(await listarMedicamentos());
    setPersonas(await listarPersonas());
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleAgregar() {
    if (!nombre.trim() || !frecuencia.trim()) return;
    const frecuenciaHoras = parseInt(frecuencia, 10) || 24;
    const persona = personas.find((p) => p.id === personaId) || null;

    const id = await agregarMedicamento(nombre.trim(), dosis.trim(), frecuenciaHoras, personaId);

    // Programa el aviso de la primera próxima toma, a partir de ahora
    const proximaToma = new Date(Date.now() + frecuenciaHoras * 60 * 60 * 1000);
    const notifId = await programarMedicamento(
      nombre.trim(),
      dosis.trim(),
      persona?.nombre,
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

  const formulario = (
    <>
      <Text style={styles.title}>Administrar medicamentos</Text>
      <View style={styles.form}>
        <SelectorPersona personas={personas} valor={personaId} onChange={setPersonaId} />
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
    </>
  );

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="medicamentos"
        titulo="💊 Administrar medicamentos"
        texto="Aquí agregas cada medicamento con su nombre, dosis y cada cuántas horas se toma. Numa te va a avisar solo cuando toque la siguiente dosis (y puede decirte en voz alta qué medicamento es, desde Ajustes). Para borrar uno, toca 'Eliminar' en la lista."
      />
      <FlatList
        data={medicamentos}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={formulario}
        ListEmptyComponent={<Text style={styles.empty}>Aún no tienes medicamentos guardados</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.nombre}</Text>
              <Text style={styles.rowSubtitle}>
                {item.dosis ? `${item.dosis} · ` : ""}cada {item.frecuencia_horas}h
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
  title: { fontSize: 24, fontWeight: "700", color: "#222", marginBottom: 20 },
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
    backgroundColor: "#5B8DEF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { textAlign: "center", color: "#222", marginTop: 20 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: "#222" },
  rowSubtitle: { fontSize: 13, color: "#333", marginTop: 2 },
  rowPersona: { fontSize: 13, color: "#5B8DEF", marginTop: 3, fontWeight: "600" },
  deleteText: { color: "#E0708A", fontWeight: "600", fontSize: 13 },
});
