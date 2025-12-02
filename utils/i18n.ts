import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";

import en from "@/locales/en.json";
import sv from "@/locales/sv.json";
import ar from "@/locales/ar.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import ru from "@/locales/ru.json";

const LANGUAGE_KEY = "@quickfix_language";

export const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

const resources = {
  en: { translation: en },
  sv: { translation: sv },
  ar: { translation: ar },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
};

const getDeviceLanguage = (): LanguageCode => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || "en";
  const supportedLanguage = languages.find((l) => l.code === deviceLocale);
  return supportedLanguage ? supportedLanguage.code : "en";
};

export const getSavedLanguage = async (): Promise<LanguageCode> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && languages.some((l) => l.code === savedLanguage)) {
      return savedLanguage as LanguageCode;
    }
    return getDeviceLanguage();
  } catch {
    return getDeviceLanguage();
  }
};

export const saveLanguage = async (languageCode: LanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
  } catch (error) {
    console.error("Failed to save language preference:", error);
  }
};

export const isRTL = (languageCode: string): boolean => {
  return languageCode === "ar";
};

export const changeLanguage = async (languageCode: LanguageCode): Promise<void> => {
  await saveLanguage(languageCode);
  await i18n.changeLanguage(languageCode);
  
  const shouldBeRTL = isRTL(languageCode);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
};

export const initializeI18n = async (): Promise<void> => {
  const savedLanguage = await getSavedLanguage();
  
  const shouldBeRTL = isRTL(savedLanguage);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4",
  });
};

export default i18n;
