import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 p-4">
      <div className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-accent-green mt-2">TestMind</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to work on your tests</p>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-surface-900 rounded-lg">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                mode === m
                  ? 'bg-accent-green/20 text-accent-green font-medium'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm focus:outline-none focus:border-accent-green"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm focus:outline-none focus:border-accent-green"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm focus:outline-none focus:border-accent-green"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent-green text-surface-900 font-semibold rounded-lg hover:bg-accent-green/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-600">
          <p className="text-xs text-gray-500 text-center mb-3">Plans include monthly AI tokens</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-surface-900">
              <p className="font-medium text-gray-300">Free</p>
              <p className="text-accent-green">10K</p>
            </div>
            <div className="p-2 rounded-lg bg-surface-900 border border-accent-green/30">
              <p className="font-medium text-gray-300">Pro</p>
              <p className="text-accent-green">100K</p>
            </div>
            <div className="p-2 rounded-lg bg-surface-900">
              <p className="font-medium text-gray-300">Team</p>
              <p className="text-accent-green">500K</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
