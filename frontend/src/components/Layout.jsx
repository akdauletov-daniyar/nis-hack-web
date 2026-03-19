import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-light text-dark selection:bg-primary/20 transition-colors duration-300">
      <Navbar />
      <main className="py-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
