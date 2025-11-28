import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, Activity, Calendar, TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import DatabaseService from '../services/database';
import { format, startOfToday, startOfMonth } from 'date-fns';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');

      // Get overall stats
      const dbStats = await DatabaseService.getStats();
      console.log('Dashboard stats:', dbStats);

      // Get today's appointments
      const today = format(startOfToday(), 'yyyy-MM-dd');
      const appointments = await DatabaseService.db.appointments
        .where('date')
        .between(today, today + 'Z')
        .sortBy('createdAt');

      // Enrich with patient details
      const enrichedAppointments = await Promise.all(
        appointments.slice(0, 5).map(async (apt) => {
          const patient = await DatabaseService.db.patients.get(apt.patientId);
          return {
            ...apt,
            patientName: patient?.name || 'Unknown',
            time: apt.time || format(new Date(apt.createdAt), 'HH:mm')
          };
        })
      );

      // Get recent prescriptions with patient details
      const recentPrescriptions = await DatabaseService.db.prescriptions
        .orderBy('createdAt')
        .reverse()
        .limit(5)
        .toArray();

      const prescriptionsWithDetails = await Promise.all(
        recentPrescriptions.map(async (prescription) => {
          const patient = await DatabaseService.db.patients.get(prescription.patientId);
          return {
            ...prescription,
            patient
          };
        })
      );

      console.log('Loaded:', {
        stats: dbStats,
        appointments: enrichedAppointments.length,
        prescriptions: prescriptionsWithDetails.length
      });

      setStats(dbStats);
      setTodayAppointments(enrichedAppointments);
      setRecentPrescriptions(prescriptionsWithDetails);
      setLoading(false);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color, link }) => (
    <Link to={link} className="card hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
        </div>
        <div className={`${color} bg-opacity-10 p-4 rounded-full`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome, Dr. Vivek Raj Singh
            </h1>
            <p className="text-blue-100">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • Vardhan Hospital Cardiology Department
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xl font-bold">NexaCare Pro</p>
            <p className="text-blue-200 text-sm">Powered by NexaVoyagers</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={stats?.totalPatients || 0}
          color="text-blue-600"
          link="/patients"
        />
        <StatCard
          icon={FileText}
          label="Prescriptions"
          value={stats?.totalPrescriptions || 0}
          color="text-green-600"
          link="/reports"
        />
        <StatCard
          icon={Activity}
          label="Vitals Recorded"
          value={stats?.totalVitals || 0}
          color="text-red-600"
          link="/reports"
        />
        <StatCard
          icon={Calendar}
          label="Appointments"
          value={stats?.totalAppointments || 0}
          color="text-purple-600"
          link="/appointments"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              <span>Today's Appointments</span>
            </h2>
            <Link to="/appointments" className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
              View All →
            </Link>
          </div>

          {todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {appointment.patientName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.time} • {appointment.type || 'Consultation'}
                      </p>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-semibold
                      ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'}
                    `}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>No appointments scheduled for today</p>
              <Link
                to="/appointments"
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm mt-2 inline-block"
              >
                Schedule Appointment
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <Clock className="w-6 h-6 text-blue-600" />
              <span>Recent Prescriptions</span>
            </h2>
            <Link to="/reports" className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
              View All →
            </Link>
          </div>

          {recentPrescriptions.length > 0 ? (
            <div className="space-y-3">
              {recentPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {prescription.patient?.name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {prescription.diagnosis}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(prescription.createdAt), 'MMM dd, yyyy • hh:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>No recent prescriptions</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/patients"
            className="p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition text-center"
          >
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Search Patient</p>
          </Link>

          <Link
            to="/appointments"
            className="p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:shadow-lg transition text-center"
          >
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">New Appointment</p>
          </Link>

          <Link
            to="/data-migration"
            className="p-6 border-2 border-green-200 rounded-lg hover:border-green-500 hover:shadow-lg transition text-center"
          >
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Import from Doc On</p>
          </Link>

          <Link
            to="/settings"
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:shadow-lg transition text-center"
          >
            <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Settings</p>
          </Link>
        </div>
      </div>

      {/* Offline Alert */}
      {!navigator.onLine && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Working Offline</h3>
              <p className="text-sm text-yellow-700">
                You're currently working offline. All data will be saved locally and synced when you're back online.
                {stats?.pendingSyncItems > 0 && ` You have ${stats.pendingSyncItems} pending items to sync.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
