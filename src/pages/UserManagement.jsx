import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, Shield, Key, CheckCircle, XCircle } from 'lucide-react';
import authService from '../services/authService';
import { db } from '../services/database';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'staff'
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await authService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users: ' + error.message);
    }
    setLoading(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const result = await authService.createUser(formData);

    if (result.success) {
      alert('User created successfully!');
      setShowAddModal(false);
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        role: 'staff'
      });
      loadUsers();
    } else {
      alert('Failed to create user: ' + result.error);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();

    const result = await authService.updateUser(selectedUser.id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role
    });

    if (result.success) {
      alert('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } else {
      alert('Failed to update user: ' + result.error);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const result = await authService.changePassword(
      authService.getCurrentUser().id,
      passwordData.oldPassword,
      passwordData.newPassword
    );

    if (result.success) {
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      alert('Failed to change password: ' + result.error);
    }
  };

  const handleDeactivateUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to deactivate user "${username}"?`)) {
      return;
    }

    const result = await authService.deactivateUser(userId);

    if (result.success) {
      alert('User deactivated successfully');
      loadUsers();
    } else {
      alert('Failed to deactivate user: ' + result.error);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'doctor': 'bg-blue-100 text-blue-800',
      'nurse': 'bg-green-100 text-green-800',
      'receptionist': 'bg-purple-100 text-purple-800',
      'lab_technician': 'bg-yellow-100 text-yellow-800',
      'staff': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors['staff'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <Users className="w-8 h-8 text-blue-600" />
          <span>User Management</span>
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Key className="w-5 h-5" />
            <span>Change My Password</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Username</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Last Login</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold">{user.name}</td>
                  <td className="py-3 px-4">{user.username}</td>
                  <td className="py-3 px-4">{user.email || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                      {authService.getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.isActive ? (
                      <span className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Active</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Inactive</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({
                            username: user.username,
                            name: user.name,
                            email: user.email || '',
                            phone: user.phone || '',
                            role: user.role
                          });
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.isActive && user.role !== 'admin' && (
                        <button
                          onClick={() => handleDeactivateUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Deactivate user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input"
                  required
                >
                  <option value="staff">Staff</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="nurse">Nurse</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Create User</button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">Edit User</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  className="input bg-gray-100"
                  disabled
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input"
                  required
                >
                  <option value="staff">Staff</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="nurse">Nurse</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Update User</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="input"
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="input"
                  required
                  minLength="6"
                />
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Change Password</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
