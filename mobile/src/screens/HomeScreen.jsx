import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAuth, showComingSoon } from '../context/AuthContext';
import { useTableSession } from '../context/TableSessionContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';
import LogoArea from '../components/home/LogoArea';
import ProfileCard from '../components/home/ProfileCard';
import ScanQrCard from '../components/home/ScanQrCard';
import ConnectedTableCard from '../components/home/ConnectedTableCard';
import CampaignCard from '../components/home/CampaignCard';
import { homeCardTheme } from '../components/home/homeTheme';

const DEFAULT_CAMPAIGNS = 3;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const {
    tableSession,
    isTableConnected,
    sessionReady,
    clearTableSession,
    refreshTableSession,
  } = useTableSession();

  const points = getLoyaltyPoints(user);
  const campaignCount = user?.campaignsCount ?? user?.campaignCount ?? DEFAULT_CAMPAIGNS;

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      refreshTableSession();
    }, [refreshUser, refreshTableSession])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LogoArea />

        <ProfileCard
          user={user}
          points={points}
          campaignCount={campaignCount}
          onPress={() => navigation.navigate('Profile')}
        />

        {!sessionReady ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={homeCardTheme.primary} />
          </View>
        ) : isTableConnected && tableSession ? (
          <ConnectedTableCard
            session={tableSession}
            onRemove={clearTableSession}
            onGoMenu={() => navigation.navigate('Menu')}
            onScanAgain={() => navigation.navigate('QRScanner')}
          />
        ) : (
          <ScanQrCard onScanPress={() => navigation.navigate('QRScanner')} />
        )}

        <CampaignCard onPress={() => showComingSoon('Kampanya detaylari')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: homeCardTheme.pageBg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  loadingWrap: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});
