import * as Updates from "expo-updates";
import { Alert } from "react-native";

/**
 * Revisa si hay una actualización de Numa publicada. Si la hay, le pregunta
 * al usuario si quiere descargarla; al aceptar, la descarga y reinicia la app.
 *
 * - silencioso = true  → no muestra nada si no hay actualización (uso al abrir la app)
 * - silencioso = false → avisa también cuando ya está al día (uso desde el botón de Ajustes)
 *
 * Nota: solo funciona en la app instalada (APK), no en Expo Go ni en modo desarrollo.
 */
export async function revisarActualizaciones(silencioso = true) {
  if (__DEV__ || !Updates.isEnabled) {
    if (!silencioso) {
      Alert.alert(
        "No disponible",
        "Las actualizaciones solo funcionan en la app instalada, no en modo desarrollo."
      );
    }
    return;
  }

  try {
    const resultado = await Updates.checkForUpdateAsync();

    if (!resultado.isAvailable) {
      if (!silencioso) {
        Alert.alert("Estás al día ✅", "Ya tienes la versión más reciente de Numa.");
      }
      return;
    }

    Alert.alert(
      "Actualización disponible 🎉",
      "Hay una nueva versión de Numa con mejoras. ¿Quieres descargarla ahora? La app se reiniciará al terminar.",
      [
        { text: "Después", style: "cancel" },
        {
          text: "Actualizar",
          onPress: async () => {
            try {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            } catch {
              Alert.alert(
                "No se pudo actualizar",
                "Revisa tu conexión a internet e intenta de nuevo."
              );
            }
          },
        },
      ]
    );
  } catch {
    if (!silencioso) {
      Alert.alert("Error", "No se pudo buscar actualizaciones. Revisa tu conexión.");
    }
  }
}
