import React from 'react';
import { X, ThumbsUp, ThumbsDown, Clock, MapPin, Shield, Radio } from 'lucide-react';

const LIFECYCLE_BADGES = {
  planned:   { label: 'Planned',   color: '#3b82f6', bg: '#eff6ff' },
  active:    { label: 'Active',    color: '#ef4444', bg: '#fef2f2' },
  resolving: { label: 'Resolving', color: '#22c55e', bg: '#f0fdf4' },
};

const IMPACT_BADGES = [
  { label: 'Low Impact',    color: '#22c55e', bg: '#f0fdf4' },
  { label: 'Medium Impact', color: '#f59e0b', bg: '#fffbeb' },
  { label: 'High Impact',   color: '#ef4444', bg: '#fef2f2' },
];

const EventDetailPanel = ({ event, onClose, onVote, categoryConfig }) => {
  const cfg = categoryConfig[event.category] || categoryConfig.urban;
  const lifecycleBadge = LIFECYCLE_BADGES[event.lifecycle] || LIFECYCLE_BADGES.active;
  const impactBadge = IMPACT_BADGES[(event.impact_level || 1) - 1];
  const timeAgo = getRelativeTime(event.created_at);

  return (
    <div className="absolute top-0 right-0 bottom-0 z-[1000] w-full sm:w-[400px] pointer-events-auto">
      {/* Mobile overlay */}
      <div className="sm:hidden absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col animate-in slide-in-from-right overflow-y-auto">
        {/* Header with category color */}
        <div
          className="relative px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${cfg.color}15, ${cfg.color}05)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <X size={18} className="text-gray-500" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
              style={{ backgroundColor: cfg.color + '20' }}
            >
              {cfg.emoji}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-dark">{event.name || cfg.label}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="mr-1">{cfg.emoji} {cfg.label}</span> · <Clock size={11} /> {timeAgo}
              </p>
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2">
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ backgroundColor: lifecycleBadge.bg, color: lifecycleBadge.color }}
            >
              {lifecycleBadge.label}
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ backgroundColor: impactBadge.bg, color: impactBadge.color }}
            >
              {impactBadge.label}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Radio size={10} /> {event.effect_radius || 100}m radius
            </span>
          </div>
        </div>

        {/* Media */}
        {event.media_url && (
          <div className="px-6 py-3">
            <img
              src={event.media_url}
              alt="Event media"
              className="w-full h-48 object-cover rounded-2xl shadow-md border border-gray-100 dark:border-gray-700"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-6 py-4 space-y-5">
          {/* Location */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl">
            <MapPin size={14} className="text-primary" />
            <span>{event.latitude?.toFixed(5)}, {event.longitude?.toFixed(5)}</span>
          </div>

          {/* Smart Tags */}
          {event.smart_tags && event.smart_tags.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {event.smart_tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
              <p className="text-sm text-dark leading-relaxed bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                {event.description}
              </p>
            </div>
          )}

          {/* Trust Score Section */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Shield size={16} className="text-primary" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trust Score</span>
            </div>

            <div className={`text-4xl font-extrabold ${
              event.trust_score > 0 ? 'text-green-600' : event.trust_score < 0 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {event.trust_score > 0 ? '+' : ''}{event.trust_score}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onVote(event.id, 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-sm transition-all hover:shadow-md"
              >
                <ThumbsUp size={16} />
                Confirm
              </button>
              <button
                onClick={() => onVote(event.id, -1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm transition-all hover:shadow-md"
              >
                <ThumbsDown size={16} />
                Not here
              </button>
            </div>
          </div>
        </div>

        {/* Footer timestamp */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
          <span className="text-[10px] text-gray-400 font-mono">
            Reported {new Date(event.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

function getRelativeTime(dateStr) {
  if (!dateStr) return 'Unknown';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default EventDetailPanel;
