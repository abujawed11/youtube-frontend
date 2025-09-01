import { Stack } from "expo-router";
import { AppProvider } from "../src/contexts/AppContext";
import { AuthProvider } from "../src/contexts/AuthContext";
import "../global.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="player/[id]" 
            options={{ 
              presentation: "fullScreenModal",
              headerShown: false 
            }} 
          />
        </Stack>
      </AppProvider>
    </AuthProvider>
  );
}
