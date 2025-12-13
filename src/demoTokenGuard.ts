import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_USER_KEY = 'quickfix_local_user';

export async function cleanLegacyDemoToken() {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token && token.startsWith('demo_')) {
      console.warn('[demoTokenGuard] Removing legacy demo token from storage.');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem(LOCAL_USER_KEY);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[demoTokenGuard] Failed to clean demo token:', e);
    return false;
  }
}
