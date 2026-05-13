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
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import LoyaltyPointsScreen from '../screens/LoyaltyPointsScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import HelpFaqScreen from '../screens/HelpFaqScreen';
import ContactScreen from '../screens/ContactScreen';
import BranchListScreen from '../screens/BranchListScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, ready, user } = useAuth();

  const needsStrongPassword =
    Boolean(token) &&
    Boolean(user) &&
    user.passwordMeetsPolicy !== true;

  const stackKey = !token ? 'guest' : needsStrongPassword ? 'forcePwd' : 'app';

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
        key={stackKey}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: menuColors.bg },
        }}
      >
        {token ? (
          needsStrongPassword ? (
            <Stack.Screen
              name="MandatoryPasswordUpgrade"
              component={ChangePasswordScreen}
              initialParams={{ forcePasswordUpgrade: true }}
              options={{ gestureEnabled: false, animation: 'fade' }}
            />
          ) : (
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
            <Stack.Screen
              name="BranchList"
              component={BranchListScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="OrderHistory"
              component={OrderHistoryScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="Favorites"
              component={FavoritesScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="LanguageSettings"
              component={LanguageSettingsScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="LoyaltyPoints"
              component={LoyaltyPointsScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="Campaigns"
              component={CampaignsScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="HelpFaq"
              component={HelpFaqScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
            <Stack.Screen
              name="Contact"
              component={ContactScreen}
              options={{ animation: 'slide_from_right', animationDuration: 260 }}
            />
          </>
          )
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
