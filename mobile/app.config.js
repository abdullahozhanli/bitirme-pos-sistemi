/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const allowHttp = process.env.EXPO_PUBLIC_ALLOW_HTTP === 'true';

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      eas: {
        projectId: '70f3b49d-1847-4724-bee1-cf1e826e8d2f',
      },
    },
    android: {
      ...appJson.expo.android,
      // Production: HTTPS kullanın; HTTP yalnızca EXPO_PUBLIC_ALLOW_HTTP=true ile
      usesCleartextTraffic: allowHttp,
    },
  },
};
