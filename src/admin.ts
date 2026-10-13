import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = "numa_admin";

/** ¿Está activado el modo administrador (pruebas) en este celular? */
export async function esAdmin(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE)) === "1";
  } catch {
    return false;
  }
}

export async function activarAdmin(activo: boolean) {
  try {
    await AsyncStorage.setItem(CLAVE, activo ? "1" : "0");
  } catch {}
}
