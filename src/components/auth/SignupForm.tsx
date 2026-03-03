import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SignupForm() {
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signUp(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
  };

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 text-xl font-bold">Check Your Email</h2>
        <p className="mt-2 text-text-secondary">
          We sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-xl bg-china-red px-6 py-3 font-medium text-white transition-colors hover:bg-china-red-dark no-underline"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="mb-6 text-center text-2xl font-bold">Create Account</h2>

      <button
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-text-primary transition-colors hover:bg-white/10"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-text-secondary">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-white/10 bg-bg-secondary px-4 py-3 pl-11 text-text-primary placeholder-text-secondary outline-none transition-colors focus:border-china-red"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            required
            minLength={6}
            className="w-full rounded-xl border border-white/10 bg-bg-secondary px-4 py-3 pl-11 text-text-primary placeholder-text-secondary outline-none transition-colors focus:border-china-red"
          />
        </div>

        {error && <p className="text-sm text-china-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-china-red px-4 py-3 font-medium text-white transition-colors hover:bg-china-red-dark disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create Account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="text-china-red hover:text-china-red-light">
          Sign In
        </Link>
      </p>
    </div>
  );
}
