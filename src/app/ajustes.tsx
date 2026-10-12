import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { guardarApiKey, obtenerPerfil } from "../db/database";
import Ayuda from "../components/Ayuda";
import { revisarActualizaciones } from "../actualizaciones";

export default function AjustesScreen() {
  const [apiKey, setApiKey] = useState("");
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const perfil = await obtenerPerfil();
        setApiKey(perfil?.openrouter_api_key || "");
      })();
    }, [])
  );

  async function handleGuardar() {
    setGuardando(true);
    await guardarApiKey(apiKey.trim());
    setGuardando(false);
    Alert.alert("Listo", "Clave guardada.");
  }

  return (
    <View style={styles.container}>
      <Ayuda
        screenKey="ajustes"
        titulo="⚙️ Ajustes"
        texto="Aquí guardas tu clave de OpenRouter, la que le da acceso a Numa a la IA para leer recetas y entender el chat. Si no la tienes, puedes sacarla gratis desde el enlace de abajo."
      />
      <Text style={styles.label}>Clave de OpenRouter</Text>
      <Text style={styles.help}>
        Numa la usa para leer recetas y entender tus mensajes en el chat. Es gratis, se
        obtiene en openrouter.ai/keys.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", padding: 20, paddingTop: 30 },
  label: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 6 },
  help: { fontSize: 15, color: "#333", marginBottom: 16, lineHeight: 19 },
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
  link: { color: "#5B8DEF", textAlign: "center", fontSize: 14 },
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
