import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowRight, Clock, Calendar, Trash2 } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { Badge, StatusBadge } from '../components/atoms/Badge';
import { SearchInput } from '../components/molecules/SearchInput';
import { useAuth } from '../context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/atoms/Modal';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthSelect } from '../components/auth/AuthSelect';
import { useCreateAnimalProfile, useAllAnimals, queryKeys } from '../api/hooks';
import { useToast } from '../components/molecules/Toast';
import { formatRelativeTime } from '../utils/timezone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAnimalProfileApi } from '../api/endpoints';

type AnimalCardKind = 'profile' | 'placeholder';

interface AnimalCardData {
  kind: AnimalCardKind;
  key: string;
  available: boolean;
  // profile-backed
  animal_id?: string;
  animal_name?: string;
  backend_status?: string;
  age?: number;
  gender?: string;
  environment_id?: string;
  environment_description?: string | null;
  description?: string;
  last_profile_update?: string;
  // placeholder
  species?: string;
  name?: string;
  imageUrl?: string;
  status?: 'Active' | 'Coming Soon' | 'Deleted' | 'Resting' | 'Feeding';
}

const STORAGE_KEY = 'vizai_custom_animals_v1';

function toTitleCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatBackendDobInput(value: string): string | undefined {
  if (!value) return undefined;
  // Accept "YYYY-MM-DD" and convert to "YYYY-MM-DD 00:00:00"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value} 00:00:00`;
  return value; // allow user to paste backend format directly
}

// baseCards removed - now loaded from API

export function AnimalSelectionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ animal_id: string; animal_name: string } | null>(null);
  const createProfile = useCreateAnimalProfile('giant-anteater');
  const queryClient = useQueryClient();
  const { data: allAnimals } = useAllAnimals();
  const [customProfiles, setCustomProfiles] = useState<{ animal_id: string; animal_name: string }[]>([]);

  const deleteProfile = useMutation({
    mutationFn: ({ animal_id }: { animal_id: string }) => deleteAnimalProfileApi(animal_id),
    onSuccess: (_, variables) => {
      setCustomProfiles((prev) => prev.filter((p) => p.animal_id !== variables.animal_id));
      queryClient.invalidateQueries({ queryKey: queryKeys.allAnimals() });
      queryClient.invalidateQueries({ queryKey: ['animalProfile'] });
      showToast('success', `Animal removed from UI (${variables.animal_id})`);
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      showToast('error', error?.message || 'Failed to delete profile');
    },
  });

  const [createForm, setCreateForm] = useState({
    animal_id: '',
    animal_name: '',
    date_of_birth: '',
    gender: '',
    environment_id: '',
    description: '',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomProfiles(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customProfiles));
    } catch {
      // ignore
    }
  }, [customProfiles]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectAnimal = (animalId: string) => {
    navigate(`/animals/${animalId}/dashboard`);
  };

  const cards: AnimalCardData[] = useMemo(() => {
    // Convert API animals to card format
    const apiCards: AnimalCardData[] = (allAnimals || [])
      .filter((animal: any) => String(animal?.status || '').toUpperCase() !== 'DELETED')
      .map((animal: any) => {
        const rawStatus = String(animal?.status || 'ACTIVE').toUpperCase();
        const uiStatus =
          rawStatus === 'ACTIVE'
            ? 'Active'
            : rawStatus === 'COMING_SOON'
            ? 'Coming Soon'
            : 'Active';
        return {
          kind: 'profile' as const,
          key: animal.animal_id,
          animal_id: animal.animal_id,
          animal_name: animal.animal_name,
          backend_status: rawStatus,
          age: animal.age,
          gender: animal.gender,
          environment_id: animal.environment_id,
          environment_description: animal.environment_description,
          description: animal.description,
          last_profile_update: animal.last_profile_update,
          available: rawStatus === 'ACTIVE',
          status: uiStatus as AnimalCardData['status'],
        };
      });

    // Custom profiles (manually added, not yet in API)
    const custom = customProfiles.map((p) => ({
      kind: 'profile' as const,
      key: p.animal_id,
      animal_id: p.animal_id,
      animal_name: p.animal_name,
      available: false, // dashboards for new animals may not have behavior data yet
    }));

    // De-dupe by key (API animals take precedence)
    const seen = new Set<string>();
    const merged = [...apiCards, ...custom].filter((c) => {
      if (seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });
    return merged;
  }, [allAnimals, customProfiles]);

  const filteredAnimals = cards.filter((card) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (card.kind === 'placeholder') {
      return (
        (card.species || '').toLowerCase().includes(q) ||
        (card.name || '').toLowerCase().includes(q)
      );
    }
    return (
      (card.animal_id || '').toLowerCase().includes(q) ||
      (card.animal_name || '').toLowerCase().includes(q)
    );
  });

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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-charcoal mb-2">
              Select an Animal to Monitor
            </h1>
            <p className="text-gray-600">
              Choose an animal to view behavior analytics and monitoring data
            </p>
          </div>
          <Button onClick={() => setShowAddProfile(true)}>
            Add Animal Profile
          </Button>
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
            animal.kind === 'profile' ? (
              <ProfileBackedAnimalCard
                key={animal.key}
                animalId={animal.animal_id!}
                animalName={animal.animal_name!}
                available={animal.available}
                status={animal.status || 'Active'}
                age={animal.age}
                gender={animal.gender}
                environmentId={animal.environment_id}
                lastProfileUpdate={animal.last_profile_update}
                description={animal.description}
                onSelect={handleSelectAnimal}
                onDelete={() => setDeleteConfirm({ animal_id: animal.animal_id!, animal_name: animal.animal_name! })}
              />
            ) : (
              <Card
                key={animal.key}
                hover={animal.available}
                padding="none"
                className={`overflow-hidden ${!animal.available ? 'opacity-60' : ''}`}
              >
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
                    <StatusBadge status={animal.status || 'Resting'} />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-charcoal mb-1">
                    {animal.species}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{animal.name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>Last behavior update: -</span>
                  </div>
                  <Button className="w-full" disabled rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View Dashboard
                  </Button>
                </div>
              </Card>
            )
          ))}
        </div>

        {/* Add Profile Modal */}
        <Modal isOpen={showAddProfile} onClose={() => setShowAddProfile(false)} title="Add Animal Profile" size="lg">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AuthInput
                label="Animal ID"
                value={createForm.animal_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, animal_id: e.target.value }))}
                placeholder="GAE-04"
              />
              <AuthInput
                label="Animal Name"
                value={createForm.animal_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, animal_name: e.target.value }))}
                placeholder="Bear"
              />
              <AuthInput
                label="Date of Birth"
                type="date"
                value={createForm.date_of_birth}
                onChange={(e) => setCreateForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                placeholder="2022-05-01"
                rightIcon={<Calendar className="w-4 h-4" />}
              />
              <AuthSelect
                label="Gender"
                value={createForm.gender}
                onChange={(e) => setCreateForm((p) => ({ ...p, gender: e.target.value }))}
                options={[
                  { value: '', label: 'Select gender' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'FeMale', label: 'FeMale (backend style)' },
                ]}
                placeholder="Select gender"
              />
              <AuthInput
                label="Environment ID"
                value={createForm.environment_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, environment_id: e.target.value }))}
                placeholder="ENV_003"
              />
              <AuthInput
                label="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Healthy adult Bear"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowAddProfile(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const animal_id = createForm.animal_id.trim();
                    const animal_name = createForm.animal_name.trim();
                    if (!animal_id || !animal_name) {
                      showToast('error', 'Animal ID and Animal Name are required');
                      return;
                    }

                    await createProfile.mutateAsync({
                      animal_id,
                      animal_name,
                      date_of_birth: formatBackendDobInput(createForm.date_of_birth.trim()),
                      gender: createForm.gender || undefined,
                      environment_id: createForm.environment_id || undefined,
                      description: createForm.description || undefined,
                    });

                    showToast('success', `Profile created for ${toTitleCase(animal_name)} (${animal_id})`);
                    setCustomProfiles((prev) => {
                      if (prev.some((p) => p.animal_id === animal_id)) return prev;
                      return [...prev, { animal_id, animal_name }];
                    });
                    setShowAddProfile(false);
                    setCreateForm({
                      animal_id: '',
                      animal_name: '',
                      date_of_birth: '',
                      gender: '',
                      environment_id: '',
                      description: '',
                    });
                  } catch (e: any) {
                    showToast('error', e?.message || 'Failed to create profile');
                  }
                }}
                disabled={createProfile.isPending}
              >
                {createProfile.isPending ? 'Creating...' : 'Create Profile'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Animal Profile"
          size="md"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the profile for{' '}
              <span className="font-medium text-charcoal">
                {deleteConfirm ? toTitleCase(deleteConfirm.animal_name) : ''} ({deleteConfirm?.animal_id})
              </span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteProfile.mutate({
                      animal_id: deleteConfirm.animal_id,
                    });
                  }
                }}
                disabled={deleteProfile.isPending}
              >
                {deleteProfile.isPending ? 'Deleting...' : 'Delete Profile'}
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}

function ProfileBackedAnimalCard({
  animalId,
  animalName,
  available,
  status,
  age,
  gender,
  environmentId,
  lastProfileUpdate,
  description,
  onSelect,
  onDelete,
}: {
  animalId: string;
  animalName: string;
  available: boolean;
  status: 'Active' | 'Coming Soon' | 'Deleted' | 'Resting' | 'Feeding';
  age?: number;
  gender?: string;
  environmentId?: string;
  lastProfileUpdate?: string;
  description?: string;
  onSelect: (animalId: string) => void;
  onDelete: () => void;
}) {
  const displaySpecies = toTitleCase(animalName);
  const displayName = toTitleCase(animalName);
  const last = lastProfileUpdate ? formatRelativeTime(lastProfileUpdate) : '-';
  const isComingSoon = status === 'Coming Soon';

  const imageUrl =
    `https://placehold.co/400x300/008C8C/white?text=${encodeURIComponent(displayName)}`;

  return (
    <Card
      hover={available && !isComingSoon}
      padding="none"
      className={`overflow-hidden ${!available ? 'opacity-60' : ''}`}
    >
      <div className="relative h-48 bg-gray-100">
        <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
        {!available && (
          <div className="absolute inset-0 bg-charcoal/40 flex items-center justify-center">
            <Badge variant="default" size="md">
              {isComingSoon ? 'Coming Soon' : 'Profile Added'}
            </Badge>
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <StatusBadge status={status} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 left-3 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-md transition-colors"
          title="Delete profile"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-charcoal mb-1">{displaySpecies}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {`${displayName} • ${animalId}`}
        </p>

        {(age !== undefined || gender || environmentId) && (
          <p className="text-sm text-gray-500 mb-4">
            Age {age ?? 0} • {(gender || 'Unknown').toString()} • Env {environmentId || 'Unknown'}
          </p>
        )}

        {description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{description}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Clock className="w-4 h-4" />
          <span>Last profile update: {last}</span>
        </div>

        <Button
          className="w-full"
          disabled={!available}
          onClick={() => onSelect(animalId)} // animalId is backend ID (e.g., "GAE-01")
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          View Dashboard
        </Button>
      </div>
    </Card>
  );
}

