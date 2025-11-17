import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Activity, Calendar, FileText, Home, Settings as SettingsIcon,
  Users, Wifi, WifiOff, RefreshCw, Database, Menu, X
} from 'lucide-react';
import syncService from '../services/syncService';
import DatabaseService from '../services/database';

function Layout() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadStats();
    loadSyncStatus();

    // Set up sync listener
    const syncListener = (event, data) => {
      if (event === 'syncStart') {
        setIsSyncing(true);
      } else if (event === 'syncComplete') {
        setIsSyncing(false);
        setLastSyncTime(data.timestamp);
        loadStats();
      } else if (event === 'syncError') {
        setIsSyncing(false);
      } else if (event === 'online') {
        setIsOnline(true);
      } else if (event === 'offline') {
        setIsOnline(false);
      }
    };

    syncService.addListener(syncListener);

    // Poll for pending sync count
    const interval = setInterval(loadSyncStatus, 5000);

    return () => {
      syncService.removeListener(syncListener);
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    const dbStats = await DatabaseService.getStats();
    setStats(dbStats);
  };

  const loadSyncStatus = async () => {
    const pendingItems = await DatabaseService.getPendingSyncItems(1000);
    setPendingSyncCount(pendingItems.length);

    const lastSync = await DatabaseService.getSetting('lastSyncTime');
    setLastSyncTime(lastSync);
  };

  const handleSync = async () => {
    if (isSyncing) return;
    await syncService.syncNow();
  };

  const formatLastSyncTime = (timestamp) => {
    if (!timestamp) return 'Never';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/appointments', icon: Calendar, label: 'Appointments' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/data-migration', icon: Database, label: 'Data Migration' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-2xl sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-blue-700 rounded-lg transition"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center space-x-3">
                <Activity className="w-10 h-10" />
                <div>
                  <h1 className="text-2xl font-bold">Vardhan Hospital EMR</h1>
                  <p className="text-blue-200 text-xs">Electronic Medical Records - Offline Capable</p>
                </div>
              </div>
            </div>

            {/* Right: Doctor Info & Status */}
            <div className="flex items-center space-x-4">
              {/* Sync Status */}
              <div className="hidden md:flex items-center space-x-2 bg-blue-700 px-4 py-2 rounded-lg">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                )}
                <div className="text-sm">
                  <div className="font-semibold">
                    {isOnline ? 'Online' : 'Offline Mode'}
                  </div>
                  {stats && (
                    <div className="text-xs text-blue-200">
                      {stats.totalPatients.toLocaleString()} patients
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                <div className="hidden md:block text-sm">
                  <div className="font-semibold">
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </div>
                  <div className="text-xs text-blue-200">
                    {pendingSyncCount > 0 ? `${pendingSyncCount} pending` : formatLastSyncTime(lastSyncTime)}
                  </div>
                </div>
              </button>

              {/* Doctor Info */}
              <div className="hidden md:block text-right">
                <p className="font-semibold">Dr. Vivek Raj Singh</p>
                <p className="text-sm text-blue-200">MD Cardiology</p>
              </div>
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
                VR
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Status Bar */}
        <div className="md:hidden px-6 py-2 bg-blue-700 border-t border-blue-600">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-400" />
              )}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <span>{stats?.totalPatients.toLocaleString()} patients</span>
            <span>{pendingSyncCount} pending</span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 fixed lg:sticky top-0 left-0 h-screen
          w-64 bg-white shadow-xl transition-transform duration-300 ease-in-out z-40
          flex flex-col
        `}>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition
                    ${isActive
                      ? 'bg-blue-100 text-blue-800 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Prescriptions:</span>
                <span className="font-semibold">{stats?.totalPrescriptions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Vitals:</span>
                <span className="font-semibold">{stats?.totalVitals || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Appointments:</span>
                <span className="font-semibold">{stats?.totalAppointments || 0}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Layout;
