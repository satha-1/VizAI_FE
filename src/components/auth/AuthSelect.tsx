import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface AuthSelectProps {
  label: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
}

export function AuthSelect({
  label,
  error,
  options,
  placeholder,
  value = '',
  onChange,
  name,
  id,
  disabled = false,
}: AuthSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      onChange({ target: { value: optionValue } });
    }
    setIsOpen(false);
  };

  return (
    <div className="w-full" ref={containerRef}>
      <label
        htmlFor={selectId}
        className="block text-xs font-medium text-charcoal mb-1"
      >
        {label}
      </label>
      
      {/* Hidden native select for form submission */}
      <input type="hidden" name={name} value={value} />
      
      {/* Custom dropdown trigger */}
      <button
        type="button"
        id={selectId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-left
          bg-white
          transition-colors duration-150
          flex items-center justify-between
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'}
          ${!selectedOption ? 'text-gray-400' : 'text-charcoal'}
        `}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg animate-fade-in"
          style={{ width: containerRef.current?.offsetWidth }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && handleSelect(option.value)}
              disabled={option.disabled}
              className={`
                w-full px-3 py-2 text-sm text-left flex items-center justify-between
                transition-colors duration-150
                ${option.disabled 
                  ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                  : 'text-charcoal hover:bg-primary hover:text-white'
                }
                ${option.value === value ? 'bg-primary/10 text-primary font-medium' : ''}
              `}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
