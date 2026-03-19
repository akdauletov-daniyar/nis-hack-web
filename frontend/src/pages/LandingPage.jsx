import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, MapPin, Navigation, X } from 'lucide-react';
import { getPublicEnv } from '../lib/env';

const LandingPage = () => {
  const [mapLocation, setMapLocation] = useState('Central Park, New York');
  const [origin, setOrigin] = useState('My Location');
  const [destination, setDestination] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const googleMapsApiKey = getPublicEnv('VITE_GOOGLE_CLOUD_API');

  const handleLocate = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapLocation(`${position.coords.latitude},${position.coords.longitude}`);
          setOrigin('My Location');
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Could not fetch location. Please ensure location services are enabled.");
        }
      );
    }
  };

  useEffect(() => {
    handleLocate();
  }, []);

  const handleRoute = () => {
    if (destination.trim() !== '') {
      setIsRouting(true);
    } else {
      alert("Please enter a destination to route to!");
    }
  };

  const originParam = (origin.toLowerCase() === 'my location') ? mapLocation : origin;
  const mapSrc = (isRouting && destination) 
    ? `https://www.google.com/maps/embed/v1/directions?key=${googleMapsApiKey}&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destination)}`
    : `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(mapLocation)}`;

  return (
    <div className="bg-light min-h-screen pb-20 relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">

        {/* HERO SECTION */}
        <div className="text-center mb-16 max-w-3xl mx-auto flex flex-col items-center justify-center relative mt-10">

          <h1 className="text-5xl md:text-7xl font-extrabold text-dark tracking-tighter mb-6 leading-tight">
            Level-up your city’s <span className="text-primary">accessibility.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl font-medium">
            The ultimate navigation tool. Map your accessible journey and connect instantly with nearby volunteers when you need a little extra support.
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-alt transition-colors duration-300">
              Get Started
            </Link>
          </div>
        </div>

        {/* MAP CONTAINER (Under Hero) */}
        <div className="relative mx-auto bg-gray-100 rounded-[2rem] border-[8px] border-white shadow-[0_20px_60px_rgb(0,0,0,0.15)] overflow-hidden w-full h-[500px]">
          
          {/* Overlay Map Routing Panel */}
          <div className="absolute top-4 left-4 z-20">
            {isPanelExpanded ? (
              <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 w-[90vw] sm:w-80 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                  <h3 className="font-bold text-dark flex items-center gap-2 text-sm">
                    <Navigation size={16} className="text-primary"/> Plan Your Route
                  </h3>
                  <button onClick={() => setIsPanelExpanded(false)} className="text-gray-400 hover:text-dark transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Crosshair size={14} className="text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      value={origin} 
                      onChange={(e) => { setOrigin(e.target.value); setIsRouting(false); }} 
                      placeholder="Starting point" 
                      className="bg-white border border-gray-200 text-dark text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-9 pr-10 p-2.5 outline-none shadow-sm transition-shadow" 
                    />
                    <button 
                      onClick={handleLocate} 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary hover:text-primary-alt transition-colors" 
                      title="Use my current location"
                    >
                      <MapPin size={16} />
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin size={14} className="text-secondary" />
                    </div>
                    <input 
                      type="text" 
                      value={destination} 
                      onChange={(e) => { setDestination(e.target.value); setIsRouting(false); }} 
                      placeholder="Where to?" 
                      className="bg-white border border-gray-200 text-dark text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-9 p-2.5 outline-none shadow-sm transition-shadow" 
                    />
                  </div>
                  
                  <button 
                    onClick={handleRoute} 
                    className="w-full bg-dark hover:bg-gray-800 text-white font-bold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2 mt-2 shadow-md hover:shadow-lg"
                  >
                    Route
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsPanelExpanded(true)}
                className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3 font-bold text-dark hover:bg-gray-50 transition-all hover:scale-105"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation size={16} className="text-primary" />
                </div>
                Plan Route
              </button>
            )}
          </div>

          {/* Real Google Maps Integration */}
          <div className="absolute inset-0 z-0">
            <iframe
              title="Google Maps Overview"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={mapSrc}
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
