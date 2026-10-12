import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  actualizarNotificacionMedicamento,
  listarMedicamentos,
  Medicamento,
  registrarToma,
  ultimaTomaDe,
} from "../db/database";
import { cancelarNotificacion, programarNotificacion } from "../notificaciones";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";

type Fila = Medicamento & { ultimaToma: string | null };

function formatearFechaHora(iso: string) {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SeguimientoScreen() {
  const [filas, setFilas] = useState<Fila[]>([]);

  const cargar = useCallback(async () => {
    const meds = await listarMedicamentos();
    const conUltimaToma = await Promise.all(
      meds.map(async (m) => {
        const ultima = await ultimaTomaDe(m.id);
        return { ...m, ultimaToma: ultima ? ultima.fecha_hora : null };
      })
    );
    setFilas(conUltimaToma);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleTomado(med: Fila) {
    await registrarToma(med.id, med.nombre);

    // Cancela el aviso pendiente y programa el de la siguiente dosis
    await cancelarNotificacion(med.notification_id);
    const proximaToma = new Date(Date.now() + med.frecuencia_horas * 60 * 60 * 1000);
    const notifId = await programarNotificacion(
      "💊 Hora de tu medicamento",
      `${med.nombre}${med.dosis ? ` (${med.dosis})` : ""}`,
      proximaToma
    );
    await actualizarNotificacionMedicamento(med.id, notifId);

    registrarEvento("toma_registrada", { medicamento: med.nombre });
    if (notifId) registrarEvento("notificacion_programada", { tipo: "medicamento" });

    cargar();
  }

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="seguimiento"
        titulo="📈 Seguimiento"
        texto="Cada vez que tomes un medicamento, toca '✅ Tomado' aquí. Numa registra la hora exacta y reprograma tu siguiente aviso automáticamente a partir de ese momento."
      />
      <FlatList
        data={filas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aún no tienes medicamentos para dar seguimiento
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>💊 {item.nombre}</Text>
              <Text style={styles.detalle}>
                {item.dosis ? `${item.dosis} · ` : ""}cada {item.frecuencia_horas}h
              </Text>
              <Text style={styles.ultima}>
                {item.ultimaToma
                  ? `Última toma: ${formatearFechaHora(item.ultimaToma)}`
                  : "Sin tomas registradas"}
              </Text>
            </View>
            <Pressable style={styles.tomarButton} onPress={() => handleTomado(item)}>
              <Text style={styles.tomarText}>✅ Tomado</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  empty: { textAlign: "center", color: "#222", marginTop: 20, fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  nombre: { fontSize: 16, fontWeight: "600", color: "#222" },
  detalle: { fontSize: 15, color: "#333", marginTop: 2 },
  ultima: { fontSize: 12, color: "#B07CD8", marginTop: 4 },
  tomarButton: {
    backgroundColor: "#4CAF93",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tomarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
