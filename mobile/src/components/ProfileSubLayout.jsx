import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { menuColors, homeFonts, pressScale } from '../constants/homeTheme';

const PAGE_BG = '#F3F6F4';

export default function ProfileSubLayout({ navigation, title, children, showBack = true, rightSlot }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        {showBack ? (
          <Pressable
            style={({ pressed }) => [styles.topIconBtn, pressScale(pressed)]}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color={menuColors.text} />
          </Pressable>
        ) : (
          <View style={styles.topIconBtn} />
        )}
        <Text style={styles.topTitle} numberOfLines={1}>
          {title}
        </Text>
        {rightSlot != null ? rightSlot : <View style={styles.topIconBtn} />}
      </View>
      {children}
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
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
  },
});
