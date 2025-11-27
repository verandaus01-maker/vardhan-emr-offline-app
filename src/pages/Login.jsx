import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn, Lock, User } from 'lucide-react';
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
      const result = await authService.login(username, password);

      if (result.success) {
        onLoginSuccess(result.user);
        navigate('/');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-2xl">
            <Activity className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">MediVoyager Pro</h1>
          <p className="text-blue-200 text-lg">by NexaVoyagers</p>
          <p className="text-blue-300 text-sm mt-2">Intelligent Offline EMR System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to access your EMR system</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="input pl-10"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 text-lg"
            >
              {loading ? (
                <>
                  <div className="spinner w-5 h-5"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Default Credentials Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-semibold mb-2">Default Login:</p>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Username: <code className="bg-blue-100 px-2 py-1 rounded">admin</code></div>
              <div>Password: <code className="bg-blue-100 px-2 py-1 rounded">vardhan@2025</code></div>
            </div>
            <p className="text-xs text-blue-600 mt-2">⚠️ Change password after first login</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-200 text-sm">
          <p>© 2025 NexaVoyagers Technologies</p>
          <p className="mt-1">MediVoyager Pro™ - All Rights Reserved</p>
          <p className="mt-2 text-xs">License: Vardhan Hospital, Varanasi</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
