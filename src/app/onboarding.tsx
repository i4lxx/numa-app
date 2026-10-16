import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { guardarPerfil, TipoUsuario } from "../db/database";
import { iniciarAnalytics } from "../analytics";

const ANCHO = Dimensions.get("window").width;

const SLIDES = [
  {
    emoji: "💙",
    titulo: "Esto es Numa",
    texto: "Numa nació para ser tu apoyo y ayudarte a organizar tu vida: que no se te pasen tus medicamentos, tus citas ni lo que es importante para ti. Te mostramos cómo usarla en las siguientes pantallas.",
  },
  {
    emoji: "💬",
    titulo: "Chat con Numa",
    texto: "Escríbele en lenguaje normal para que agende cosas por ti: 'recuérdame la cita el martes a las 4pm'.",
  },
  {
    emoji: "💊",
    titulo: "Administrar medicamentos",
    texto: "Agrega tus medicamentos con dosis y frecuencia. Numa te avisa cuando toque la siguiente toma.",
  },
  {
    emoji: "📅",
    titulo: "Citas",
    texto: "Guarda tus citas con fecha y hora. Se agregan solas a tu calendario del celular.",
  },
  {
    emoji: "📷",
    titulo: "Escanear receta",
    texto: "Tómale foto a una receta médica y Numa detecta los medicamentos automáticamente.",
  },
  {
    emoji: "📈",
    titulo: "Seguimiento",
    texto: "Marca cada vez que tomas un medicamento, para llevar un registro exacto.",
  },
  {
    emoji: "📋",
    titulo: "Historial",
    texto: "Consulta todo lo que ya pasó: tomas registradas y citas anteriores.",
  },
];

const TIPOS_USUARIO: { valor: TipoUsuario; emoji: string; titulo: string; detalle: string }[] = [
  { valor: "estudiante", emoji: "🎓", titulo: "Estudiante", detalle: "Estudio y organizo mis tiempos" },
  { valor: "adulto", emoji: "🧑", titulo: "Adulto", detalle: "Trabajo y llevo mi día a día" },
  { valor: "adulto_mayor", emoji: "👴", titulo: "Adulto mayor", detalle: "Quiero tener mi salud al día" },
  { valor: "cuidador", emoji: "🤝", titulo: "Cuidador", detalle: "Administro la salud de otra persona" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario | null>(null);
  const [nombre, setNombre] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [slideActual, setSlideActual] = useState(0);
  const listRef = useRef<FlatList>(null);

  async function handleGuardarPerfil(saltarClave: boolean) {
    setGuardando(true);
    const perfil = await guardarPerfil(
      nombre.trim(),
      saltarClave ? undefined : apiKey.trim(),
      tipoUsuario || undefined
    );
    iniciarAnalytics(perfil.usuario_id, perfil.nombre, perfil.tipo_usuario);
    setGuardando(false);
    setPaso(4);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const indice = Math.round(e.nativeEvent.contentOffset.x / ANCHO);
    setSlideActual(indice);
  }

  function irASiguienteSlide() {
    if (slideActual < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: slideActual + 1 });
    } else {
      router.replace("/");
    }
  }

  // ---------- Paso 1: nombre ----------
  if (paso === 1) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>¡Hola! Soy Numa</Text>
        <Text style={styles.subtitle}>
          Voy a ayudarte con tus medicamentos y citas.{"\n"}¿Cómo te llamas?
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor="#666"
          value={nombre}
          onChangeText={setNombre}
          autoFocus
        />

        <Pressable
          style={[styles.button, !nombre.trim() && styles.buttonDisabled]}
          onPress={() => setPaso(2)}
          disabled={!nombre.trim()}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/legal")}>
          <Text style={styles.legalAviso}>
            Al continuar aceptas los{" "}
            <Text style={styles.legalEnlace}>Términos y la Política de privacidad</Text>. Numa es un
            proyecto estudiantil en desarrollo.
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  // ---------- Paso 2: tipo de usuario ----------
  if (paso === 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🙋</Text>
        <Text style={styles.title}>¿Quién va a usar Numa?</Text>
        <Text style={styles.subtitle}>
          Elige la opción que más se parezca a ti, así puedo mejorar la app para cada persona.
        </Text>

        {TIPOS_USUARIO.map((t) => (
          <Pressable
            key={t.valor}
            style={[styles.opcion, tipoUsuario === t.valor && styles.opcionActiva]}
            onPress={() => setTipoUsuario(t.valor)}
          >
            <Text style={styles.opcionEmoji}>{t.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.opcionTitulo}>{t.titulo}</Text>
              <Text style={styles.opcionDetalle}>{t.detalle}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable
          style={[styles.button, { marginTop: 10 }, !tipoUsuario && styles.buttonDisabled]}
          onPress={() => setPaso(3)}
          disabled={!tipoUsuario}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Paso 3: clave de OpenRouter ----------
  if (paso === 3) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>Una cosa más</Text>
        <Text style={styles.subtitle}>
          Para que Numa pueda leer tus recetas y entender el chat, necesita una clave
          gratuita de OpenRouter. La puedes conseguir en dos minutos.
        </Text>

        <Pressable onPress={() => Linking.openURL("https://openrouter.ai/keys")}>
          <Text style={styles.link}>Abrir openrouter.ai/keys →</Text>
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Pega tu clave aquí (sk-or-v1-...)"
          placeholderTextColor="#666"
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          secureTextEntry
        />

        <Pressable
          style={[styles.button, !apiKey.trim() && styles.buttonDisabled]}
          onPress={() => handleGuardarPerfil(false)}
          disabled={!apiKey.trim() || guardando}
        >
          <Text style={styles.buttonText}>
            {guardando ? "Guardando..." : "Guardar y continuar"}
          </Text>
        </Pressable>

        <Pressable onPress={() => handleGuardarPerfil(true)} disabled={guardando}>
          <Text style={styles.skip}>Lo hago después</Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  // ---------- Paso 3: carrusel explicando cada función ----------
  return (
    <View style={styles.carruselContainer}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.titulo}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: ANCHO }]}>
            <Text style={styles.slideEmoji}>{item.emoji}</Text>
            <Text style={styles.slideTitulo}>{item.titulo}</Text>
            <Text style={styles.slideTexto}>{item.texto}</Text>
          </View>
        )}
      />

      <View style={styles.puntosRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.punto, i === slideActual && styles.puntoActivo]}
          />
        ))}
      </View>

      <Pressable style={styles.button} onPress={irASiguienteSlide}>
        <Text style={styles.buttonText}>
          {slideActual === SLIDES.length - 1 ? "Comenzar" : "Siguiente"}
        </Text>
      </Pressable>

      {slideActual < SLIDES.length - 1 && (
        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.skip}>Saltar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emoji: { fontSize: 56, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "700", color: "#222", marginBottom: 8 },
  subtitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  link: { color: "#5B8DEF", fontSize: 14, marginBottom: 20 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  button: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#5B8DEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonDisabled: { backgroundColor: "#C7D6F5" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skip: { color: "#999", fontSize: 14, textAlign: "center", marginBottom: 20 },
  legalAviso: { fontSize: 13, color: "#4D525B", textAlign: "center", lineHeight: 19, paddingHorizontal: 10 },
  legalEnlace: { color: "#5B8DEF", fontWeight: "700" },

  opcion: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    padding: 16,
    marginBottom: 12,
  },
  opcionActiva: { borderColor: "#5B8DEF", backgroundColor: "#EEF3FF" },
  opcionEmoji: { fontSize: 32, marginRight: 14 },
  opcionTitulo: { fontSize: 18, fontWeight: "700", color: "#222" },
  opcionDetalle: { fontSize: 14, color: "#333", marginTop: 2 },

  carruselContainer: { flex: 1, backgroundColor: "#FAFAFA", paddingTop: 60 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  slideEmoji: { fontSize: 72, marginBottom: 24 },
  slideTitulo: { fontSize: 24, fontWeight: "700", color: "#222", marginBottom: 12 },
  slideTexto: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 23,
  },
  puntosRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 6,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DDD",
  },
  puntoActivo: {
    backgroundColor: "#5B8DEF",
    width: 20,
  },
});
