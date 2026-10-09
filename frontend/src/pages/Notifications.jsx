import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';
import { notificationsAPI } from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <span>Alerts &amp; Operational Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated alerts triggered for critical fraud risk (Score ≥ 81), assignments, and escalations
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active alerts recorded.</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex items-start justify-between space-x-4 transition-colors ${
                notif.is_read ? 'bg-white opacity-80' : 'bg-blue-50/20 font-medium'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className={`p-2 rounded-lg mt-0.5 ${
                  notif.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{notif.title}</span>
                    {!notif.is_read && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500 text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {notif.link_url && (
                  <Link
                    to={notif.link_url}
                    onClick={() => handleMarkRead(notif.id)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
