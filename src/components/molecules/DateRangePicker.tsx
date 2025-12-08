import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '../atoms/Button';
import { DateRangePreset } from '../../types';
import { useDateRange } from '../../context/DateRangeContext';

interface DateRangePickerProps {
  className?: string;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangePicker({ className = '' }: DateRangePickerProps) {
  const { dateRange, setPreset, setCustomRange, formatDateRange } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(dateRange.startDate);
  const [customEnd, setCustomEnd] = useState(dateRange.endDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustomPicker(true);
    } else {
      setPreset(preset);
      setShowCustomPicker(false);
      setIsOpen(false);
    }
  };

  const handleApplyCustom = () => {
    setCustomRange(customStart, customEnd);
    setIsOpen(false);
    setShowCustomPicker(false);
  };

  const currentPresetLabel = presets.find(p => p.value === dateRange.preset)?.label || 'Select';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-charcoal hover:bg-gray-50 transition-colors focus-ring"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="hidden sm:inline">{formatDateRange()}</span>
        <span className="sm:hidden">{currentPresetLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-2 py-1 uppercase tracking-wider">Quick select</p>
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`px-3 py-2 text-sm rounded-lg text-left transition-colors
                    ${dateRange.preset === preset.value && preset.value !== 'custom'
                      ? 'bg-primary text-white'
                      : 'text-charcoal hover:bg-gray-100'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {showCustomPicker && (
            <div className="border-t border-gray-100 p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <Button onClick={handleApplyCustom} className="w-full">
                  Apply Range
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

