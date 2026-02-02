// react-native-reanimated kirjaston vaatima konfiguraatio drag&drop animaatioiden toimimiseksi

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  }
}