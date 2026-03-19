import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Map, ListChecks, BellRing, BarChart3, Users, ShieldAlert, Award, FileText, Settings, LogOut, Info, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, role, signOut } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const commonLinks = [
    { to: '/dashboard', label: 'My Hub', icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] }
  ];
  const citizenLinks = [
    { to: '/citizen', label: 'Routing & Map', icon: Map, roles: ['citizen', 'volunteer', 'emergency', 'government', 'admin'] },
    { to: '/citizen/requests', label: 'My Requests', icon: ListChecks, roles: ['citizen', 'volunteer', 'admin'] }
  ];
  const volunteerLinks = [
    { to: '/volunteer', label: 'Volunteer Board', icon: Award, roles: ['volunteer', 'admin'] }
  ];
  const emergencyLinks = [
    { to: '/emergency', label: '112 Monitoring', icon: ShieldAlert, roles: ['emergency', 'admin'] },
    { to: '/emergency/alerts', label: 'Active Alerts', icon: BellRing, roles: ['emergency', 'admin'] }
  ];
  const governmentLinks = [
    { to: '/government', label: 'City Analytics', icon: BarChart3, roles: ['government', 'admin'] },
    { to: '/government/reports', label: 'Mobility Reports', icon: FileText, roles: ['government', 'admin'] }
  ];
  const adminLinks = [
    { to: '/admin', label: 'User Management', icon: Users, roles: ['admin'] },
    { to: '/admin/settings', label: 'Platform Settings', icon: Settings, roles: ['admin'] }
  ];

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
    <nav className="bg-light/80 backdrop-blur-md border-b border-gray-100 z-50 transition-all duration-300 relative">
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
                        `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                          isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
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
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:text-primary hover:border-primary/40 transition-colors"
              aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {effectiveTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <>
                <Link to="/about" className="text-sm font-bold text-dark hover:text-primary transition-colors hidden sm:block">About</Link>
                
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary/20 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-hidden bg-gray-100"
                  >
                    <img src="/user-icon.png" alt="User Profile" className="w-full h-full object-cover" onError={(e) => {e.target.style.display='none'}} />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                       <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                         <p className="text-sm font-bold text-dark dark:text-white capitalize">{role || 'Pending Role'}</p>
                       </div>
                       
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
