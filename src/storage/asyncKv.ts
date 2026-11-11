import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "./kv";

/** Único punto que toca AsyncStorage: escenario de la demo y override del tema. */
export const asyncStorageKv: KeyValueStorage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
};
