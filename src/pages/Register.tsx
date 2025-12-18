import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { AuthInput, AuthSelect, AuthCheckbox, AuthButton } from '../components/auth';
import { useToast } from '../components/molecules/Toast';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole | '';
  acceptTerms: boolean;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  acceptTerms?: string;
}

const roleOptions = [
  { value: 'Zoo Manager', label: 'Zoo Manager' },
  { value: 'Veterinarian', label: 'Veterinarian' },
  { value: 'Researcher', label: 'Researcher' },
  { value: 'Animal Keeper', label: 'Animal Keeper' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [formValues, setFormValues] = useState<RegisterFormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/animals', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field: keyof RegisterFormValues, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formValues.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formValues.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formValues.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formValues.password) {
      newErrors.password = 'Password is required';
    } else if (formValues.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formValues.confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (formValues.password !== formValues.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formValues.role) {
      newErrors.role = 'Please select a role';
    }

    if (!formValues.acceptTerms) {
      newErrors.acceptTerms = 'You must agree to the Terms and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = (): boolean => {
    return (
      formValues.fullName.trim() !== '' &&
      formValues.email.trim() !== '' &&
      formValues.password !== '' &&
      formValues.confirmPassword !== '' &&
      formValues.password === formValues.confirmPassword &&
      formValues.role !== '' &&
      formValues.acceptTerms
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    showToast('success', 'Account created successfully. Please sign in.');
    navigate('/login');
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
            {/* <p className="text-base text-white/80 max-w-md">
              Advanced behavior analysis and welfare monitoring powered by computer vision and AI.
            </p> */}
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

      {/* Right panel - Register form */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-4">
            <img src={logoImg} alt="VizAI" className="h-10 mx-auto mb-1" />
            <p className="text-sm text-gray-600">MetroParks Zoo</p>
          </div>

          <div className="bg-white rounded-2xl shadow-card px-6 py-5">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-charcoal mb-1">
                Create your account
              </h2>
              <p className="text-sm text-gray-500">
                Join VizAI to start monitoring animal behavior
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <AuthInput
                label="Full Name"
                type="text"
                name="fullName"
                id="fullName"
                placeholder="First Last"
                value={formValues.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                error={errors.fullName}
                autoComplete="name"
                autoFocus
              />

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
              />

              <div className="grid grid-cols-2 gap-3">
                <AuthInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  value={formValues.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  error={errors.password}
                  autoComplete="new-password"
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

                <AuthInput
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={formValues.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-charcoal transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
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

              <AuthCheckbox
                name="acceptTerms"
                id="acceptTerms"
                checked={formValues.acceptTerms}
                onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                error={errors.acceptTerms}
                label={
                  <>
                    I agree to the{' '}
                    <span className="text-primary underline cursor-pointer">
                      Terms and Privacy Policy
                    </span>
                  </>
                }
              />

              <div className="pt-1 space-y-2">
                <AuthButton
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={!isFormValid()}
                >
                  Register
                </AuthButton>

                <AuthButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/login')}
                >
                  Already have an account? Sign in
                </AuthButton>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-gray-500 mt-3">
            © 2025 VizAI – MetroParks Zoo. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
