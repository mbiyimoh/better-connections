# Spec D: Bulk Duplicate Actions & Delete All

**Slug:** bulk-actions
**Author:** Claude Code
**Date:** 2026-01-08
**Priority:** P2 (Enhancement)
**Estimated Effort:** 4-5 hours

---

## Problems

1. **Bulk duplicate handling**: VCF import requires per-contact decisions, tedious for large imports
2. **No "start fresh" option**: Users cannot easily delete all contacts to reimport cleanly

## Solutions

### Part 1: Bulk Duplicate Actions

Add action bar to ImportMergeReview with:
- **Skip All**: Skip remaining duplicates
- **Merge All**: Smart merge (fill empty fields, append notes)
- **Replace All**: Two modes - "Replace all fields" or "Replace only non-empty"

### Part 2: Delete All Contacts

Add "Delete All Contacts" to:
- Settings page under "Data Management"
- Import page as "Start Fresh" option
- Require typing "DELETE" to confirm

---

## Part 1: Bulk Duplicate Actions UI

### User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Import Conflicts                                   [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  47 contacts already exist in your network.                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Bulk Actions:                                             │  │
│  │  [Skip All] [Merge All ▾] [Replace All ▾]                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ─────────────────── OR review individually ───────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ John Smith                                            1/47  ││
│  │ john@example.com                                            ││
│  │─────────────────────────────────────────────────────────────││
│  │ ...field conflict resolution...                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [← Previous]  [Skip this contact]  [Next →]                    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Cancel Import]                              [Apply & Import]   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│  Merge All Options          [×]  │   │  Replace All Options        [×]  │
│                                  │   │                                  │
│  This will apply smart merge     │   │  Choose how to replace:          │
│  to all 47 duplicates:           │   │                                  │
│                                  │   │  ○ Replace only empty fields     │
│  • Fill empty fields with        │   │    Keep existing data, fill gaps │
│    incoming values               │   │                                  │
│  • Append notes (not replace)    │   │  ○ Replace all fields            │
│  • Keep existing tags            │   │    Overwrite with incoming data  │
│                                  │   │                                  │
│  [Cancel]    [Apply to All 47]   │   │  [Cancel]    [Apply to All 47]   │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

### Implementation

#### File: `src/components/import/ImportMergeReview.tsx`

**Add bulk action state and handlers:**

```tsx
type BulkAction = 'skip' | 'merge' | 'replace-empty' | 'replace-all';

const [showMergeOptions, setShowMergeOptions] = useState(false);
const [showReplaceOptions, setShowReplaceOptions] = useState(false);

const applyBulkAction = (action: BulkAction) => {
  const newResolutions = new Map(resolutions);

  duplicates.forEach((dup) => {
    const resolution: DuplicateResolution = {
      existingContactId: dup.existing.id,
      incoming: dup.incoming,
      action: action === 'skip' ? 'skip' : 'merge',
      fieldDecisions: [],
    };

    if (action === 'skip') {
      // No field decisions needed
    } else if (action === 'merge') {
      // Smart merge: keep existing, fill empty with incoming
      resolution.fieldDecisions = dup.conflicts.map((c) => ({
        field: c.field,
        choice: 'keep' as const, // Keep existing, but empty fields get auto-filled
      }));
    } else if (action === 'replace-empty') {
      // Replace only empty fields
      resolution.fieldDecisions = dup.conflicts.map((c) => ({
        field: c.field,
        choice: c.existingValue ? 'keep' : 'use_new',
      }));
    } else if (action === 'replace-all') {
      // Replace all fields with incoming
      resolution.fieldDecisions = dup.conflicts.map((c) => ({
        field: c.field,
        choice: 'use_new' as const,
      }));
    }

    newResolutions.set(dup.existing.id, resolution);
  });

  setResolutions(newResolutions);
  setShowMergeOptions(false);
  setShowReplaceOptions(false);

  // Show confirmation toast
  toast({
    title: `Applied to ${duplicates.length} contacts`,
    description: action === 'skip'
      ? 'All duplicates will be skipped'
      : `All duplicates will be ${action === 'merge' ? 'smart merged' : 'replaced'}`,
  });
};
```

**Add bulk actions bar above individual review:**

```tsx
<div className="border-b border-border p-4 bg-bg-tertiary/50">
  <p className="text-sm text-text-secondary mb-3">Bulk Actions:</p>
  <div className="flex gap-2 flex-wrap">
    <Button
      variant="outline"
      size="sm"
      onClick={() => applyBulkAction('skip')}
    >
      Skip All ({duplicates.length})
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Merge All <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setShowMergeOptions(true)}>
          Smart merge (fill empty fields)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Replace All <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => applyBulkAction('replace-empty')}>
          Replace only empty fields
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyBulkAction('replace-all')}>
          Replace all fields (overwrite)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>

<div className="text-center text-text-tertiary text-sm py-2 border-b border-border">
  ─── OR review individually below ───
</div>
```

**Add confirmation dialog for "Replace All":**

```tsx
{showReplaceAllConfirm && (
  <AlertDialog open={showReplaceAllConfirm} onOpenChange={setShowReplaceAllConfirm}>
    <AlertDialogContent className="bg-bg-secondary border-border">
      <AlertDialogHeader>
        <AlertDialogTitle>Replace All Contacts?</AlertDialogTitle>
        <AlertDialogDescription>
          This will overwrite existing data for {duplicates.length} contacts with
          the imported data. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => applyBulkAction('replace-all')}
          className="bg-destructive hover:bg-destructive/90"
        >
          Replace All
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

---

## Part 2: Delete All Contacts

### Settings Page Location

#### File: `src/app/(dashboard)/settings/page.tsx`

**Add Data Management section:**

```tsx
{/* Data Management Section */}
<Card className="border-border bg-bg-secondary">
  <CardHeader>
    <CardTitle className="text-text-primary flex items-center gap-2">
      <Database className="h-5 w-5" />
      Data Management
    </CardTitle>
    <CardDescription className="text-text-secondary">
      Manage your contact data
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-primary font-medium">Delete All Contacts</p>
        <p className="text-sm text-text-tertiary">
          Permanently remove all {contactCount} contacts from your account
        </p>
      </div>
      <Button
        variant="destructive"
        onClick={() => setShowDeleteAllDialog(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete All
      </Button>
    </div>
  </CardContent>
</Card>
```

### Import Page "Start Fresh" Option

#### File: `src/app/(dashboard)/contacts/import/page.tsx`

**Add "Start Fresh" option:**

```tsx
{/* If user has contacts, show "Start Fresh" option */}
{contactCount > 0 && (
  <Card className="border-border bg-bg-secondary/50 mb-6">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-primary font-medium">Start Fresh?</p>
          <p className="text-sm text-text-tertiary">
            Delete all {contactCount} existing contacts before importing
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDeleteAllDialog(true)}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All & Start Fresh
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### Delete All Dialog (Shared Component)

#### New File: `src/components/contacts/DeleteAllContactsDialog.tsx`

```tsx
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface DeleteAllContactsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contactCount: number;
}

export function DeleteAllContactsDialog({
  isOpen,
  onClose,
  contactCount,
}: DeleteAllContactsDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const canDelete = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/contacts/delete-all', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contacts');
      }

      const data = await response.json();

      toast({
        title: 'Contacts deleted',
        description: `Successfully deleted ${data.deleted} contacts`,
      });

      onClose();
      router.refresh();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contacts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-bg-secondary border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete All Contacts
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-secondary">
            This will permanently delete all <strong>{contactCount}</strong> contacts
            from your account. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="confirm-delete" className="text-text-secondary">
            Type <strong className="text-destructive">DELETE</strong> to confirm:
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="mt-2 bg-bg-tertiary border-border text-text-primary"
            disabled={isDeleting}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete All Contacts'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### API Endpoint

#### New File: `src/app/api/contacts/delete-all/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

// DELETE /api/contacts/delete-all - Delete all contacts for the authenticated user
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all contacts for this user
    // Prisma will cascade delete related tags due to schema relations
    const result = await prisma.contact.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error deleting all contacts:', error);
    return NextResponse.json(
      { error: 'Failed to delete contacts' },
      { status: 500 }
    );
  }
}
```

---

## Testing

### Bulk Duplicate Actions
1. Import VCF file with 10+ duplicates
2. Click "Skip All" → all duplicates marked as skip
3. Click "Merge All" → smart merge applied to all
4. Click "Replace All > Replace only empty" → only empty fields updated
5. Click "Replace All > Replace all fields" → confirmation dialog → all fields overwritten
6. Verify "Apply & Import" commits with correct actions

### Delete All Contacts
1. Go to Settings → Data Management
2. Click "Delete All" → dialog opens
3. Type "delete" (lowercase) → button stays disabled
4. Type "DELETE" → button enables
5. Click delete → contacts deleted, toast shown
6. Verify redirect/refresh shows empty state

### Start Fresh on Import
1. Have existing contacts
2. Go to /contacts/import
3. See "Start Fresh" option with contact count
4. Click → same DELETE confirmation dialog
5. After deletion, import flow continues normally

## Files Changed

- `src/components/import/ImportMergeReview.tsx` (bulk actions)
- `src/components/contacts/DeleteAllContactsDialog.tsx` (new)
- `src/app/api/contacts/delete-all/route.ts` (new)
- `src/app/(dashboard)/settings/page.tsx` (Data Management section)
- `src/app/(dashboard)/contacts/import/page.tsx` (Start Fresh option)

## Security Considerations

- DELETE endpoint requires authentication
- DELETE endpoint only affects authenticated user's contacts
- "DELETE" confirmation prevents accidental deletion
- No batch delete without explicit user confirmation

## Rollback

Revert file changes. If contacts were deleted, they cannot be recovered (user was warned).
