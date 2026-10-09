import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, UserCheck, LogOut, ChevronDown, CheckCircle } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('notifications-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', handleUpdate);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      // silent catch for unauthenticated states
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/claims?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSwitchRole = async (acc) => {
    await switchAccount(acc.email, acc.password);
    setShowRoleMenu(false);
  };

  const handleNotifItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationsAPI.markRead(notif.id);
        fetchNotifications();
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (notif.link_url) {
      navigate(notif.link_url);
    }
    setShowNotifMenu(false);
  };

  const handleMarkAllReadNavbar = async () => {
    try {
      await notificationsAPI.markAllRead();
      fetchNotifications();
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left section: mobile toggle & search */}
      <div className="flex items-center space-x-3 flex-1 max-w-lg">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearch} className="relative w-full max-w-sm hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Claim ID, Patient, Provider..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
          />
        </form>
      </div>

      {/* Right section: Quick role switcher, notifications, user avatar */}
      <div className="flex items-center space-x-3">
        {/* Quick Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all duration-200 hover:scale-102 active:scale-98 shadow-2xs cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline text-slate-500">Role:</span>
            <span className="font-semibold text-slate-900">{user?.role || 'Guest'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Role Switch (Demo)
              </div>
              {DEMO_ACCOUNTS.map((acc) => {
                const isCurrent = user?.email === acc.email;
                return (
                  <button
                    key={acc.email}
                    onClick={() => handleSwitchRole(acc)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      isCurrent ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{acc.label}</div>
                      <div className="text-[10px] text-slate-400">{acc.email}</div>
                    </div>
                    {isCurrent && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Alerts &amp; Notifications</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-medium text-slate-500">{unreadCount} new</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllReadNavbar}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No recent alerts.</div>
                ) : (
                  notifications.slice(0, 6).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifItemClick(notif)}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        notif.is_read ? 'opacity-70 bg-white' : 'bg-blue-50/20 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-slate-900 truncate">{notif.title}</span>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 ml-1"></span>
                        )}
                      </div>
                      <div className="text-slate-600 line-clamp-2 text-[11px]">{notif.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setShowNotifMenu(false);
                  }}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile & logout */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs transition-all duration-200 hover:ring-2 hover:ring-blue-500/40 hover:scale-105">
            {user?.full_name ? user.full_name[0] : 'U'}
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
