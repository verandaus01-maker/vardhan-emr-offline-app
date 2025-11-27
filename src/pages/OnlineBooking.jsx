import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, CheckCircle } from 'lucide-react';
import DatabaseService from '../services/database';
import { format, addDays, startOfDay } from 'date-fns';

function OnlineBooking() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    isNewPatient: true
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');

  useEffect(() => {
    if (formData.appointmentDate) {
      loadAvailableSlots(formData.appointmentDate);
    }
  }, [formData.appointmentDate]);

  const loadAvailableSlots = async (date) => {
    // Get existing appointments for the date
    const appointments = await DatabaseService.getAppointmentsByDate(date, 1);
    const bookedSlots = appointments.map(apt => apt.time);

    // Generate available slots (9 AM to 6 PM, 30-minute intervals)
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        if (!bookedSlots.includes(time)) {
          slots.push({
            time,
            display: format(new Date().setHours(hour, minute), 'hh:mm a')
          });
        }
      }
    }

    setAvailableSlots(slots);
  };

  const handleNextStep = () => {
    if (step === 1 && (!formData.name || !formData.phone)) {
      alert('Please fill in all required fields');
      return;
    }
    if (step === 2 && (!formData.appointmentDate || !formData.appointmentTime)) {
      alert('Please select date and time');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Check if patient exists
      let patient = await DatabaseService.searchPatients(formData.phone);

      if (patient.length === 0) {
        // Create new patient
        const patientId = await DatabaseService.addPatient({
          name: formData.name,
          age: parseInt(formData.age) || 0,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          registrationDate: new Date().toISOString(),
          source: 'online_booking'
        });

        patient = await DatabaseService.getPatient(patientId);
      } else {
        patient = patient[0];
      }

      // Create appointment
      const appointmentId = await DatabaseService.addAppointment({
        patientId: patient.id || patient.patientId,
        uhid: patient.uhid,
        date: formData.appointmentDate,
        time: formData.appointmentTime,
        doctorId: 1,
        status: 'scheduled',
        type: 'appointment',
        patientName: formData.name,
        notes: formData.reason,
        source: 'online_booking',
        bookingMethod: 'online'
      });

      // Generate confirmation number
      const confNumber = `VH${new Date().getFullYear()}${String(appointmentId).padStart(6, '0')}`;
      setConfirmationNumber(confNumber);
      setBookingConfirmed(true);

      // Send confirmation (implement SMS/email later)
      console.log('Appointment booked:', confNumber);

    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getNextSevenDays = () => {
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const date = addDays(new Date(), i);
      dates.push({
        value: format(date, 'yyyy-MM-dd'),
        display: format(date, 'EEE, MMM dd')
      });
    }
    return dates;
  };

  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-6">
        <div className="card max-w-2xl w-full text-center">
          <div className="mb-6">
            <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-green-800 mb-2">
              Appointment Confirmed!
            </h1>
            <p className="text-gray-600">Your appointment has been successfully booked</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Confirmation Number</p>
            <p className="text-3xl font-bold text-blue-800 font-mono mb-4">{confirmationNumber}</p>

            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-gray-600">Patient Name</p>
                <p className="font-semibold">{formData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{formData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold">{format(new Date(formData.appointmentDate), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <p className="font-semibold">{formData.appointmentTime}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 text-left mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Important Instructions:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Please arrive 15 minutes before your appointment time</li>
              <li>• Bring your previous medical records (if any)</li>
              <li>• Carry a valid ID proof</li>
              <li>• Fast for 8-12 hours if lab tests are scheduled</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600 mb-6">
            <p>A confirmation SMS has been sent to {formData.phone}</p>
            <p className="mt-2">For any changes, call: <span className="font-semibold">+91 542 2367890</span></p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">
            Book Your Appointment
          </h1>
          <p className="text-gray-600">Vardhan Hospital - Cardiology Department</p>
          <p className="text-sm text-gray-500 mt-1">Dr. Vivek Raj Singh, MD (Cardiology)</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <span className="ml-2 font-semibold hidden md:inline">Patient Details</span>
          </div>
          <div className={`h-1 w-16 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="ml-2 font-semibold hidden md:inline">Select Date & Time</span>
          </div>
          <div className={`h-1 w-16 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              3
            </div>
            <span className="ml-2 font-semibold hidden md:inline">Confirm</span>
          </div>
        </div>

        {/* Step 1: Patient Details */}
        {step === 1 && (
          <div className="card fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <User className="w-6 h-6 text-blue-600" />
              <span>Patient Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="input"
                  placeholder="Your age"
                />
              </div>

              <div>
                <label className="label">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="input"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div>
                <label className="label">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="your@email.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Reason for Visit (Optional)</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Brief description of your health concern..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-8">
              <button onClick={handleNextStep} className="btn-primary flex-1">
                Next: Select Date & Time
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && (
          <div className="card fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span>Select Appointment Date & Time</span>
            </h2>

            <div className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="label">Select Date</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {getNextSevenDays().map((date) => (
                    <button
                      key={date.value}
                      onClick={() => setFormData({ ...formData, appointmentDate: date.value, appointmentTime: '' })}
                      className={`p-4 rounded-lg border-2 transition ${
                        formData.appointmentDate === date.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {date.display}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {formData.appointmentDate && (
                <div>
                  <label className="label flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Select Time Slot</span>
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setFormData({ ...formData, appointmentTime: slot.time })}
                        className={`p-3 rounded-lg border-2 transition ${
                          formData.appointmentTime === slot.time
                            ? 'border-green-600 bg-green-50 text-green-800 font-semibold'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                  {availableSlots.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No slots available for this date. Please select another date.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-8">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleNextStep} className="btn-primary flex-1" disabled={!formData.appointmentTime}>
                Next: Confirm
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="card fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <span>Confirm Appointment</span>
            </h2>

            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Appointment Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Patient Name</p>
                  <p className="font-semibold text-lg">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age / Gender</p>
                  <p className="font-semibold text-lg">{formData.age || 'N/A'} / {formData.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-lg">{formData.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-lg">{formData.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Appointment Date</p>
                  <p className="font-semibold text-lg">{format(new Date(formData.appointmentDate), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Appointment Time</p>
                  <p className="font-semibold text-lg">{formData.appointmentTime}</p>
                </div>
                {formData.reason && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Reason for Visit</p>
                    <p className="font-semibold">{formData.reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Please note:</strong> You will receive a confirmation SMS on {formData.phone} once the appointment is confirmed.
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-success flex-1"
              >
                {loading ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        )}

        {/* Hospital Contact Info */}
        <div className="card mt-8 bg-gray-50">
          <h3 className="font-bold mb-3">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Phone</p>
              <p className="font-semibold">+91 542 2367890</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-semibold">info@vardhanhospital.co.in</p>
            </div>
            <div>
              <p className="text-gray-600">Address</p>
              <p className="font-semibold">Bada Lalpur, Varanasi - 221003</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnlineBooking;
