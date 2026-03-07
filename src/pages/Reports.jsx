import React, { useState, useEffect } from 'react';
import { BarChart, FileText, TrendingUp, Users, Calendar, Activity, Clock } from 'lucide-react';
import DatabaseService, { db } from '../services/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function Reports() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    loadStats();
  }, [selectedMonth]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const dbStats = await DatabaseService.getStats();
      setStats(dbStats);

      // Load monthly data
      const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
      const monthEnd = endOfMonth(new Date(selectedMonth + '-01'));
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd') + 'Z';

      const [monthPrescriptions, monthAppointments, monthVitals, monthLabReports] = await Promise.all([
        db.prescriptions
          .where('createdAt')
          .between(monthStart.toISOString(), monthEnd.toISOString())
          .toArray(),
        db.appointments
          .where('date')
          .between(monthStartStr, monthEndStr)
          .toArray(),
        db.vitals
          .where('createdAt')
          .between(monthStart.toISOString(), monthEnd.toISOString())
          .toArray(),
        db.labReports
          .where('createdAt')
          .between(monthStart.toISOString(), monthEnd.toISOString())
          .toArray()
      ]);

      // Count appointment statuses
      const completedAppts = monthAppointments.filter(a => a.status === 'completed').length;
      const scheduledAppts = monthAppointments.filter(a => a.status === 'scheduled').length;
      const cancelledAppts = monthAppointments.filter(a => a.status === 'cancelled').length;

      setMonthlyData({
        prescriptions: monthPrescriptions.length,
        appointments: monthAppointments.length,
        vitals: monthVitals.length,
        labReports: monthLabReports.length,
        completedAppts,
        scheduledAppts,
        cancelledAppts
      });

      // Load recent activity (last 10 prescriptions)
      const recent = await db.prescriptions
        .orderBy('createdAt')
        .reverse()
        .limit(10)
        .toArray();

      const enriched = await Promise.all(
        recent.map(async (rx) => {
          const patient = await db.patients.get(rx.patientId);
          return { ...rx, patientName: patient?.name || 'Unknown' };
        })
      );
      setRecentActivity(enriched);

    } catch (error) {
      console.error('Failed to load reports:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM yyyy');

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <BarChart className="w-8 h-8 text-blue-600" />
          <span>Reports & Analytics</span>
        </h1>
        <div className="flex items-center space-x-3">
          <label className="text-sm font-semibold text-gray-600">Select Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Overall Database Stats */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Overall Database Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600">{stats?.totalPatients?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Total Patients</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600">{stats?.totalPrescriptions?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Total Prescriptions</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <Activity className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-600">{stats?.totalVitals?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Vitals Recorded</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-600">{stats?.totalAppointments?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Total Appointments</p>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      {monthlyData && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Monthly Summary — {monthLabel}</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{monthlyData.prescriptions}</p>
              <p className="text-sm text-gray-600 mt-1">Prescriptions Written</p>
            </div>
            <div className="p-4 border-2 border-purple-200 bg-purple-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-600">{monthlyData.appointments}</p>
              <p className="text-sm text-gray-600 mt-1">Appointments</p>
            </div>
            <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">{monthlyData.vitals}</p>
              <p className="text-sm text-gray-600 mt-1">Vitals Recorded</p>
            </div>
            <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">{monthlyData.labReports}</p>
              <p className="text-sm text-gray-600 mt-1">Lab Reports</p>
            </div>
          </div>

          {/* Appointment Breakdown */}
          {monthlyData.appointments > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Appointment Breakdown</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-bold text-green-700">{monthlyData.completedAppts}</p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="font-bold text-yellow-700">{monthlyData.scheduledAppts}</p>
                    <p className="text-xs text-gray-600">Scheduled</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-bold text-red-700">{monthlyData.cancelledAppts}</p>
                    <p className="text-xs text-gray-600">Cancelled</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {monthlyData.prescriptions === 0 && monthlyData.appointments === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BarChart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No data recorded for {monthLabel}</p>
            </div>
          )}
        </div>
      )}

      {/* Pending Sync */}
      {stats?.pendingSyncItems > 0 && (
        <div className="card border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">Pending Sync Items</p>
              <p className="text-sm text-yellow-700">
                {stats.pendingSyncItems} records waiting to sync with cloud
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Prescriptions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center space-x-2">
          <Clock className="w-6 h-6 text-blue-600" />
          <span>Recent Prescriptions</span>
        </h2>

        {recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Patient</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Diagnosis</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((rx) => (
                  <tr key={rx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-800">{rx.patientName}</td>
                    <td className="py-3 px-4 text-gray-600">{rx.diagnosis || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {format(new Date(rx.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No prescriptions recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
