import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';

const STORAGE_KEY = 'selfkasa_notif_prefs_v1';

const defaultPrefs = {
  orderStatus: true,
  campaigns: true,
};

export default function NotificationSettingsScreen({ navigation }) {
  const [prefs, setPrefs] = useState(defaultPrefs);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (cancelled || !raw) return;
          const p = JSON.parse(raw);
          if (p && typeof p === 'object') {
            setPrefs({
              orderStatus: p.orderStatus !== false,
              campaigns: p.campaigns !== false,
            });
          }
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function persist(next) {
    setPrefs(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      Alert.alert('Kayıt', 'Tercihler kaydedilemedi.');
    }
  }

  return (
    <ProfileSubLayout navigation={navigation} title="Bildirim tercihleri">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          Tercihler bu cihazda saklanır. Tam anlık bildirim desteği için sistem izinlerini de
          açmanız gerekir.
        </Text>
        <View style={[styles.card, uiShadow.card]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Sipariş durumu</Text>
              <Text style={styles.rowSub}>Hazırlık ve servis güncellemeleri (yakında)</Text>
            </View>
            <Switch
              value={prefs.orderStatus}
              onValueChange={(v) => persist({ ...prefs, orderStatus: v })}
              trackColor={{ false: menuColors.border, true: 'rgba(63,163,77,0.45)' }}
              thumbColor={prefs.orderStatus ? menuColors.primary : '#f4f4f5'}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Kampanyalar</Text>
              <Text style={styles.rowSub}>İndirim ve kampanya duyuruları</Text>
            </View>
            <Switch
              value={prefs.campaigns}
              onValueChange={(v) => persist({ ...prefs, campaigns: v })}
              trackColor={{ false: menuColors.border, true: 'rgba(63,163,77,0.45)' }}
              thumbColor={prefs.campaigns ? menuColors.primary : '#f4f4f5'}
            />
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.reset, pressScale(pressed)]}
          onPress={() => void persist(defaultPrefs)}
        >
          <Text style={styles.resetText}>Varsayılanlara dön</Text>
        </Pressable>
      </ScrollView>
    </ProfileSubLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  intro: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
  rowSub: {
    marginTop: 4,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
    lineHeight: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: menuColors.border,
    marginLeft: 14,
  },
  reset: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resetText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.primaryDark,
  },
});
