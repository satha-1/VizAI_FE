import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { AuthInput, AuthSelect, AuthButton } from '../components/auth';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginFormValues {
  email: string;
  password: string;
  role: UserRole | '';
}

interface FormErrors {
  email?: string;
  password?: string;
  role?: string;
}

const roleOptions = [
  { value: 'Zoo Manager', label: 'Zoo Manager' },
  { value: 'Veterinarian', label: 'Veterinarian' },
  { value: 'Researcher', label: 'Researcher' },
  { value: 'Animal Keeper', label: 'Animal Keeper' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuth();

  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: '',
    password: '',
    role: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/animals', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field: keyof LoginFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formValues.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formValues.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formValues.password) {
      newErrors.password = 'Password is required';
    }

    if (!formValues.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = (): boolean => {
    return (
      formValues.email.trim() !== '' &&
      formValues.password !== '' &&
      formValues.role !== ''
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await login(formValues.email, formValues.password);
      navigate('/animals');
    } catch {
      setErrors({ password: 'Invalid credentials. Please try again.' });
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 400">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-16">
          <div className="mb-6">
            <img src={logoImg} alt="VizAI" className="h-12 mb-3" />
            <p className="text-lg text-white/90">
              MetroParks Zoo
            </p>
          </div>

          <div className="space-y-4">
            {/* <h2 className="text-xl xl:text-2xl font-semibold text-white">
              Giant Anteater Monitoring
            </h2> */}
            <p className="text-base text-white/80 max-w-md">
              Advanced behavior analysis and welfare monitoring powered by computer vision and AI.
            </p>
          </div>

          <div className="mt-8 opacity-80">
            <svg className="w-40 h-40" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2" strokeDasharray="8 8" />
              <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <circle cx="100" cy="100" r="40" fill="white" opacity="0.1" />
              <path d="M60 100 Q80 80 100 100 Q120 120 140 100" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="100" r="8" fill="#A3E635" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-4">
            <img src={logoImg} alt="VizAI" className="h-10 mx-auto mb-1" />
            <p className="text-sm text-gray-600">MetroParks Zoo</p>
          </div>

          <div className="bg-white rounded-2xl shadow-card px-6 py-6">
            <div className="text-center mb-5">
              <h2 className="text-xl font-semibold text-charcoal mb-1">
                Welcome Back
              </h2>
              <p className="text-sm text-gray-500">
                Sign in to continue to Zoo Monitoring Dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput
                label="Email"
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                value={formValues.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                autoComplete="email"
                autoFocus
              />

              <div>
                <AuthInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  value={formValues.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  error={errors.password}
                  autoComplete="current-password"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-charcoal transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <div className="mt-1 text-right">
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-primary-dark transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <AuthSelect
                label="Role"
                name="role"
                id="role"
                placeholder="Select your role"
                value={formValues.role}
                onChange={(e) => handleChange('role', e.target.value)}
                error={errors.role}
                options={roleOptions}
              />

              <div className="pt-2 space-y-2">
                <AuthButton
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={!isFormValid()}
                >
                  Sign in
                </AuthButton>

                <AuthButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/register')}
                >
                  Don't have an account? Create one
                </AuthButton>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            © 2025 VizAI – MetroParks Zoo. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
