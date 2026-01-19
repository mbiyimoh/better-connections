import { NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri: string;
    photoUri: string;
  }>;
}

interface PlaceDetailsResponse {
  id: string;
  displayName?: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  photos?: PlacePhoto[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    );
  }

  if (!placeId) {
    return NextResponse.json(
      { error: 'Place ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch place details with photos using Google Places API (New)
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,photos',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch place details', details: errorText },
        { status: response.status }
      );
    }

    const data: PlaceDetailsResponse = await response.json();

    // Build photo URLs (up to 6 photos)
    const photos = (data.photos || []).slice(0, 6).map((photo) => ({
      url: `https://places.googleapis.com/v1/${photo.name}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=800`,
      width: photo.widthPx,
      height: photo.heightPx,
      attribution: photo.authorAttributions?.[0]?.displayName || null,
    }));

    return NextResponse.json({
      id: data.id,
      name: data.displayName?.text || null,
      address: data.formattedAddress || null,
      location: data.location || null,
      photos,
      // Embed URL for the mini-map (free Maps Embed API)
      mapEmbedUrl: `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_PLACES_API_KEY}&q=place_id:${placeId}&zoom=15`,
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    );
  }
}
