import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn, Lock, User, Wifi, Shield } from 'lucide-react';
import authService from '../services/authService';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.login(username.trim(), password);
      if (result.success) {
        onLoginSuccess(result.user);
        navigate('/');
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 flex-col items-center justify-center p-12 text-white">
        <div className="w-24 h-24 bg-white bg-opacity-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <Activity className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-5xl font-extrabold mb-3 tracking-tight">NexaCare Pro</h1>
        <p className="text-blue-200 text-xl font-medium mb-2">by NexaVoyagers Technologies</p>
        <p className="text-blue-300 text-sm mb-10">AI-Powered Clinical EMR System</p>

        <div className="w-full max-w-xs space-y-4">
          {[
            { icon: Wifi, label: 'Multi-Device Sync', desc: 'All hospital devices stay in sync' },
            { icon: Shield, label: 'Role-Based Access', desc: 'Admin, Doctor, Nurse & more' },
            { icon: Activity, label: 'Offline-First', desc: 'Works without internet' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center space-x-3 bg-white bg-opacity-10 rounded-xl p-3">
              <div className="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-blue-300 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-blue-300 text-xs">Licensed to: Vardhan Hospital, Varanasi</p>
          <p className="text-blue-400 text-xs mt-1">© 2024-2025 NexaVoyagers Technologies Pvt. Ltd.</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-gray-50">
        {/* Mobile logo */}
        <div className="md:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Activity className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">NexaCare Pro</h1>
          <p className="text-gray-500 text-sm mt-1">Vardhan Hospital EMR</p>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sign in</h2>
            <p className="text-gray-500 mt-1">Enter your credentials to access the system</p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start space-x-2">
              <span className="text-red-500 mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center space-x-2 text-base mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-8">
            Contact your hospital administrator if you cannot sign in.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
