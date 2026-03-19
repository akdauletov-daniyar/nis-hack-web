import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Settings2 } from 'lucide-react';

const MapRoutingWidget = () => {
  const [destination, setDestination] = useState('');
  const [currentLocation, setCurrentLocation] = useState('New York');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-dark flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          Accessible Routing
        </h3>
        <button className="p-1.5 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 transition-colors">
          <Settings2 size={16} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Where do you want to go?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 text-dark text-sm rounded-xl focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-shadow"
          />
          <button className="bg-primary hover:bg-primary-alt text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg sm:w-auto w-full">
            <Navigation size={18} />
            Route
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 relative">
        <iframe
          title="Google Map"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={destination ? `https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_CLOUD_API}&origin=${encodeURIComponent(currentLocation)}&destination=${encodeURIComponent(destination)}` : `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_CLOUD_API}&q=${encodeURIComponent(currentLocation)}`}
        ></iframe>
      </div>
    </div>
  );
};

export default MapRoutingWidget;
