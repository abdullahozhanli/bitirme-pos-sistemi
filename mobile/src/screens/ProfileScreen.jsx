import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useAuth, showComingSoon } from '../context/AuthContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';

const PROFILE_GRADIENT = ['#3FA34D', '#66BB6A'];
const PAGE_BG = '#F3F6F4';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );
  const displayName = user?.name?.trim() || 'Misafir';
  const orderCount = 12;
  const loyaltyPoints = getLoyaltyPoints(user);

  function MenuRow({ icon, label, onPress }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.rowItem, pressScale(pressed)]}
        onPress={onPress}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIconBox}>
            <Ionicons name={icon} size={17} color={menuColors.primaryDark} />
          </View>
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={17}
          color={menuColors.textMutedLight}
        />
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.topIconBtn, pressScale(pressed)]}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={20} color={menuColors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Profilim</Text>
        <Pressable
          style={({ pressed }) => [styles.topIconBtn, pressScale(pressed)]}
          onPress={() => showComingSoon('Profili duzenle')}
          hitSlop={10}
        >
          <Ionicons name="create-outline" size={18} color={menuColors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.summaryCard, uiShadow.card]}>
          <LinearGradient
            colors={PROFILE_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Ionicons name="person-outline" size={34} color={menuColors.white} />
          </LinearGradient>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email || '—'}</Text>
          {user?.role && user.role !== 'musteri' ? (
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{user.role}</Text>
            </View>
          ) : null}
          <View style={styles.statsRow}>
            <Ionicons
              name="bag-check-outline"
              size={16}
              color={menuColors.primaryDark}
            />
            <Text style={styles.statsText}>Toplam Siparis: {orderCount}</Text>
          </View>
        </View>

        <View style={styles.dualRow}>
          <Pressable
            style={({ pressed }) => [
              styles.miniCard,
              uiShadow.card,
              pressScale(pressed),
            ]}
            onPress={() => showComingSoon('Puanlarim')}
          >
            <Ionicons name="sparkles-outline" size={18} color={menuColors.primaryDark} />
            <Text style={styles.miniTitle}>Puanlarim</Text>
            <Text style={styles.miniDesc}>
              {loyaltyPoints} puan biriktirdin
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.miniCard,
              uiShadow.card,
              pressScale(pressed),
            ]}
            onPress={() => showComingSoon('Kampanyalarim')}
          >
            <Ionicons name="pricetag-outline" size={18} color={menuColors.primaryDark} />
            <Text style={styles.miniTitle}>Kampanyalarim</Text>
            <Text style={styles.miniDesc}>Ilk siparise %20 indirim aktif</Text>
          </Pressable>
        </View>

        <View style={[styles.groupCard, uiShadow.card]}>
          <Text style={styles.groupTitle}>Siparislerim</Text>
          <MenuRow
            icon="time-outline"
            label="Gecmis Siparisler"
            onPress={() => showComingSoon('Gecmis Siparisler')}
          />
          <MenuRow
            icon="heart-outline"
            label="Favorilerim"
            onPress={() => showComingSoon('Favorilerim')}
          />
          <MenuRow
            icon="refresh-outline"
            label="Tekrar Siparis Ver"
            onPress={() => showComingSoon('Tekrar Siparis Ver')}
          />
        </View>

        <View style={[styles.groupCard, uiShadow.card]}>
          <Text style={styles.groupTitle}>Ayarlar</Text>
          <MenuRow
            icon="key-outline"
            label="Sifre Degistir"
            onPress={() => showComingSoon('Sifre Degistir')}
          />
          <MenuRow
            icon="notifications-outline"
            label="Bildirim Tercihleri"
            onPress={() => showComingSoon('Bildirim Tercihleri')}
          />
          <MenuRow
            icon="language-outline"
            label="Dil"
            onPress={() => showComingSoon('Dil')}
          />
        </View>

        <View style={[styles.groupCard, uiShadow.card]}>
          <Text style={styles.groupTitle}>Destek</Text>
          <MenuRow
            icon="help-circle-outline"
            label="Yardim ve Destek"
            onPress={() => showComingSoon('Yardim ve Destek')}
          />
          <MenuRow
            icon="chatbubble-ellipses-outline"
            label="Iletisim"
            onPress={() => showComingSoon('Iletisim')}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressScale(pressed)]}
          onPress={async () => {
            await logout();
          }}
        >
          <Ionicons name="log-out-outline" size={17} color="#B91C1C" />
          <Text style={styles.logoutText}>Cikis Yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: menuColors.card,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  topTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  summaryCard: {
    backgroundColor: menuColors.card,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: menuColors.border,
    marginBottom: 14,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 21,
    color: menuColors.text,
    marginBottom: 4,
  },
  email: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    marginBottom: 8,
  },
  roleChip: {
    backgroundColor: 'rgba(63,163,77,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  roleChipText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: menuColors.primaryDark,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statsText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: menuColors.primaryDark,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  miniCard: {
    flex: 1,
    backgroundColor: menuColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  miniTitle: {
    marginTop: 10,
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.text,
    marginBottom: 4,
  },
  miniDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: menuColors.textSecondary,
  },
  groupCard: {
    backgroundColor: menuColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  groupTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: menuColors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(63,163,77,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.text,
  },
  logoutBtn: {
    marginTop: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.2)',
    backgroundColor: 'rgba(185,28,28,0.06)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  logoutText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#B91C1C',
  },
});
