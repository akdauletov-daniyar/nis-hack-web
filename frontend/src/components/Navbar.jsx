import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Map, ListChecks, BellRing, BarChart3, Users, ShieldAlert, Award, FileText, Settings, LogOut, Info, Sun, Moon, User, Brain, Wind, FilterX, Accessibility, Plug, Car } from 'lucide-react';

const Navbar = () => {
  const { user, role, signOut } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const modelsDropdownRef = useRef(null);
  const modelsTimeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (modelsDropdownRef.current && !modelsDropdownRef.current.contains(event.target)) {
        setShowModelsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelsEnter = () => {
    if (modelsTimeoutRef.current) clearTimeout(modelsTimeoutRef.current);
    setShowModelsDropdown(true);
  };
  const handleModelsLeave = () => {
    modelsTimeoutRef.current = setTimeout(() => setShowModelsDropdown(false), 200);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const modelLinks = [
    { to: '/models/air-quality', label: 'Air Quality Model', icon: Wind },
    { to: '/models/data-preprocessing', label: 'Data Preprocessing', icon: FilterX },
    { to: '/models/geoai-accessibility', label: 'GeoAI Accessibility', icon: Accessibility },
    { to: '/models/integration-service', label: 'Integration Service', icon: Plug },
    { to: '/models/traffic-model', label: 'Traffic Model', icon: Car },
  ];

  const commonLinks = [
    { to: '/dashboard', label: 'My Hub', icon: Map, roles: ['volunteer', 'emergency', 'government', 'admin'] }
  ];
  const citizenLinks = [
    { to: '/citizen', label: 'Routing & Map', icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] },
    { to: '/events-map', label: 'Events Map', icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] }
  ];
  const volunteerLinks = [
    { to: '/volunteer', label: 'Volunteer Board', icon: Award, roles: ['volunteer'] }
  ];
  const emergencyLinks = [
    { to: '/emergency', label: 'Emergencies', icon: ShieldAlert, roles: ['emergency', 'admin'] }
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

  const visibleLinks = allLinks.filter(link => link.roles.includes(role));

  return (
    <nav className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 z-50 transition-all duration-300 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex flex-1 items-center gap-8 overflow-x-auto no-scrollbar">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
              <img src="/app-logo.png" alt="sonar Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-300" />
              <span className="text-xl font-extrabold text-dark tracking-tight hidden sm:block">sonar</span>
            </Link>

            {/* Navigation Links moved from Sidebar */}
            {user && (
              <div className="flex space-x-1">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to + link.label}
                      to={link.to}
                      end={link.to === '/dashboard' || link.to === '/citizen'}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--app-text)]'
                        }`
                      }
                    >
                      <Icon size={16} className="stroke-[2.5px]" />
                      <span className="hidden md:inline">{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6 relative ml-4">

            {/* AI Models Hover Dropdown */}
            <div
              className="relative"
              ref={modelsDropdownRef}
              onMouseEnter={handleModelsEnter}
              onMouseLeave={handleModelsLeave}
            >
              <button className="text-sm font-bold text-dark hover:text-primary transition-colors flex items-center gap-1.5 hidden sm:flex">
                <Brain size={16} /> AI Models
              </button>
              {showModelsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {modelLinks.map((ml) => {
                    const MIcon = ml.icon;
                    return (
                      <Link
                        key={ml.to}
                        to={ml.to}
                        onClick={() => setShowModelsDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary transition-colors"
                      >
                        <MIcon size={16} className="text-primary" />
                        {ml.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <NavLink to="/events-map" className={({ isActive }) => `text-sm font-bold transition-colors hidden sm:flex items-center gap-1.5 ${isActive ? 'text-primary' : 'text-dark hover:text-primary'}`}>
              <Map size={16} /> Events Map
            </NavLink>

            {user ? (
              <>
                <Link to="/about" className="text-sm font-bold text-dark hover:text-primary transition-colors hidden sm:block">About</Link>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary/20 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-hidden bg-gray-100"
                  >
                    <img src="/user-icon.png" alt="User Profile" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                        <p className="text-sm font-bold text-dark dark:text-white capitalize">{role || 'Pending Role'}</p>
                      </div>

                      <Link to="/profile" onClick={() => setShowDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary flex items-center gap-2">
                        <User size={16} /> Profile
                      </Link>

                      <button onClick={toggleTheme} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary flex items-center gap-2">
                        {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} 
                        {effectiveTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                      </button>

                      <Link to="/settings" onClick={() => setShowDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary flex items-center gap-2">
                        <Settings size={16} /> Settings
                      </Link>

                      <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                      <Link to="/about" onClick={() => setShowDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                        <Info size={16} /> About
                      </Link>

                      <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                      <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-alt shadow-md hover:shadow-lg transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
