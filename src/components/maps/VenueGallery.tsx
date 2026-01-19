'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MapPin, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface VenuePhoto {
  url: string;
  width: number;
  height: number;
  attribution: string | null;
}

interface PlaceData {
  id: string;
  name: string | null;
  address: string | null;
  location: { latitude: number; longitude: number } | null;
  photos: VenuePhoto[];
}

interface VenueGalleryProps {
  googlePlaceId: string;
  venueName: string;
  venueAddress: string;
  className?: string;
  autoAdvanceInterval?: number; // ms between auto-advances, default 4000
}

export function VenueGallery({
  googlePlaceId,
  venueName,
  venueAddress,
  className = '',
  autoAdvanceInterval = 4000,
}: VenueGalleryProps) {
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    async function fetchPlaceData() {
      if (!googlePlaceId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/places/${googlePlaceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch place data');
        }
        const data = await response.json();
        setPlaceData(data);
      } catch (err) {
        console.error('Error fetching place data:', err);
        setError('Unable to load venue photos');
      } finally {
        setLoading(false);
      }
    }

    fetchPlaceData();
  }, [googlePlaceId]);

  // Filter out broken images while preserving original indices for error tracking
  const photosWithIndices = (placeData?.photos || [])
    .map((photo, originalIndex) => ({ photo, originalIndex }))
    .filter(({ originalIndex }) => !brokenImages.has(originalIndex));
  const photos = photosWithIndices.map(({ photo }) => photo);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused || photos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, autoAdvanceInterval);

    return () => clearInterval(timer);
  }, [isPaused, photos.length, autoAdvanceInterval]);

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  // Handle image load errors
  const handleImageError = (originalIndex: number) => {
    setBrokenImages((prev) => new Set([...prev, originalIndex]));
  };

  const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`;

  // Loading state
  if (loading) {
    return (
      <div className={`relative aspect-[16/9] bg-zinc-900 rounded-2xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Error or no photos - show fallback
  if (error || !placeData || photos.length === 0) {
    return (
      <div className={`relative aspect-[16/9] bg-zinc-900 rounded-2xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">{venueName}</p>
            <p className="text-zinc-600 text-xs mt-1">{venueAddress}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[16/9] bg-zinc-900 rounded-2xl overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Photo carousel */}
      <div className="absolute inset-0">
        {photosWithIndices.map(({ photo, originalIndex }, filteredIndex) => (
          <div
            key={originalIndex}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              filteredIndex === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={photo.url}
              alt={`${venueName} - Photo ${filteredIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized
              onError={() => handleImageError(originalIndex)}
              priority={filteredIndex === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows (visible on hover/touch) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to photo ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* "View on Google Maps" link - bottom right */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/80 text-white text-xs rounded-full transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Google Maps
      </a>

      {/* Photo counter - top right */}
      {photos.length > 1 && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 text-white text-xs rounded-full">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
