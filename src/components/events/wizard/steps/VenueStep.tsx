'use client';

import { useState } from 'react';
import { MapPin, Car, Shirt, Image, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DRESS_CODE_OPTIONS, isCustomDressCode } from '@/lib/m33t';
import type { EventWizardData } from '../hooks/useWizardState';

interface VenueStepProps {
  data: EventWizardData;
  onChange: (updates: Partial<EventWizardData>) => void;
}

export function VenueStep({ data, onChange }: VenueStepProps) {
  // Track whether user selected "Other" to show/hide custom input
  const [showCustomInput, setShowCustomInput] = useState(() => isCustomDressCode(data.dressCode));
  const [customDressCode, setCustomDressCode] = useState(() =>
    isCustomDressCode(data.dressCode) ? data.dressCode : ''
  );

  // Determine the select value - if custom, show "other", otherwise show the actual value
  const selectValue = isCustomDressCode(data.dressCode) ? 'other' : data.dressCode;

  const handleDressCodeChange = (value: string) => {
    if (value === 'other') {
      setShowCustomInput(true);
      // Don't update the actual dress code yet - wait for custom input
      if (customDressCode) {
        onChange({ dressCode: customDressCode });
      }
    } else {
      setShowCustomInput(false);
      setCustomDressCode('');
      onChange({ dressCode: value });
    }
  };

  const handleCustomDressCodeChange = (value: string) => {
    setCustomDressCode(value);
    // Only update if non-empty after trimming
    const trimmed = value.trim();
    if (trimmed) {
      onChange({ dressCode: trimmed });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Venue Details</h2>
        <p className="text-text-secondary">Where is your event taking place?</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venueName">
          <MapPin className="inline w-4 h-4 mr-1" />
          Venue Name <span className="text-gold-primary">*</span>
        </Label>
        <Input
          id="venueName"
          placeholder="e.g., The Capital Factory"
          value={data.venueName}
          onChange={(e) => onChange({ venueName: e.target.value })}
          className={`bg-bg-tertiary ${!data.venueName ? 'border-error/50 focus:border-error' : ''}`}
        />
        {!data.venueName && (
          <p className="text-xs text-error">Venue name is required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="venueAddress">Venue Address <span className="text-gold-primary">*</span></Label>
        <Input
          id="venueAddress"
          placeholder="e.g., 701 Brazos St, Austin, TX 78701"
          value={data.venueAddress}
          onChange={(e) => onChange({ venueAddress: e.target.value })}
          className={`bg-bg-tertiary ${!data.venueAddress ? 'border-error/50 focus:border-error' : ''}`}
        />
        {!data.venueAddress && (
          <p className="text-xs text-error">Venue address is required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="googlePlaceId">
          <Image className="inline w-4 h-4 mr-1" />
          Google Place ID
          <span className="text-text-secondary font-normal ml-1">(optional)</span>
        </Label>
        <Input
          id="googlePlaceId"
          placeholder="e.g., ChIJN1t_tDeuEmsRUsoyG83frY4"
          value={data.googlePlaceId || ''}
          onChange={(e) => onChange({ googlePlaceId: e.target.value || null })}
          className="bg-bg-tertiary font-mono text-sm"
        />
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Shows venue photos from Google Maps on the landing page.</span>
          <a
            href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold-primary hover:text-gold-light"
          >
            Find Place ID
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parkingNotes">
          <Car className="inline w-4 h-4 mr-1" />
          Parking Notes
        </Label>
        <Textarea
          id="parkingNotes"
          placeholder="e.g., Free parking in the garage on 7th Street..."
          value={data.parkingNotes}
          onChange={(e) => onChange({ parkingNotes: e.target.value })}
          className="bg-bg-tertiary min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label>
          <Shirt className="inline w-4 h-4 mr-1" />
          Dress Code
        </Label>
        <Select value={selectValue} onValueChange={handleDressCodeChange}>
          <SelectTrigger className="bg-bg-tertiary">
            <SelectValue placeholder="Select dress code..." />
          </SelectTrigger>
          <SelectContent>
            {DRESS_CODE_OPTIONS.map((dc) => (
              <SelectItem key={dc.value} value={dc.value}>{dc.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCustomInput && (
          <div className="mt-2">
            <Input
              placeholder="Enter custom dress code..."
              value={customDressCode}
              onChange={(e) => handleCustomDressCodeChange(e.target.value)}
              className={`bg-bg-tertiary ${customDressCode && !customDressCode.trim() ? 'border-error/50' : ''}`}
              autoFocus
            />
            {customDressCode && !customDressCode.trim() && (
              <p className="text-xs text-error mt-1">Please enter a dress code</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
