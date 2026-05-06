import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';
import { menuColors } from '../constants/homeTheme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MenuScreen from '../screens/MenuScreen';
import CartScreen from '../screens/CartScreen';
import CalorieEstimateScreen from '../screens/CalorieEstimateScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={menuColors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: menuColors.bg },
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Menu"
              component={MenuScreen}
              options={{
                animation: 'slide_from_right',
                animationDuration: 260,
              }}
            />
            <Stack.Screen
              name="Cart"
              component={CartScreen}
              options={{
                animation: 'slide_from_right',
                animationDuration: 260,
              }}
            />
            <Stack.Screen
              name="CalorieEstimate"
              component={CalorieEstimateScreen}
              options={{
                animation: 'slide_from_right',
                animationDuration: 260,
              }}
            />
            <Stack.Screen
              name="QRScanner"
              component={QRScannerScreen}
              options={{
                animation: 'fade_from_bottom',
                animationDuration: 280,
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                animation: 'fade_from_bottom',
                animationDuration: 280,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
