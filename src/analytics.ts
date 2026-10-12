import PostHog from "posthog-react-native";

// ⚠️ Pon aquí tu Project API Key y API Host de PostHog (Project Settings)
const POSTHOG_API_KEY = "phc_TU_CLAVE_AQUI";
const POSTHOG_HOST = "https://us.i.posthog.com";

let cliente: PostHog | null = null;

export function iniciarAnalytics(usuarioId: string, nombre: string, tipoUsuario?: string | null) {
  if (cliente) return cliente;

  cliente = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
  });

  // Identifica este celular/usuario de forma anónima con el id que ya
  // generamos en el onboarding (no es su nombre real, solo un id interno)
  cliente.identify(usuarioId, {
    nombre_usuario: nombre,
    tipo_usuario: tipoUsuario || "sin_definir",
  });

  return cliente;
}

/**
 * Registra un evento. Si analytics no se ha inicializado todavía
 * (por ejemplo, la app sigue cargando), no truena, solo lo ignora.
 */
export function registrarEvento(nombre: string, propiedades?: Record<string, any>) {
  if (!cliente) return;
  cliente.capture(nombre, propiedades);
}

export function registrarPantalla(nombrePantalla: string) {
  if (!cliente) return;
  cliente.screen(nombrePantalla);
}
