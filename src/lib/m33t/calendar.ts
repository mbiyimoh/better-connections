/**
 * M33T Calendar Integration Utilities
 *
 * Generates Google Calendar URLs and ICS file content for event calendar integration.
 * Zero dependencies -- uses standard URL params and RFC 5545 ICS format.
 */

export interface CalendarEventData {
  title: string;
  description: string;
  date: string; // ISO date string
  startTime: string; // "HH:MM" 24h format
  endTime: string; // "HH:MM" 24h format
  timezone: string; // IANA timezone e.g. "America/Chicago"
  venueName: string;
  venueAddress: string;
}

/**
 * Build a Google Calendar URL with pre-filled event details.
 * Opens in a new tab -- user clicks "Save" in Google Calendar.
 *
 * Date format: YYYYMMDDTHHmmss (local time, paired with ctz param)
 */
export function buildGoogleCalendarUrl(event: CalendarEventData): string {
  const eventDate = new Date(event.date);
  // Get date in event's timezone (en-CA gives YYYY-MM-DD format)
  const dateStr = eventDate.toLocaleDateString('en-CA', {
    timeZone: event.timezone,
  });
  const [year, month, day] = dateStr.split('-');

  const startFormatted = `${year}${month}${day}T${event.startTime.replace(':', '')}00`;
  const endFormatted = `${year}${month}${day}T${event.endTime.replace(':', '')}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startFormatted}/${endFormatted}`,
    location: `${event.venueName}, ${event.venueAddress}`,
    details: event.description,
    ctz: event.timezone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Convert local event time to a UTC Date object.
 * Takes the event date (ISO string), a time string ("HH:MM"), and IANA timezone.
 */
function localTimeToUTC(
  dateISO: string,
  time: string,
  timezone: string
): Date {
  const eventDate = new Date(dateISO);
  // Get the calendar date in the event's timezone
  const dateStr = eventDate.toLocaleDateString('en-CA', { timeZone: timezone });
  // Construct a datetime string and use the timezone offset to find UTC
  const localStr = `${dateStr}T${time}:00`;

  // Create a formatter that gives us the offset for this timezone at this date/time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the local time as if it were UTC, then adjust
  const naiveUTC = new Date(localStr + 'Z');
  const inTZ = new Date(
    formatter.format(naiveUTC).replace(
      /(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/,
      '$3-$1-$2T$4:$5:$6Z'
    )
  );
  // The difference between naiveUTC and inTZ is the timezone offset
  const offsetMs = inTZ.getTime() - naiveUTC.getTime();
  return new Date(naiveUTC.getTime() - offsetMs);
}

/** Format a Date as ICS UTC timestamp: YYYYMMDDTHHmmssZ */
function formatICSTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Generate a UUID, with fallback for non-secure contexts */
function generateUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate ICS file content string (RFC 5545).
 * Uses UTC times (Z suffix) for maximum compatibility across calendar apps
 * without requiring a VTIMEZONE block.
 */
export function generateICSContent(event: CalendarEventData): string {
  const startUTC = localTimeToUTC(event.date, event.startTime, event.timezone);
  const endUTC = localTimeToUTC(event.date, event.endTime, event.timezone);

  const uid = `${generateUID()}@bettercontacts.ai`;
  const now = formatICSTimestamp(new Date());

  // Escape special characters per RFC 5545
  const escapeICS = (str: string) =>
    str.replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Better Contacts//M33T//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSTimestamp(startUTC)}`,
    `DTEND:${formatICSTimestamp(endUTC)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(`${event.venueName}, ${event.venueAddress}`)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger download of an ICS file in the browser.
 * Creates a Blob, generates an object URL, clicks a hidden anchor, then cleans up.
 */
export function downloadICSFile(
  event: CalendarEventData,
  filename?: string
): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download =
    filename ||
    `${event.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
