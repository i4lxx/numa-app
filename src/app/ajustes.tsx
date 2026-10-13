import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  cambiarTipoUsuario,
  guardarApiKey,
  obtenerPerfil,
  TipoUsuario,
} from "../db/database";
import Ayuda from "../components/Ayuda";
import { revisarActualizaciones } from "../actualizaciones";
import { guardarVoz, hablar, vozActivada } from "../notificaciones";
import { registrarEvento } from "../analytics";

const TIPOS: { valor: TipoUsuario; etiqueta: string }[] = [
  { valor: "estudiante", etiqueta: "🎓 Estudiante" },
  { valor: "adulto", etiqueta: "🧑 Adulto" },
  { valor: "adulto_mayor", etiqueta: "👴 Adulto mayor" },
  { valor: "cuidador", etiqueta: "🤝 Cuidador" },
];

export default function AjustesScreen() {
  const [apiKey, setApiKey] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [voz, setVoz] = useState(false);
  const [tipo, setTipo] = useState<TipoUsuario | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const perfil = await obtenerPerfil();
        setApiKey(perfil?.openrouter_api_key || "");
        setTipo(perfil?.tipo_usuario || null);
        setVoz(await vozActivada());
      })();
    }, [])
  );

  async function handleGuardar() {
    setGuardando(true);
    await guardarApiKey(apiKey.trim());
    setGuardando(false);
    Alert.alert("Listo", "Clave guardada.");
  }

  async function handleVoz(activa: boolean) {
    setVoz(activa);
    await guardarVoz(activa);
    registrarEvento("voz_cambiada", { activa });
    if (activa) hablar("Listo, ahora te avisaré en voz alta.");
  }

  async function handleTipo(t: TipoUsuario) {
    setTipo(t);
    await cambiarTipoUsuario(t);
    registrarEvento("tipo_usuario_cambiado", { tipo: t });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: 30, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
    >
      <Ayuda
        screenKey="ajustes"
        titulo="⚙️ Ajustes"
        texto="Aquí eliges si Numa te avisa en voz alta, tu tipo de perfil (si cuidas a alguien, elige Cuidador) y guardas tu clave de OpenRouter para que Numa lea recetas y entienda el chat."
      />

      <Text style={styles.label}>Avisos con voz</Text>
      <View style={styles.vozRow}>
        <Text style={styles.vozTexto}>
          Numa lee en voz alta qué medicamento o cita es cuando llega el aviso con la app abierta, o
          cuando tocas la notificación.
        </Text>
        <Switch value={voz} onValueChange={handleVoz} />
      </View>
      {voz && (
        <Pressable onPress={() => hablar("Es hora de que tomes Paracetamol, quinientos miligramos")}>
          <Text style={styles.link}>▶︎ Probar voz</Text>
        </Pressable>
      )}

      <Text style={[styles.label, { marginTop: 28 }]}>Tipo de perfil</Text>
      <View style={styles.tiposFila}>
        {TIPOS.map((t) => (
          <Pressable
            key={t.valor}
            style={[styles.ficha, tipo === t.valor && styles.fichaActiva]}
            onPress={() => handleTipo(t.valor)}
          >
            <Text style={[styles.fichaTexto, tipo === t.valor && styles.fichaTextoActivo]}>
              {t.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.help}>
        Con el perfil Cuidador aparece "Personas a cargo" en el inicio, para administrar los
        medicamentos y citas de otra persona.
      </Text>

      <Text style={[styles.label, { marginTop: 28 }]}>Clave de OpenRouter</Text>
      <Text style={styles.help}>
        Numa la usa para leer recetas y entender tus mensajes en el chat. Es gratis, se obtiene en
        openrouter.ai/keys.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="sk-or-v1-..."
        placeholderTextColor="#666"
        value={apiKey}
        onChangeText={setApiKey}
        autoCapitalize="none"
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleGuardar} disabled={guardando}>
        <Text style={styles.buttonText}>{guardando ? "Guardando..." : "Guardar"}</Text>
      </Pressable>

      <Pressable onPress={() => Linking.openURL("https://openrouter.ai/keys")}>
        <Text style={styles.link}>Abrir openrouter.ai/keys →</Text>
      </Pressable>

      <Pressable style={styles.updateButton} onPress={() => revisarActualizaciones(false)}>
        <Text style={styles.updateText}>🔄 Buscar actualizaciones</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  label: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 6 },
  help: { fontSize: 15, color: "#333", marginBottom: 16, lineHeight: 19, marginTop: 8 },
  vozRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  vozTexto: { flex: 1, fontSize: 15, color: "#333", lineHeight: 20 },
  tiposFila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ficha: {
    borderWidth: 1,
    borderColor: "#C9D6F5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#fff",
  },
  fichaActiva: { backgroundColor: "#5B8DEF", borderColor: "#5B8DEF" },
  fichaTexto: { color: "#333", fontSize: 14, fontWeight: "600" },
  fichaTextoActivo: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#5B8DEF",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  link: { color: "#5B8DEF", textAlign: "center", fontSize: 14, marginTop: 4 },
  updateButton: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#5B8DEF",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  updateText: { color: "#5B8DEF", fontWeight: "700", fontSize: 15 },
});
