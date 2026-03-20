import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Palette, Globe, Sun, Moon, Monitor, Check } from 'lucide-react';

const Settings = () => {
  const { user, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themeOptions = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ];

  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'ru', label: 'Русский', flag: '🇷🇺' },
    { value: 'kk', label: 'Қазақша', flag: '🇰🇿' },
  ];

  const roleLabels = {
    citizen: t('citizen'),
    government: t('government'),
    emergency: t('emergency'),
    volunteer: t('volunteer'),
    admin: t('admin'),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-dark dark:text-white tracking-tight">{t('settings')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{t('settingsDesc')}</p>
      </header>

      {/* Profile Section */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <User size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-dark dark:text-white">{t('profile')}</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('profileDesc')}</p>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('email')}</span>
            <span className="text-sm font-semibold text-dark dark:text-white mt-1 sm:mt-0">{user?.email || '—'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('role')}</span>
            <span className="px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wide bg-primary/10 text-primary">
              {roleLabels[role] || role || '—'}
            </span>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette size={20} className="text-secondary" />
          <h2 className="text-lg font-bold text-dark dark:text-white">{t('appearance')}</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('themeDesc')}</p>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(opt => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <Icon size={24} className="mb-2" />
                <span className="text-sm font-bold">{opt.label}</span>
                {isActive && <Check size={14} className="mt-1 text-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Language Section */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe size={20} className="text-primary-alt" />
          <h2 className="text-lg font-bold text-dark dark:text-white">{t('language')}</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('languageDesc')}</p>

        <div className="grid grid-cols-3 gap-3">
          {languageOptions.map(opt => {
            const isActive = language === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setLanguage(opt.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl mb-1">{opt.flag}</span>
                <span className="text-sm font-bold">{opt.label}</span>
                {isActive && <Check size={14} className="mt-1 text-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end mb-10">
        <button
          onClick={handleSave}
          className={`px-8 py-3 rounded-xl font-bold text-white transition-all duration-200 ${
            saved
              ? 'bg-green-500'
              : 'bg-primary hover:bg-primary-alt shadow-lg hover:shadow-xl hover:-translate-y-0.5'
          }`}
        >
          {saved ? `✓ ${t('saved')}` : t('save')}
        </button>
      </div>
    </div>
  );
};

export default Settings;
