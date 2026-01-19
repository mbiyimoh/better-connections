import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Car, Shirt, Users, ChevronRight, Check, X, HelpCircle, Sparkles, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';

const gold = '#D4A84B';

// Landing page with event details
const EventLanding = ({ event, organizer, onRespond }) => (
  <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#09090b' }}>
    {/* Hero Section */}
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(212,168,75,0.08)' }} />
      
      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Organizer */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}>
            {organizer.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="text-left">
            <p className="text-sm" style={{ color: '#71717a' }}>You're invited by</p>
            <p className="text-white font-medium">{organizer.name}</p>
          </div>
        </div>

        {/* Event Title */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          {event.name}
        </h1>
        
        {/* Date & Time */}
        <div className="flex items-center justify-center gap-6 mb-6 text-lg" style={{ color: '#a1a1aa' }}>
          <span className="flex items-center gap-2">
            <Calendar size={20} style={{ color: gold }} />
            {event.date}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={20} style={{ color: gold }} />
            {event.time}
          </span>
        </div>

        {/* Description */}
        <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: '#a1a1aa' }}>
          {event.description}
        </p>

        {/* Response Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={() => onRespond('yes')}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105"
            style={{ backgroundColor: '#4ade80', color: 'black' }}
          >
            <Check size={20} /> I'll Be There
          </button>
          <button
            onClick={() => onRespond('maybe')}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105"
            style={{ backgroundColor: '#fbbf24', color: 'black' }}
          >
            <HelpCircle size={20} /> Maybe
          </button>
          <button
            onClick={() => onRespond('no')}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105"
            style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}
          >
            <X size={20} /> Can't Make It
          </button>
        </div>

        {/* RSVP Deadline */}
        <p className="text-sm" style={{ color: '#71717a' }}>
          Please respond by <span className="text-white font-medium">{event.rsvpDeadline}</span>
        </p>
      </div>
    </div>

    {/* Event Details Section */}
    <div className="px-6 pb-16">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Event Details</h2>
          
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#27272a' }}>
              <MapPin size={20} style={{ color: gold }} />
            </div>
            <div>
              <p className="text-white font-medium">{event.venue}</p>
              <p className="text-sm" style={{ color: '#71717a' }}>{event.address}</p>
              <a href="#" className="text-sm flex items-center gap-1 mt-1" style={{ color: gold }}>
                Get Directions <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {event.parking && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#27272a' }}>
                <Car size={20} style={{ color: gold }} />
              </div>
              <div>
                <p className="text-white font-medium">Parking</p>
                <p className="text-sm" style={{ color: '#71717a' }}>{event.parking}</p>
              </div>
            </div>
          )}

          {event.dressCode && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#27272a' }}>
                <Shirt size={20} style={{ color: gold }} />
              </div>
              <div>
                <p className="text-white font-medium">Dress Code</p>
                <p className="text-sm" style={{ color: '#71717a' }}>{event.dressCode}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#27272a' }}>
              <Users size={20} style={{ color: gold }} />
            </div>
            <div>
              <p className="text-white font-medium">Guest Count</p>
              <p className="text-sm" style={{ color: '#71717a' }}>{event.confirmedCount} confirmed so far</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="px-6 py-4 text-center" style={{ borderTop: '1px solid #3f3f46' }}>
      <p className="text-xs" style={{ color: '#71717a' }}>
        Powered by <span style={{ color: gold }}>M33T</span> × Better Contacts
      </p>
    </div>
  </div>
);

// Confirmation screen after responding
const ResponseConfirmation = ({ response, event, onContinue, onChangeResponse }) => {
  const messages = {
    yes: { title: "You're in! 🎉", subtitle: "We're excited to see you there.", color: '#4ade80' },
    maybe: { title: "Thanks for letting us know", subtitle: "We'll keep a spot warm for you.", color: '#fbbf24' },
    no: { title: "Sorry you can't make it", subtitle: "We'll miss you at this one.", color: '#71717a' },
  };
  const msg = messages[response];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#09090b' }}>
      <div className="max-w-md mx-auto text-center">
        {/* Animated checkmark or icon */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${msg.color}20` }}
        >
          {response === 'yes' && <Check size={40} style={{ color: msg.color }} />}
          {response === 'maybe' && <HelpCircle size={40} style={{ color: msg.color }} />}
          {response === 'no' && <X size={40} style={{ color: msg.color }} />}
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">{msg.title}</h1>
        <p className="text-lg mb-8" style={{ color: '#a1a1aa' }}>{msg.subtitle}</p>

        {response === 'no' ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: '#71717a' }}>
              Changed your mind? You can update your response anytime before {event.rsvpDeadline}.
            </p>
            <button
              onClick={onChangeResponse}
              className="px-6 py-3 rounded-xl font-medium"
              style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}
            >
              Change Response
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl text-left" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} style={{ color: gold }} />
                <span className="text-sm font-medium text-white">Help us find your best connections</span>
              </div>
              <p className="text-sm mb-4" style={{ color: '#71717a' }}>
                Answer a few quick questions so we can match you with the right people at the event.
              </p>
              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                style={{ backgroundColor: gold, color: 'black' }}
              >
                Continue to Interview <ArrowRight size={16} />
              </button>
            </div>

            <button
              onClick={onChangeResponse}
              className="text-sm hover:underline"
              style={{ color: '#71717a' }}
            >
              Change my response
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Interview prompt screen
const InterviewPrompt = ({ existingProfile, onStartInterview, onSkip }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#09090b' }}>
    <div className="max-w-lg mx-auto">
      {existingProfile ? (
        // User has Better Contacts profile
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(212,168,75,0.2)' }}>
            <MessageSquare size={28} style={{ color: gold }} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Quick Check-In</h1>
          <p className="mb-6" style={{ color: '#a1a1aa' }}>
            We already have your profile from Better Contacts. Just a few questions about what you're hoping to get from this event.
          </p>

          {/* Profile preview */}
          <div className="p-4 rounded-xl text-left mb-6" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.3), rgba(212,168,75,0.1))', color: gold }}>
                {existingProfile.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-white font-medium">{existingProfile.name}</p>
                <p className="text-sm" style={{ color: '#71717a' }}>{existingProfile.role}, {existingProfile.company}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {existingProfile.expertise.slice(0, 4).map(exp => (
                <span key={exp} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#27272a', color: '#a1a1aa' }}>{exp}</span>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: '#71717a' }}>
              This came from your Better Contacts profile. <a href="#" style={{ color: gold }}>Edit profile</a>
            </p>
          </div>

          <button
            onClick={onStartInterview}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold mb-3"
            style={{ backgroundColor: gold, color: 'black' }}
          >
            Start Quick Interview <ArrowRight size={18} />
          </button>
          <p className="text-xs" style={{ color: '#71717a' }}>Takes about 2 minutes</p>
        </div>
      ) : (
        // New user - no Better Contacts profile
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(212,168,75,0.2)' }}>
            <MessageSquare size={28} style={{ color: gold }} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Let's Get to Know You</h1>
          <p className="mb-6" style={{ color: '#a1a1aa' }}>
            A quick conversation helps us find your best connections at the event. Think of it like a friendly chat over coffee.
          </p>

          <button
            onClick={onStartInterview}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold mb-3"
            style={{ backgroundColor: gold, color: 'black' }}
          >
            Start Interview <ArrowRight size={18} />
          </button>
          <p className="text-xs" style={{ color: '#71717a' }}>Takes about 5 minutes</p>
        </div>
      )}
    </div>
  </div>
);

// Main component that manages flow state
export default function RSVPAttendeeFlow() {
  const [screen, setScreen] = useState('landing'); // landing, confirmation, interview-prompt
  const [response, setResponse] = useState(null);

  const mockEvent = {
    name: 'AI Summit 2025',
    date: 'March 30, 2025',
    time: '6:00 PM - 9:00 PM',
    description: 'An intimate evening exploring how AI changes what\'s possible. Connect with founders, investors, and operators who are building the future.',
    venue: 'The Domain',
    address: '123 Innovation Way, Austin, TX 78701',
    parking: 'Validated parking in Garage B. Enter from Main Street.',
    dressCode: 'Business Casual',
    confirmedCount: 23,
    rsvpDeadline: 'March 23, 2025',
  };

  const mockOrganizer = {
    name: 'Beems Ghogomu',
    company: '33 Strategies',
  };

  // Existing user with Better Contacts profile (null for new users)
  const mockExistingProfile = {
    name: 'Sarah Chen',
    role: 'Founder & CEO',
    company: 'Nexus AI',
    expertise: ['AI/ML', 'Product Strategy', 'Enterprise Sales', 'Fundraising'],
  };

  const handleRespond = (resp) => {
    setResponse(resp);
    setScreen('confirmation');
  };

  const handleContinueToInterview = () => {
    setScreen('interview-prompt');
  };

  const handleChangeResponse = () => {
    setScreen('landing');
    setResponse(null);
  };

  const handleStartInterview = () => {
    // Would navigate to the full interview experience
    alert('Navigate to Interview Experience (next prototype)');
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {screen === 'landing' && (
        <EventLanding 
          event={mockEvent} 
          organizer={mockOrganizer} 
          onRespond={handleRespond} 
        />
      )}
      {screen === 'confirmation' && (
        <ResponseConfirmation 
          response={response} 
          event={mockEvent}
          onContinue={handleContinueToInterview}
          onChangeResponse={handleChangeResponse}
        />
      )}
      {screen === 'interview-prompt' && (
        <InterviewPrompt 
          existingProfile={mockExistingProfile}
          onStartInterview={handleStartInterview}
          onSkip={() => {}}
        />
      )}
    </div>
  );
}
