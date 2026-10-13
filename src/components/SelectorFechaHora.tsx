import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

type Props = {
  modo: "fecha" | "hora";
  valor: string; // fecha: AAAA-MM-DD · hora: HH:MM (vacío si no hay nada elegido)
  onChange: (nuevo: string) => void;
  placeholder: string;
};

const p2 = (n: number) => String(n).padStart(2, "0");
const aFecha = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const aHora = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;

function aDate(modo: "fecha" | "hora", valor: string): Date {
  const base = new Date();
  if (modo === "fecha" && valor) {
    const [y, m, d] = valor.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d, 12, 0);
  }
  if (modo === "hora" && valor) {
    const [h, mi] = valor.split(":").map(Number);
    if (!isNaN(h)) base.setHours(h, mi || 0, 0, 0);
  }
  return base;
}

/**
 * Campo que, al tocarlo, abre un calendario (fecha) o un reloj (hora)
 * en lugar de obligar a escribir a mano.
 */
export default function SelectorFechaHora({ modo, valor, onChange, placeholder }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [temp, setTemp] = useState<Date>(new Date());

  const formatear = (d: Date) => (modo === "fecha" ? aFecha(d) : aHora(d));

  const inicioDeHoy = new Date();
  inicioDeHoy.setHours(0, 0, 0, 0);

  function abrir() {
    const actual = aDate(modo, valor);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: actual,
        mode: modo === "fecha" ? "date" : "time",
        is24Hour: true,
        minimumDate: modo === "fecha" ? inicioDeHoy : undefined,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === "set" && d) onChange(formatear(d));
        },
      });
    } else {
      setTemp(actual);
      setAbierto(true);
    }
  }

  const textoMostrado = valor
    ? modo === "fecha"
      ? aDate("fecha", valor).toLocaleDateString("es-MX", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : valor
    : placeholder;

  return (
    <>
      <Pressable style={styles.campo} onPress={abrir}>
        <Text style={styles.icono}>{modo === "fecha" ? "📅" : "🕐"}</Text>
        <Text style={[styles.texto, !valor && styles.placeholder]}>{textoMostrado}</Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
          <View style={styles.fondo}>
            <View style={styles.tarjeta}>
              <DateTimePicker
                value={temp}
                mode={modo === "fecha" ? "date" : "time"}
                display={modo === "fecha" ? "inline" : "spinner"}
                locale="es-MX"
                themeVariant="light"
                minimumDate={modo === "fecha" ? inicioDeHoy : undefined}
                onChange={(_e, d) => d && setTemp(d)}
              />
              <View style={styles.botonesRow}>
                <Pressable style={styles.botonGris} onPress={() => setAbierto(false)}>
                  <Text style={styles.botonGrisTexto}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.botonAzul}
                  onPress={() => {
                    onChange(formatear(temp));
                    setAbierto(false);
                  }}
                >
                  <Text style={styles.botonAzulTexto}>Listo</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  campo: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  icono: { fontSize: 16, marginRight: 10 },
  texto: { fontSize: 15, color: "#222" },
  placeholder: { color: "#666" },
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  tarjeta: { backgroundColor: "#fff", borderRadius: 20, padding: 16 },
  botonesRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  botonGris: { flex: 1, backgroundColor: "#F0F0F0", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  botonGrisTexto: { color: "#444", fontWeight: "700", fontSize: 15 },
  botonAzul: { flex: 1, backgroundColor: "#5B8DEF", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  botonAzulTexto: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
