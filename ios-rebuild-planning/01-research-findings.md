# iOS Rebuild Research Findings

**Research Date:** 2026-01-23
**Scope:** AI-assisted workflows, documentation strategies, code translation approaches, and tooling for translating a React/Next.js PWA to native iOS Swift

---

## Executive Summary

The research reveals a mature ecosystem for AI-assisted iOS development, with Claude Code emerging as particularly effective for SwiftUI applications. The recommended approach combines:

1. **Behavior-focused documentation** rather than code-centric specs
2. **AGENTS.md/CLAUDE.md configuration** with Swift-specific guidelines
3. **Cursor + Claude Code + SweetPad** as the primary development workflow
4. **Incremental feature translation** with AI agents handling implementation

Key finding: A developer successfully shipped a production macOS SwiftUI app "almost entirely with Claude Code" after 6 years of failed side projects, demonstrating the viability of this approach for non-daily iOS developers.

---

## Part 1: AI-Assisted Development Workflows

### Recommended Toolchain

| Tool | Purpose | Why |
|------|---------|-----|
| **Cursor** | Primary IDE | AI-first editor with excellent Swift support via SweetPad |
| **Claude Code** | Implementation agent | "Quite good at SwiftUI" - consistently finds correct patterns |
| **SweetPad** | Build/run integration | Build, run, debug Swift projects without Xcode open |
| **Xcode** | Build system backend | Still required for compilation, but not primary editor |
| **XcodeBuildMCP** | Build commands | Simplifies xcodebuild invocations for Claude |

### Workflow Pattern

```
1. Write detailed feature spec
2. Prime Claude by having it read relevant existing code
3. Request implementation with "ultrathink" for complex features
4. Review generated code, paste screenshots for UI iteration
5. Build via SweetPad, test manually, feed errors back to Claude
6. Iterate until feature complete
```

### Key Insight: Context Engineering > Prompt Engineering

The most successful practitioners focus on **context engineering**—maximizing the quality of information available to the AI within token constraints—rather than crafting perfect prompts.

**Sources:**
- [I Shipped a macOS App Built Entirely by Claude Code](https://www.indragie.com/blog/i-shipped-a-macos-app-built-entirely-by-claude-code)
- [Building iOS apps with Cursor and Claude Code](https://dimillian.medium.com/building-ios-apps-with-cursor-and-claude-code-ee7635edde24)
- [How to Build iOS & macOS Apps in VS Code with Claude Code & SweetPad](https://curiousmints.com/how-to-build-ios-macos-apps-in-vs-code-cursor-windsurf-with-claude-code-sweetpad/)

---

## Part 2: Documentation Strategy for iOS Translation

### Recommended: Behavior-Focused Documentation

**INCLUDE in documentation:**
- Feature specifications (what it does, not how)
- User flow diagrams and step-by-step interactions
- Data model definitions (TypeScript interfaces → Swift structs)
- Business rules and validation logic (language-agnostic)
- API contracts (request/response shapes)
- Design tokens (colors, spacing, typography)
- Edge cases and error states

**EXCLUDE from documentation:**
- React component JSX
- Tailwind CSS classes
- Framework-specific hooks (useEffect, useState)
- Implementation details that don't translate

### Why Behavior-Focused Works

1. **React and SwiftUI are both declarative** - conceptual patterns transfer
2. **Claude understands both ecosystems** - it can translate intent, not just syntax
3. **Business logic is language-agnostic** - validation rules, scoring algorithms work identically
4. **Data models translate directly** - TypeScript interfaces → Swift structs

### Sample Documentation Structure

```
features/
├── contact-management/
│   ├── overview.md           # What the feature does
│   ├── user-flows.md         # Step-by-step interactions
│   ├── data-models.md        # Schema definitions
│   ├── business-rules.md     # Validation, scoring logic
│   └── api-contracts.md      # Backend integration points
├── enrichment/
│   ├── overview.md
│   ├── gamification-rules.md # Scoring, ranks, timers
│   └── voice-input.md        # Speech recognition behavior
└── research/
    ├── overview.md
    ├── recommendation-flow.md
    └── apply-workflow.md
```

### When to Include Code Snippets

| Include | Don't Include |
|---------|---------------|
| Data model definitions | React component structure |
| Validation regex patterns | CSS/Tailwind styling |
| API response shapes | useEffect/useState patterns |
| Complex algorithms (pseudocode) | Framework-specific hooks |
| Scoring formulas | Import statements |

**Sources:**
- [Mobile App Requirements Document: Steps to Build](https://themindstudios.com/blog/mobile-app-requirements-document/)
- [Convert Web App to Mobile App Guide](https://nextnative.dev/blog/convert-web-app-to-mobile-app)

---

## Part 3: React → Swift Conceptual Translation

### The Good News: High-Level Patterns Map Well

| React/Next.js | Swift/SwiftUI | Translation Difficulty |
|---------------|---------------|------------------------|
| Components | Views | **Easy** - both composable |
| Props | Parameters, @Binding | **Easy** - data flows down |
| useState | @State | **Easy** - local state |
| useContext | @EnvironmentObject | **Easy** - shared state |
| useEffect | .onAppear, .task | **Medium** - timing differs |
| Redux/Zustand | @Observable | **Medium** - similar concepts |
| React Router | NavigationStack | **Easy** - push/pop model |
| Framer Motion | withAnimation | **Medium** - API differs |
| Tailwind CSS | SwiftUI modifiers | **Medium** - different syntax |
| fetch/axios | URLSession | **Easy** - async/await both |

### What Requires Reimagining

**Platform APIs:**
- Web Speech API → iOS Speech framework
- localStorage → UserDefaults/Keychain
- Web Audio → AVFoundation
- File input → DocumentPicker

**Navigation Patterns:**
- React modal stacks → iOS sheet presentation
- Tab bars work similarly but with different APIs
- Split views (iPad) require iOS-specific handling

**Offline/Sync:**
- Service workers → Core Data + CloudKit
- IndexedDB → SQLite/Core Data

### Claude's Swift Strengths and Weaknesses

**Strengths:**
- SwiftUI view composition
- Standard UI patterns
- Refactoring complex view bodies
- Generating mock data
- Writing automation scripts

**Weaknesses:**
- Swift Concurrency (async/await, actors) - defaults to older patterns
- Complex type expressions that exceed compiler limits
- Choosing correct API (sometimes picks AppKit over SwiftUI)
- Cannot autonomously test running apps

**Sources:**
- [Developing in Xcode with AI: Comparing Tools](https://medium.com/@avilevin23/developing-in-xcode-with-ai-comparing-copilot-claude-mcp-cursor-and-more-97a42254506c)
- [AI Tools Compared for SwiftUI Coding](https://www.doubledotdevelopment.co.uk/posts/ai_lllms_compared_for_ios_tca/)

---

## Part 4: Existing Tools and Resources

### AGENTS.md / CLAUDE.md Configuration

**AGENTS.md** is emerging as the unified standard for AI coding agent configuration, with support in Cursor, Zed, GitHub Copilot, and others. Claude Code uses CLAUDE.md but can reference AGENTS.md.

**Recommended Swift Configuration:**

```markdown
# AGENTS.md (or CLAUDE.md)

## Swift Development Guidelines

- Use SwiftUI for all UI unless AppKit-only features required
- Follow Apple Human Interface Guidelines
- Target Swift 6 with async/await and modern concurrency
- Use SF Symbols for all icons
- Use the latest iOS/macOS APIs (no backward compatibility constraints)
- Prefer composition over inheritance
- Use @Observable for state management (iOS 17+)

## Project Structure

- MVVM architecture
- Feature-based folder organization
- Separate networking layer
- Core Data for persistence

## When Writing Code

- Read existing patterns in the codebase first
- Match existing naming conventions
- Add inline comments for complex logic only
- Use Swift's type system fully (no Any unless necessary)
```

**Resources:**
- [AGENTS.md Official Site](https://agents.md/)
- [How to use AGENTS.md in Claude Code](https://aiengineerguide.com/blog/how-to-use-agents-md-in-claude-code/)
- [Peter Steinberger's agent-rules](https://github.com/steipete/agent-rules) - Swift 6 concurrency docs

### Automated Code Translation Tools

Several AI-powered translators exist but have limitations:

| Tool | Capability | Limitation |
|------|------------|------------|
| [CodeConvert.ai](https://www.codeconvert.ai/typescript-to-swift-converter) | TypeScript → Swift | Snippet-level, not project-scale |
| [CodingFleet](https://codingfleet.com/code-converter/react/swift/) | React → Swift | Basic conversion, no SwiftUI patterns |
| [Workik AI](https://workik.com/swift-code-generator) | Context-aware Swift generation | Good for UIKit/SwiftUI components |

**Recommendation:** Use these for individual utility functions or data models, not for wholesale codebase translation. The AI coding agent approach (Claude Code) is more effective for feature-by-feature reimplementation.

### SweetPad Integration

SweetPad enables full iOS development workflow in VS Code/Cursor:

```bash
# Install dependencies
brew install xcode-build-server xcbeautify swiftformat

# In Cursor, run:
# Sweetpad: Generate Build Server Config

# Build and run with F5 or Sweetpad commands
```

**Key Benefits:**
- Write code in Cursor with Claude Code
- Build/run without switching to Xcode
- Hot reloading via InjectionIII for SwiftUI
- Debugging with breakpoints

**Sources:**
- [SweetPad GitHub](https://github.com/sweetpad-dev/sweetpad)
- [Cursor Swift Guide](https://docs.cursor.com/guides/languages/swift)

---

## Part 5: Recommended Workflow for Better Connections iOS

### Phase 0: Preparation (This Effort)

1. **Document all features** in behavior-focused format
2. **Extract data models** into language-agnostic definitions
3. **Map API contracts** for backend integration
4. **Define design system** in platform-agnostic tokens
5. **Create AGENTS.md** with Swift/iOS guidelines

### Phase 1: Project Setup

1. Create Xcode project with SwiftUI + Core Data
2. Set up SweetPad in Cursor
3. Configure AGENTS.md with project conventions
4. Establish folder structure (feature-based)
5. Set up basic navigation shell

### Phase 2: Core Infrastructure

1. Authentication (Supabase integration)
2. Data models (Contact, Tag, etc.)
3. Core Data setup with CloudKit sync
4. Networking layer for API calls
5. Design system implementation

### Phase 3: Feature-by-Feature Translation

For each feature:
1. Read behavior spec to Claude
2. Have Claude read related iOS code patterns
3. Request implementation with detailed spec
4. Iterate with screenshots and error feedback
5. Test thoroughly before moving on

**Suggested Order:**
1. Contact list and detail views (core CRUD)
2. Contact form and editing
3. Search and filtering
4. Tags management
5. Enrichment flow
6. Voice input
7. AI research integration
8. M33T events (if in scope)

### Phase 4: Platform Optimization

1. iOS-specific features (Widgets, Shortcuts)
2. Offline-first architecture refinement
3. Performance optimization
4. App Store preparation

---

## Part 6: Key Lessons from Practitioners

### From "I Shipped a macOS App Built Entirely by Claude Code"

1. **Prime before implementing** - Have Claude read existing code first
2. **Use "ultrathink"** - Activates deeper reasoning for complex features
3. **Screenshots work** - Paste UI screenshots and request improvements
4. **Detailed specs matter** - Vague requests fail on non-trivial features
5. **Manual verification loops** - You must test the running app and feed back
6. **CLAUDE.md low-effort, high-value** - Simple guidelines compound over time

### From iOS Development Community

1. **Cursor + Claude Code is the winning combo** for AI-first iOS development
2. **SweetPad eliminates Xcode context switching** - major productivity gain
3. **Claude struggles with Swift Concurrency** - be prepared to intervene
4. **InjectionIII enables hot reload** - critical for UI iteration speed
5. **Keep Xcode installed** - still needed as build system backend

---

## Part 7: Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Swift Concurrency bugs | Medium | Review async code manually, use established patterns |
| Claude picks wrong APIs | Medium | Strong AGENTS.md guidelines, manual review |
| Context window limits | Medium | Break features into smaller specs, use compaction |
| iOS-specific behaviors | High | Test on real devices, not just simulator |
| App Store rejection | High | Follow HIG, test accessibility, handle edge cases |
| Backend integration | Medium | Test API calls early, mock data for development |

---

## Conclusion

The iOS rebuild is highly feasible with current AI-assisted tooling. The recommended approach:

1. **Invest in behavior documentation** now (it pays off regardless of approach)
2. **Use Claude Code + Cursor + SweetPad** as primary development workflow
3. **Configure AGENTS.md** with Swift-specific guidelines from community resources
4. **Translate feature-by-feature** rather than attempting wholesale code conversion
5. **Expect manual intervention** for Swift Concurrency and complex UI states
6. **Plan for testing loops** - AI cannot autonomously verify running app behavior

The path from React PWA to native iOS Swift is well-trodden by the AI-assisted development community, with clear patterns and tools available. The main investment is in documentation and spec preparation, which benefits the project regardless of implementation approach.

---

## Sources and References

### Primary Articles
- [I Shipped a macOS App Built Entirely by Claude Code](https://www.indragie.com/blog/i-shipped-a-macos-app-built-entirely-by-claude-code) - Indragie Karunaratne
- [Building iOS apps with Cursor and Claude Code](https://dimillian.medium.com/building-ios-apps-with-cursor-and-claude-code-ee7635edde24) - Thomas Ricouard
- [How to use VSCode/Cursor for iOS development](https://dimillian.medium.com/how-to-use-cursor-for-ios-development-54b912c23941) - Thomas Ricouard
- [How to Build iOS & macOS Apps in VS Code with Claude Code & SweetPad](https://curiousmints.com/how-to-build-ios-macos-apps-in-vs-code-cursor-windsurf-with-claude-code-sweetpad/)

### Tools and Resources
- [SweetPad GitHub](https://github.com/sweetpad-dev/sweetpad)
- [AGENTS.md Official Site](https://agents.md/)
- [Peter Steinberger's agent-rules](https://github.com/steipete/agent-rules)
- [Cursor Swift Guide](https://docs.cursor.com/guides/languages/swift)
- [CodeConvert.ai TypeScript to Swift](https://www.codeconvert.ai/typescript-to-swift-converter)

### Documentation Best Practices
- [Mobile App Requirements Document Guide](https://themindstudios.com/blog/mobile-app-requirements-document/)
- [Convert Web App to Mobile App](https://nextnative.dev/blog/convert-web-app-to-mobile-app)
- [AGENTS.md: The New Standard for AI Coding Assistants](https://medium.com/@proflead/agents-md-the-new-standard-for-ai-coding-assistants-af72910928b6)

### AI Tool Comparisons
- [Developing in Xcode with AI: Comparing Tools](https://medium.com/@avilevin23/developing-in-xcode-with-ai-comparing-copilot-claude-mcp-cursor-and-more-97a42254506c)
- [AI Tools Compared for SwiftUI Coding](https://www.doubledotdevelopment.co.uk/posts/ai_lllms_compared_for_ios_tca/)
- [Coding Agents Comparison](https://artificialanalysis.ai/insights/coding-agents-comparison)
