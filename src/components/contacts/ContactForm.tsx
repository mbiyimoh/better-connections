'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X, Loader2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TAG_CATEGORY_COLORS } from '@/lib/design-system';
import type { Contact, TagCategory } from '@/types/contact';
import Link from 'next/link';
import { HometownSuggestion } from './HometownSuggestion';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { parseVcfFile, type ParsedContact } from '@/lib/vcf-parser';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional().or(z.literal('')),
  primaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  secondaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  primaryPhone: z.string().max(50).optional().or(z.literal('')),
  secondaryPhone: z.string().max(50).optional().or(z.literal('')),
  title: z.string().max(255).optional(),
  organizationalTitle: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  howWeMet: z.string().optional(),
  relationshipStrength: z.number().int().min(1).max(4),
  whyNow: z.string().optional(),
  expertise: z.string().optional(),
  interests: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface TagInput {
  text: string;
  category: TagCategory;
}

interface ContactFormProps {
  contact?: Contact;
  isEditing?: boolean;
}

export function ContactForm({ contact, isEditing = false }: ContactFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [tags, setTags] = useState<TagInput[]>(
    contact?.tags.map((t) => ({ text: t.text, category: t.category })) || []
  );
  const [newTagText, setNewTagText] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>('RELATIONSHIP');

  // Mobile VCF import state
  const isMobile = useIsMobile();
  const [isImporting, setIsImporting] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showMultiContactDialog, setShowMultiContactDialog] = useState(false);
  const [pendingVcfData, setPendingVcfData] = useState<ParsedContact | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: contact?.firstName || '',
      lastName: contact?.lastName || '',
      primaryEmail: contact?.primaryEmail || '',
      secondaryEmail: contact?.secondaryEmail || '',
      primaryPhone: contact?.primaryPhone || '',
      secondaryPhone: contact?.secondaryPhone || '',
      title: contact?.title || '',
      organizationalTitle: contact?.organizationalTitle || '',
      company: contact?.company || '',
      location: contact?.location || '',
      linkedinUrl: contact?.linkedinUrl || '',
      howWeMet: contact?.howWeMet || '',
      relationshipStrength: contact?.relationshipStrength || 1,
      whyNow: contact?.whyNow || '',
      expertise: contact?.expertise || '',
      interests: contact?.interests || '',
      notes: contact?.notes || '',
    },
  });

  const relationshipStrength = watch('relationshipStrength');
  const primaryPhone = watch('primaryPhone');
  const location = watch('location');

  // Handle focus field from query param (scroll to field and apply glow)
  useEffect(() => {
    const focus = searchParams.get('focus');
    if (!focus) return;

    // Small delay to ensure DOM is ready
    const scrollTimeout = setTimeout(() => {
      const element = document.getElementById(focus);
      if (element) {
        // Scroll to element with offset for sticky header
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the input
        element.focus();
        // Apply glow effect
        setFocusedField(focus);
      }
    }, 100);

    // Remove glow after 3 seconds
    const glowTimeout = setTimeout(() => setFocusedField(null), 3100);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(glowTimeout);
    };
  }, [searchParams]);

  // Helper to get glow classes for focused field
  const getFieldClasses = (fieldId: string, baseError?: boolean) => {
    const isGlowing = focusedField === fieldId;
    return cn(
      baseError && 'border-destructive',
      isGlowing && 'ring-2 ring-gold-primary ring-offset-2 ring-offset-bg-primary border-gold-primary transition-all duration-300'
    );
  };

  const addTag = () => {
    if (newTagText.trim()) {
      setTags([...tags, { text: newTagText.trim(), category: newTagCategory }]);
      setNewTagText('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // ========================================
  // Mobile VCF Import Functions
  // ========================================

  // Map VCF parsed contact to form data structure
  const mapVcfToFormData = (contact: ParsedContact): Partial<ContactFormData> => ({
    firstName: contact.firstName,
    lastName: contact.lastName || '',
    primaryEmail: contact.primaryEmail || '',
    secondaryEmail: contact.secondaryEmail || '',
    primaryPhone: contact.primaryPhone || '',
    secondaryPhone: contact.secondaryPhone || '',
    title: contact.title || '',
    company: contact.company || '',
    location: [contact.city, contact.state].filter(Boolean).join(', ') || '',
    linkedinUrl: contact.linkedinUrl || '',
    notes: contact.notes || '',
    // Fields not in VCF - keep defaults
    organizationalTitle: '',
    howWeMet: '',
    relationshipStrength: 1,
    whyNow: '',
    expertise: '',
    interests: '',
  });

  // Check if user has entered any data in the form
  const formHasData = (): boolean => {
    const values = getValues();
    return !!(
      values.firstName ||
      values.lastName ||
      values.primaryEmail ||
      values.primaryPhone ||
      values.title ||
      values.company ||
      values.location ||
      values.notes
    );
  };

  // Apply VCF data to form and show success toast
  const applyVcfData = (vcfContact: ParsedContact) => {
    const formData = mapVcfToFormData(vcfContact);
    reset({ ...getValues(), ...formData, relationshipStrength: 1 });
    setTags([]); // Clear tags since VCF doesn't have them
    toast({
      title: 'Contact imported',
      description: 'Review the information and save when ready.',
    });
  };

  // Handle VCF file selection from native file input
  const handleVcfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    // Validate extension (iOS Safari ignores accept attribute)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.vcf') && !fileName.endsWith('.vcard')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a .vcf or .vcard file.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const { contacts } = parseVcfFile(text);

      if (contacts.length === 0) {
        toast({
          title: 'No contact found',
          description: 'Could not read any contact information from this file.',
          variant: 'destructive',
        });
        return;
      }

      if (contacts.length > 1) {
        // Multi-contact file - show dialog with link to bulk import
        setShowMultiContactDialog(true);
        return;
      }

      // Single contact - check if form has data
      const vcfContact = contacts[0];
      if (!vcfContact) {
        toast({
          title: 'No contact found',
          description: 'Could not read any contact information from this file.',
          variant: 'destructive',
        });
        return;
      }
      if (formHasData()) {
        setPendingVcfData(vcfContact);
        setShowOverwriteDialog(true);
      } else {
        applyVcfData(vcfContact);
      }
    } catch (error) {
      console.error('VCF parse error:', error);
      toast({
        title: 'Import failed',
        description: 'Could not read the file. It may be corrupted or in an unsupported format.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle overwrite confirmation
  const handleOverwriteConfirm = () => {
    if (pendingVcfData) {
      applyVcfData(pendingVcfData);
    }
    setPendingVcfData(null);
    setShowOverwriteDialog(false);
  };

  // Handle overwrite cancel
  const handleOverwriteCancel = () => {
    setPendingVcfData(null);
    setShowOverwriteDialog(false);
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        lastName: data.lastName || null,
        primaryEmail: data.primaryEmail || null,
        secondaryEmail: data.secondaryEmail || null,
        primaryPhone: data.primaryPhone || null,
        secondaryPhone: data.secondaryPhone || null,
        linkedinUrl: data.linkedinUrl || null,
        tags,
      };

      const url = isEditing ? `/api/contacts/${contact?.id}` : '/api/contacts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save contact');

      const savedContact = await res.json();
      // Redirect to profile page after save (or contacts list for new contacts)
      const redirectPath = isEditing && contact?.id
        ? `/contacts/${contact.id}`
        : savedContact?.id ? `/contacts/${savedContact.id}` : '/contacts';
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to save contact. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 pl-16 md:pl-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/contacts"
          className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
        <h1 className="text-[28px] font-bold text-white">
          {isEditing ? 'Edit Contact' : 'Add Contact'}
        </h1>
      </div>

      {/* Mobile VCF Import Button - only show on mobile for new contacts */}
      {isMobile && !isEditing && (
        <div className="mb-6">
          <label
            htmlFor="vcf-import-input"
            className={cn(
              'flex w-full cursor-pointer items-center justify-center gap-2',
              'rounded-lg border border-border bg-bg-secondary',
              'px-4 py-3 text-sm font-medium text-text-secondary',
              'transition-colors hover:border-gold-primary hover:text-gold-primary',
              isImporting && 'pointer-events-none opacity-50'
            )}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {isImporting ? 'Importing...' : 'Import a vCard'}
            <input
              id="vcf-import-input"
              type="file"
              accept=".vcf,.vcard,text/vcard,text/x-vcard"
              onChange={handleVcfFileSelect}
              className="sr-only"
              disabled={isImporting}
            />
          </label>
          <p className="mt-2 text-center text-xs text-text-tertiary">
            Share a contact to Files, then import here
          </p>
        </div>
      )}

      <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Basic Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="John"
                className={getFieldClasses('firstName', !!errors.firstName)}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Doe"
                className={getFieldClasses('lastName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryEmail">Primary Email</Label>
              <Input
                id="primaryEmail"
                type="email"
                {...register('primaryEmail')}
                placeholder="john@example.com"
                className={getFieldClasses('primaryEmail', !!errors.primaryEmail)}
              />
              {errors.primaryEmail && (
                <p className="text-sm text-destructive">{errors.primaryEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryEmail">Secondary Email</Label>
              <Input
                id="secondaryEmail"
                type="email"
                {...register('secondaryEmail')}
                placeholder="john.doe@work.com"
                className={getFieldClasses('secondaryEmail', !!errors.secondaryEmail)}
              />
              {errors.secondaryEmail && (
                <p className="text-sm text-destructive">{errors.secondaryEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryPhone">Primary Phone</Label>
              <Input
                id="primaryPhone"
                {...register('primaryPhone')}
                placeholder="+1 (555) 123-4567"
                className={getFieldClasses('primaryPhone')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryPhone">Secondary Phone</Label>
              <Input
                id="secondaryPhone"
                {...register('secondaryPhone')}
                placeholder="+1 (555) 987-6543"
                className={getFieldClasses('secondaryPhone')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Job Role</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Venture Capitalist, Software Engineer..."
                className={getFieldClasses('title')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationalTitle">Position</Label>
              <Input
                id="organizationalTitle"
                {...register('organizationalTitle')}
                placeholder="President, VP of Engineering..."
                className={getFieldClasses('organizationalTitle')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                {...register('company')}
                placeholder="Acme Inc"
                className={getFieldClasses('company')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="San Francisco, CA"
                className={getFieldClasses('location')}
              />
              <HometownSuggestion
                phone={primaryPhone}
                currentLocation={location}
                onAccept={(suggested) => setValue('location', suggested)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                {...register('linkedinUrl')}
                placeholder="https://linkedin.com/in/johndoe"
                className={getFieldClasses('linkedinUrl', !!errors.linkedinUrl)}
              />
              {errors.linkedinUrl && (
                <p className="text-sm text-destructive">{errors.linkedinUrl.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Relationship */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Relationship</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="howWeMet">How We Met</Label>
              <Textarea
                id="howWeMet"
                {...register('howWeMet')}
                placeholder="Met at TechCrunch Disrupt 2024..."
                rows={2}
                className={getFieldClasses('howWeMet')}
              />
            </div>
            <div className="space-y-2">
              <Label>Relationship Strength</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setValue('relationshipStrength', level)}
                    className={cn(
                      'flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                      relationshipStrength >= level
                        ? 'border-gold-primary bg-gold-subtle text-gold-primary'
                        : 'border-border bg-bg-secondary text-text-secondary hover:border-gold-primary/50'
                    )}
                  >
                    {level === 1 && 'Weak'}
                    {level === 2 && 'Casual'}
                    {level === 3 && 'Good'}
                    {level === 4 && 'Strong'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Now - Key Differentiator */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Why Now</h2>
            <p className="text-sm text-text-tertiary">
              This is the most valuable field - what makes this contact relevant right now?
            </p>
          </div>
          <Textarea
            id="whyNow"
            {...register('whyNow')}
            placeholder="Recently raised Series A, looking for GTM advice. Mentioned they need help with pricing strategy..."
            rows={3}
            className={getFieldClasses('whyNow')}
          />
        </section>

        {/* Tags */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => {
              const colors = TAG_CATEGORY_COLORS[tag.category];
              return (
                <span
                  key={index}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                    colors.bg,
                    colors.text
                  )}
                >
                  {tag.text}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              placeholder="Add a tag..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Select
              value={newTagCategory}
              onValueChange={(v) => setNewTagCategory(v as TagCategory)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RELATIONSHIP">Relationship</SelectItem>
                <SelectItem value="OPPORTUNITY">Opportunity</SelectItem>
                <SelectItem value="EXPERTISE">Expertise</SelectItem>
                <SelectItem value="INTEREST">Interest</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Additional Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Additional Information</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expertise">Expertise</Label>
              <Textarea
                id="expertise"
                {...register('expertise')}
                placeholder="SaaS growth, product-led growth, enterprise sales..."
                rows={2}
                className={getFieldClasses('expertise')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Textarea
                id="interests"
                {...register('interests')}
                placeholder="AI/ML, investing, hiking..."
                rows={2}
                className={getFieldClasses('interests')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any other notes about this contact..."
                rows={3}
                className={getFieldClasses('notes')}
              />
            </div>
          </div>
        </section>

        {/* Spacer for sticky button */}
        <div className="h-20" />
      </form>

      {/* Sticky Submit Bar */}
      <div className="sticky bottom-0 left-0 right-0 z-10 -mx-6 mt-4 border-t border-border bg-bg-primary/95 px-6 py-4 backdrop-blur-glass">
        <div className="mx-auto flex max-w-2xl gap-4">
          <Button type="submit" form="contact-form" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={isEditing && contact ? `/contacts/${contact.id}` : '/contacts'}>Cancel</Link>
          </Button>
        </div>
      </div>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current entries?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve already entered some information. Importing this vCard will replace your current entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverwriteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteConfirm}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Multi-Contact Dialog */}
      <AlertDialog open={showMultiContactDialog} onOpenChange={setShowMultiContactDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Multiple contacts detected</AlertDialogTitle>
            <AlertDialogDescription>
              Looks like this is a multi-contact file. Head over to our bulk upload tool for this one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/contacts/import">Go to Import</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
