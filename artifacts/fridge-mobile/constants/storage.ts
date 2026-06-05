import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_AIO_KEY      = "aio_key";
const KEY_AIO_USERNAME = "aio_username";

export async function getStoredAioKey(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEY_AIO_KEY);
  return stored ?? process.env.EXPO_PUBLIC_AIO_KEY ?? "";
}

export async function getStoredAioUsername(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEY_AIO_USERNAME);
  return stored ?? process.env.EXPO_PUBLIC_AIO_USERNAME ?? "VinitIOT";
}

export async function saveAioCredentials(key: string, username: string): Promise<void> {
  await AsyncStorage.setItem(KEY_AIO_KEY, key.trim());
  await AsyncStorage.setItem(KEY_AIO_USERNAME, username.trim());
}

export async function clearAioCredentials(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_AIO_KEY, KEY_AIO_USERNAME]);
}
