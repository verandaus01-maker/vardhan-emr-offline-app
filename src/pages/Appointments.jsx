import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus } from 'lucide-react';
import DatabaseService from '../services/database';
import { format, startOfToday } from 'date-fns';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const todayAppointments = await DatabaseService.getAppointmentsByDate(today, 1);
    setAppointments(todayAppointments);
    setLoading(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-purple-600" />
          <span>Appointments</span>
        </h1>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div key={apt.id} className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{apt.patientName}</p>
                    <p className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{apt.time}</span>
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p>No appointments for today</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Appointments;
