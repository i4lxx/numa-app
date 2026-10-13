import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Cita,
  listarCitasDeHoy,
  listarMedicamentos,
  Medicamento,
  obtenerPerfil,
} from "../db/database";
import { registrarEvento } from "../analytics";
import { activarAdmin, esAdmin } from "../admin";
import Ayuda from "../components/Ayuda";

const MENU_ITEMS = [
  { label: "Chat con\nNuma", emoji: "💬", color: "#6C63FF", route: "/chat" },
  { label: "Administrar\nmedicamentos", emoji: "💊", color: "#5B8DEF", route: "/medicamentos" },
  { label: "Citas", emoji: "📅", color: "#4CAF93", route: "/citas" },
  { label: "Escanear\nreceta", emoji: "📷", color: "#F0A24B", route: "/escanear" },
  { label: "Seguimiento", emoji: "📈", color: "#E0708A", route: "/seguimiento" },
  { label: "Historial", emoji: "📋", color: "#B07CD8", route: "/historial" },
  { label: "Ajustes", emoji: "⚙️", color: "#999999", route: "/ajustes" },
];

const ITEM_PERSONAS = { label: "Personas\na cargo", emoji: "👥", color: "#6C63FF", route: "/personas" };
const ITEM_ADMIN = { label: "Modo\nadministrador", emoji: "🧪", color: "#333333", route: "/admin" };

export default function HomeScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [citasHoy, setCitasHoy] = useState<Cita[]>([]);
  const [listo, setListo] = useState(false);
  const [verPersonas, setVerPersonas] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [toques, setToques] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const perfil = await obtenerPerfil();
        if (!perfil) {
          router.replace("/onboarding");
          return;
        }
        setNombre(perfil.nombre);
        setVerPersonas(perfil.tipo_usuario === "cuidador");
        setAdmin(await esAdmin());
        setMedicamentos(await listarMedicamentos());
        setCitasHoy(await listarCitasDeHoy());
        setListo(true);
        registrarEvento("pantalla_vista", { pantalla: "inicio" });
      })();
    }, [])
  );

  if (!listo) return <View style={styles.container} />;

  // Truco para ti: toca 7 veces el título "Numa" para activar el modo administrador
  async function handleToqueTitulo() {
    const n = toques + 1;
    if (n >= 7) {
      setToques(0);
      await activarAdmin(true);
      setAdmin(true);
      Alert.alert("🧪 Modo administrador", "Activado. Ahora ves la tarjeta de pruebas en el menú.");
    } else {
      setToques(n);
    }
  }

  const items = [
    ...MENU_ITEMS.slice(0, 6),
    ...(verPersonas ? [ITEM_PERSONAS] : []),
    MENU_ITEMS[6],
    ...(admin ? [ITEM_ADMIN] : []),
  ];

  const sinPendientes = medicamentos.length === 0 && citasHoy.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Ayuda
        screenKey="inicio"
        titulo="👋 Bienvenido a Numa"
        texto="Aquí ves de un vistazo lo que tienes pendiente hoy (medicamentos y citas). Abajo, cada tarjeta te lleva a una función distinta: chatea con Numa, administra medicamentos, agrega citas, escanea recetas, da seguimiento o consulta tu historial."
      />
      <Pressable onPress={handleToqueTitulo}>
        <Text style={styles.title}>Numa</Text>
      </Pressable>
      <Text style={styles.greeting}>
        Hola {nombre}, bienvenido{"\n"}¿Cómo puedo ayudarte hoy?
      </Text>

      <View style={styles.todayBox}>
        <Text style={styles.todayTitle}>Hoy</Text>
        {sinPendientes ? (
          <Text style={styles.todayEmpty}>No tienes pendientes por hoy 🎉</Text>
        ) : (
          <>
            {medicamentos.map((m) => (
              <View key={`med-${m.id}`} style={styles.todayRow}>
                <Text style={styles.todayIcon}>💊</Text>
                <Text style={styles.todayText}>
                  {m.persona_nombre ? `${m.persona_nombre}: ` : ""}
                  {m.nombre}
                  {m.dosis ? ` (${m.dosis})` : ""} — cada {m.frecuencia_horas}h
                </Text>
              </View>
            ))}
            {citasHoy.map((c) => (
              <View key={`cita-${c.id}`} style={styles.todayRow}>
                <Text style={styles.todayIcon}>📅</Text>
                <Text style={styles.todayText}>
                  {c.persona_nombre ? `${c.persona_nombre}: ` : ""}
                  {c.titulo}
                  {c.hora ? ` — ${c.hora}` : ""}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={[styles.card, { backgroundColor: item.color }]}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.cardLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { paddingTop: 70, paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 36, fontWeight: "700", textAlign: "center", color: "#222" },
  greeting: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  todayBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  todayEmpty: { fontSize: 16, color: "#333" },
  todayRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  todayIcon: { fontSize: 16, marginRight: 10 },
  todayText: { fontSize: 15, color: "#222", flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emoji: { fontSize: 36, marginBottom: 10 },
  cardLabel: { fontSize: 15, fontWeight: "600", color: "#fff", textAlign: "center" },
});
