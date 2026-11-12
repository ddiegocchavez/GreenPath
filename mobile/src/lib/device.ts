/** Identificador estable del dispositivo (UUID v4 generado al instalar) y su nombre. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

const KEY = 'greenpath.device_id';

export async function getDeviceId(): Promise<string> {
  const saved = await AsyncStorage.getItem(KEY);
  if (saved) return saved;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY, id);
  return id;
}

export function getDeviceLabel(): string {
  const name = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ');
  return (Device.isDevice ? name : `${name} (emulador)`).trim().slice(0, 80) || 'Android';
}
