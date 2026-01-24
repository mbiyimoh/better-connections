# Portable Feedback System

A complete, production-ready user feedback system for Next.js applications. Features upvoting, file attachments, filtering, sorting, and admin status management.

## Features

- **Floating Feedback Button**: Fixed position button visible on all pages
- **Feedback Portal Page**: Full-page view with sorting and filtering
- **Submission Form**: Multi-step form with area/type categorization
- **Upvoting System**: One vote per user with optimistic UI
- **File Attachments**: Image uploads to Cloudflare R2 (S3-compatible)
- **Admin Status Management**: Track feedback through lifecycle (Open → In Progress → Completed)
- **Pagination Support**: Cursor-based pagination for large datasets

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  FeedbackButton (global)  →  /feedback page                     │
│                               ↓                                  │
│                         FeedbackDialog                           │
│                               ↓                                  │
│  FeedbackList ← → FeedbackCard ← → UpvoteButton                 │
│                               ↓                                  │
│                         FeedbackForm → FileUploadInput          │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                          API Routes                              │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/feedback           - Create feedback                  │
│  GET  /api/feedback           - List feedback (with filters)    │
│  GET  /api/feedback/[id]      - Get single feedback             │
│  PATCH /api/feedback/[id]     - Update status (admin)           │
│  POST /api/feedback/[id]/vote - Upvote/remove vote             │
│  POST /api/feedback/upload    - Upload attachment              │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Database                                 │
├─────────────────────────────────────────────────────────────────┤
│  Feedback → FeedbackVote (1:N)                                  │
│           → FeedbackAttachment (1:N)                            │
│           → User (N:1)                                          │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare R2                               │
├─────────────────────────────────────────────────────────────────┤
│  feedback/{userId}/{timestamp}-{random}-{filename}              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure your project has:

- [x] Next.js 14+ with App Router
- [x] Prisma ORM with PostgreSQL database
- [x] shadcn/ui configured
- [x] Authentication system (Supabase, NextAuth, Clerk, etc.)
- [x] Toast notification library (sonner recommended)

---

## Quick Start

1. Install dependencies
2. Set up Cloudflare R2 storage
3. Add database schema
4. Copy component files
5. Add FeedbackButton to layout
6. Done!

---

## Step 1: Install Dependencies

### NPM Packages

```bash
npm install @aws-sdk/client-s3 date-fns lucide-react sonner zod
```

### shadcn/ui Components

If not already installed:

```bash
npx shadcn@latest add button card badge avatar dialog input textarea select label
```

---

## Step 2: Set Up Cloudflare R2

### Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2 Object Storage** → **Create bucket**
3. Name it (e.g., `my-app-feedback`)
4. Note your **Account ID** (shown in the URL or sidebar)

### Generate API Token

1. Go to **R2** → **Manage R2 API Tokens** → **Create API token**
2. Select permissions: **Object Read & Write** for your bucket
3. Copy the **Access Key ID** and **Secret Access Key**

### Enable Public Access

1. Go to your bucket → **Settings**
2. Under **R2.dev subdomain**, click **Allow Access**
3. Note the public URL: `https://pub-{accountId}.r2.dev`

### Add Environment Variables

```bash
# .env.local
R2_ACCOUNT_ID=your_32_char_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=my-app-feedback
# Optional - auto-generated if not set
R2_PUBLIC_URL=https://pub-{accountId}.r2.dev
```

> **CRITICAL**: No quotes around values! Quotes cause signature errors.

---

## Step 3: Database Schema

### Add to `prisma/schema.prisma`

```prisma
// ============================================================================
// User Feedback System Models
// ============================================================================

// CUSTOMIZE: Update these values for your app's specific areas
enum FeedbackArea {
  DASHBOARD       // Example: Main dashboard
  REPORTS         // Example: Reports section
  SETTINGS        // Example: Settings/preferences
  BILLING         // Example: Billing/subscription
  API             // Example: API/integrations
  OTHER           // Catch-all for uncategorized
}

enum FeedbackType {
  BUG             // Something is broken
  ENHANCEMENT     // Improvement to existing feature
  IDEA            // New feature suggestion
  QUESTION        // General question or confusion
}

enum FeedbackStatus {
  OPEN            // New, unreviewed
  IN_REVIEW       // Being evaluated
  PLANNED         // Accepted, will be implemented
  IN_PROGRESS     // Currently being worked on
  COMPLETED       // Done/shipped
  CLOSED          // Won't do / duplicate / invalid
}

model Feedback {
  id          String         @id @default(cuid())
  userId      String

  // Content
  title       String         @db.VarChar(200)
  description String         @db.Text

  // Categorization
  area        FeedbackArea
  type        FeedbackType
  status      FeedbackStatus @default(OPEN)

  // Metrics - denormalized for sorting performance
  upvoteCount Int            @default(0)

  // Timestamps
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relations
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  votes       FeedbackVote[]
  attachments FeedbackAttachment[]

  // Indexes for common queries
  @@index([userId])
  @@index([status])
  @@index([area])
  @@index([type])
  @@index([createdAt])
  @@index([upvoteCount])
}

model FeedbackVote {
  id         String   @id @default(cuid())
  feedbackId String
  userId     String
  createdAt  DateTime @default(now())

  // Relations
  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Constraints - one vote per user per feedback
  @@unique([feedbackId, userId])
  @@index([feedbackId])
  @@index([userId])
}

model FeedbackAttachment {
  id         String   @id @default(cuid())
  feedbackId String

  // File metadata
  url        String   @db.Text          // Full URL to stored file
  filename   String   @db.VarChar(255)  // Original filename
  mimeType   String   @db.VarChar(100)  // e.g., image/png
  sizeBytes  Int                        // File size for display

  createdAt  DateTime @default(now())

  // Relations
  feedback   Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)

  @@index([feedbackId])
}
```

### Add Relations to Your User Model

```prisma
model User {
  // ... your existing fields ...

  // Add these two lines:
  feedbackSubmissions Feedback[]
  feedbackVotes       FeedbackVote[]
}
```

### Run Migration

```bash
npx prisma migrate dev --name add_feedback_system
npx prisma generate
```

---

## Step 4: Create Files

### Directory Structure

```
src/
├── components/
│   └── feedback/
│       ├── index.ts
│       ├── FeedbackButton.tsx
│       ├── FeedbackDialog.tsx
│       ├── FeedbackForm.tsx
│       ├── FeedbackList.tsx
│       ├── FeedbackCard.tsx
│       ├── UpvoteButton.tsx
│       └── FileUploadInput.tsx
├── app/
│   ├── feedback/
│   │   └── page.tsx
│   └── api/
│       └── feedback/
│           ├── route.ts
│           ├── [id]/
│           │   ├── route.ts
│           │   └── vote/
│           │       └── route.ts
│           └── upload/
│               └── route.ts
└── lib/
    ├── validations/
    │   └── feedback.ts
    ├── storage/
    │   └── r2-client.ts
    └── api-errors.ts
```

---

## Component Files

### `src/components/feedback/index.ts`

```typescript
export { FeedbackButton } from './FeedbackButton'
export { FeedbackDialog } from './FeedbackDialog'
export { FeedbackForm } from './FeedbackForm'
export { FeedbackList } from './FeedbackList'
export { FeedbackCard } from './FeedbackCard'
export { UpvoteButton } from './UpvoteButton'
export { FileUploadInput } from './FileUploadInput'
```

---

### `src/components/feedback/FeedbackButton.tsx`

```tsx
'use client'

import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

/**
 * Floating feedback button - add to your root layout
 */
export function FeedbackButton() {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.push('/feedback')}
      className="fixed bottom-6 left-6 z-50 shadow-lg"
      size="lg"
    >
      <MessageSquarePlus className="mr-2 h-5 w-5" />
      Give Feedback
    </Button>
  )
}
```

---

### `src/components/feedback/FeedbackDialog.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FeedbackForm } from './FeedbackForm'
import { toast } from 'sonner'
import type { CreateFeedbackInput } from '@/lib/validations/feedback'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function FeedbackDialog({ open, onOpenChange, onSuccess }: FeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: CreateFeedbackInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit feedback')
      }

      toast.success('Feedback submitted successfully!')
      onOpenChange(false)
      onSuccess?.()

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            {/* CUSTOMIZE: Update for your app */}
            Help us improve by sharing your feedback, bug reports, or feature ideas.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  )
}
```

---

### `src/components/feedback/FeedbackForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUploadInput } from './FileUploadInput'
import { Bug, Sparkles, Lightbulb, HelpCircle } from 'lucide-react'
import type { CreateFeedbackInput, FeedbackArea, FeedbackType, FeedbackAttachmentMetadata } from '@/lib/validations/feedback'

interface FeedbackFormProps {
  onSubmit: (data: CreateFeedbackInput) => Promise<void>
  isSubmitting: boolean
}

export function FeedbackForm({ onSubmit, isSubmitting }: FeedbackFormProps) {
  const [formData, setFormData] = useState<{
    title: string
    description: string
    area: FeedbackArea
    type: FeedbackType
    attachments: FeedbackAttachmentMetadata[]
  }>({
    title: '',
    description: '',
    area: 'DASHBOARD',  // CUSTOMIZE: Set your default area
    type: 'BUG',
    attachments: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // CUSTOMIZE: Update these values to match your FeedbackArea enum
  const areaOptions: Array<{ value: FeedbackArea; label: string }> = [
    { value: 'DASHBOARD', label: 'Dashboard' },
    { value: 'REPORTS', label: 'Reports' },
    { value: 'SETTINGS', label: 'Settings' },
    { value: 'BILLING', label: 'Billing' },
    { value: 'API', label: 'API' },
    { value: 'OTHER', label: 'Other' }
  ]

  const typeOptions: Array<{
    value: FeedbackType
    label: string
    icon: typeof Bug
    color: string
  }> = [
    { value: 'BUG', label: 'Bug', icon: Bug, color: 'text-red-600' },
    { value: 'ENHANCEMENT', label: 'Enhancement', icon: Sparkles, color: 'text-blue-600' },
    { value: 'IDEA', label: 'Idea', icon: Lightbulb, color: 'text-yellow-600' },
    { value: 'QUESTION', label: 'Question', icon: HelpCircle, color: 'text-purple-600' }
  ]

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }
    if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must be 200 characters or less'
    }
    if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }
    if (formData.description.trim().length > 5000) {
      newErrors.description = 'Description must be 5000 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Area Selection */}
      <div>
        <Label>Which part of the app does this relate to?</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {areaOptions.map(option => (
            <Button
              key={option.value}
              type="button"
              variant={formData.area === option.value ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, area: option.value })}
              className="justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Type Selection */}
      <div>
        <Label>What type of feedback is this?</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {typeOptions.map(option => {
            const Icon = option.icon
            return (
              <Button
                key={option.value}
                type="button"
                variant={formData.type === option.value ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, type: option.value })}
                className="justify-start"
              >
                <Icon className={`mr-2 h-4 w-4 ${formData.type === option.value ? '' : option.color}`} />
                {option.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value })
            if (errors.title) setErrors({ ...errors, title: '' })
          }}
          placeholder="Brief summary of your feedback"
          required
          maxLength={200}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
        <p className="text-xs text-muted-foreground mt-1">{formData.title.length}/200 characters</p>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value })
            if (errors.description) setErrors({ ...errors, description: '' })
          }}
          placeholder="Provide details about your feedback. For bugs, include steps to reproduce."
          required
          rows={6}
          maxLength={5000}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
        <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/5000 characters</p>
      </div>

      {/* File Upload */}
      <div>
        <Label>Screenshots or Attachments (optional)</Label>
        <FileUploadInput
          onUpload={(metadata: FeedbackAttachmentMetadata) => setFormData({
            ...formData,
            attachments: [...formData.attachments, metadata]
          })}
          onRemove={(url: string) => setFormData({
            ...formData,
            attachments: formData.attachments.filter(a => a.url !== url)
          })}
          attachments={formData.attachments}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </form>
  )
}
```

---

### `src/components/feedback/FeedbackList.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { FeedbackCard } from './FeedbackCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { FeedbackArea, FeedbackType } from '@/lib/validations/feedback'

interface FeedbackListProps {
  refreshTrigger?: number
}

interface FeedbackItem {
  id: string
  title: string
  description: string
  area: string
  type: string
  status: string
  upvoteCount: number
  hasUserUpvoted: boolean
  createdAt: string
  user: {
    name: string | null
    email: string
    avatarUrl?: string | null
  }
  attachments: Array<{ url: string; filename: string }>
}

export function FeedbackList({ refreshTrigger }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'oldest'>('popular')
  const [filterArea, setFilterArea] = useState<FeedbackArea | 'ALL'>('ALL')
  const [filterType, setFilterType] = useState<FeedbackType | 'ALL'>('ALL')

  const fetchFeedback = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ sort: sortBy })
      if (filterArea !== 'ALL') params.append('area', filterArea)
      if (filterType !== 'ALL') params.append('type', filterType)

      const res = await fetch(`/api/feedback?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch feedback')

      const data = await res.json()
      setFeedback(data.feedback)
    } catch (error) {
      console.error('Failed to load feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
  }, [sortBy, filterArea, filterType, refreshTrigger])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm font-medium">Sort by:</label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger id="sort-select" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="area-filter" className="text-sm font-medium">Area:</label>
          <Select value={filterArea} onValueChange={(value) => setFilterArea(value as typeof filterArea)}>
            <SelectTrigger id="area-filter" className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Areas</SelectItem>
              {/* CUSTOMIZE: Update to match your FeedbackArea enum */}
              <SelectItem value="DASHBOARD">Dashboard</SelectItem>
              <SelectItem value="REPORTS">Reports</SelectItem>
              <SelectItem value="SETTINGS">Settings</SelectItem>
              <SelectItem value="BILLING">Billing</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-sm font-medium">Type:</label>
          <Select value={filterType} onValueChange={(value) => setFilterType(value as typeof filterType)}>
            <SelectTrigger id="type-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="ENHANCEMENT">Enhancement</SelectItem>
              <SelectItem value="IDEA">Idea</SelectItem>
              <SelectItem value="QUESTION">Question</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge variant="secondary" className="ml-auto">
          {feedback.length} {feedback.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      {/* Feedback List */}
      {feedback.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No feedback found. Be the first to submit feedback!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <FeedbackCard key={item.id} feedback={item} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### `src/components/feedback/FeedbackCard.tsx`

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { UpvoteButton } from './UpvoteButton'
import { formatDistanceToNow } from 'date-fns'
import { Bug, Sparkles, Lightbulb, HelpCircle, Paperclip } from 'lucide-react'

interface FeedbackCardProps {
  feedback: {
    id: string
    title: string
    description: string
    area: string
    type: string
    status: string
    upvoteCount: number
    hasUserUpvoted: boolean
    createdAt: string
    user: {
      name: string | null
      email: string
      avatarUrl?: string | null
    }
    attachments: Array<{ url: string; filename: string }>
  }
}

const typeIcons = {
  BUG: Bug,
  ENHANCEMENT: Sparkles,
  IDEA: Lightbulb,
  QUESTION: HelpCircle
}

const typeColors = {
  BUG: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ENHANCEMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IDEA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  QUESTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
}

const statusColors = {
  OPEN: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  IN_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PLANNED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  IN_PROGRESS: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  COMPLETED: 'bg-green-600 text-white',
  CLOSED: 'bg-gray-400 text-white dark:bg-gray-600'
}

// CUSTOMIZE: Update these labels to match your FeedbackArea enum
const areaLabels: Record<string, string> = {
  DASHBOARD: 'Dashboard',
  REPORTS: 'Reports',
  SETTINGS: 'Settings',
  BILLING: 'Billing',
  API: 'API',
  OTHER: 'Other'
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const TypeIcon = typeIcons[feedback.type as keyof typeof typeIcons] || HelpCircle

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Upvote Section */}
          <UpvoteButton
            feedbackId={feedback.id}
            initialUpvotes={feedback.upvoteCount}
            initialHasUpvoted={feedback.hasUserUpvoted}
          />

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-lg leading-tight">{feedback.title}</h3>
              <div className="flex gap-2 shrink-0">
                <Badge className={typeColors[feedback.type as keyof typeof typeColors]}>
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {feedback.type}
                </Badge>
                <Badge className={statusColors[feedback.status as keyof typeof statusColors]}>
                  {feedback.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {feedback.description}
            </p>

            {/* Attachments */}
            {feedback.attachments.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {feedback.attachments.map((attachment, i) => (
                  <a
                    key={i}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <Paperclip className="h-3 w-3" />
                    {attachment.filename}
                  </a>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={feedback.user.avatarUrl || undefined} />
                <AvatarFallback>
                  {(feedback.user.name || feedback.user.email)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {feedback.user.name || feedback.user.email}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {areaLabels[feedback.area] || feedback.area}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

### `src/components/feedback/UpvoteButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'  // CUSTOMIZE: Update to your auth hook
import { useRouter } from 'next/navigation'

interface UpvoteButtonProps {
  feedbackId: string
  initialUpvotes: number
  initialHasUpvoted: boolean
  onUpdate?: (upvotes: number, hasUpvoted: boolean) => void
}

export function UpvoteButton({
  feedbackId,
  initialUpvotes,
  initialHasUpvoted,
  onUpdate
}: UpvoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()  // CUSTOMIZE: Update to match your auth hook
  const router = useRouter()

  const handleVote = async () => {
    if (!user) {
      toast.error('Please sign in to upvote')
      router.push('/login')  // CUSTOMIZE: Update to your login route
      return
    }

    setIsLoading(true)

    // Capture current state BEFORE optimistic update
    const previousUpvotes = upvotes
    const previousHasUpvoted = hasUpvoted

    // Optimistic update
    const newHasUpvoted = !hasUpvoted
    const newUpvotes = newHasUpvoted ? upvotes + 1 : upvotes - 1
    setHasUpvoted(newHasUpvoted)
    setUpvotes(newUpvotes)

    try {
      const res = await fetch(`/api/feedback/${feedbackId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newHasUpvoted ? 'upvote' : 'remove'
        })
      })

      if (!res.ok) throw new Error('Failed to vote')

      const data = await res.json()
      // Sync with server state
      setUpvotes(data.upvoteCount)
      setHasUpvoted(data.hasUserUpvoted)
      onUpdate?.(data.upvoteCount, data.hasUserUpvoted)

    } catch (error) {
      // Rollback to previous state
      setHasUpvoted(previousHasUpvoted)
      setUpvotes(previousUpvotes)
      toast.error('Failed to update vote')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant={hasUpvoted ? 'default' : 'outline'}
        size="icon"
        onClick={handleVote}
        disabled={isLoading}
        className="h-10 w-10"
        aria-label={hasUpvoted ? 'Remove upvote' : 'Upvote'}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium tabular-nums">{upvotes}</span>
    </div>
  )
}
```

---

### `src/components/feedback/FileUploadInput.tsx`

```tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FeedbackAttachmentMetadata } from '@/lib/validations/feedback'

interface FileUploadInputProps {
  onUpload: (metadata: FeedbackAttachmentMetadata) => void
  onRemove: (url: string) => void
  attachments: FeedbackAttachmentMetadata[]
  maxFiles?: number
}

export function FileUploadInput({
  onUpload,
  onRemove,
  attachments,
  maxFiles = 3
}: FileUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (attachments.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    const file = files[0]

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported')
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/feedback/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await res.json()
      onUpload({
        url: data.url,
        filename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes
      })
      toast.success('File uploaded successfully')

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
          disabled={isUploading || attachments.length >= maxFiles}
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer ${
            isUploading || attachments.length >= maxFiles ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-sm">
              <span className="font-medium text-primary">Click to upload</span>
              {' or drag and drop'}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF, or WEBP (max 5MB)</p>
            <p className="text-xs text-muted-foreground">{attachments.length}/{maxFiles} files uploaded</p>
          </div>
        </label>
      </div>

      {/* Preview List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="flex items-center gap-3 p-2 border rounded-lg bg-muted/50">
              <img
                src={attachment.url}
                alt={`Attachment ${index + 1}`}
                className="h-12 w-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(attachment.url)} aria-label="Remove attachment">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Page File

### `src/app/feedback/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FeedbackList } from '@/components/feedback/FeedbackList'
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog'
import { Plus } from 'lucide-react'

export default function FeedbackPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback Portal</h1>
          <p className="text-muted-foreground mt-1">
            Share your feedback, report bugs, or suggest new features
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Add New Feedback
        </Button>
      </div>

      {/* Feedback List */}
      <FeedbackList refreshTrigger={refreshTrigger} />

      {/* Submission Dialog */}
      <FeedbackDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
```

---

## API Routes

### `src/app/api/feedback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'  // CUSTOMIZE
import { CreateFeedbackSchema } from '@/lib/validations/feedback'
import { ApiErrorHandler } from '@/lib/api-errors'
import prisma from '@/lib/db'  // CUSTOMIZE
import { Prisma, FeedbackArea, FeedbackType, FeedbackStatus } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = CreateFeedbackSchema.parse(body)

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        title: validated.title,
        description: validated.description,
        area: validated.area,
        type: validated.type,
        attachments: {
          create: validated.attachments.map(attachment => ({
            url: attachment.url,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes
          }))
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        attachments: true
      }
    })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sort = searchParams.get('sort') || 'popular'
    const area = searchParams.get('area')
    const type = searchParams.get('type')
    const statusParam = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const cursor = searchParams.get('cursor')

    const user = await getCurrentUser().catch(() => null)

    const where: Prisma.FeedbackWhereInput = {}

    if (statusParam) {
      where.status = statusParam as FeedbackStatus
    } else {
      where.status = { in: ['OPEN', 'IN_REVIEW', 'PLANNED', 'IN_PROGRESS'] }
    }

    if (area) where.area = area as FeedbackArea
    if (type) where.type = type as FeedbackType

    const orderBy: Prisma.FeedbackOrderByWithRelationInput =
      sort === 'popular' ? { upvoteCount: 'desc' } :
      sort === 'recent' ? { createdAt: 'desc' } :
      { createdAt: 'asc' }

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        attachments: true
      }
    })

    const hasMore = feedback.length > limit
    const items = hasMore ? feedback.slice(0, -1) : feedback

    let userVoteSet = new Set<string>()
    if (user && items.length > 0) {
      const feedbackIds = items.map(item => item.id)
      const userVotes = await prisma.feedbackVote.findMany({
        where: { userId: user.id, feedbackId: { in: feedbackIds } },
        select: { feedbackId: true }
      })
      userVoteSet = new Set(userVotes.map(v => v.feedbackId))
    }

    const enriched = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      area: item.area,
      type: item.type,
      status: item.status,
      upvoteCount: item.upvoteCount,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      user: item.user,
      attachments: item.attachments,
      hasUserUpvoted: userVoteSet.has(item.id)
    }))

    return NextResponse.json({
      feedback: enriched,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore
    })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}
```

---

### `src/app/api/feedback/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser, requireAdmin } from '@/lib/auth'  // CUSTOMIZE
import { UpdateFeedbackSchema } from '@/lib/validations/feedback'
import { ApiErrorHandler } from '@/lib/api-errors'
import prisma from '@/lib/db'  // CUSTOMIZE

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params
    const user = await getCurrentUser().catch(() => null)

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        attachments: true,
        ...(user ? { votes: { where: { userId: user.id }, select: { id: true } } } : {})
      }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    const response = {
      id: feedback.id,
      title: feedback.title,
      description: feedback.description,
      area: feedback.area,
      type: feedback.type,
      status: feedback.status,
      upvoteCount: feedback.upvoteCount,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
      user: feedback.user,
      attachments: feedback.attachments,
      hasUserUpvoted: user && 'votes' in feedback ? (feedback.votes as { id: string }[]).length > 0 : false
    }

    return NextResponse.json({ feedback: response })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()  // CUSTOMIZE: Update to your admin check

    const body = await req.json()
    const validated = UpdateFeedbackSchema.parse(body)
    const { id: feedbackId } = await params

    const feedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: validated,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        attachments: true
      }
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}
```

---

### `src/app/api/feedback/[id]/vote/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'  // CUSTOMIZE
import { VoteActionSchema } from '@/lib/validations/feedback'
import { ApiErrorHandler } from '@/lib/api-errors'
import prisma from '@/lib/db'  // CUSTOMIZE

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = VoteActionSchema.parse(body)
    const { id: feedbackId } = await params

    if (action === 'upvote') {
      const existingVote = await prisma.feedbackVote.findUnique({
        where: { feedbackId_userId: { feedbackId, userId: user.id } }
      })

      if (!existingVote) {
        await prisma.$transaction([
          prisma.feedbackVote.create({
            data: { feedbackId, userId: user.id }
          }),
          prisma.feedback.update({
            where: { id: feedbackId },
            data: { upvoteCount: { increment: 1 } }
          })
        ])
      }
    } else if (action === 'remove') {
      const existingVote = await prisma.feedbackVote.findUnique({
        where: { feedbackId_userId: { feedbackId, userId: user.id } }
      })

      if (existingVote) {
        await prisma.$transaction([
          prisma.feedbackVote.delete({
            where: { feedbackId_userId: { feedbackId, userId: user.id } }
          }),
          prisma.feedback.update({
            where: { id: feedbackId },
            data: { upvoteCount: { decrement: 1 } }
          })
        ])
      }
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: {
        upvoteCount: true,
        votes: { where: { userId: user.id }, select: { id: true } }
      }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      upvoteCount: feedback.upvoteCount,
      hasUserUpvoted: feedback.votes.length > 0
    })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}
```

---

### `src/app/api/feedback/upload/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'  // CUSTOMIZE
import { ApiErrorHandler } from '@/lib/api-errors'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, generateFileKey } from '@/lib/storage/r2-client'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Only images (PNG, JPEG, GIF, WebP) are supported.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const fileKey = `feedback/${user.id}/${generateFileKey(file.name)}`

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
      ContentLength: file.size,
    }))

    const fileUrl = `${R2_PUBLIC_URL}/${fileKey}`

    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      sizeBytes: file.size,
      mimeType: file.type
    })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}
```

---

## Library Files

### `src/lib/validations/feedback.ts`

```typescript
import { z } from 'zod'

// CUSTOMIZE: Update these values to match your app's areas
export const FeedbackAreaSchema = z.enum([
  'DASHBOARD',
  'REPORTS',
  'SETTINGS',
  'BILLING',
  'API',
  'OTHER'
])

export const FeedbackTypeSchema = z.enum([
  'BUG',
  'ENHANCEMENT',
  'IDEA',
  'QUESTION'
])

export const FeedbackStatusSchema = z.enum([
  'OPEN',
  'IN_REVIEW',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED'
])

export const FeedbackAttachmentMetadataSchema = z.object({
  url: z.string().url('Invalid attachment URL'),
  filename: z.string().min(1, 'Filename required'),
  mimeType: z.string().min(1, 'MIME type required'),
  sizeBytes: z.number().int().positive('File size must be positive')
})

export const CreateFeedbackSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be 200 characters or less')
    .transform(s => s.trim()),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be 5000 characters or less')
    .transform(s => s.trim()),
  area: FeedbackAreaSchema,
  type: FeedbackTypeSchema,
  attachments: z.array(FeedbackAttachmentMetadataSchema)
    .optional()
    .default([])
    .refine(
      (arr) => arr.every(a => a.sizeBytes <= 10 * 1024 * 1024),
      { message: 'Attachment size must be 10MB or less' }
    )
})

export const UpdateFeedbackSchema = z.object({
  status: FeedbackStatusSchema.optional()
})

export const VoteActionSchema = z.object({
  action: z.enum(['upvote', 'remove'])
})

// TypeScript types
export type FeedbackArea = z.infer<typeof FeedbackAreaSchema>
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>
export type FeedbackAttachmentMetadata = z.infer<typeof FeedbackAttachmentMetadataSchema>
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>
export type UpdateFeedbackInput = z.infer<typeof UpdateFeedbackSchema>
export type VoteActionInput = z.infer<typeof VoteActionSchema>
```

---

### `src/lib/storage/r2-client.ts`

```typescript
import { S3Client } from '@aws-sdk/client-s3'

// Validate required environment variables
if (!process.env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is required')
if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is required')
if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is required')
if (!process.env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is required')

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME

export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ||
  `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`

export function generateFileKey(filename: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).slice(2, 10)
  return `${timestamp}-${randomSuffix}-${filename}`
}
```

---

### `src/lib/api-errors.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'

export interface ApiError {
  error: string
  details?: unknown
  suggestion?: string
  code?: string
}

export class ApiErrorHandler {
  static handle(error: unknown): NextResponse<ApiError> {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    // Business logic errors
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (error.message === 'Admin access required' || error.message.includes('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    // Prisma errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string }
      if (prismaError.code === 'P2002') {
        return NextResponse.json({ error: 'A record with these properties already exists' }, { status: 409 })
      }
      if (prismaError.code === 'P2025') {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 })
      }
    }

    console.error('Unexpected API error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
```

---

## Final Step: Add to Layout

### Update `src/app/layout.tsx`

```tsx
import { FeedbackButton } from '@/components/feedback/FeedbackButton'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <YourAuthProvider>
          {children}
          <Toaster />
          <FeedbackButton />  {/* Add this */}
        </YourAuthProvider>
      </body>
    </html>
  )
}
```

---

## Customization Checklist

- [ ] Update `FeedbackArea` enum in Prisma schema
- [ ] Update `FeedbackAreaSchema` in `lib/validations/feedback.ts`
- [ ] Update `areaOptions` in `FeedbackForm.tsx`
- [ ] Update area filter in `FeedbackList.tsx`
- [ ] Update `areaLabels` in `FeedbackCard.tsx`
- [ ] Update auth imports in API routes (`getCurrentUser`, `requireAdmin`)
- [ ] Update auth context import in `UpvoteButton.tsx`
- [ ] Update Prisma import in API routes
- [ ] Update login redirect URL in `UpvoteButton.tsx`
- [ ] Update dialog description in `FeedbackDialog.tsx`

---

## Test Checklist

1. **Feedback Button**: Should appear at bottom-left
2. **Click Button**: Should navigate to `/feedback`
3. **Add Feedback**: Submit form with title, description, area, type
4. **Validation**: Title < 5 chars should show error
5. **File Upload**: Drag image, should upload and show preview
6. **View Feedback**: New item should appear in list
7. **Upvote**: Click thumbs up, count should increase
8. **Toggle Vote**: Click again, vote should be removed
9. **Filters**: Test area and type dropdowns
10. **Sorting**: Test popular/recent/oldest

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check auth function returns user correctly |
| R2 SignatureDoesNotMatch | Remove quotes from env vars |
| FeedbackButton not showing | Check it's imported in layout |
| Upvote not persisting | Check auth context is working |
| Type errors | Run `npx prisma generate` |

---

## License

MIT - Use freely in any project.
