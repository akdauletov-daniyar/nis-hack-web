import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-light/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
              <img src="/app-logo.png" alt="Demo 1.0 Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-300" />
              <span className="text-xl font-extrabold text-dark tracking-tight">
                Demo 1.0
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-bold text-dark hover:text-primary transition-colors hidden sm:block">Dashboard</Link>
                <div className="flex flex-col text-right hidden lg:block border-l border-gray-200 pl-4">
                  <span className="text-sm font-semibold text-dark leading-tight">{user.email}</span>
                  <span className="text-[10px] text-secondary uppercase font-bold tracking-wider leading-none relative top-0.5">{role || 'Loading...'}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-2 inline-flex items-center justify-center px-4 py-2 border border-accent/20 bg-dark text-sm font-semibold rounded-lg text-white hover:bg-gray-800 focus:ring-4 focus:ring-gray-100 transition-all duration-200"
                >
                  Sign Out
                </button>
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
