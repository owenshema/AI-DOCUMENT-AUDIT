import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api/auth';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell({ isDarkMode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.getNotifications();
      setNotifications(data?.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleToggle = () => {
    setOpen(prev => {
      if (!prev) fetchNotifications();
      return !prev;
    });
  };

  const handleClick = (notification) => {
    setOpen(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const btnClass = isDarkMode
    ? 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
    : 'text-gray-500 hover:bg-gray-100';
  const panelClass = isDarkMode
    ? 'bg-[#122a45] shadow-2xl shadow-black/40'
    : 'border border-gray-200 bg-white shadow-xl';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subtextClass = isDarkMode ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        title="Notifications"
        className={`relative rounded-lg p-2 transition-colors ${btnClass}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-11 z-20 w-80 rounded-xl ${panelClass}`}>
          <div className={`flex items-center justify-between px-4 py-3 ${isDarkMode ? '' : 'border-b border-gray-100'}`}>
            <p className={`text-sm font-semibold ${textClass}`}>Notifications</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className={`px-4 py-6 text-center text-sm ${subtextClass}`}>Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className={`mx-auto mb-2 h-8 w-8 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${subtextClass}`}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    isDarkMode ? 'hover:bg-white/[0.05]' : 'border-b border-gray-50 hover:bg-gray-50 last:border-0'
                  } ${n.status === 'unread' ? (isDarkMode ? 'bg-white/[0.04]' : 'bg-blue-50/50') : ''}`}
                >
                  <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.status === 'unread' ? 'bg-blue-600' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-semibold ${textClass}`}>{n.subject}</p>
                    <p className={`mt-0.5 line-clamp-2 text-xs ${subtextClass}`}>{n.message}</p>
                    <p className={`mt-1 text-[10px] ${subtextClass}`}>{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
