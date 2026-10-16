import { ScrollView, StyleSheet, Text, View } from "react-native";

// Mismo texto que la página web (terminos.html). Si cambias uno, cambia el otro.
const FECHA = "15 de octubre de 2026";
const INTRO = "Numa es un proyecto estudiantil en desarrollo. Aquí te explicamos, de forma clara, cómo funciona, qué datos usa y qué debes tener en cuenta.";

type Bloque = { tipo: "p"; texto: string } | { tipo: "ul"; items: string[] };
const SECCIONES: { titulo: string; bloques: Bloque[] }[] = [
  {
    titulo: "1. Qué es Numa y en qué etapa está",
    bloques: [
      { tipo: "p", texto: "Numa es una aplicación en desarrollo. Es un proyecto estudiantil: lo hace una persona estudiante, con seriedad y con el cuidado que merece algo que trata con medicamentos, citas y datos personales." },
      { tipo: "p", texto: "Como todo proyecto en desarrollo, puede tener errores, cambiar de un día a otro o dejar de funcionar. Por eso se ofrece de forma gratuita y tal como está, sin garantías. Si encuentras un problema, escríbenos: ayuda a mejorarla." },
    ],
  },
  {
    titulo: "2. Aviso importante sobre tu salud",
    bloques: [
      { tipo: "p", texto: "Numa es un apoyo para organizarte. No es un médico ni sustituye la opinión de un profesional de la salud." },
      { tipo: "ul", items: ["Las respuestas del chat son generadas por inteligencia artificial y pueden contener errores. No las uses para decidir un tratamiento ni una dosis.", "La lectura de recetas por foto puede equivocarse. Revisa siempre cada medicamento, dosis y horario contra tu receta original, y ante la duda consulta a tu médico o farmacéutico.", "Los recordatorios dependen de tu teléfono: pueden fallar si el aparato está apagado, sin batería, en modo ahorro de energía o con las notificaciones bloqueadas. No dependas solo de Numa para algo crítico.", "Numa no es un servicio de emergencias. Si hay una urgencia médica, llama al 911 (en México) o a los servicios de emergencia de tu país."] },
    ],
  },
  {
    titulo: "3. Qué datos guarda Numa y dónde",
    bloques: [
      { tipo: "p", texto: "Numa no tiene cuentas de usuario ni un servidor propio con tus datos. Lo que registras se guarda en tu teléfono, dentro de la app:" },
      { tipo: "ul", items: ["tu nombre y el tipo de perfil que elegiste;", "tus medicamentos, dosis, horarios y el registro de tomas;", "tus citas y notas;", "las personas a cargo, si usas el perfil Cuidador;", "tu clave de OpenRouter, si la agregaste."] },
      { tipo: "p", texto: "Si desinstalas la app, esos datos se borran del teléfono y no se pueden recuperar. Los eventos que Numa haya creado en el calendario de tu teléfono no se borran solos: quedan en tu calendario hasta que los elimines." },
    ],
  },
  {
    titulo: "4. Qué información sale de tu teléfono",
    bloques: [
      { tipo: "p", texto: "Para funcionar, Numa usa algunos servicios de terceros. Esto es lo que se envía y a quién:" },
      { tipo: "ul", items: ["OpenRouter (con tu propia clave): el texto que escribes en el chat para agendar cosas y las fotos de recetas que escaneas. OpenRouter y los proveedores de los modelos de IA que usa tienen sus propias políticas; algunos modelos gratuitos pueden registrar lo que reciben.", "Chat general (Gemini, de Google): las preguntas de conversación y los últimos mensajes del chat viajan a un servicio intermedio en Cloudflare, que consulta a Gemini con una clave compartida de Numa. Numa no almacena esas conversaciones; Cloudflare y Google las procesan según sus propias políticas.", "Estadísticas de uso (PostHog): un identificador interno de la instalación, el nombre que escribiste, tu tipo de perfil, las pantallas y funciones que usas y, en algunos eventos, el nombre de un medicamento que marcaste como tomado. Sirven para saber cuántas personas usan la app y qué funciones necesitan mejoras.", "Actualizaciones (Expo): al abrir la app, ésta consulta si hay una versión nueva. Eso expone a Expo datos técnicos básicos de la conexión, como la dirección IP.", "Calendario: si agendas una cita, Numa crea un evento en el calendario de tu teléfono. Si ese calendario se sincroniza con iCloud o Google, esos servicios también lo guardan."] },
      { tipo: "p", texto: "Fuera de lo anterior no compartimos tus datos con nadie, no los vendemos y la app no muestra publicidad." },
    ],
  },
  {
    titulo: "5. Permisos que pide la app",
    bloques: [
      { tipo: "ul", items: ["Notificaciones: para avisarte de medicamentos y citas.", "Calendario: para agregar tus citas a la agenda del teléfono.", "Cámara y fotos: para escanear recetas."] },
      { tipo: "p", texto: "Puedes negar o quitar cualquiera de ellos desde los ajustes de tu teléfono; la función relacionada dejará de estar disponible. La función de voz usa la voz del propio teléfono para leer los avisos en voz alta, y no escucha ni graba lo que dices." },
    ],
  },
  {
    titulo: "6. Tus decisiones",
    bloques: [
      { tipo: "ul", items: ["Puedes usar Numa sin agregar la clave de OpenRouter; el chat para agendar y el escaneo de recetas no funcionarán sin ella.", "Puedes activar o desactivar los avisos con voz en Ajustes.", "Puedes borrar tus datos desinstalando la app.", "Si quieres que se elimine tu información de las estadísticas de uso, escríbenos al correo de contacto con el nombre que usaste en la app."] },
    ],
  },
  {
    titulo: "7. Uso responsable",
    bloques: [
      { tipo: "p", texto: "Usa Numa con criterio, como una ayuda y no como tu única fuente de información. Se ofrece sin garantías de que sea correcta, esté siempre disponible o sirva para un fin específico. En la medida que la ley lo permita, el autor no se hace responsable por daños que resulten de usarla." },
      { tipo: "p", texto: "Si eres menor de edad, usa Numa con la supervisión de una persona adulta. Si cuidas a otra persona, asegúrate de contar con su permiso o el de quien corresponda para registrar sus datos de salud." },
    ],
  },
  {
    titulo: "8. Cambios a este documento",
    bloques: [
      { tipo: "p", texto: "Como la app sigue en desarrollo, estos términos pueden cambiar. Cuando haya cambios importantes los publicaremos aquí y en la app, y se actualizará la fecha de este documento." },
    ],
  },
  {
    titulo: "9. Contacto",
    bloques: [
      { tipo: "p", texto: "¿Dudas, errores o quieres que eliminemos tus datos de las estadísticas? Escríbenos a numa.luisleon@gmail.com." },
    ],
  },
];

export default function LegalScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.titulo}>Términos y privacidad</Text>
      <Text style={styles.intro}>{INTRO}</Text>
      <Text style={styles.fecha}>Última actualización: {FECHA}</Text>

      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>Proyecto estudiantil en desarrollo</Text>
        <Text style={styles.avisoTexto}>
          Numa se trabaja con seriedad y cuidamos tus datos, pero todavía puede fallar o cambiar. No
          sustituye a un médico.
        </Text>
      </View>

      {SECCIONES.map((s) => (
        <View key={s.titulo} style={styles.seccion}>
          <Text style={styles.seccionTitulo}>{s.titulo}</Text>
          {s.bloques.map((b, i) =>
            b.tipo === "p" ? (
              <Text key={i} style={styles.parrafo}>
                {b.texto}
              </Text>
            ) : (
              <View key={i} style={{ marginBottom: 8 }}>
                {b.items.map((it, j) => (
                  <View key={j} style={styles.itemFila}>
                    <Text style={styles.vineta}>•</Text>
                    <Text style={styles.itemTexto}>{it}</Text>
                  </View>
                ))}
              </View>
            )
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  titulo: { fontSize: 26, fontWeight: "800", color: "#222", marginBottom: 8 },
  intro: { fontSize: 16, color: "#333", lineHeight: 23 },
  fecha: { fontSize: 13, color: "#4D525B", marginTop: 8 },
  aviso: {
    backgroundColor: "#ECEBFD",
    borderColor: "#D8D5F7",
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  avisoTitulo: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 4 },
  avisoTexto: { fontSize: 15, color: "#333", lineHeight: 21 },
  seccion: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 16 },
  seccionTitulo: { fontSize: 18, fontWeight: "800", color: "#1F2A38", marginBottom: 10 },
  parrafo: { fontSize: 15, color: "#333", lineHeight: 23, marginBottom: 10 },
  itemFila: { flexDirection: "row", marginBottom: 8 },
  vineta: { fontSize: 15, color: "#5B52E8", width: 18, lineHeight: 23 },
  itemTexto: { flex: 1, fontSize: 15, color: "#333", lineHeight: 23 },
});
