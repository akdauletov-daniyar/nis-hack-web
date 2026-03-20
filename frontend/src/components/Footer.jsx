import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-dark text-gray-300 py-12 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-extrabold text-white mb-4">sonar</h2>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              {t('footer_desc')}
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">{t('footer_platform')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-primary transition-colors">{t('footer_signInReg')}</Link></li>
              <li><Link to="/" className="hover:text-primary transition-colors">{t('footer_interactiveMap')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">{t('footer_legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">{t('footer_privacyPolicy')}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t('footer_termsService')}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} sonar. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="https://github.com/akdauletov-daniyar" target="_blank" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
