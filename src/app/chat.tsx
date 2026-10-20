import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { clasificarMensaje, DatosEvento } from "../api/ia";
import { actualizarNotificacionCita, agregarCita, obtenerPerfil } from "../db/database";
import { cancelarNotificacion, programarNotificacion } from "../notificaciones";
import { crearEventoCalendario } from "../calendario";
import { registrarEvento } from "../analytics";
import Ayuda from "../components/Ayuda";
import { preguntarNuma } from "../geminiChat";

type Mensaje = {
  id: string;
  autor: "user" | "numa";
  texto?: string;
  datos?: DatosEvento;
  estado?: "pendiente" | "confirmado" | "cancelado";
};

const NOMBRES_CATEGORIA: Record<string, string> = {
  evento_familiar: "Evento familiar",
  cita_medica: "Cita médica",
  evento_personal: "Evento personal",
  recordatorio_llamada: "Recordatorio de llamada",
};

function idUnico() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatScreen() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "bienvenida",
      autor: "numa",
      texto: "Hola, soy Numa. Puedo agendarte cosas (ej. 'recuérdame la cita el martes a las 4pm') o platicar contigo de lo que quieras: dudas sobre un medicamento, algo que quieras investigar, lo que sea.",
    },
  ]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const listRef = useRef<FlatList>(null);

  function agregarMensaje(m: Mensaje) {
    setMensajes((prev) => [...prev, m]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleEnviar() {
    const textoUsuario = texto.trim();
    if (!textoUsuario || cargando) return;

    setTexto("");
    agregarMensaje({ id: idUnico(), autor: "user", texto: textoUsuario });
    setCargando(true);
    registrarEvento("chat_mensaje_enviado");

    try {
      // La clave de OpenRouter ya es opcional: primero se usa el modo rápido (Gemini)
      const perfil = await obtenerPerfil();
      const datos = await clasificarMensaje(textoUsuario, perfil?.openrouter_api_key);

      if (datos.categoria === "otro") {
        // No es algo para agendar: le preguntamos a Numa de verdad (Gemini)
        try {
          const historialReciente = mensajes
            .filter((m) => m.texto)
            .slice(-8)
            .map((m) => ({ autor: m.autor, texto: m.texto! }));
          const respuestaGemini = await preguntarNuma(textoUsuario, historialReciente);
          agregarMensaje({ id: idUnico(), autor: "numa", texto: respuestaGemini });
        } catch (e: any) {
          agregarMensaje({
            id: idUnico(),
            autor: "numa",
            texto: `No pude responder eso ahora: ${e.message || "intenta de nuevo"}`,
          });
        }
      } else {
        agregarMensaje({
          id: idUnico(),
          autor: "numa",
          datos,
          estado: "pendiente",
        });
      }
    } catch (e: any) {
      agregarMensaje({
        id: idUnico(),
        autor: "numa",
        texto: `No pude procesar eso: ${e.message || "error desconocido"}`,
      });
    } finally {
      setCargando(false);
    }
  }

  async function handleConfirmar(id: string, datos: DatosEvento) {
    try {
      // Se guarda localmente en el celular (ya no depende de internet ni de Render)
      if (datos.fecha) {
        const notas = [datos.detalle, datos.persona ? `Persona: ${datos.persona}` : null]
          .filter(Boolean)
          .join(" · ");

        const idCita = await agregarCita(
          datos.titulo || "Recordatorio",
          datos.fecha,
          datos.hora || "",
          notas
        );

        const fechaHora = new Date(`${datos.fecha}T${datos.hora || "09:00"}:00`);

        const notifId = await programarNotificacion(
          "📅 Recordatorio",
          datos.titulo || "Recordatorio",
          fechaHora
        );
        if (notifId) {
          await actualizarNotificacionCita(idCita, notifId);
          registrarEvento("notificacion_programada", { tipo: "cita_chat" });
        }

        await crearEventoCalendario(datos.titulo || "Recordatorio", fechaHora, notas);
      }

      registrarEvento("chat_evento_confirmado", { categoria: datos.categoria });
      setMensajes((prev) =>
        prev.map((m) => (m.id === id ? { ...m, estado: "confirmado" } : m))
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo guardar. Intenta de nuevo.");
    }
  }

  function handleCancelar(id: string) {
    setMensajes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, estado: "cancelado" } : m))
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Ayuda
        screenKey="chat"
        titulo="💬 Chat con Numa"
        texto="Escríbele como a una persona. Puedes pedirle que agende algo ('recuérdame llamar a mamá el viernes a las 6pm') — te muestra lo que entendió antes de guardar. O simplemente platica con ella: pregúntale para qué sirve un medicamento, o algo que quieras investigar."
      />
      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.autor === "user" ? styles.bubbleUser : styles.bubbleNuma,
            ]}
          >
            {item.texto && (
              <Text style={item.autor === "user" ? styles.textoUser : styles.textoNuma}>
                {item.texto}
              </Text>
            )}

            {item.datos && (
              <View>
                <Text style={styles.tarjetaTitulo}>
                  {NOMBRES_CATEGORIA[item.datos.categoria] || "Recordatorio"}
                </Text>
                {item.datos.titulo && (
                  <Text style={styles.tarjetaLinea}>📌 {item.datos.titulo}</Text>
                )}
                {item.datos.fecha && (
                  <Text style={styles.tarjetaLinea}>
                    📅 {item.datos.fecha}
                    {item.datos.hora ? ` · ${item.datos.hora}` : ""}
                  </Text>
                )}
                {item.datos.persona && (
                  <Text style={styles.tarjetaLinea}>👤 {item.datos.persona}</Text>
                )}
                {item.datos.detalle && (
                  <Text style={styles.tarjetaLinea}>📝 {item.datos.detalle}</Text>
                )}

                {item.estado === "pendiente" && (
                  <View style={styles.accionesRow}>
                    <Pressable
                      style={styles.botonCancelar}
                      onPress={() => handleCancelar(item.id)}
                    >
                      <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.botonConfirmar}
                      onPress={() => handleConfirmar(item.id, item.datos!)}
                    >
                      <Text style={styles.botonConfirmarTexto}>✅ Guardar</Text>
                    </Pressable>
                  </View>
                )}
                {item.estado === "confirmado" && (
                  <Text style={styles.estadoTexto}>✅ Guardado</Text>
                )}
                {item.estado === "cancelado" && (
                  <Text style={styles.estadoTextoCancelado}>Cancelado</Text>
                )}
              </View>
            )}
          </View>
        )}
      />

      {cargando && (
        <View style={styles.cargandoBox}>
          <ActivityIndicator color="#5B8DEF" />
          <Text style={styles.cargandoTexto}>Numa está pensando...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escríbele a Numa..."
          placeholderTextColor="#666"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={handleEnviar}
          returnKeyType="send"
        />
        <Pressable style={styles.enviarButton} onPress={handleEnviar}>
          <Text style={styles.enviarTexto}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  bubbleUser: {
    backgroundColor: "#5B8DEF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleNuma: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  textoUser: { color: "#fff", fontSize: 15 },
  textoNuma: { color: "#222", fontSize: 15 },
  tarjetaTitulo: { fontWeight: "700", fontSize: 14, color: "#5B8DEF", marginBottom: 6 },
  tarjetaLinea: { fontSize: 14, color: "#333", marginBottom: 3 },
  accionesRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  botonCancelar: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  botonCancelarTexto: { color: "#666", fontWeight: "600", fontSize: 13 },
  botonConfirmar: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#4CAF93",
  },
  botonConfirmarTexto: { color: "#fff", fontWeight: "700", fontSize: 13 },
  estadoTexto: { color: "#4CAF93", fontWeight: "600", marginTop: 8, fontSize: 13 },
  estadoTextoCancelado: { color: "#999", marginTop: 8, fontSize: 13 },
  cargandoBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  cargandoTexto: { color: "#888", fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  enviarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#5B8DEF",
    alignItems: "center",
    justifyContent: "center",
  },
  enviarTexto: { color: "#fff", fontSize: 18 },
});
