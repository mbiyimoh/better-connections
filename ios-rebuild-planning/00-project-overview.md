# Better Connections iOS Rebuild - Project Overview

## Executive Summary

This initiative focuses on translating the Better Connections personal CRM from its current React/Next.js progressive web app (PWA) into a native iOS application built with Swift and SwiftUI.

## Current State

**Existing Product:** Better Connections PWA
- **Stack:** Next.js 14+, React, TypeScript, Tailwind CSS, Prisma ORM, Supabase PostgreSQL
- **Core Features:**
  - Contact management with rich metadata
  - "Why Now" contextual relevance tracking
  - AI-powered contact research via Tavily + GPT-4o
  - Voice-first enrichment with 30-second gamified sessions
  - Natural language chat exploration
  - VCF import with duplicate detection
  - M33T event networking platform
- **Design System:** Dark theme, gold accent (#d4a54a), glassmorphism, Framer Motion animations

## Goals for iOS Rebuild

1. **Native Performance:** Leverage iOS-specific capabilities (Contacts.framework, Siri Shortcuts, widgets)
2. **Superior UX:** Native gestures, haptics, and iOS design patterns
3. **Offline-First:** Core CRM functionality without network dependency
4. **Platform Integration:** iCloud sync, ShareSheet, App Clips for M33T events

## Key Questions This Research Addresses

1. **Process:** What are the best AI-assisted workflows for web-to-native translation?
2. **Documentation:** How should we structure PWA documentation to maximize iOS implementation efficiency?
3. **Code Translation:** To what extent do React patterns translate to Swift/SwiftUI?
4. **Tooling:** What spec-based workflows and AI agents exist for Swift development?

## Conceptual Foundation: React → Swift Translation

### High-Level Architecture Comparison

| React/Next.js | Swift/SwiftUI | Notes |
|---------------|---------------|-------|
| Components | Views | Both are composable UI building blocks |
| Props | @Binding, parameters | Data flows down similarly |
| useState | @State | Local component/view state |
| useContext | @EnvironmentObject | Shared state across tree |
| useEffect | .onAppear, .task | Side effects and lifecycle |
| Redux/Zustand | Combine, @Observable | Global state management |
| API routes | URLSession, async/await | Network requests |
| Prisma/Supabase | Core Data, CloudKit | Local + cloud persistence |
| Tailwind CSS | SwiftUI modifiers | Styling approach |
| Framer Motion | withAnimation, matchedGeometryEffect | Animations |

### Key Paradigm Differences

1. **Declarative UI:** Both React and SwiftUI are declarative, making conceptual translation smoother
2. **Type Safety:** TypeScript → Swift is natural; Swift is even stricter
3. **State Management:** SwiftUI's property wrappers (@State, @Binding, @Observable) map well to React hooks
4. **Navigation:** React Router → NavigationStack (similar push/pop mental model)
5. **Async:** Both use async/await; Swift's structured concurrency is more rigorous

### What Translates Directly

- **Business Logic:** Validation rules, scoring algorithms, data transformations
- **Data Models:** TypeScript interfaces → Swift structs/classes
- **API Contracts:** Endpoint shapes, request/response types
- **User Flows:** Screen sequences, interaction patterns

### What Requires Reimagining

- **Styling:** Tailwind utilities → SwiftUI modifiers (different syntax, similar concepts)
- **Animations:** Framer Motion → SwiftUI animations (conceptually similar, API differs)
- **Platform APIs:** Web Speech API → Speech framework; localStorage → UserDefaults/Keychain
- **Navigation Patterns:** Modal stacks, tab bars, split views work differently

## Documentation Strategy

### Recommended Approach

Documentation for the iOS rebuild should be **behavior-focused** rather than **code-focused**:

1. **Feature Specifications:** What the feature does, not how it's implemented
2. **User Flows:** Step-by-step interaction sequences
3. **Data Models:** Schema definitions (translate naturally to Swift)
4. **Business Rules:** Validation, scoring, filtering logic (language-agnostic)
5. **API Contracts:** Request/response shapes for backend integration
6. **Design Tokens:** Colors, spacing, typography (design system translates)

### Code Snippets: When to Include

- **YES:** Data model definitions, API response shapes, validation logic
- **NO:** React component JSX, CSS classes, framework-specific hooks
- **MAYBE:** Complex algorithms (pseudocode or language-agnostic description)

## Success Criteria

1. Feature parity with PWA for core CRM functionality
2. Native iOS experience (not a wrapped web view)
3. Offline-capable with sync when connected
4. App Store ready with proper iOS conventions
5. Maintainable codebase with clear architecture

## Timeline Considerations

This document does not include timeline estimates per project conventions. Implementation will be broken into phases with clear deliverables.

## Next Steps

1. Research AI-assisted web-to-native workflows
2. Identify existing Swift expert agents and spec-based tools
3. Audit current PWA features for iOS translation complexity
4. Create feature-by-feature translation guides
5. Establish iOS project architecture and conventions

---

**Created:** 2026-01-23
**Status:** Research Phase
**Owner:** Product (with AI-assisted implementation)
