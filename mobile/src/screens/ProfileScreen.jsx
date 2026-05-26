import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenBackButton from '../components/ScreenBackButton';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useAuth } from '../context/AuthContext';
import {
  pickProfileImageUri,
  prepareProfileAvatarFileUri,
} from '../utils/pickProfileAvatar';
import ProfileAvatar from '../components/ProfileAvatar';
import { isUnauthorizedError } from '../api/authSession';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import * as LoyaltyPoints from '../utils/loyaltyPoints';
import client from '../api/client';

const PAGE_BG = '#F3F6F4';
/** Mat, doygun siyah — yeşil ikon kutusu içinde */
const PROFILE_ICON = '#1A1A1A';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser, uploadProfileAvatar, removeProfileAvatar } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      let cancelled = false;
      (async () => {
        try {
          const res = await client.get('/api/orders/mine', { params: { limit: 1, page: 1 } });
          if (!cancelled) setOrderTotal(Number(res.data?.total) || 0);
        } catch {
          if (!cancelled) setOrderTotal(0);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshUser])
  );
  const displayName = user?.name?.trim() || 'Misafir';
  const loyaltyPoints = LoyaltyPoints.getLoyaltyPoints(user);
  const hasAvatar = Boolean(String(user?.avatarUrl || '').trim());

  const pickAndUploadAvatar = useCallback(async () => {
    const picked = await pickProfileImageUri();
    if (!picked?.uri) return;
    try {
      setAvatarBusy(true);
      const fileUri = await prepareProfileAvatarFileUri(picked.uri);
      await uploadProfileAvatar(fileUri);
    } catch (e) {
      if (!isUnauthorizedError(e)) {
        Alert.alert('Hata', apiErrorMessage(e, 'Yüklenemedi'));
      }
    } finally {
      setAvatarBusy(false);
    }
  }, [uploadProfileAvatar]);

  const clearAvatar = useCallback(async () => {
    try {
      setAvatarBusy(true);
      await removeProfileAvatar();
    } catch (e) {
      if (!isUnauthorizedError(e)) {
        Alert.alert('Hata', apiErrorMessage(e, 'Kaldırılamadı'));
      }
    } finally {
      setAvatarBusy(false);
    }
  }, [removeProfileAvatar]);

  const closeAvatarSheet = useCallback(() => setAvatarSheetOpen(false), []);

  const openAvatarOptions = useCallback(() => {
    if (avatarBusy) return;
    setAvatarSheetOpen(true);
  }, [avatarBusy]);

  const onSheetPickGallery = useCallback(() => {
    setAvatarSheetOpen(false);
    void pickAndUploadAvatar();
  }, [pickAndUploadAvatar]);

  const onSheetRemovePhoto = useCallback(() => {
    setAvatarSheetOpen(false);
    void clearAvatar();
  }, [clearAvatar]);

  function AvatarSheetOption({ icon, label, hint, onPress, muted }) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.sheetOption,
          pressed && styles.sheetOptionPressed,
        ]}
        onPress={onPress}
      >
        <View style={styles.sheetOptionIcon}>
          <Ionicons
            name={icon}
            size={19}
            color={muted ? '#6B7280' : '#111827'}
          />
        </View>
        <View style={styles.sheetOptionTextWrap}>
          <Text style={[styles.sheetOptionLabel, muted && styles.sheetOptionLabelMuted]}>
            {label}
          </Text>
          {hint ? <Text style={styles.sheetOptionHint}>{hint}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={menuColors.textMutedLight} />
      </Pressable>
    );
  }

  function MenuRow({ icon, label, onPress }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.rowItem, pressScale(pressed)]}
        onPress={onPress}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIconBox}>
            <Ionicons name={icon} size={17} color={PROFILE_ICON} />
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
        <ScreenBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topTitle}>Profilim</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.summaryCard, uiShadow.card]}>
          <Pressable
            onPress={openAvatarOptions}
            disabled={avatarBusy}
            style={({ pressed }) => [styles.avatarPress, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.avatarWrap}>
              <ProfileAvatar
                avatarUrl={user?.avatarUrl}
                size={78}
                borderRadius={24}
                variant="profile"
                style={styles.avatarPhoto}
              />
              {avatarBusy ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color={menuColors.white} size="small" />
                </View>
              ) : null}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color={menuColors.white} />
              </View>
            </View>
          </Pressable>
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
              color={PROFILE_ICON}
            />
            <Text style={styles.statsText}>Toplam sipariş: {orderTotal}</Text>
          </View>
        </View>

        <View style={styles.dualRow}>
          <Pressable
            style={({ pressed }) => [
              styles.miniCard,
              uiShadow.card,
              pressScale(pressed),
            ]}
            onPress={() => navigation.navigate('LoyaltyPoints')}
          >
            <Ionicons name="sparkles-outline" size={18} color={PROFILE_ICON} />
            <Text style={styles.miniTitle}>Puanlarım</Text>
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
            onPress={() => navigation.navigate('Campaigns')}
          >
            <Ionicons name="pricetag-outline" size={18} color={PROFILE_ICON} />
            <Text style={styles.miniTitle}>Kampanyalarım</Text>
            <Text style={styles.miniDesc}>Sepet tutarına göre indirim seçenekleri</Text>
          </Pressable>
        </View>

        <View style={[styles.groupCard, uiShadow.card]}>
          <Text style={styles.groupTitle}>Siparislerim</Text>
          <MenuRow
            icon="time-outline"
            label="Geçmiş siparişler"
            onPress={() => navigation.navigate('BranchList', { intent: 'pastOrders' })}
          />
          <MenuRow
            icon="heart-outline"
            label="Favorilerim"
            onPress={() => navigation.navigate('BranchList', { intent: 'favorites' })}
          />
          <MenuRow
            icon="refresh-outline"
            label="Tekrar sipariş ver"
            onPress={() => navigation.navigate('BranchList', { intent: 'reorder' })}
          />
        </View>

        <View style={[styles.groupCard, uiShadow.card]}>
          <Text style={styles.groupTitle}>Ayarlar</Text>
          <MenuRow
            icon="key-outline"
            label="Şifre değiştir"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuRow
            icon="notifications-outline"
            label="Bildirim tercihleri"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <MenuRow
            icon="language-outline"
            label="Dil"
            onPress={() => navigation.navigate('LanguageSettings')}
          />
        </View>

        <View style={[styles.groupCard, uiShadow.card]}>
          <Text style={styles.groupTitle}>Destek</Text>
          <MenuRow
            icon="help-circle-outline"
            label="Yardım ve destek"
            onPress={() => navigation.navigate('HelpFaq')}
          />
          <MenuRow
            icon="chatbubble-ellipses-outline"
            label="İletişim"
            onPress={() => navigation.navigate('Contact')}
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

      <Modal
        visible={avatarSheetOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeAvatarSheet}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={closeAvatarSheet} />
          <View style={styles.sheetPanel}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profil fotoğrafı</Text>
            <Text style={styles.sheetSubtitle}>
              Galeriden yeni bir görsel seçin veya mevcut fotoğrafı kaldırın.
            </Text>

            <View style={styles.sheetOptionsCard}>
              <AvatarSheetOption
                icon="images-outline"
                label="Galeriden seç"
                hint="Hızlı yükleme, otomatik boyutlandırma"
                onPress={onSheetPickGallery}
              />
              {hasAvatar ? (
                <>
                  <View style={styles.sheetOptionDivider} />
                  <AvatarSheetOption
                    icon="trash-outline"
                    label="Fotoğrafı kaldır"
                    hint="Profil görseli varsayılana döner"
                    onPress={onSheetRemovePhoto}
                    muted
                  />
                </>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.sheetCancelBtn,
                pressScale(pressed),
              ]}
              onPress={closeAvatarSheet}
            >
              <Text style={styles.sheetCancelText}>Vazgeç</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  topTitle: {
    flex: 1,
    marginRight: 40,
    textAlign: 'center',
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
  avatarPress: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarPhoto: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(17,24,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetPanel: {
    backgroundColor: PAGE_BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  sheetOptionsCard: {
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    overflow: 'hidden',
    marginBottom: 12,
    ...uiShadow.card,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  sheetOptionPressed: {
    backgroundColor: menuColors.bgSoft,
  },
  sheetOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetOptionLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#111827',
  },
  sheetOptionLabelMuted: {
    color: '#4B5563',
  },
  sheetOptionHint: {
    marginTop: 2,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textMuted,
  },
  sheetOptionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: menuColors.border,
    marginLeft: 66,
  },
  sheetCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: menuColors.card,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  sheetCancelText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
});
