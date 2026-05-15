import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackButton, { ScreenBackPlaceholder } from './ScreenBackButton';
import { menuColors, homeFonts } from '../constants/homeTheme';

const PAGE_BG = '#F3F6F4';

export default function ProfileSubLayout({ navigation, title, children, showBack = true, rightSlot }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        {showBack ? (
          <ScreenBackButton onPress={() => navigation.goBack()} />
        ) : (
          <ScreenBackPlaceholder />
        )}
        <Text style={styles.topTitle} numberOfLines={1}>
          {title}
        </Text>
        {rightSlot != null ? rightSlot : <ScreenBackPlaceholder />}
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
  topTitle: {
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
  },
});
