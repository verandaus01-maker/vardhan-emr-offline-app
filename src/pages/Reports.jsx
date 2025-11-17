import React, { useState, useEffect } from 'react';
import { BarChart, FileText, TrendingUp, Users } from 'lucide-react';
import DatabaseService from '../services/database';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const dbStats = await DatabaseService.getStats();
    setStats(dbStats);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
        <BarChart className="w-8 h-8 text-blue-600" />
        <span>Reports & Analytics</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Patients</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalPatients || 0}</p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Prescriptions</p>
              <p className="text-3xl font-bold text-green-600">{stats?.totalPrescriptions || 0}</p>
            </div>
            <FileText className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Vitals Recorded</p>
              <p className="text-3xl font-bold text-red-600">{stats?.totalVitals || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-red-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Sync</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.pendingSyncItems || 0}</p>
            </div>
            <FileText className="w-12 h-12 text-yellow-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Monthly Summary</h2>
        <p className="text-gray-600">
          Period: {format(startOfMonth(new Date()), 'MMM dd, yyyy')} - {format(endOfMonth(new Date()), 'MMM dd, yyyy')}
        </p>
        <div className="mt-6 text-center text-gray-500">
          <BarChart className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p>Detailed analytics coming soon</p>
        </div>
      </div>
    </div>
  );
}

export default Reports;
