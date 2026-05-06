import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { ComicNeue_300Light } from '@expo-google-fonts/comic-neue/300Light';
import { ComicNeue_400Regular } from '@expo-google-fonts/comic-neue/400Regular';
import { ComicNeue_700Bold } from '@expo-google-fonts/comic-neue/700Bold';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './context/AuthContext';
import { TableSessionProvider } from './context/TableSessionContext';
import { CartProvider } from './context/CartContext';
import RootNavigator from './navigation/RootNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    ComicNeue_300Light,
    ComicNeue_400Regular,
    ComicNeue_700Bold,
  });

  // Font indirme uzun sürerse (ör. 6sn) yine de UI'yi açalım, sonsuz beklemeyi engeller.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded || !!fontError || fontTimeout;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AuthProvider>
        <TableSessionProvider>
          <CartProvider>
            <RootNavigator />
          </CartProvider>
        </TableSessionProvider>
      </AuthProvider>
    </View>
  );
}
