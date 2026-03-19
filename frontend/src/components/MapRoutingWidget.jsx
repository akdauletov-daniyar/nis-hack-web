import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Navigation, Settings2 } from 'lucide-react';
import { getPublicEnv } from '../lib/env';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const MapRoutingWidget = () => {
  const [destination, setDestination] = useState('');
  const [currentLocation, setCurrentLocation] = useState('New York');
  const [routeResult, setRouteResult] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const googleMapsApiKey = getPublicEnv('VITE_GOOGLE_CLOUD_API');

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

  const requestAccessibleRoute = async (event) => {
    event.preventDefault();
    const target = destination.trim();
    if (!target) {
      setRouteError('Please enter a destination first.');
      return;
    }

    setIsRouting(true);
    setRouteError('');

    try {
      const params = new URLSearchParams({
        start: currentLocation,
        destination: target,
      });
      const response = await fetch(`${API_BASE_URL}/api/routes/accessible-route?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.detail || 'Failed to calculate accessible route.');
      }
      setRouteResult(payload);
    } catch (error) {
      console.error('Accessible routing API error:', error);
      setRouteResult(null);
      setRouteError(error.message || 'Unable to fetch route guidance.');
    } finally {
      setIsRouting(false);
    }
  };

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
        <form onSubmit={requestAccessibleRoute} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Where do you want to go?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 text-dark text-sm rounded-xl focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-shadow"
          />
          <button
            type="submit"
            disabled={isRouting}
            className="bg-primary hover:bg-primary-alt disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg sm:w-auto w-full"
          >
            <Navigation size={18} />
            {isRouting ? 'Routing...' : 'Route'}
          </button>
        </form>

        {routeError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <span>{routeError}</span>
          </div>
        )}

        {routeResult && (
          <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-green-900">GeoAI Accessibility Insights</p>
              <span className="text-xs font-bold bg-white border border-green-200 rounded px-2 py-1 text-green-800">
                Score: {Math.round(routeResult.accessibility_score)}/100
              </span>
            </div>
            <p className="text-xs text-green-900">
              {routeResult.distance} • {routeResult.estimated_time}
            </p>
            {routeResult.route?.length > 0 && (
              <p className="text-xs text-green-800">
                Next: {routeResult.route.slice(0, 2).map((step) => step.instruction).join(' ')}
              </p>
            )}
          </div>
        )}
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
          src={destination ? `https://www.google.com/maps/embed/v1/directions?key=${googleMapsApiKey}&origin=${encodeURIComponent(currentLocation)}&destination=${encodeURIComponent(destination)}` : `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(currentLocation)}`}
        ></iframe>
      </div>
    </div>
  );
};

export default MapRoutingWidget;
