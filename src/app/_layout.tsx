import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { escucharToquesDeNotificacion, pedirPermisoNotificaciones } from "../notificaciones";
import { iniciarAnalytics } from "../analytics";
import { obtenerPerfil } from "../db/database";
import { revisarActualizaciones } from "../actualizaciones";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Lo primero: quitar la pantalla de carga, pase lo que pase después.
    SplashScreen.hideAsync().catch(() => {});

    // Todo lo demás va protegido: si algo falla (permisos, red, analytics),
    // la app igual abre.
    (async () => {
      try {
        await pedirPermisoNotificaciones();
      } catch {}
      try {
        const perfil = await obtenerPerfil();
        if (perfil) iniciarAnalytics(perfil.usuario_id, perfil.nombre, perfil.tipo_usuario);
      } catch {}
      try {
        revisarActualizaciones();
      } catch {}
    })();

    // Si la voz está activa, tocar una notificación la lee en voz alta
    const suscripcion = escucharToquesDeNotificacion();
    return () => suscripcion.remove();
  }, []);

  // Las pantallas de Numa son de fondo claro, así que usamos siempre el tema claro.
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: "minimal", // solo la flecha, sin el texto "index"
          headerTintColor: "#5B8DEF",
          headerStyle: { backgroundColor: "#FAFAFA" },
          headerTitleStyle: { color: "#222" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="chat" options={{ title: "Chat con Numa" }} />
        <Stack.Screen name="medicamentos" options={{ title: "Medicamentos" }} />
        <Stack.Screen name="citas" options={{ title: "Citas" }} />
        <Stack.Screen name="escanear" options={{ title: "Escanear receta" }} />
        <Stack.Screen name="seguimiento" options={{ title: "Seguimiento" }} />
        <Stack.Screen name="historial" options={{ title: "Historial" }} />
        <Stack.Screen name="personas" options={{ title: "Personas a cargo" }} />
        <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
        <Stack.Screen name="legal" options={{ title: "Términos y privacidad" }} />
        <Stack.Screen name="admin" options={{ title: "Modo administrador" }} />
      </Stack>
    </ThemeProvider>
  );
}
