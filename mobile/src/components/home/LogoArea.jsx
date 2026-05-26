import { Image, StyleSheet, View } from 'react-native';

export default function LogoArea() {
  return (
    <View style={styles.row}>
      <View style={styles.frame}>
        <Image
          source={require('../../görsel/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  frame: {
    width: 146,
    height: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logo: {
    width: 146,
    height: 44,
    opacity: 0.98,
    marginTop: -4,
  },
});
