'use client';

import { useState, useEffect } from 'react';
import { VenueGallery } from '@/components/maps/VenueGallery';
import { MapPin, ExternalLink, Car, Shirt, UtensilsCrossed } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

interface VenueSectionProps {
  venueName: string;
  venueAddress: string;
  parkingNotes?: string | null;
  dressCode?: string | null;
  foodInfo?: string | null;
  googlePlaceId?: string | null;
  sectionNumber?: string | null;
}

export function VenueSection({
  venueName,
  venueAddress,
  parkingNotes,
  dressCode,
  foodInfo,
  googlePlaceId,
  sectionNumber,
}: VenueSectionProps) {
  const hasGooglePlaceId = googlePlaceId !== null && googlePlaceId !== undefined && googlePlaceId !== '';
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);

  // Fetch place data to get the map embed URL
  useEffect(() => {
    if (!hasGooglePlaceId) return;

    async function fetchMapUrl() {
      try {
        const response = await fetch(`/api/places/${googlePlaceId}`);
        if (response.ok) {
          const data = await response.json();
          setMapEmbedUrl(data.mapEmbedUrl);
        }
      } catch (err) {
        console.error('Error fetching map URL:', err);
      }
    }

    fetchMapUrl();
  }, [googlePlaceId, hasGooglePlaceId]);

  const googleMapsUrl = hasGooglePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;

  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <p className="font-mono text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-left md:text-center">
          {sectionNumber ? `${sectionNumber} — ` : ''}THE VENUE
        </p>

        {/* Venue text info - now directly below header */}
        <div className="text-left md:text-center mb-8">
          <h3
            className="font-display text-2xl text-white mb-2"
          >
            {venueName}
          </h3>
          <p className="font-body text-zinc-500">{venueAddress}</p>
        </div>

        {/* Photo gallery (if Google Place ID available), or fallback to placeholder */}
        {hasGooglePlaceId ? (
          <VenueGallery
            googlePlaceId={googlePlaceId}
            venueName={venueName}
            venueAddress={venueAddress}
            className="mb-6"
          />
        ) : (
          <div className="aspect-video bg-zinc-900 rounded-3xl flex items-center justify-center mb-6">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">{venueName}</p>
              <p className="text-zinc-600 text-xs mt-1">{venueAddress}</p>
            </div>
          </div>
        )}

        {/* Dark-styled map embed - smaller, below carousel */}
        {mapEmbedUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative rounded-xl overflow-hidden border border-zinc-800 hover:border-amber-500/50 transition-colors"
          >
            <div className="aspect-[3/1] w-full">
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  // CSS filters to create dark/gold-tinted appearance
                  filter: 'grayscale(100%) invert(92%) sepia(15%) saturate(200%) hue-rotate(10deg) brightness(90%) contrast(95%)',
                }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full pointer-events-none"
              />
            </div>
            {/* Subtle overlay for better integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 to-transparent pointer-events-none" />
            {/* "View on Google Maps" hint */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 text-zinc-300 text-xs rounded-full border border-zinc-700">
              <ExternalLink className="w-3 h-3" />
              <span>View on Maps</span>
            </div>
          </a>
        )}

        {/* Info tiles - side-by-side grid */}
        {(parkingNotes || dressCode || foodInfo) && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {parkingNotes && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Car className="w-6 h-6 text-amber-500" />
                  </div>
                  <h4 className="text-amber-500 text-sm font-semibold tracking-widest uppercase">
                    Parking
                  </h4>
                </div>
                <MarkdownContent className="text-zinc-400 text-sm">
                  {parkingNotes}
                </MarkdownContent>
              </div>
            )}

            {dressCode && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Shirt className="w-6 h-6 text-amber-500" />
                  </div>
                  <h4 className="text-amber-500 text-sm font-semibold tracking-widest uppercase">
                    Dress Code
                  </h4>
                </div>
                <MarkdownContent className="text-zinc-400 text-sm">
                  {dressCode}
                </MarkdownContent>
              </div>
            )}

            {foodInfo && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-amber-500" />
                  </div>
                  <h4 className="text-amber-500 text-sm font-semibold tracking-widest uppercase">
                    Food & Drinks
                  </h4>
                </div>
                <MarkdownContent className="text-zinc-400 text-sm">
                  {foodInfo}
                </MarkdownContent>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
