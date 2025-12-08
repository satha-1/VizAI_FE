import { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-primary to-accent px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">VizAI</h1>
              <p className="text-white/80 text-sm">Zoo Monitoring Dashboard</p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-8">
          {/* Title Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-charcoal">{title}</h2>
            {subtitle && (
              <p className="text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

