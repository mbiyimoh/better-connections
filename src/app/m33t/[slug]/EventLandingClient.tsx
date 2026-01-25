'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { PublicEventData, PublicAttendee } from './types';
import {
  EventHero,
  VenueSection,
  AttendeeCarousel,
  ProfileModal,
  FullGuestListModal,
  ScheduleSection,
  WhatToExpectSection,
  HostSection,
  FooterCTA,
  ScrollytellingSection,
} from './components';

interface EventLandingClientProps {
  data: PublicEventData;
}

// Helper to format section number (01, 02, etc.)
function formatSectionNumber(num: number): string {
  return num.toString().padStart(2, '0');
}

export function EventLandingClient({ data }: EventLandingClientProps) {
  const { event, attendees, hosts, rsvpUrl } = data;
  const [selectedAttendee, setSelectedAttendee] = useState<PublicAttendee | null>(null);
  const [showFullGuestList, setShowFullGuestList] = useState(false);
  const [scrollytellingComplete, setScrollytellingComplete] = useState(false);

  // Check if this is a NO EDGES event (for scrollytelling)
  const isNoEdgesEvent = event.name.toUpperCase().includes('NO EDGES');

  // Track if this is the first completion (not a replay)
  const hasCompletedOnce = useRef(false);

  // Scroll to top when scrollytelling completes (mobile fix)
  useEffect(() => {
    if (scrollytellingComplete && isNoEdgesEvent && !hasCompletedOnce.current) {
      hasCompletedOnce.current = true;
      // Instant scroll to top - no animation to avoid disorientation
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [scrollytellingComplete, isNoEdgesEvent]);

  // Replay intro handler - scrolls to top and resets scrollytelling
  const handleReplayIntro = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Reset the ref so the next completion will scroll to top again
    hasCompletedOnce.current = false;
    // Small delay to let scroll start before showing scrollytelling
    setTimeout(() => setScrollytellingComplete(false), 100);
  };

  // Get total attendee count
  const totalAttendees =
    attendees.confirmed.length + attendees.maybe.length + attendees.invited.length;

  // Calculate dynamic section numbers based on which sections are visible
  const sectionNumbers = useMemo(() => {
    let currentNumber = 0;
    const numbers: Record<string, string | null> = {
      venue: null,
      attendees: null,
      whatToExpect: null,
      schedule: null,
      host: null,
    };

    if (event.landingPageSettings.showVenue) {
      currentNumber++;
      numbers.venue = formatSectionNumber(currentNumber);
    }
    if (event.landingPageSettings.showAttendees) {
      currentNumber++;
      numbers.attendees = formatSectionNumber(currentNumber);
    }
    if (event.landingPageSettings.showWhatToExpect && event.whatToExpect && event.whatToExpect.length > 0) {
      currentNumber++;
      numbers.whatToExpect = formatSectionNumber(currentNumber);
    }
    if (event.landingPageSettings.showSchedule && event.schedule && event.schedule.length > 0) {
      currentNumber++;
      numbers.schedule = formatSectionNumber(currentNumber);
    }
    if (event.landingPageSettings.showHost && hosts.length > 0) {
      currentNumber++;
      numbers.host = formatSectionNumber(currentNumber);
    }

    return numbers;
  }, [event.landingPageSettings, event.whatToExpect, event.schedule, hosts.length]);

  // Handle attendee selection from either carousel or full list modal
  const handleSelectAttendee = (attendee: PublicAttendee) => {
    setSelectedAttendee(attendee);
    setShowFullGuestList(false); // Close full list if open
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Scrollytelling Section (NO EDGES events only) */}
      {isNoEdgesEvent && !scrollytellingComplete && (
        <ScrollytellingSection onComplete={() => setScrollytellingComplete(true)} />
      )}

      {/* Main Content */}
      <div className={isNoEdgesEvent && !scrollytellingComplete ? 'opacity-0' : 'opacity-100 transition-opacity duration-700'}>
        {/* Replay Intro button - subtle, top-right corner */}
        {isNoEdgesEvent && scrollytellingComplete && (
          <button
            onClick={handleReplayIntro}
            className="fixed top-4 right-4 z-40 px-3 py-1.5 text-xs text-zinc-500 hover:text-amber-500 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full transition-all backdrop-blur-sm shadow-[0_0_12px_rgba(212,165,74,0.3)] hover:shadow-[0_0_16px_rgba(212,165,74,0.5)]"
          >
            Replay Intro
          </button>
        )}

        {/* Hero Section */}
        <EventHero event={event} rsvpUrl={rsvpUrl} />

        {/* Venue Section */}
        {event.landingPageSettings.showVenue && (
          <VenueSection
            venueName={event.venueName}
            venueAddress={event.venueAddress}
            parkingNotes={event.parkingNotes}
            dressCode={event.dressCode}
            foodInfo={event.foodInfo}
            googlePlaceId={event.googlePlaceId}
            sectionNumber={sectionNumbers.venue}
          />
        )}

        {/* Attendees Section */}
        {event.landingPageSettings.showAttendees && (
          <section className="py-24 px-4">
            <div className="max-w-6xl mx-auto">
              <p className="font-mono text-amber-500 text-sm font-medium tracking-widest uppercase mb-4 text-center">
                {sectionNumbers.attendees} — THE ROOM
              </p>
              <h2
                className="font-display text-3xl md:text-4xl text-center mb-12"
              >
                Who&apos;s Coming
              </h2>

              {totalAttendees === 0 ? (
                <p className="text-center text-zinc-500">Be the first to RSVP!</p>
              ) : (
                <div className="space-y-12">
                  {/* Confirmed Carousel */}
                  <AttendeeCarousel
                    title="Confirmed"
                    subtitle="They're in. Are you?"
                    attendees={attendees.confirmed}
                    statusColor="bg-emerald-500"
                    onSelectAttendee={handleSelectAttendee}
                  />

                  {/* Maybe Carousel */}
                  <AttendeeCarousel
                    title="Maybe"
                    attendees={attendees.maybe}
                    statusColor="bg-amber-500"
                    onSelectAttendee={handleSelectAttendee}
                  />

                  {/* Invited Carousel */}
                  <AttendeeCarousel
                    title="Invited"
                    attendees={attendees.invited}
                    statusColor="bg-zinc-600"
                    onSelectAttendee={handleSelectAttendee}
                  />

                  {/* View Full Guest List Button */}
                  {totalAttendees > 0 && (
                    <div className="text-center">
                      <button
                        onClick={() => setShowFullGuestList(true)}
                        className="text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        View Full Guest List
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* What to Expect Section */}
        {event.landingPageSettings.showWhatToExpect && event.whatToExpect && event.whatToExpect.length > 0 && (
          <WhatToExpectSection items={event.whatToExpect} sectionNumber={sectionNumbers.whatToExpect} />
        )}

        {/* Schedule Section */}
        {event.landingPageSettings.showSchedule && event.schedule && event.schedule.length > 0 && (
          <ScheduleSection schedule={event.schedule} sectionNumber={sectionNumbers.schedule} />
        )}

        {/* Host Section */}
        {event.landingPageSettings.showHost && hosts.length > 0 && (
          <HostSection hosts={hosts} sectionNumber={sectionNumbers.host} />
        )}

        {/* Footer CTA */}
        <FooterCTA
          tagline={event.tagline}
          date={event.date}
          location={event.venueName}
          rsvpUrl={rsvpUrl}
        />
      </div>

      {/* Profile Modal */}
      <ProfileModal
        attendee={selectedAttendee}
        onClose={() => setSelectedAttendee(null)}
      />

      {/* Full Guest List Modal */}
      <FullGuestListModal
        isOpen={showFullGuestList}
        onClose={() => setShowFullGuestList(false)}
        attendees={attendees}
        onSelectAttendee={handleSelectAttendee}
      />
    </div>
  );
}
