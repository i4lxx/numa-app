import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  screenKey: string; // identificador único de la pantalla, ej. "medicamentos"
  titulo: string;
  texto: string;
};

/**
 * Icono flotante "?" que, la primera vez que se visita una pantalla,
 * abre automáticamente una ventana explicando qué hacer ahí. Después de
 * la primera vez, el icono se queda disponible para volver a abrirla
 * cuando el usuario quiera.
 */
export default function Ayuda({ screenKey, titulo, texto }: Props) {
  const [visible, setVisible] = useState(false);
  const storageKey = `ayuda_vista_${screenKey}`;

  useEffect(() => {
    (async () => {
      const yaVista = await AsyncStorage.getItem(storageKey);
      if (!yaVista) {
        setVisible(true);
        await AsyncStorage.setItem(storageKey, "1");
      }
    })();
  }, []);

  return (
    <>
      <Pressable style={styles.icono} onPress={() => setVisible(true)}>
        <Text style={styles.iconoTexto}>?</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.fondo}>
          <View style={styles.tarjeta}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.texto}>{texto}</Text>
            <Pressable style={styles.boton} onPress={() => setVisible(false)}>
              <Text style={styles.botonTexto}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icono: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 4,
  },
  iconoTexto: { color: "#fff", fontWeight: "800", fontSize: 17 },
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  tarjeta: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
  titulo: { fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 10 },
  texto: { fontSize: 16, color: "#333", lineHeight: 23, marginBottom: 22 },
  boton: {
    backgroundColor: "#5B8DEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  botonTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
