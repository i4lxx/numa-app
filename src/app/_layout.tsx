import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { pedirPermisoNotificaciones } from '../notificaciones';
import { iniciarAnalytics } from '../analytics';
import { obtenerPerfil } from '../db/database';
import { revisarActualizaciones } from '../actualizaciones';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
    pedirPermisoNotificaciones();
    revisarActualizaciones();

    (async () => {
      const perfil = await obtenerPerfil();
      if (perfil) {
        iniciarAnalytics(perfil.usuario_id, perfil.nombre, perfil.tipo_usuario);
      }
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
