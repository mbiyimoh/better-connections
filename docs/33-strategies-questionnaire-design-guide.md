# 33 Strategies Question UI — Implementation Guide

A complete guide to replicating the 33 Strategies questionnaire design system in any React/Next.js project. This covers the visual design, interaction patterns, and exact code for 6 question types used in the Persona Sharpener module.

**What you're building:** A dark, premium questionnaire experience with gold accents, smooth animations, and 6 distinct question input types — all following the 33 Strategies brand aesthetic.

---

## Table of Contents

1. [Design Foundations](#1-design-foundations)
2. [Page Layout & Shell](#2-page-layout--shell)
3. [Question Type: Single Select (This or That)](#3-question-type-single-select-this-or-that)
4. [Question Type: Multi-Select (Checkboxes)](#4-question-type-multi-select-checkboxes)
5. [Question Type: Slider (Range)](#5-question-type-slider-range)
6. [Question Type: Ranking (Drag-to-Order)](#6-question-type-ranking-drag-to-order)
7. [Question Type: Fill in the Blank (Template)](#7-question-type-fill-in-the-blank-template)
8. [Question Type: Open Text (Scenario)](#8-question-type-open-text-scenario)
9. [Question Rendering Switch](#9-question-rendering-switch)
10. [Navigation & Progress](#10-navigation--progress)
11. [Animation Patterns](#11-animation-patterns)
12. [Data Model](#12-data-model)
13. [Adapting for Your Use Case](#13-adapting-for-your-use-case)

---

## 1. Design Foundations

### Dependencies

```bash
npm install framer-motion
# Tailwind CSS is assumed (v3.3+)
```

### Color Palette

```
Background:     #0a0a0f     (near-black with blue undertone)
Surface:        #111114     (card backgrounds)
Elevated:       #0d0d14     (header, overlays)

Text Primary:   #f5f5f5     (headlines, option labels)
Text Muted:     #888888     (body, descriptions)
Text Dim:       #555555     (tertiary, placeholders)

Gold Accent:    #D4A84B     (CTA buttons, selected states, progress bar, labels)
Gold Hover:     #e0b55c     (hover state for gold buttons)
Gold BG:        #D4A84B/10  (selected option background — 10% opacity)

Borders:        zinc-700    (#3f3f46 — default card borders)
Borders Hover:  zinc-600    (#52525b — hover state)
Borders Active: #D4A84B     (selected state)

Error:          #f87171     (red-400)
```

### Typography

```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&display=swap');
```

| Role | Font | Tailwind Class | Usage |
|------|------|----------------|-------|
| Headlines / Question text | Instrument Serif | `font-display` | Question title, large numbers |
| Body / Options | DM Sans | `font-body` (or default sans) | Option labels, descriptions, buttons |
| Labels / Categories | JetBrains Mono | `font-mono` | Category tags, counters, uppercase labels |

Add to your `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        body: ['"DM Sans"', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
};
```

### Core Visual Rules

- **Dark theme only.** Background is `#0a0a0f`, never white.
- **Gold is the signature accent.** Used for: selected states, CTA buttons, progress bar, category labels, active indicators. Never use blue/green as primary accent.
- **No emojis in UI chrome.** Use geometric SVG icons with 1.5px stroke.
- **Subtle animations.** Scale 1.01 on hover, 0.99 on tap. Fade-in on question transitions. Nothing flashy.
- **One question per screen.** Full-page single-question flow, not a scrollable form.

---

## 2. Page Layout & Shell

The questionnaire uses a fixed header + progress bar at the top, with the question content centered below.

```tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function QuestionnaireShell({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentValue, setCurrentValue] = useState(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleContinue = () => {
    // Save answer
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: currentValue }));
    setCurrentValue(null);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevQ = questions[currentIndex - 1];
      setCurrentValue(answers[prevQ.id] ?? null);
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Progress bar (fixed top) ── */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-800 z-50">
        <motion.div
          className="h-full bg-[#D4A84B]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* ── Header (fixed, frosted glass) ── */}
      <header className="fixed top-0 left-0 right-0 bg-[#0a0a0f]/80 backdrop-blur-sm z-40 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            {/* X icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit
          </button>

          <span className="text-zinc-500 text-sm">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
      </header>

      {/* ── Question Content ── */}
      <div className="pt-20 pb-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="py-8">
            {/* Category label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-[#D4A84B]">
                {currentQuestion.category}
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-xs text-zinc-500">
                {currentIndex + 1} of {totalQuestions}
              </span>
            </div>

            {/* Question title (animated) */}
            <motion.h2
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl lg:text-3xl font-display text-white mb-8"
            >
              {currentQuestion.text}
            </motion.h2>

            {/* Question input (render by type — see below) */}
            {renderQuestion(currentQuestion, currentValue, setCurrentValue)}

            {/* ── Navigation ── */}
            <div className="mt-8 flex items-center gap-4">
              {currentIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  &larr; Back
                </button>
              )}

              <div className="flex-1" />

              <button
                onClick={() => {
                  setCurrentValue(null);
                  handleContinue();
                }}
                className="px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
              >
                Skip
              </button>

              <motion.button
                onClick={handleContinue}
                disabled={currentValue === null}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-[#D4A84B] text-black font-medium rounded-lg hover:bg-[#e0b55c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {currentIndex < totalQuestions - 1 ? 'Continue \u2192' : 'Complete'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key layout details:**
- `max-w-3xl` for single-column question layout (or `max-w-7xl` with `lg:grid-cols-2` if you want a sidebar)
- `pt-20` clears the fixed header
- Progress bar sits above the header (`z-50` vs `z-40`)
- Header uses `bg-[#0a0a0f]/80 backdrop-blur-sm` for frosted glass

---

## 3. Question Type: Single Select (This or That)

Radio-style vertical option list. User picks exactly one.

```tsx
import { motion } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SingleSelectProps {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SingleSelect({ options, value, onChange, disabled }: SingleSelectProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <motion.button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          whileHover={disabled ? undefined : { scale: 1.01 }}
          whileTap={disabled ? undefined : { scale: 0.99 }}
          className={`w-full p-4 rounded-lg border text-left transition-all ${
            value === option.value
              ? 'border-[#D4A84B] bg-[#D4A84B]/10'
              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-3">
            {/* Radio indicator */}
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                value === option.value ? 'border-[#D4A84B]' : 'border-zinc-600'
              }`}
            >
              {value === option.value && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#D4A84B]" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{option.label}</p>
              {option.sublabel && (
                <p className="text-sm text-zinc-500">{option.sublabel}</p>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
```

**Visual anatomy:**
- Each option is a full-width button with `rounded-lg` border
- Radio indicator: 20px circle with 2px border, gold fill dot when selected
- Default border: `zinc-700`, hover: `zinc-600`, selected: `#D4A84B`
- Selected background: `#D4A84B` at 10% opacity
- Subtle scale animation: 1.01 on hover, 0.99 on press

---

## 4. Question Type: Multi-Select (Checkboxes)

Checkbox-style option list with optional max selection limit.

```tsx
import { motion } from 'framer-motion';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[] | null) => void;
  maxSelections?: number;
  instruction?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options, value, onChange, maxSelections, instruction, disabled
}: MultiSelectProps) {
  const selectedValues = Array.isArray(value) ? value : [];
  const max = maxSelections || options.length;
  const isAtMax = selectedValues.length >= max;

  const handleToggle = (optionValue: string) => {
    if (disabled) return;
    if (selectedValues.includes(optionValue)) {
      const newValues = selectedValues.filter((v) => v !== optionValue);
      onChange(newValues.length > 0 ? newValues : null);
    } else if (!isAtMax) {
      onChange([...selectedValues, optionValue]);
    }
  };

  return (
    <div className="space-y-3">
      {instruction && <p className="text-sm text-zinc-500">{instruction}</p>}

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          const isDisabledOption = disabled || (isAtMax && !isSelected);

          return (
            <motion.button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              disabled={isDisabledOption}
              whileHover={isDisabledOption ? undefined : { scale: 1.01 }}
              whileTap={isDisabledOption ? undefined : { scale: 0.99 }}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-[#D4A84B] bg-[#D4A84B]/10'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
              } ${isDisabledOption ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox indicator */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'border-[#D4A84B] bg-[#D4A84B]' : 'border-zinc-600'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-white">{option.label}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-sm text-zinc-500">
        {selectedValues.length} of {max} selected
      </p>
    </div>
  );
}
```

**Key differences from Single Select:**
- Checkbox indicator: `rounded` (square) instead of `rounded-full` (circle)
- Selected state: solid gold fill with black checkmark SVG
- At max selections, remaining options get `opacity-50`
- Counter shown at bottom: "2 of 3 selected"

---

## 5. Question Type: Slider (Range)

Horizontal range input with gold gradient fill track.

```tsx
import { useEffect } from 'react';

interface SliderProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: string;      // Label for left end
  max?: string;      // Label for right end
  defaultValue?: number;
  disabled?: boolean;
}

export function SliderQuestion({
  value, onChange, min = 'Low', max = 'High', defaultValue = 50, disabled
}: SliderProps) {
  const currentValue = typeof value === 'number' ? value : defaultValue;

  useEffect(() => {
    if (value === null || value === undefined) {
      onChange(defaultValue);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{min}</span>
        <span className="text-2xl font-display text-[#D4A84B]">{currentValue}</span>
        <span className="text-sm text-zinc-400">{max}</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={currentValue}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full h-3 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #D4A84B ${currentValue}%, #27272a ${currentValue}%)`,
        }}
      />
    </div>
  );
}
```

**Visual anatomy:**
- Current value displayed center-top in large serif font (`text-2xl font-display`) in gold
- Min/max labels flanking the value in `text-sm text-zinc-400`
- Track: 12px tall (`h-3`), `rounded-lg`
- Fill: gold gradient from left to current position, zinc-800 for unfilled
- Auto-initializes with default value on mount

---

## 6. Question Type: Ranking (Drag-to-Order)

Two-zone interface: unranked items (pill buttons) and ranked items (numbered list).

```tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RankItem {
  id: string;
  label: string;
  rank?: number;
}

interface RankingProps {
  items: RankItem[];
  value: RankItem[] | null;
  onChange: (value: RankItem[] | null) => void;
  disabled?: boolean;
}

export function Ranking({ items, value, onChange, disabled }: RankingProps) {
  const [rankedItems, setRankedItems] = useState<RankItem[]>([]);
  const [unrankedItems, setUnrankedItems] = useState<RankItem[]>([]);

  useEffect(() => {
    if (Array.isArray(value) && value.length > 0) {
      setRankedItems(value);
      const rankedIds = value.map((r) => r.id);
      setUnrankedItems(items.filter((i) => !rankedIds.includes(i.id)));
    } else {
      setRankedItems([]);
      setUnrankedItems([...items]);
    }
  }, []);

  const addToRanking = (item: RankItem) => {
    if (disabled) return;
    const newRanked = [...rankedItems, { ...item, rank: rankedItems.length + 1 }];
    const newUnranked = unrankedItems.filter((i) => i.id !== item.id);
    setRankedItems(newRanked);
    setUnrankedItems(newUnranked);
    onChange(newRanked);
  };

  const removeFromRanking = (item: RankItem) => {
    if (disabled) return;
    const newRanked = rankedItems
      .filter((i) => i.id !== item.id)
      .map((i, idx) => ({ ...i, rank: idx + 1 }));
    setRankedItems(newRanked);
    setUnrankedItems([...unrankedItems, { id: item.id, label: item.label }]);
    onChange(newRanked.length > 0 ? newRanked : null);
  };

  const moveUp = (index: number) => {
    if (disabled || index === 0) return;
    const newRanked = [...rankedItems];
    [newRanked[index - 1], newRanked[index]] = [newRanked[index], newRanked[index - 1]];
    const reranked = newRanked.map((i, idx) => ({ ...i, rank: idx + 1 }));
    setRankedItems(reranked);
    onChange(reranked);
  };

  const moveDown = (index: number) => {
    if (disabled || index === rankedItems.length - 1) return;
    const newRanked = [...rankedItems];
    [newRanked[index], newRanked[index + 1]] = [newRanked[index + 1], newRanked[index]];
    const reranked = newRanked.map((i, idx) => ({ ...i, rank: idx + 1 }));
    setRankedItems(reranked);
    onChange(reranked);
  };

  return (
    <div className="space-y-4">
      {/* Ranked items */}
      {rankedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">Your ranking:</p>
          {rankedItems.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              className="flex items-center gap-3 p-3 bg-[#D4A84B]/10 border border-[#D4A84B]/30 rounded-lg"
            >
              {/* Rank badge */}
              <span className="w-6 h-6 rounded-full bg-[#D4A84B] text-black text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <span className="flex-1 text-white">{item.label}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveUp(index)} disabled={disabled || index === 0}
                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-30">
                  &uarr;
                </button>
                <button onClick={() => moveDown(index)} disabled={disabled || index === rankedItems.length - 1}
                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-30">
                  &darr;
                </button>
                <button onClick={() => removeFromRanking(item)} disabled={disabled}
                  className="p-1 text-zinc-400 hover:text-red-400">
                  &times;
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Unranked items */}
      {unrankedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            {rankedItems.length > 0 ? 'Click to add to ranking:' : 'Click items in order of priority:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {unrankedItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => addToRanking(item)}
                disabled={disabled}
                whileHover={disabled ? undefined : { scale: 1.02 }}
                whileTap={disabled ? undefined : { scale: 0.98 }}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Visual anatomy:**
- Ranked items: gold-tinted background (`#D4A84B/10`), gold border (`#D4A84B/30`)
- Rank badge: solid gold circle with black number text
- Unranked items: pill-shaped buttons in `bg-zinc-800` with `border-zinc-700`
- `layout` prop on `motion.div` gives smooth reorder animation
- Arrow buttons for reorder, X button for removal

---

## 7. Question Type: Fill in the Blank (Template)

Sentence completion with inline text inputs and optional suggestion pills.

```tsx
import { useState, useEffect } from 'react';

interface BlankConfig {
  id: string;
  placeholder: string;
  suggestions?: string[];
}

interface FillBlankProps {
  template: string;           // e.g., "I want to {goal} within {timeframe}"
  blanks: BlankConfig[];
  value: Record<string, string> | null;
  onChange: (value: Record<string, string> | null) => void;
  disabled?: boolean;
}

export function FillBlank({ template, blanks, value, onChange, disabled }: FillBlankProps) {
  const [blankValues, setBlankValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (value && typeof value === 'object') setBlankValues(value);
  }, []);

  const handleBlankChange = (blankId: string, text: string) => {
    const newValues = { ...blankValues, [blankId]: text };
    setBlankValues(newValues);
    const allFilled = blanks.every((b) => newValues[b.id]?.trim());
    onChange(allFilled ? newValues : null);
  };

  const renderTemplate = () => {
    const parts: React.ReactNode[] = [];
    let remaining = template;
    let key = 0;

    blanks.forEach((blank) => {
      const placeholder = `{${blank.id}}`;
      const index = remaining.indexOf(placeholder);

      if (index !== -1) {
        if (index > 0) {
          parts.push(
            <span key={key++} className="text-zinc-300">{remaining.substring(0, index)}</span>
          );
        }

        parts.push(
          <span key={key++} className="inline-block mx-1">
            <input
              type="text"
              value={blankValues[blank.id] || ''}
              onChange={(e) => handleBlankChange(blank.id, e.target.value)}
              placeholder={blank.placeholder}
              disabled={disabled}
              className="px-3 py-1 bg-zinc-800 border-b-2 border-[#D4A84B] text-white placeholder-zinc-600 focus:outline-none focus:border-[#e0b55c] min-w-[150px] disabled:opacity-50"
            />
            {blank.suggestions?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {blank.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBlankChange(blank.id, s)}
                    disabled={disabled}
                    className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded hover:bg-zinc-600 hover:text-white disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </span>
        );

        remaining = remaining.substring(index + placeholder.length);
      }
    });

    if (remaining) {
      parts.push(<span key={key++} className="text-zinc-300">{remaining}</span>);
    }

    return parts;
  };

  return (
    <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <p className="text-lg leading-relaxed">{renderTemplate()}</p>
    </div>
  );
}
```

**Visual anatomy:**
- Container: padded card with `bg-zinc-900/50 border border-zinc-800`
- Inline inputs: no full border — just a gold bottom underline (`border-b-2 border-[#D4A84B]`)
- Background of inputs: `bg-zinc-800`
- Suggestion pills: tiny gray buttons below each input field
- Only emits a value when ALL blanks are filled (prevents partial submissions)

---

## 8. Question Type: Open Text (Scenario)

Large textarea for free-form responses.

```tsx
interface ScenarioProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
}

export function Scenario({ value, onChange, placeholder, helperText, disabled }: ScenarioProps) {
  return (
    <div className="space-y-2">
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-[#D4A84B] disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {helperText && <p className="text-sm text-zinc-500">{helperText}</p>}
    </div>
  );
}
```

**Visual anatomy:**
- Full-width textarea, 4 rows default
- Border transitions from `zinc-700` to `#D4A84B` on focus
- `resize-none` prevents user resizing
- Helper text below in dim gray

---

## 9. Question Rendering Switch

Central dispatcher that maps question type to component:

```tsx
function renderQuestion(question, value, onChange) {
  switch (question.type) {
    case 'single-select':
      return <SingleSelect options={question.options} value={value} onChange={onChange} />;

    case 'multi-select':
      return (
        <MultiSelect
          options={question.options}
          value={value || []}
          onChange={onChange}
          maxSelections={question.maxSelections}
          instruction={question.instruction}
        />
      );

    case 'slider':
      return (
        <SliderQuestion
          value={value}
          onChange={onChange}
          min={question.min}
          max={question.max}
          defaultValue={question.defaultValue}
        />
      );

    case 'ranking':
      return <Ranking items={question.items} value={value} onChange={onChange} />;

    case 'fill-blank':
      return (
        <FillBlank
          template={question.template}
          blanks={question.blanks}
          value={value}
          onChange={onChange}
        />
      );

    case 'open-text':
      return (
        <Scenario
          value={value}
          onChange={onChange}
          placeholder={question.placeholder}
          helperText={question.helperText}
        />
      );

    default:
      return null;
  }
}
```

---

## 10. Navigation & Progress

### Progress Bar

Fixed at `top-0`, sits above the header (`z-50`):

```tsx
<div className="fixed top-0 left-0 right-0 h-1 bg-zinc-800 z-50">
  <motion.div
    className="h-full bg-[#D4A84B]"
    initial={{ width: 0 }}
    animate={{ width: `${progress}%` }}
    transition={{ duration: 0.3 }}
  />
</div>
```

### Navigation Buttons

Three-button layout: `[Back]  ...spacer...  [Skip]  [Continue]`

| Button | Style | Behavior |
|--------|-------|----------|
| Back | Ghost: `text-zinc-400 hover:text-white` | Hidden on Q1. Restores previous answer. |
| Skip | Subtle: `text-zinc-500 hover:text-zinc-300 text-sm` | Saves null, advances. |
| Continue/Complete | CTA: `bg-[#D4A84B] text-black font-medium rounded-lg` | Disabled if `value === null`. Changes to "Complete" on last Q. |

### Category Label

Above the question title:

```tsx
<div className="flex items-center gap-2 mb-4">
  <span className="text-xs font-mono uppercase tracking-widest text-[#D4A84B]">
    {question.category}
  </span>
  <span className="text-zinc-600">&bull;</span>
  <span className="text-xs text-zinc-500">
    {currentIndex + 1} of {totalQuestions}
  </span>
</div>
```

This uses JetBrains Mono (`font-mono`), uppercase, wide letter-spacing, gold color — the signature 33 Strategies label pattern.

---

## 11. Animation Patterns

### Question Entry

```tsx
<motion.h2
  key={question.id}  // key change triggers re-animation
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-2xl lg:text-3xl font-display text-white mb-8"
>
  {question.text}
</motion.h2>
```

### Option Hover/Tap

```tsx
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.99 }}
  // ...
>
```

### Ranking Reorder

```tsx
<motion.div layout> {/* Smooth position animation on reorder */}
```

### Section Reveal (e.g., showing extra fields after answering)

```tsx
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
>
```

### Ease Curve

The standard ease across the design system is `[0.25, 0.4, 0.25, 1]` — a refined custom cubic-bezier. For simple transitions, Framer Motion's default ease works fine.

---

## 12. Data Model

### Question Shape

```typescript
interface Question {
  id: string;
  type: 'single-select' | 'multi-select' | 'slider' | 'ranking' | 'fill-blank' | 'open-text';
  category: string;                  // e.g., "logistics", "preferences", "about-you"
  text: string;                      // The question text displayed
  options?: { value: string; label: string; sublabel?: string }[];  // For select types
  items?: { id: string; label: string }[];                          // For ranking
  template?: string;                 // For fill-blank (e.g., "I want to {goal}")
  blanks?: { id: string; placeholder: string; suggestions?: string[] }[];
  min?: string;                      // Slider left label
  max?: string;                      // Slider right label
  defaultValue?: number;             // Slider default
  maxSelections?: number;            // Multi-select cap
  instruction?: string;              // Multi-select instruction text
  placeholder?: string;              // Open-text placeholder
  helperText?: string;               // Open-text helper
}
```

### Answer Shape

Each question type produces a different value:

| Type | Value Shape |
|------|-------------|
| `single-select` | `string` (the selected option's value) |
| `multi-select` | `string[]` (array of selected values) |
| `slider` | `number` (0-100) |
| `ranking` | `{ id: string; label: string; rank: number }[]` |
| `fill-blank` | `Record<string, string>` (blank ID to text) |
| `open-text` | `string` (free text) |

All types return `null` when unanswered (enables the "disabled Continue button" pattern).

---

## 13. Adapting for Your Use Case

### What to keep

- The 6 question type components (copy them verbatim)
- The color palette and animation patterns
- The one-question-per-screen flow with fixed header + progress
- The `font-display` for question titles, `font-mono` for labels
- The gold accent for all interactive states

### What to customize

- **Question data:** Replace the question bank with your event-specific questions
- **Categories:** Use your own category labels (e.g., "logistics", "preferences", "dietary")
- **Navigation:** You may not need Back/Skip if it's a shorter flow
- **Sidebar:** The original uses a two-column layout with a PersonaCard on the left. For an event RSVP, you could put a summary card, event details, or leave it single-column.
- **Completion view:** Replace with your own confirmation (e.g., "You're registered!")

### What to drop (per your request)

- **"I don't know" button** — Remove the skip/unsure mechanism
- **Confidence slider** — Remove the "How confident are you?" range input
- **Additional context textarea** — Remove the optional context field
- **SkipConfirmation modal** — Only relevant for brain-dump-powered flows
- **PersonaCard sidebar** — Only relevant for persona building
- **Two-tier question system** — Only relevant when AI customizes questions from a brain dump

### Minimal example question

```typescript
const eventQuestions: Question[] = [
  {
    id: 'attendance',
    type: 'single-select',
    category: 'logistics',
    text: 'Will you be attending in person or virtually?',
    options: [
      { value: 'in-person', label: 'In Person', sublabel: 'Join us at the venue' },
      { value: 'virtual', label: 'Virtual', sublabel: 'Watch the livestream' },
    ],
  },
  {
    id: 'interests',
    type: 'multi-select',
    category: 'preferences',
    text: 'Which sessions are you most interested in?',
    options: [
      { value: 'keynote', label: 'Opening Keynote' },
      { value: 'workshop', label: 'Hands-on Workshop' },
      { value: 'networking', label: 'Networking Hour' },
      { value: 'panel', label: 'Expert Panel' },
    ],
    maxSelections: 3,
    instruction: 'Select up to 3',
  },
  {
    id: 'excitement',
    type: 'slider',
    category: 'about-you',
    text: 'How excited are you about this event?',
    min: 'Curious',
    max: 'Cannot wait',
    defaultValue: 75,
  },
  {
    id: 'priorities',
    type: 'ranking',
    category: 'preferences',
    text: 'Rank what matters most to you at this event.',
    items: [
      { id: 'learning', label: 'Learning new skills' },
      { id: 'networking', label: 'Meeting new people' },
      { id: 'inspiration', label: 'Getting inspired' },
      { id: 'fun', label: 'Having fun' },
    ],
  },
  {
    id: 'goals',
    type: 'fill-blank',
    category: 'about-you',
    text: 'Complete the sentence:',
    template: 'I hope this event helps me {goal} so I can {outcome}.',
    blanks: [
      { id: 'goal', placeholder: 'e.g., learn AI basics', suggestions: ['learn something new', 'meet collaborators', 'find inspiration'] },
      { id: 'outcome', placeholder: 'e.g., apply it at work' },
    ],
  },
  {
    id: 'anything-else',
    type: 'open-text',
    category: 'logistics',
    text: 'Anything else we should know?',
    placeholder: 'Dietary needs, accessibility requirements, special requests...',
    helperText: 'Optional — but helps us prepare.',
  },
];
```

---

*This guide captures the exact visual patterns, code, and interaction design from the 33 Strategies Persona Sharpener questionnaire. All 6 question types are production-tested and can be dropped into any React + Tailwind + Framer Motion project.*
