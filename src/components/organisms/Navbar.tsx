import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutDashboard, Clock, FileText } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { DateRangePicker } from '../molecules/DateRangePicker';
import { UserMenu } from '../molecules/UserMenu';

interface NavbarProps {
  className?: string;
}

const tabs = [
  { path: '/animals/giant-anteater/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/animals/giant-anteater/timeline', label: 'Timeline', icon: Clock },
  { path: '/animals/giant-anteater/reports', label: 'Reports', icon: FileText },
];

const animals = [
  { id: 'giant-anteater', name: 'Giant Anteater', available: true },
  { id: 'red-panda', name: 'Red Panda', available: false },
  { id: 'sloth', name: 'Sloth', available: false },
];

export function Navbar({ className = '' }: NavbarProps) {
  const location = useLocation();
  const [animalDropdownOpen, setAnimalDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAnimalDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTab = tabs.find(tab => location.pathname === tab.path);

  return (
    <header className={`bg-white border-b border-gray-200 sticky top-0 z-40 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row with logo, breadcrumb, and user menu */}
        <div className="flex items-center justify-between h-16">
          {/* Logo and breadcrumb */}
          <div className="flex items-center gap-4">
            <NavLink to="/animals" className="flex items-center gap-2 focus-ring rounded-lg">
              <img src={logoImg} alt="VizAI" className="h-8" />
            </NavLink>

            {/* Breadcrumb */}
            <nav className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
              <ChevronRight className="w-4 h-4" />
              
              {/* Animal dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setAnimalDropdownOpen(!animalDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors focus-ring"
                >
                  <span className="font-medium text-charcoal">Giant Anteater</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${animalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {animalDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in">
                    {animals.map((animal) => (
                      <button
                        key={animal.id}
                        disabled={!animal.available}
                        onClick={() => setAnimalDropdownOpen(false)}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          animal.available
                            ? 'text-charcoal hover:bg-gray-50'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {animal.name}
                        {!animal.available && (
                          <span className="ml-2 text-xs text-gray-400">(Coming Soon)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ChevronRight className="w-4 h-4" />
              <span className="text-charcoal font-medium">{currentTab?.label || 'Dashboard'}</span>
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <DateRangePicker />
            <UserMenu />
          </div>
        </div>

        {/* Bottom row with navigation tabs */}
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                  ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-charcoal hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

