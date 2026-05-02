import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './context/AuthContext';
import { TableSessionProvider } from './context/TableSessionContext';
import { CartProvider } from './context/CartContext';
import RootNavigator from './navigation/RootNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AuthProvider>
      <TableSessionProvider>
        <CartProvider>
          <RootNavigator />
        </CartProvider>
      </TableSessionProvider>
    </AuthProvider>
  );
}
