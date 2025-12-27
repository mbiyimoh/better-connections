# Voice Input for Enrichment Session

## Problem
The enrichment session page (`/enrichment/session`) currently uses text input only. The original product vision specifies voice-first "brain dump" as the core V1 experience - users should be able to speak freely for 30 seconds while the system extracts insights into categorized bubbles.

## Solution
Add voice input toggle to the existing enrichment session using `react-speech-recognition` (Web Speech API wrapper). The voice input will stream transcription directly into the existing `extractInsights` function.

**Note:** The session page already has `'use client'` directive, which is required for the speech recognition hook. The Web Speech API will trigger a browser permission prompt the first time the user clicks the mic button - this is expected browser behavior.

## Scope

### In Scope
- Install `react-speech-recognition` and `@types/react-speech-recognition`
- Add mic toggle button to the session UI
- Stream live transcription to bubble extraction
- Visual feedback during recording (pulsing mic indicator)
- Graceful fallback for unsupported browsers

### Out of Scope
- Custom speech recognition models
- Offline voice recognition
- Multi-language support (English only for V1)
- Audio recording/playback

## Implementation

### 1. Install Dependencies
```bash
npm install react-speech-recognition @types/react-speech-recognition
```

### 2. Modify Session Page
File: `src/app/(dashboard)/enrichment/session/page.tsx`

Add to imports:
```typescript
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff } from 'lucide-react';
```

Add hook and state:
```typescript
const {
  transcript,
  listening,
  resetTranscript,
  browserSupportsSpeechRecognition
} = useSpeechRecognition();

const [lastProcessedLength, setLastProcessedLength] = useState(0);
```

Add voice processing effect:
```typescript
// Process new transcript segments as they come in
useEffect(() => {
  if (transcript.length > lastProcessedLength) {
    const newText = transcript.slice(lastProcessedLength);
    // Extract insights from new speech segment
    const insights = extractInsights(newText);
    if (insights.length > 0) {
      const newBubbles = insights.map((i) => createBubble(i.text, i.category));
      setBubbles((prev) => [...prev, ...newBubbles]);
    }
    setLastProcessedLength(transcript.length);
  }
}, [transcript, lastProcessedLength]);
```

Add mic toggle button (alongside existing +30sec and pause buttons):
```typescript
<Button
  variant={listening ? "default" : "secondary"}
  size="sm"
  onClick={() => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      setLastProcessedLength(0);
      SpeechRecognition.startListening({ continuous: true });
    }
  }}
  className={listening ? "bg-red-500 hover:bg-red-400 animate-pulse" : ""}
>
  {listening ? <MicOff size={16} /> : <Mic size={16} />}
  {listening ? "Stop" : "Voice"}
</Button>
```

Add browser support check:
```typescript
{!browserSupportsSpeechRecognition && (
  <p className="text-amber-500 text-xs text-center">
    Voice input not supported in this browser. Use Chrome for best experience.
  </p>
)}
```

### 3. Auto-stop on Timer Complete
Modify `handleComplete`:
```typescript
const handleComplete = useCallback(() => {
  setIsPlaying(false);
  setSessionComplete(true);
  SpeechRecognition.stopListening(); // Stop voice if active
}, []);
```

### 4. Category Hint Prompts (Optional Enhancement)
Show visual hints during recording to guide the brain dump:
```typescript
{isStarted && (
  <div className="flex gap-2 justify-center text-xs text-zinc-500">
    <span className="text-blue-400">Relationship</span>
    <span className="text-green-400">Opportunity</span>
    <span className="text-purple-400">Expertise</span>
    <span className="text-amber-400">Interest</span>
  </div>
)}
```

## Files Changed
1. `package.json` - Add dependencies
2. `src/app/(dashboard)/enrichment/session/page.tsx` - Add voice input

## Testing
1. Open `/enrichment/session?contact=[id]` in Chrome
2. Click "Start Session"
3. Click "Voice" button - should show pulsing red mic
4. Speak: "I met John at TechCrunch. He's an investor interested in AI startups."
5. Verify bubbles appear as you speak
6. Click "Stop" to end voice input
7. Timer expiring should also stop voice input

## Browser Support
- Chrome: Full support (recommended)
- Edge: Full support
- Firefox: Partial (may require flags)
- Safari: Not supported
- Mobile Chrome: Supported

## Success Criteria
- [ ] Voice toggle button visible when session is active
- [ ] Transcription streams to bubble extraction in real-time
- [ ] Visual feedback shows when mic is active (pulsing red)
- [ ] Voice stops automatically when timer completes
- [ ] Graceful fallback message for unsupported browsers
- [ ] Existing text input continues to work alongside voice
