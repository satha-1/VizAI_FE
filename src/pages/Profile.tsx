import { Card, CardHeader, CardTitle, CardContent } from '../components/atoms/Card';
import { StatusBadge } from '../components/atoms/Badge';
import { Skeleton } from '../components/atoms/Skeleton';
import { EmptyState } from '../components/atoms/EmptyState';
import { ErrorState } from '../components/atoms/ErrorState';
import { useAnimal, useCreateAnimalProfile, useUpdateAnimalProfile, useDeleteAnimalProfile } from '../api/hooks';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthSelect } from '../components/auth/AuthSelect';
import { Button } from '../components/atoms/Button';
import { Modal } from '../components/atoms/Modal';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Info, Clock, Globe, User } from 'lucide-react';
import { formatRelativeTime, formatToZooTime } from '../utils/timezone';

type ProfileMode = 'view' | 'edit' | 'create';

type ProfileForm = {
  animal_id: string;
  animal_name: string;
  date_of_birth: string;
  gender: string;
  environment_id: string;
  animal_description: string;
  environment_description: string;
};

export function ProfilePage() {
  const { animalId: routeAnimalId } = useParams<{ animalId: string }>();
  const animalId = routeAnimalId || 'giant-anteater'; // Fallback for backward compatibility
  const { data: animal, isLoading, error, refetch } = useAnimal(animalId);
  const createMutation = useCreateAnimalProfile(animalId);
  const updateMutation = useUpdateAnimalProfile(animalId);
  const deleteMutation = useDeleteAnimalProfile(animalId);

  const [mode, setMode] = useState<ProfileMode>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formFromAnimal = (a: any | undefined): ProfileForm => ({
    animal_id: (a?.animal_id || a?.id || 'GAE-01').toString(),
    animal_name: (a?.animal_name || a?.name || 'anteater').toString(),
    date_of_birth: a?.date_of_birth ? String(a.date_of_birth).slice(0, 10) : '',
    gender: (a?.gender || '').toString(),
    environment_id: (a?.environment_id || '').toString(),
    animal_description: (a?.animal_description || '').toString(),
    environment_description: (a?.environment_description || '').toString(),
  });

  const [form, setForm] = useState<ProfileForm>(() => formFromAnimal(animal));

  // When we're NOT editing/creating, keep the form synced to backend data
  useEffect(() => {
    if (mode === 'view') {
      setForm(formFromAnimal(animal));
    }
  }, [animal, mode]);

  // Calculate age from date_of_birth if available
  const calculateAge = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null;
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const age = animal?.date_of_birth ? calculateAge(animal.date_of_birth) : animal?.age || null;
  const gender = animal?.gender || animal?.sex || 'Unknown';
  // Normalize gender capitalization
  const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();

  return (
    <div className="space-y-6">
      {/* If profile fetch failed, show message and allow create */}
      {error && mode === 'view' && (
        <ErrorState
          title="Profile not available"
          message="We couldn't load the animal profile from the backend. You can retry, or create the profile now."
          onRetry={() => refetch()}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {mode === 'view' ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!animal) return;
                setForm(formFromAnimal(animal));
                setMode('edit');
              }}
              disabled={!animal}
            >
              Edit Profile
            </Button>
            <Button
              onClick={() => {
                // Create mode starts with blank details, but pre-fills animal id/name
                const current = formFromAnimal(animal);
                setForm({
                  ...formFromAnimal(undefined),
                  animal_id: current.animal_id,
                  animal_name: current.animal_name,
                });
                setMode('create');
              }}
            >
              Create Profile
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setForm(formFromAnimal(animal));
                setMode('view');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (mode === 'edit' && animal) {
                  await updateMutation.mutateAsync({
                    date_of_birth: form.date_of_birth || undefined,
                    gender: form.gender || undefined,
                    environment_id: form.environment_id || undefined,
                    animal_description: form.animal_description || undefined,
                    environment_description: form.environment_description || undefined,
                  });
                } else if (mode === 'create') {
                  await createMutation.mutateAsync({
                    animal_id: form.animal_id || undefined,
                    animal_name: form.animal_name || undefined,
                    date_of_birth: form.date_of_birth || undefined,
                    gender: form.gender || undefined,
                    environment_id: form.environment_id || undefined,
                    description: form.animal_description || undefined,
                  });
                }
                setMode('view');
              }}
              disabled={updateMutation.isPending || createMutation.isPending}
            >
              {(updateMutation.isPending || createMutation.isPending)
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create'
                  : 'Save'}
            </Button>
            {mode === 'edit' && (
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteMutation.isPending || !animal}
              >
                Delete Profile
              </Button>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete profile?"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            This will delete the animal profile from the backend. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteMutation.mutateAsync();
                setShowDeleteConfirm(false);
                setMode('view');
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit form */}
      {(mode === 'edit' || mode === 'create') && (
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'Create Profile' : 'Edit Profile Details'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mode === 'create' && (
              <>
                <AuthInput
                  label="Animal ID"
                  value={form.animal_id}
                  onChange={(e) => setForm((p) => ({ ...p, animal_id: e.target.value }))}
                  placeholder="GAE-01"
                />
                <AuthInput
                  label="Animal Name"
                  value={form.animal_name}
                  onChange={(e) => setForm((p) => ({ ...p, animal_name: e.target.value }))}
                  placeholder="anteater"
                />
              </>
            )}
            <AuthInput
              label="Date of Birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
              rightIcon={<Calendar className="w-4 h-4" />}
            />
            <AuthSelect
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
              options={[
                { value: '', label: 'Select gender' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
              ]}
              placeholder="Select gender"
            />
            <AuthInput
              label="Environment ID"
              value={form.environment_id}
              onChange={(e) => setForm((p) => ({ ...p, environment_id: e.target.value }))}
              placeholder="ENV_001"
            />
            <AuthInput
              label="Animal Description"
              value={form.animal_description}
              onChange={(e) => setForm((p) => ({ ...p, animal_description: e.target.value }))}
              placeholder="Healthy deer from forest"
            />
            <div className="md:col-span-2">
              <AuthInput
                label="Environment Description"
                value={form.environment_description}
                onChange={(e) => setForm((p) => ({ ...p, environment_description: e.target.value }))}
                placeholder="Dense forest environment"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-6">
              <Skeleton className="w-24 h-24 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : animal ? (
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              {/* Profile Image */}
              <div className="w-32 h-32 rounded-xl bg-primary/10 overflow-hidden flex-shrink-0 border-2 border-primary/20">
                {animal.image_url ? (
                  <img
                    src={animal.image_url}
                    alt={animal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <span className="text-5xl">🦡</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-charcoal">{animal.name}</h1>
                  <StatusBadge status={animal.status} size="md" />
                </div>
                <p className="text-xl font-medium text-gray-700 mb-4">{animal.species}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>
                      <span className="font-medium">Age:</span> {age !== null ? `${age} years` : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>
                      <span className="font-medium">Gender:</span> {normalizedGender}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>
                      <span className="font-medium">Enclosure:</span> {animal.enclosure}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>
                      <span className="font-medium">ID:</span> {animal.animal_id || animal.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No profile data"
              description="Animal profile information is not available."
            />
          )}
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Animal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Animal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : animal ? (
              <dl className="space-y-4">
                {animal.animal_description && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Description</dt>
                    <dd className="text-sm text-charcoal">{animal.animal_description}</dd>
                  </div>
                )}
                {animal.date_of_birth && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Date of Birth</dt>
                    <dd className="text-sm text-charcoal flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatToZooTime(animal.date_of_birth)}
                    </dd>
                  </div>
                )}
                {age !== null && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Age</dt>
                    <dd className="text-sm text-charcoal">{age} years old</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 mb-1">Gender</dt>
                  <dd className="text-sm text-charcoal">{normalizedGender}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 mb-1">Animal ID</dt>
                  <dd className="text-sm text-charcoal font-mono">{animal.animal_id || animal.id}</dd>
                </div>
                {animal.animal_created_at && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Profile Created</dt>
                    <dd className="text-sm text-charcoal flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatRelativeTime(animal.animal_created_at)}
                    </dd>
                  </div>
                )}
                {animal.animal_modified_at && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Last Modified</dt>
                    <dd className="text-sm text-charcoal flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatRelativeTime(animal.animal_modified_at)}
                    </dd>
                  </div>
                )}
              </dl>
            ) : null}
          </CardContent>
        </Card>

        {/* Environment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : animal ? (
              <dl className="space-y-4">
                {animal.environment_id && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Environment ID</dt>
                    <dd className="text-sm text-charcoal font-mono">{animal.environment_id}</dd>
                  </div>
                )}
                {animal.environment_description && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Description</dt>
                    <dd className="text-sm text-charcoal">{animal.environment_description}</dd>
                  </div>
                )}
                {animal.enclosure && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Enclosure</dt>
                    <dd className="text-sm text-charcoal flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {animal.enclosure}
                    </dd>
                  </div>
                )}
                {animal.environment_created_at && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Environment Created</dt>
                    <dd className="text-sm text-charcoal flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatRelativeTime(animal.environment_created_at)}
                    </dd>
                  </div>
                )}
                {animal.environment_modified_at && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-1">Last Modified</dt>
                    <dd className="text-sm text-charcoal flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatRelativeTime(animal.environment_modified_at)}
                    </dd>
                  </div>
                )}
                {!animal.environment_id && !animal.environment_description && (
                  <div className="text-sm text-gray-500 italic">
                    No environment information available
                  </div>
                )}
              </dl>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

