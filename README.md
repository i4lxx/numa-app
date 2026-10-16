<div align="center">

<img src="assets/images/icon.png" alt="Logo de Numa" width="120" />

# Numa

**Orden para tu día, tranquilidad para tu familia.**

Tu asistente personal de salud y agenda: recuerda tus medicamentos, organiza tus citas y lee tus recetas médicas con IA, todo desde tu celular.

[![Descargar APK](https://img.shields.io/badge/Descargar-APK%20para%20Android-5B8DEF?style=for-the-badge&logo=android&logoColor=white)](https://numaagenda-glitch.github.io)

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/Datos-SQLite%20local-003B57?logo=sqlite&logoColor=white)
![Plataforma](https://img.shields.io/badge/Plataforma-Android%20%7C%20iOS-4CAF93)

</div>

---

## ¿Qué es Numa?

Numa nació como un bot de Telegram y hoy es una app móvil independiente. Está pensada para cualquier persona —desde estudiantes hasta adultos mayores— que quiere llevar el control de sus medicamentos y compromisos sin complicarse.

Le hablas como a una persona ("tengo cita con el dentista el viernes a las 5"), le tomas foto a tu receta, y Numa se encarga de organizarlo y recordártelo. **Siempre te pide confirmación antes de guardar algo.**

> ⚠️ **Numa no es un médico ni da consejos médicos.** Solo organiza y te recuerda la información que tú o tu doctor ya le dieron.

## ✨ Funciones

| | Función | Qué hace |
|---|---|---|
| 💬 | **Chat con Numa** | Escribe en lenguaje natural y Numa detecta si es una cita médica, un evento familiar, un evento personal o un recordatorio para llamar a alguien. |
| 📷 | **Escanear receta** | Toma una foto de tu receta (impresa o a mano) y la IA transcribe medicamentos, dosis y frecuencia. Si algún dato no se lee bien, te lo pregunta en lugar de inventarlo. |
| 💊 | **Medicamentos** | Agrega, consulta y elimina tus medicamentos. Recibe avisos cada vez que te toca una toma. |
| 📅 | **Citas** | Agenda tus citas con aviso previo y, si lo permites, se agregan también al calendario de tu teléfono. |
| 📈 | **Seguimiento** | Registra cada toma confirmada y ve cuándo fue la última. |
| 📋 | **Historial** | Consulta tus tomas y citas pasadas. |
| 🔄 | **Actualizaciones automáticas** | La app busca nuevas versiones al abrirse y se actualiza sola, sin reinstalar. |

## 🔒 Privacidad

- **Tus datos viven en tu celular.** Medicamentos, citas y tomas se guardan en una base de datos SQLite local; no hay servidor propio de Numa.
- **Tu clave de IA es tuya.** Cada persona usa su propia clave gratuita de [OpenRouter](https://openrouter.ai), que también se guarda solo en el dispositivo.
- Las fotos de recetas se envían a OpenRouter únicamente para transcribirlas.
- La app registra estadísticas de uso anónimas (pantallas visitadas) para mejorar la experiencia.

## 📲 Instalación

### Android
1. Entra a la [página de Numa](https://numaagenda-glitch.github.io) y descarga el APK más reciente.
2. Ábrelo en tu celular y permite la instalación desde fuentes desconocidas si te lo pide.
3. Al abrir Numa por primera vez, escribe tu nombre y tu clave de OpenRouter.

### iOS
Por ahora se instala mediante *sideloading* (SideStore). La versión para App Store llegará más adelante.

### Obtener tu clave de OpenRouter (gratis)
1. Crea una cuenta en [openrouter.ai](https://openrouter.ai).
2. Ve a **Keys** → **Create Key**.
3. Copia la clave (empieza con `sk-or-`) y pégala en Numa, en el onboarding o en **Ajustes**.

## 🛠️ Para desarrolladores

### Tecnologías

- **[Expo](https://expo.dev) SDK 57** + **React Native 0.86** + **TypeScript**
- **Expo Router** para la navegación por archivos
- **expo-sqlite** para el almacenamiento local
- **expo-notifications** y **expo-calendar** para avisos y calendario
- **expo-image-picker** para la cámara y la galería
- **expo-updates** + **EAS** para builds y actualizaciones OTA
- **OpenRouter** (modelos gratuitos con visión) para leer recetas y clasificar mensajes

### Correr el proyecto

```bash
git clone <url-de-este-repositorio>
cd numa-app
npm install
npx expo start
```

Escanea el código QR con un *development build* o con un emulador de Android.

> Las actualizaciones automáticas solo funcionan en la app instalada (APK), no en modo desarrollo.

### Generar un APK

```bash
npx eas build --platform android --profile preview
```

### Publicar una actualización (sin reinstalar)

```bash
npx eas update --channel production --message "Descripción del cambio"
```

### Estructura

```
src/
├── app/              # Pantallas (Expo Router)
│   ├── index.tsx         Inicio: pendientes de hoy y menú
│   ├── onboarding.tsx    Registro inicial (nombre y clave)
│   ├── chat.tsx          Chat en lenguaje natural
│   ├── escanear.tsx      Lectura de recetas con IA
│   ├── medicamentos.tsx  Administrar medicamentos
│   ├── citas.tsx         Administrar citas
│   ├── seguimiento.tsx   Registro de tomas
│   ├── historial.tsx     Tomas y citas pasadas
│   └── ajustes.tsx       Clave, actualizaciones y más
├── api/ia.ts         # Cliente de OpenRouter (texto y visión)
├── db/database.ts    # Esquema y consultas SQLite
├── notificaciones.ts # Recordatorios locales
├── calendario.ts     # Integración con el calendario del teléfono
├── actualizaciones.ts# Actualizaciones OTA
└── components/       # Componentes reutilizables
```

## 👤 Autor

Desarrollado por **Luis Alejandro León Aguilar**, estudiante de Ingeniería en Sistemas Computacionales.

---

<div align="center">
<sub>Hecho con 💙 para que nadie olvide una toma ni una cita.</sub>
</div>
