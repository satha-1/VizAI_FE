import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutDashboard, Clock, FileText, User } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { DateRangePicker } from '../molecules/DateRangePicker';
import { UserMenu } from '../molecules/UserMenu';
import { useAllAnimals } from '../../api/hooks';

interface NavbarProps {
  className?: string;
}

// Tabs will be generated dynamically based on current animal ID
const getTabs = (animalId: string) => [
  { path: `/animals/${animalId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
  { path: `/animals/${animalId}/timeline`, label: 'Timeline', icon: Clock },
  { path: `/animals/${animalId}/reports`, label: 'Reports', icon: FileText },
  { path: `/animals/${animalId}/profile`, label: 'Profile', icon: User },
];

export function Navbar({ className = '' }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [animalDropdownOpen, setAnimalDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: allAnimals } = useAllAnimals();

  // Extract animal ID from current route (e.g., /animals/GAE-01/dashboard -> GAE-01)
  const animalId = useMemo(() => {
    const match = location.pathname.match(/^\/animals\/([^/]+)/);
    return match ? match[1] : 'giant-anteater'; // Fallback for backward compatibility
  }, [location.pathname]);

  const tabs = useMemo(() => getTabs(animalId), [animalId]);

  const animals = useMemo(() => {
    const raw = Array.isArray(allAnimals) ? allAnimals : [];
    return raw
      .filter((a: any) => String(a?.status || '').toUpperCase() !== 'DELETED')
      .map((a: any) => {
        const status = String(a?.status || 'ACTIVE').toUpperCase();
        return {
          id: String(a?.animal_id || ''),
          name: String(a?.animal_name || a?.animal_id || 'Unknown'),
          status,
          selectable: status === 'ACTIVE',
        };
      })
      .filter((a) => a.id);
  }, [allAnimals]);

  const currentAnimalLabel = useMemo(() => {
    const match = animals.find((a) => a.id === animalId);
    if (match) return match.name;
    // fallback for older route "/animals/giant-anteater/..."
    if (animalId === 'giant-anteater') return 'Giant Anteater';
    return animalId;
  }, [animals, animalId]);

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
                  <span className="font-medium text-charcoal">{currentAnimalLabel}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${animalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {animalDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in">
                    {animals.map((animal) => (
                      <button
                        key={animal.id}
                        disabled={!animal.selectable}
                        onClick={() => {
                          if (!animal.selectable) return;
                          setAnimalDropdownOpen(false);
                          navigate(`/animals/${animal.id}/dashboard`);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          animal.selectable
                            ? 'text-charcoal hover:bg-gray-50'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {animal.name}
                        {!animal.selectable && (
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

