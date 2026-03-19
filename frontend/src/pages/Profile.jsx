import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, MapPin, Calendar, Edit3, Save, X, Camera } from 'lucide-react';

const Profile = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    surname: '',
    city: '',
    age: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setProfileData({
          name: data.name || '',
          surname: data.surname || '',
          city: data.city || '',
          age: data.age || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        id: user.id,
        name: profileData.name,
        surname: profileData.surname,
        city: profileData.city,
        age: profileData.age ? parseInt(profileData.age) : null,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) {
        if (error.code === '42703' || error.code === 'PGRST204') {
           throw new Error("Missing columns in Supabase! PostgREST cannot find these columns. Please add 'name' (text), 'surname' (text), 'city' (text), 'age' (int4), and 'avatar_url' (text) to your 'profiles' database table.");
        }
        throw error;
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert(err.message || 'Error updating profile settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Header Cover */}
        <div className="h-32 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 relative">
           <div className="absolute -bottom-12 left-8">
             <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden relative group">
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="text-white" size={24} />
                  </div>
                )}
             </div>
           </div>
        </div>

        {/* Profile Content */}
        <div className="pt-16 pb-8 px-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-dark dark:text-white capitalize">
                {profileData.name || profileData.surname ? `${profileData.name} ${profileData.surname}`.trim() : 'Anonymous User'}
              </h1>
              <p className="text-gray-500 font-medium capitalize flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                 {role}
              </p>
              <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
            </div>
            
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-alt font-bold rounded-xl transition-colors"
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold rounded-xl transition-colors"
                >
                  <X size={16} /> Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary-alt font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            {/* Personal Details Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">Personal Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">First Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="name"
                      value={profileData.name} 
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="e.g. John"
                    />
                  ) : (
                    <p className="text-dark dark:text-gray-300 font-medium px-1">{profileData.name || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1">Last Name (Optional)</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="surname"
                      value={profileData.surname} 
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="e.g. Doe"
                    />
                  ) : (
                    <p className="text-dark dark:text-gray-300 font-medium px-1">{profileData.surname || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Demographics Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-2">Demographics</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><MapPin size={14}/> City (By Location)</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="city"
                      value={profileData.city} 
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="e.g. Almaty"
                    />
                  ) : (
                    <p className="text-dark dark:text-gray-300 font-medium px-1">{profileData.city || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><Calendar size={14}/> Age (Optional)</label>
                  {isEditing ? (
                    <input 
                      type="number" 
                      name="age"
                      value={profileData.age} 
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-dark dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="e.g. 25"
                      min="13"
                      max="120"
                    />
                  ) : (
                    <p className="text-dark dark:text-gray-300 font-medium px-1">{profileData.age ? `${profileData.age} years old` : 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
