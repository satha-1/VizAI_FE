import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowRight, Clock } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Badge, StatusBadge } from '../components/atoms/Badge';
import { SearchInput } from '../components/molecules/SearchInput';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface AnimalCardData {
  id: string;
  species: string;
  name: string;
  imageUrl: string;
  age: number;
  sex: string;
  enclosure: string;
  status: 'Active' | 'Resting' | 'Alert';
  lastUpdate: string;
  available: boolean;
}

const animals: AnimalCardData[] = [
  {
    id: 'giant-anteater',
    species: 'Giant Anteater',
    name: 'Aria',
    imageUrl: 'https://placehold.co/400x300/008C8C/white?text=Aria',
    age: 6,
    sex: 'Female',
    enclosure: 'B-2',
    status: 'Active',
    lastUpdate: '5 min ago',
    available: true,
  },
  {
    id: 'red-panda',
    species: 'Red Panda',
    name: 'Ruby',
    imageUrl: 'https://placehold.co/400x300/374151/white?text=Coming+Soon',
    age: 3,
    sex: 'Female',
    enclosure: 'A-1',
    status: 'Resting',
    lastUpdate: '-',
    available: false,
  },
  {
    id: 'sloth',
    species: 'Two-Toed Sloth',
    name: 'Simon',
    imageUrl: 'https://placehold.co/400x300/374151/white?text=Coming+Soon',
    age: 8,
    sex: 'Male',
    enclosure: 'C-3',
    status: 'Resting',
    lastUpdate: '-',
    available: false,
  },
];

export function AnimalSelectionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectAnimal = (animalId: string) => {
    navigate(`/animals/${animalId}/dashboard`);
  };

  const filteredAnimals = animals.filter((animal) =>
    animal.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoImg} alt="VizAI" className="h-8" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium text-charcoal">{user?.name}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-charcoal mb-2">
            Select an Animal to Monitor
          </h1>
          <p className="text-gray-600">
            Choose an animal to view behavior analytics and monitoring data
          </p>
        </div>

        <div className="mb-6">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search animals..."
            className="max-w-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnimals.map((animal) => (
            <Card
              key={animal.id}
              hover={animal.available}
              padding="none"
              className={`overflow-hidden ${
                !animal.available ? 'opacity-60' : ''
              }`}
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={animal.imageUrl}
                  alt={animal.name}
                  className="w-full h-full object-cover"
                />
                {!animal.available && (
                  <div className="absolute inset-0 bg-charcoal/60 flex items-center justify-center">
                    <Badge variant="default" size="md">
                      Coming Soon
                    </Badge>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={animal.status} />
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-charcoal mb-1">
                  {animal.species}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {animal.name}
                </p>

                <p className="text-sm text-gray-500 mb-4">
                  Age {animal.age} • {animal.sex} • Enclosure {animal.enclosure}
                </p>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Last behavior update: {animal.lastUpdate}</span>
                </div>

                <Button
                  className="w-full"
                  disabled={!animal.available}
                  onClick={() => handleSelectAnimal(animal.id)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Dashboard
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

