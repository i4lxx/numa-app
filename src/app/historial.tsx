import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Cita, listarCitasPasadas, listarTomas, Toma } from "../db/database";
import Ayuda from "../components/Ayuda";

type Evento =
  | { tipo: "toma"; fecha: string; data: Toma }
  | { tipo: "cita"; fecha: string; data: Cita };

function formatearFechaHora(iso: string) {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistorialScreen() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [tomas, citas] = await Promise.all([listarTomas(100), listarCitasPasadas()]);
        const eventosTomas: Evento[] = tomas.map((t) => ({
          tipo: "toma",
          fecha: t.fecha_hora,
          data: t,
        }));
        const eventosCitas: Evento[] = citas.map((c) => ({
          tipo: "cita",
          fecha: `${c.fecha}T${c.hora || "00:00"}`,
          data: c,
        }));
        const todos = [...eventosTomas, ...eventosCitas].sort((a, b) =>
          b.fecha.localeCompare(a.fecha)
        );
        setEventos(todos);
      })();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="historial"
        titulo="📋 Historial"
        texto="Aquí ves todo lo que ya pasó: cada vez que marcaste un medicamento como tomado, y tus citas anteriores, ordenadas de la más reciente a la más antigua."
      />
      <FlatList
        data={eventos}
        keyExtractor={(item, i) => `${item.tipo}-${item.data.id}-${i}`}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no hay historial que mostrar</Text>
        }
        renderItem={({ item }) =>
          item.tipo === "toma" ? (
            <View style={styles.row}>
              <Text style={styles.icon}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{item.data.medicamento_nombre}</Text>
                <Text style={styles.subtitulo}>
                  Tomado el {formatearFechaHora(item.data.fecha_hora)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.icon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{item.data.titulo}</Text>
                <Text style={styles.subtitulo}>
                  {item.data.fecha}
                  {item.data.hora ? ` · ${item.data.hora}` : ""}
                </Text>
              </View>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  empty: { textAlign: "center", color: "#333", marginTop: 20, fontSize: 16 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: { fontSize: 20, marginRight: 12 },
  titulo: { fontSize: 15, fontWeight: "600", color: "#222" },
  subtitulo: { fontSize: 14, color: "#333", marginTop: 2 },
});
