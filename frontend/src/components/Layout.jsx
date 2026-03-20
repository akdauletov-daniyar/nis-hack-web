import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import EmergencyAlertsBanner from './EmergencyAlertsBanner';
import Footer from './Footer';

const FULL_WIDTH_ROUTES = ['/events-map'];

const Layout = () => {
  const location = useLocation();
  const isFullWidth = FULL_WIDTH_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-light text-dark selection:bg-primary/20 transition-colors duration-300 flex flex-col">
      <Navbar />
      <div className="flex w-full flex-1">
        <main className={isFullWidth
          ? 'flex-1 w-full overflow-y-auto'
          : 'flex-1 w-full max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 overflow-y-auto'
        }>
          {!isFullWidth && <EmergencyAlertsBanner />}
          <Outlet />
        </main>
      </div>
      {!isFullWidth && <Footer />}
    </div>
  );
};

export default Layout;

