import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch directly from supabase purely for visual representation in admin panel
      const { data, error } = await supabase.from('profiles').select('*, auth_users:id (email)').limit(50);
      if (data) setUsers(data);
    } catch {
      console.error("Error fetching profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, targetRole) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://127.0.0.1:8000/api/users/${userId}/approve_role?new_role=${targetRole}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        alert(`User role updated to ${targetRole}`);
        fetchUsers();
      } else {
        alert("Failed to update role. Make sure you are an admin.");
      }
    } catch (e) {
      alert("API Error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight">System Infrastructure Management</h1>
        <p className="text-indigo-600 mt-2 font-medium">Control Role-Based Access to Government and Emergency modules.</p>
      </header>
      
      <div className="bg-white p-0 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Global User Directory</h2>
          <button onClick={fetchUsers} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Refresh Synced Profiles</button>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-gray-500">Syncing directory logs...</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-gray-400 uppercase text-xs font-semibold tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">UUID</th>
                  <th className="px-6 py-4">Current Role</th>
                  <th className="px-6 py-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-xs">{u.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wide
                        ${u.role==='admin' ? 'bg-indigo-100 text-indigo-800' :
                          u.role==='emergency' ? 'bg-red-100 text-red-800' :
                          u.role==='government' ? 'bg-slate-200 text-slate-800' :
                          u.role==='volunteer' ? 'bg-green-100 text-green-800' :
                          'bg-blue-50 text-blue-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      {u.role !== 'emergency' && (
                        <button onClick={() => handleApprove(u.id, 'emergency')} className="text-red-600 hover:text-white hover:bg-red-600 px-3 py-1 rounded transition border border-red-200">Set Emergency</button>
                      )}
                      {u.role !== 'government' && (
                        <button onClick={() => handleApprove(u.id, 'government')} className="text-slate-700 hover:text-white hover:bg-slate-800 px-3 py-1 rounded transition border border-slate-300">Set Government</button>
                      )}
                       {u.role !== 'admin' && (
                        <button onClick={() => handleApprove(u.id, 'admin')} className="text-indigo-600 hover:text-indigo-900 font-bold px-3 py-1 text-xs uppercase underline">Make Admin</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;
