import type { Question } from './schemas';

export type QuestionType = 'open_text' | 'slider' | 'single_select' | 'multi_select' | 'ranking';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export const QUESTION_TYPES = [
  { id: 'open_text', label: 'Open Text', icon: 'FileText', description: 'Free-form text response' },
  { id: 'slider', label: 'Slider', icon: 'SlidersHorizontal', description: 'Spectrum between two poles' },
  { id: 'single_select', label: 'Single Select', icon: 'Circle', description: 'Choose one option' },
  { id: 'multi_select', label: 'Multi Select', icon: 'CheckSquare', description: 'Choose multiple options' },
  { id: 'ranking', label: 'Ranking', icon: 'ArrowUpDown', description: 'Rank options in order of preference' },
] as const;

export const QUESTION_CATEGORIES = [
  { id: 'GOALS', label: 'Goals', description: 'What they want to achieve', required: true },
  { id: 'CONNECTIONS', label: 'Connections', description: 'Who they want to meet', required: true },
  { id: 'IDENTITY', label: 'Identity', description: 'Who they are', required: false },
  { id: 'BACKGROUND', label: 'Background', description: 'Professional context', required: false },
  { id: 'PREFERENCES', label: 'Preferences', description: 'How they like to interact', required: false },
] as const;

export const REQUIRED_QUESTIONS: Question[] = [
  {
    id: 'goals',
    type: 'open_text',
    category: 'GOALS',
    title: "What are your biggest current goals?",
    subtitle: "What are you actively working toward right now?",
    required: true,
    locked: true,
    order: 0,
    config: {
      placeholder: "e.g., Raising a seed round, hiring a technical co-founder...",
      hint: "The more specific you are, the better we can match you.",
    },
  },
  {
    id: 'ideal_connections',
    type: 'open_text',
    category: 'CONNECTIONS',
    title: "Who would be your ideal connections at this event?",
    subtitle: "Describe the type of people you'd most like to meet.",
    required: true,
    locked: true,
    order: 1,
    config: {
      placeholder: "e.g., Early-stage VCs, operators who've scaled to 100 employees...",
      hint: "Think about who could help with your goals, or who you could help.",
    },
  },
];

export const STARTER_QUESTIONS: Question[] = [
  ...REQUIRED_QUESTIONS,
  {
    id: 'experience_level',
    type: 'single_select',
    category: 'BACKGROUND',
    title: "Which best describes your professional stage?",
    required: false,
    locked: false,
    order: 2,
    config: {
      options: [
        { value: 'early', label: 'Early Career', description: '0-5 years' },
        { value: 'mid', label: 'Mid-Career', description: '5-15 years' },
        { value: 'senior', label: 'Senior / Executive', description: '15+ years' },
        { value: 'founder', label: 'Founder', description: 'Building your own company' },
      ],
    },
  },
  {
    id: 'topics',
    type: 'multi_select',
    category: 'PREFERENCES',
    title: "What topics are you most excited to discuss?",
    required: false,
    locked: false,
    order: 3,
    config: {
      maxSelections: 3,
      options: [
        { value: 'ai_ml', label: 'AI & Machine Learning' },
        { value: 'fundraising', label: 'Fundraising & Investment' },
        { value: 'product', label: 'Product Development' },
        { value: 'growth', label: 'Growth & Marketing' },
        { value: 'hiring', label: 'Hiring & Team Building' },
        { value: 'operations', label: 'Operations & Scale' },
      ],
    },
  },
];
