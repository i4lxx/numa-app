import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { DatosReceta, leerRecetaFoto, MedicamentoDetectado } from "../api/ia";
import { agregarMedicamento, obtenerPerfil } from "../db/database";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";

export default function EscanearScreen() {
  const router = useRouter();
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<DatosReceta | null>(null);

  async function elegirFoto(desdeCamara: boolean) {
    const permiso = desdeCamara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert("Permiso necesario", "Numa necesita permiso para continuar.");
      return;
    }

    const resultadoPicker = desdeCamara
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });

    if (resultadoPicker.canceled) return;

    const asset = resultadoPicker.assets[0];
    setFotoUri(asset.uri);
    setResultado(null);

    if (!asset.base64) {
      Alert.alert("Error", "No se pudo leer la imagen, intenta de nuevo.");
      return;
    }

    const perfil = await obtenerPerfil();
    if (!perfil?.openrouter_api_key) {
      Alert.alert(
        "Falta tu clave de OpenRouter",
        "Ve a Ajustes y agrégala para poder leer recetas."
      );
      return;
    }

    setCargando(true);
    try {
      const datos = await leerRecetaFoto(asset.base64, perfil.openrouter_api_key);
      if (!datos.es_receta || !datos.medicamentos?.length) {
        Alert.alert(
          "No se detectó receta",
          "No parece que esta imagen sea una receta médica. Intenta con una foto más clara."
        );
        setResultado(null);
      } else {
        setResultado(datos);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo leer la receta, intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function handleConfirmar() {
    if (!resultado) return;
    setGuardando(true);
    try {
      // Guarda directo en el celular
      for (const m of resultado.medicamentos) {
        await agregarMedicamento(m.nombre, m.dosis || "", m.frecuencia_horas || 24);
      }
      registrarEvento("receta_escaneada", { cantidad_medicamentos: resultado.medicamentos.length });
      Alert.alert("Listo", "Receta guardada correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo guardar la receta.");
    } finally {
      setGuardando(false);
    }
  }

  function handleCancelar() {
    setFotoUri(null);
    setResultado(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Ayuda
        screenKey="escanear"
        titulo="📷 Escanear receta"
        texto="Toma o elige una foto de una receta médica. Numa la lee con IA y te muestra los medicamentos que detectó, para que confirmes antes de guardar nada."
      />
      {!fotoUri && (
        <View style={styles.botones}>
          <Pressable style={styles.actionButton} onPress={() => elegirFoto(true)}>
            <Text style={styles.actionEmoji}>📷</Text>
            <Text style={styles.actionText}>Tomar foto</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => elegirFoto(false)}>
            <Text style={styles.actionEmoji}>🖼️</Text>
            <Text style={styles.actionText}>Elegir de galería</Text>
          </Pressable>
        </View>
      )}

      {fotoUri && <Image source={{ uri: fotoUri }} style={styles.preview} />}

      {cargando && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#F0A24B" />
          <Text style={styles.loadingText}>Leyendo tu receta...</Text>
        </View>
      )}

      {resultado && !cargando && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Esto detecté:</Text>
          {resultado.medicamentos.map((m: MedicamentoDetectado, i: number) => (
            <View key={i} style={styles.medRow}>
              <Text style={styles.medNombre}>💊 {m.nombre}</Text>
              <Text style={styles.medDetalle}>
                {m.dosis || "sin dosis"} · cada {m.frecuencia_horas || "?"}h
                {m.duracion_dias ? ` · ${m.duracion_dias} días` : ""}
              </Text>
            </View>
          ))}
          {resultado.doctor && <Text style={styles.meta}>Doctor: {resultado.doctor}</Text>}
          {resultado.notas && <Text style={styles.meta}>⚠️ {resultado.notas}</Text>}

          <View style={styles.confirmRow}>
            <Pressable style={styles.cancelButton} onPress={handleCancelar}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={handleConfirmar}
              disabled={guardando}
            >
              <Text style={styles.confirmText}>
                {guardando ? "Guardando..." : "✅ Guardar"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {fotoUri && !cargando && !resultado && (
        <Pressable style={styles.retryButton} onPress={handleCancelar}>
          <Text style={styles.retryText}>Intentar con otra foto</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 20, paddingTop: 30, alignItems: "center" },
  botones: { width: "100%", gap: 16 },
  actionButton: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  actionEmoji: { fontSize: 34, marginBottom: 8 },
  actionText: { fontSize: 16, fontWeight: "600", color: "#333" },
  preview: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: "cover",
  },
  loadingBox: { alignItems: "center", marginTop: 20 },
  loadingText: { marginTop: 10, color: "#333", fontSize: 15 },
  resultBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  resultTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#222" },
  medRow: { marginBottom: 10 },
  medNombre: { fontSize: 15, fontWeight: "600", color: "#222" },
  medDetalle: { fontSize: 14, color: "#333", marginTop: 2 },
  meta: { fontSize: 14, color: "#333", marginTop: 4 },
  confirmRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  cancelText: { color: "#666", fontWeight: "600" },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#4CAF93",
  },
  confirmText: { color: "#fff", fontWeight: "700" },
  retryButton: { marginTop: 20 },
  retryText: { color: "#5B8DEF", fontWeight: "600" },
});
