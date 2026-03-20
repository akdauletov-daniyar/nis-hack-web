import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Map, ListChecks, BellRing, BarChart3, Users, ShieldAlert, Award, FileText, Settings, Menu, X } from 'lucide-react';

const Sidebar = () => {
  const { role, user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Define links based on roles
  const commonLinks = [
    { to: '/dashboard', label: t('nav_myHub'), icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] }
  ];

  const citizenLinks = [
    { to: '/citizen', label: t('nav_routingMap'), icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] },
    { to: '/events-map', label: t('nav_eventsMap'), icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] }
  ];

  const volunteerLinks = [
    { to: '/volunteer', label: t('nav_volunteerBoard'), icon: Award, roles: ['volunteer'] }
  ];

  const emergencyLinks = [
    { to: '/emergency', label: t('nav_emergencies'), icon: ShieldAlert, roles: ['emergency', 'admin'] }
  ];

  const governmentLinks = [
    // { to: '/government', label: 'City Analytics', icon: BarChart3, roles: ['government', 'admin'] }
  ];

  const adminLinks = [];

  const allLinks = [
    ...commonLinks,
    ...citizenLinks,
    ...volunteerLinks,
    ...emergencyLinks,
    ...governmentLinks,
    ...adminLinks
  ];

  // Filter links by current user's role
  const visibleLinks = allLinks.filter(link => link.roles.includes(role));

  if (!user) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="md:hidden fixed bottom-6 left-6 p-3 bg-primary text-white rounded-full shadow-lg z-50 transition-transform hover:scale-105"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:sticky top-0 md:top-20 left-0 w-64 h-screen md:h-[calc(100vh-5rem)] bg-white border-r border-gray-100 shadow-sm z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <div className="mb-6 px-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('sidebar_navigation')}</h2>
          </div>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            // Using a hack to handle active state with NavLink
            return (
              <NavLink
                key={link.to + link.label}
                to={link.to}
                end={link.to === '/dashboard' || link.to === '/citizen'} // Exact match for base routes
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/10 text-primary shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--app-text)]'
                  }`
                }
              >
                <Icon size={20} className="stroke-[2.5px]" />
                {link.label}
              </NavLink>
            );
          })}
        </div>
        
        {/* Role Badge pinned at bottom */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {role ? role[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-sm font-bold text-dark truncate">{t('sidebar_activeRole')}</p>
              <p className="text-xs text-gray-500 capitalize">{role ? t(role) : t('nav_pending')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
