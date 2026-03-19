import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    settings: 'Settings',
    profile: 'Profile',
    appearance: 'Appearance',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    save: 'Save Changes',
    saved: 'Saved!',
    email: 'Email',
    role: 'Role',
    signOut: 'Sign Out',
    settingsDesc: 'Manage your account preferences and customize your experience.',
    profileDesc: 'Your account information synced from the authentication provider.',
    appearanceDesc: 'Customize how the platform looks and feels for you.',
    languageDesc: 'Choose your preferred display language.',
    themeDesc: 'Select a color scheme for the interface.',
    citizen: 'Citizen',
    government: 'Government',
    emergency: 'Rescue Service',
    volunteer: 'Volunteer',
    admin: 'Administrator',
    dashboard: 'Dashboard',
    welcomeBack: 'Welcome back',
  },
  ru: {
    settings: 'Настройки',
    profile: 'Профиль',
    appearance: 'Внешний вид',
    language: 'Язык',
    theme: 'Тема',
    light: 'Светлая',
    dark: 'Тёмная',
    system: 'Системная',
    save: 'Сохранить',
    saved: 'Сохранено!',
    email: 'Эл. почта',
    role: 'Роль',
    signOut: 'Выйти',
    settingsDesc: 'Управляйте настройками аккаунта и настройте интерфейс.',
    profileDesc: 'Информация вашего аккаунта из системы аутентификации.',
    appearanceDesc: 'Настройте внешний вид платформы под себя.',
    languageDesc: 'Выберите предпочтительный язык интерфейса.',
    themeDesc: 'Выберите цветовую схему для интерфейса.',
    citizen: 'Гражданин',
    government: 'Гос. орган',
    emergency: 'Спасательная служба',
    volunteer: 'Волонтёр',
    admin: 'Администратор',
    dashboard: 'Панель управления',
    welcomeBack: 'С возвращением',
  },
  kk: {
    settings: 'Баптаулар',
    profile: 'Профиль',
    appearance: 'Сыртқы түрі',
    language: 'Тіл',
    theme: 'Тақырып',
    light: 'Жарық',
    dark: 'Қараңғы',
    system: 'Жүйелік',
    save: 'Сақтау',
    saved: 'Сақталды!',
    email: 'Эл. пошта',
    role: 'Рөл',
    signOut: 'Шығу',
    settingsDesc: 'Аккаунт баптауларын басқарыңыз және тәжірибеңізді теңшеңіз.',
    profileDesc: 'Аутентификация жүйесінен алынған аккаунт ақпараты.',
    appearanceDesc: 'Платформаның сыртқы түрін реттеңіз.',
    languageDesc: 'Қалаған интерфейс тілін таңдаңыз.',
    themeDesc: 'Интерфейс үшін түс схемасын таңдаңыз.',
    citizen: 'Азамат',
    government: 'Мемлекеттік орган',
    emergency: 'Құтқару қызметі',
    volunteer: 'Волонтёр',
    admin: 'Әкімші',
    dashboard: 'Басқару тақтасы',
    welcomeBack: 'Қош келдіңіз',
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app-language') || 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
