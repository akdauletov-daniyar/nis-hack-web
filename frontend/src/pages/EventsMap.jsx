import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Plus, Filter, X, Loader2, LocateFixed } from 'lucide-react';
import CreateEventModal from '../components/CreateEventModal';
import EventDetailPanel from '../components/EventDetailPanel';
import { useLanguage } from '../context/LanguageContext';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Note: CATEGORY_CONFIG and LIFECYCLE_OPTIONS text will be translated dynamically inside component using t()

const CATEGORY_CONFIG_BASE = {
  infrastructure: { color: '#f97316', emoji: '🚧', labelKey: 'cat_infrastructure' },
  emergency:      { color: '#ef4444', emoji: '⚠️', labelKey: 'cat_emergency' },
  urban:          { color: '#3b82f6', emoji: '🏙️', labelKey: 'cat_urban' },
  events:         { color: '#22c55e', emoji: '🎉', labelKey: 'cat_events' },
};

const LIFECYCLE_OPTIONS_BASE = [
  { value: '', labelKey: 'status_all' },
  { value: 'planned', labelKey: 'status_planned', emoji: '📅 ' },
  { value: 'active', labelKey: 'status_active', emoji: '🔴 ' },
  { value: 'resolving', labelKey: 'status_resolving', emoji: '🔧 ' },
];

// Component to recenter the map when user location changes
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
};

// Component to capture click location for new event placement
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const EventsMap = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 43.2389, lng: 76.8897 }); // Almaty default location
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLifecycle, setFilterLifecycle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [placingPin, setPlacingPin] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);
  const { t } = useLanguage();

  // Dynamic config based on language
  const CATEGORY_CONFIG = Object.fromEntries(
    Object.entries(CATEGORY_CONFIG_BASE).map(([key, val]) => [
      key, 
      { ...val, label: t(val.labelKey), desc: t(`catDesc_${key}`) }
    ])
  );
  const LIFECYCLE_OPTIONS = LIFECYCLE_OPTIONS_BASE.map(opt => ({
    ...opt,
    label: (opt.emoji || '') + t(opt.labelKey)
  }));

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterLifecycle) params.append('lifecycle', filterLifecycle);
      const res = await fetch(`${API_BASE_URL}/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filterCategory, filterLifecycle]);

  // Get user's GPS location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Using fallback location (Astana)')
      );
    }
  }, []);

  // Re-center map on current location
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(newLoc);
        if (mapRef.current) {
          mapRef.current.setView([newLoc.lat, newLoc.lng], 15, { animate: true });
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  const handleMapClick = (latlng) => {
    if (placingPin) {
      setNewPinLocation({ lat: latlng.lat, lng: latlng.lng });
      setPlacingPin(false);
      setShowCreateModal(true);
    }
  };

  const handleCreateEvent = () => {
    setPlacingPin(true);
    setNewPinLocation(null);
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    setNewPinLocation(null);
    fetchEvents();
  };

  const handleVote = async (eventId, vote) => {
    try {
      const token = localStorage.getItem('sb-token');
      await fetch(`${API_BASE_URL}/api/events/${eventId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ vote }),
      });
      fetchEvents();
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(prev => prev ? { ...prev, trust_score: prev.trust_score + vote } : null);
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 text-sm font-semibold text-dark hover:bg-gray-50 transition-all"
          >
            <Filter size={16} />
            {t('map_filters')}
            {(filterCategory || filterLifecycle) && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>

          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2">
              {/* Category Filter Chips */}
              <button
                onClick={() => setFilterCategory('')}
                className={`px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all border ${
                  !filterCategory ? 'bg-primary text-white border-primary' : 'bg-white/95 backdrop-blur-md text-dark border-gray-100 hover:border-primary/30'
                }`}
              >
                {t('map_all')}
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFilterCategory(filterCategory === key ? '' : key)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all border ${
                    filterCategory === key
                      ? 'text-white border-transparent'
                      : 'bg-white/95 backdrop-blur-md text-dark border-gray-100 hover:border-primary/30'
                  }`}
                  style={filterCategory === key ? { backgroundColor: cfg.color } : {}}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}

              <div className="w-px h-6 bg-gray-200 mx-1" />

              {/* Lifecycle Filter */}
              <select
                value={filterLifecycle}
                onChange={(e) => setFilterLifecycle(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/95 backdrop-blur-md border border-gray-100 text-dark shadow-sm outline-none cursor-pointer"
              >
                {LIFECYCLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <button
                onClick={() => { setFilterCategory(''); setFilterLifecycle(''); }}
                className="p-2 rounded-xl bg-white/95 backdrop-blur-md border border-gray-100 text-gray-400 hover:text-red-500 shadow-sm transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Event Count Badge */}
        <div className="pointer-events-auto ml-auto">
          <div className="px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 text-xs font-bold text-dark">
            {loading ? <Loader2 size={14} className="animate-spin" /> : `${events.length} ${t('map_eventsCount')}`}
          </div>
        </div>
      </div>

      {/* Placing Pin Banner */}
      {placingPin && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 bg-primary text-white rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-bounce">
          {t('map_tapPin')}
          <button onClick={() => setPlacingPin(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
        ref={mapRef}
        style={{ cursor: placingPin ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Event Markers */}
        {events.map((event) => {
          const cfg = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.urban;
          return (
            <React.Fragment key={event.id}>
              {/* Effect radius circle */}
              <Circle
                center={[event.latitude, event.longitude]}
                radius={event.effect_radius || 100}
                pathOptions={{
                  color: cfg.color,
                  fillColor: cfg.color,
                  fillOpacity: 0.06,
                  weight: 1,
                  opacity: 0.3,
                }}
              />
              {/* Marker dot */}
              <CircleMarker
                center={[event.latitude, event.longitude]}
                radius={8}
                pathOptions={{
                  color: '#fff',
                  fillColor: cfg.color,
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedEvent(event),
                }}
              >
                <Popup>
                  <div className="text-xs font-bold">{cfg.emoji} {event.name || cfg.label}</div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}

        {/* New pin preview */}
        {newPinLocation && (
          <CircleMarker
            center={[newPinLocation.lat, newPinLocation.lng]}
            radius={10}
            pathOptions={{
              color: '#f56029',
              fillColor: '#f56029',
              fillOpacity: 0.5,
              weight: 3,
              dashArray: '5,5',
            }}
          />
        )}
      </MapContainer>

      {/* Bottom-right buttons */}
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col items-end gap-3">
        {/* Current Location Button */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="flex items-center justify-center w-12 h-12 bg-white/95 backdrop-blur-md hover:bg-white text-dark rounded-2xl shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50"
          title={t('map_goToLocation')}
        >
          <LocateFixed size={20} className={locating ? 'animate-pulse text-primary' : 'text-gray-600 hover:text-primary transition-colors'} />
        </button>

        {/* Report Button */}
        <button
          onClick={handleCreateEvent}
          className="flex items-center gap-2 px-6 py-4 bg-primary hover:bg-primary-alt text-white font-bold rounded-2xl shadow-[0_8px_30px_rgba(245,96,41,0.4)] hover:shadow-[0_12px_40px_rgba(245,96,41,0.5)] hover:-translate-y-1 transition-all duration-300"
        >
          <Plus size={20} strokeWidth={3} />
          {t('map_reportEvent')}
        </button>
      </div>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onVote={handleVote}
          categoryConfig={CATEGORY_CONFIG}
        />
      )}

      {/* Create Event Modal */}
      {showCreateModal && newPinLocation && (
        <CreateEventModal
          location={newPinLocation}
          onClose={() => { setShowCreateModal(false); setNewPinLocation(null); }}
          onCreated={handleEventCreated}
          categoryConfig={CATEGORY_CONFIG}
        />
      )}
    </div>
  );
};

export default EventsMap;
