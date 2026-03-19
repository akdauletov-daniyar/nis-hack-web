import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Auth = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
        // Navigation is handled dynamically or user navigates to root which parses role router
        navigate('/');
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role
            }
          }
        });
        if (signUpError) throw signUpError;
        setError('Registration successful! Please sign in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-dark tracking-tight">
            {isLogin ? 'Welcome back' : 'Join Sentient'}
          </h2>
          <p className="mt-3 text-center text-sm text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="font-semibold text-primary hover:text-primary-alt transition-colors duration-200"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
        
        {error && (
          <div className={`p-4 rounded-xl text-sm font-medium ${error.includes('successful') ? 'bg-primary/5 text-primary border border-primary/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-dark mb-1 ml-1">Account Type</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-white/80 text-dark font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 sm:text-sm shadow-sm"
                >
                  <option value="citizen">Citizen</option>
                  <option value="government">Government / Authority</option>
                  <option value="emergency">Rescue Service</option>
                  <option value="volunteer">Volunteer Responder</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-dark mb-1 ml-1">Email address</label>
              <input
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-white/80 text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 sm:text-sm shadow-sm"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {/* Note: I changed type from 'email' to 'text' temporarily so that submitting 'admin' explicitly bypasses default browser email validation */}
            </div>
            <div>
              <label className="block text-sm font-bold text-dark mb-1 ml-1">Password</label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-white/80 text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 sm:text-sm shadow-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-alt shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:hover:translate-y-0 transition-all duration-200"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
