import { Pressable, StyleSheet, Text, View } from "react-native";
import { Persona } from "../db/database";

type Props = {
  personas: Persona[];
  valor: number | null; // null = para mí
  onChange: (id: number | null) => void;
};

/** Fichas "Para: Yo / Mamá / Abuelo". Solo aparece si hay personas a cargo. */
export default function SelectorPersona({ personas, valor, onChange }: Props) {
  if (personas.length === 0) return null;

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>¿Para quién es?</Text>
      <View style={styles.fila}>
        <Pressable
          style={[styles.ficha, valor === null && styles.fichaActiva]}
          onPress={() => onChange(null)}
        >
          <Text style={[styles.fichaTexto, valor === null && styles.fichaTextoActivo]}>Yo</Text>
        </Pressable>
        {personas.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.ficha, valor === p.id && styles.fichaActiva]}
            onPress={() => onChange(p.id)}
          >
            <Text style={[styles.fichaTexto, valor === p.id && styles.fichaTextoActivo]}>
              {p.nombre}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "700", color: "#222", marginBottom: 6 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ficha: {
    borderWidth: 1,
    borderColor: "#C9D6F5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  fichaActiva: { backgroundColor: "#5B8DEF", borderColor: "#5B8DEF" },
  fichaTexto: { color: "#333", fontSize: 14, fontWeight: "600" },
  fichaTextoActivo: { color: "#fff" },
});
