import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import EmergencyAlertsBanner from './EmergencyAlertsBanner';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="min-h-screen bg-light text-dark selection:bg-primary/20 transition-colors duration-300 flex flex-col">
      <Navbar />
      <div className="flex w-full flex-1">
        <main className="flex-1 w-full max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 overflow-y-auto">
          <EmergencyAlertsBanner />
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
