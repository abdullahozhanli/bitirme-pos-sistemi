import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useAuth } from '../context/AuthContext';
import {
  pickProfileImageUri,
  uriToProfileAvatarDataUrl,
} from '../utils/pickProfileAvatar';
import * as LoyaltyPoints from '../utils/loyaltyPoints';
import client from '../api/client';

const PROFILE_GRADIENT = ['#3FA34D', '#66BB6A'];
const PAGE_BG = '#F3F6F4';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser, updateProfile } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [previewPicked, setPreviewPicked] = useState(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const preparedUploadRef = useRef({ uri: null, promise: null });

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
  const hasAvatar = Boolean(user?.avatarUrl?.trim());

  useEffect(() => {
    if (!previewPicked?.uri) {
      preparedUploadRef.current = { uri: null, promise: null };
      return;
    }
    const { uri, mimeType } = previewPicked;
    preparedUploadRef.current = {
      uri,
      promise: uriToProfileAvatarDataUrl(uri, mimeType),
    };
  }, [previewPicked]);

  const pickAvatarFromLibrary = useCallback(async () => {
    const picked = await pickProfileImageUri();
    if (picked) setPreviewPicked(picked);
  }, []);

  const closeAvatarPreview = useCallback(() => {
    setPreviewPicked(null);
  }, []);

  const confirmAvatarPreview = useCallback(async () => {
    if (!previewPicked) return;
    try {
      setAvatarBusy(true);
      let dataUrl = null;
      const prep = preparedUploadRef.current;
      if (prep.uri === previewPicked.uri && prep.promise) {
        dataUrl = await prep.promise;
      }
      if (!dataUrl) {
        dataUrl = await uriToProfileAvatarDataUrl(
          previewPicked.uri,
          previewPicked.mimeType
        );
      }
      if (!dataUrl) return;
      await updateProfile({ avatarUrl: dataUrl });
      setPreviewPicked(null);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Yüklenemedi';
      Alert.alert('Hata', msg);
    } finally {
      setAvatarBusy(false);
    }
  }, [previewPicked, updateProfile]);

  const retryAvatarPick = useCallback(async () => {
    setPreviewPicked(null);
    const picked = await pickProfileImageUri();
    if (picked) setPreviewPicked(picked);
  }, []);

  const clearAvatar = useCallback(async () => {
    try {
      setAvatarBusy(true);
      await updateProfile({ avatarUrl: '' });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Kaldırılamadı';
      Alert.alert('Hata', msg);
    } finally {
      setAvatarBusy(false);
    }
  }, [updateProfile]);

  const openAvatarOptions = useCallback(() => {
    if (avatarBusy) return;
    const buttons = [
      { text: 'Galeriden seç', onPress: () => void pickAvatarFromLibrary() },
      ...(hasAvatar
        ? [{ text: 'Fotoğrafı kaldır', style: 'destructive', onPress: () => void clearAvatar() }]
        : []),
      { text: 'İptal', style: 'cancel' },
    ];
    Alert.alert('Profil fotoğrafı', 'Görselinizi güncelleyin veya kaldırın.', buttons);
  }, [avatarBusy, hasAvatar, pickAvatarFromLibrary, clearAvatar]);

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
          onPress={openAvatarOptions}
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
          <Pressable
            onPress={openAvatarOptions}
            disabled={avatarBusy}
            style={({ pressed }) => [styles.avatarPress, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.avatarWrap}>
              {hasAvatar ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarPhoto}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={PROFILE_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarPhoto}
                >
                  <Ionicons name="person-circle-outline" size={40} color={menuColors.white} />
                </LinearGradient>
              )}
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
              color={menuColors.primaryDark}
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
            <Ionicons name="sparkles-outline" size={18} color={menuColors.primaryDark} />
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
            <Ionicons name="pricetag-outline" size={18} color={menuColors.primaryDark} />
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
        visible={Boolean(previewPicked)}
        transparent
        animationType="fade"
        onRequestClose={closeAvatarPreview}
      >
        <View style={styles.avatarModalBackdrop}>
          <View style={styles.avatarModalCard}>
            <Text style={styles.avatarModalTitle}>Profil fotoğrafı</Text>
            <Text style={styles.avatarModalHint}>
              Profilde kare alanın içinde ortalanarak gösterilir. Uygunsa onaylayın.
            </Text>
            <View style={styles.avatarModalPreviewWrap}>
              {previewPicked?.uri ? (
                <Image
                  source={{ uri: previewPicked.uri }}
                  style={styles.avatarModalPreview}
                  resizeMode="cover"
                />
              ) : null}
            </View>
            <View style={styles.avatarModalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.avatarModalBtnGhost,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={closeAvatarPreview}
              >
                <Text style={styles.avatarModalBtnGhostText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.avatarModalBtnGhost,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => void retryAvatarPick()}
                disabled={avatarBusy}
              >
                <Text style={styles.avatarModalBtnGhostText}>Başka foto</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.avatarModalBtnPrimary,
                (avatarBusy || pressed) && { opacity: avatarBusy ? 0.65 : 0.92 },
              ]}
              disabled={avatarBusy}
              onPress={() => void confirmAvatarPreview()}
            >
              {avatarBusy ? (
                <ActivityIndicator color={menuColors.white} />
              ) : (
                <Text style={styles.avatarModalBtnPrimaryText}>Profilde kullan</Text>
              )}
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
  avatarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  avatarModalCard: {
    backgroundColor: menuColors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  avatarModalTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  avatarModalHint: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  avatarModalPreviewWrap: {
    width: 220,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 18,
    backgroundColor: menuColors.pillMuted,
  },
  avatarModalPreview: {
    width: '100%',
    height: '100%',
  },
  avatarModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarModalBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: menuColors.border,
    backgroundColor: menuColors.card,
  },
  avatarModalBtnGhostText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.text,
  },
  avatarModalBtnPrimary: {
    backgroundColor: menuColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalBtnPrimaryText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.white,
  },
});
