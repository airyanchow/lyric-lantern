import { useSearchParams, Navigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import { useAuth } from '../hooks/useAuth';
import ChineseLantern from '../components/icons/ChineseLantern';

export default function LoginPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isSignup = searchParams.get('signup') === 'true';

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <ChineseLantern className="mb-6 h-10 w-10" />
      {isSignup ? <SignupForm /> : <LoginForm />}
    </div>
  );
}
