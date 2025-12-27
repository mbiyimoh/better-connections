'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
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
import type { Contact, TagCategory } from '@/types/contact';
import Link from 'next/link';

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional().or(z.literal('')),
  primaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  secondaryEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  primaryPhone: z.string().max(50).optional().or(z.literal('')),
  secondaryPhone: z.string().max(50).optional().or(z.literal('')),
  title: z.string().max(255).optional(),
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

const categoryColors: Record<TagCategory, { bg: string; text: string }> = {
  RELATIONSHIP: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  OPPORTUNITY: { bg: 'bg-green-500/20', text: 'text-green-400' },
  EXPERTISE: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  INTEREST: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
};

interface ContactFormProps {
  contact?: Contact;
  isEditing?: boolean;
}

export function ContactForm({ contact, isEditing = false }: ContactFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<TagInput[]>(
    contact?.tags.map((t) => ({ text: t.text, category: t.category })) || []
  );
  const [newTagText, setNewTagText] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>('RELATIONSHIP');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
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

  const addTag = () => {
    if (newTagText.trim()) {
      setTags([...tags, { text: newTagText.trim(), category: newTagCategory }]);
      setNewTagText('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
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

      router.push('/contacts');
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
    <div className="mx-auto max-w-2xl p-6">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                className={errors.firstName ? 'border-destructive' : ''}
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryEmail">Primary Email</Label>
              <Input
                id="primaryEmail"
                type="email"
                {...register('primaryEmail')}
                placeholder="john@example.com"
                className={errors.primaryEmail ? 'border-destructive' : ''}
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
                className={errors.secondaryEmail ? 'border-destructive' : ''}
              />
              {errors.secondaryEmail && (
                <p className="text-sm text-destructive">{errors.secondaryEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryPhone">Primary Phone</Label>
              <Input id="primaryPhone" {...register('primaryPhone')} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryPhone">Secondary Phone</Label>
              <Input id="secondaryPhone" {...register('secondaryPhone')} placeholder="+1 (555) 987-6543" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} placeholder="CEO" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register('company')} placeholder="Acme Inc" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} placeholder="San Francisco, CA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                {...register('linkedinUrl')}
                placeholder="https://linkedin.com/in/johndoe"
                className={errors.linkedinUrl ? 'border-destructive' : ''}
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
            {...register('whyNow')}
            placeholder="Recently raised Series A, looking for GTM advice. Mentioned they need help with pricing strategy..."
            rows={3}
          />
        </section>

        {/* Tags */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => {
              const colors = categoryColors[tag.category];
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Textarea
                id="interests"
                {...register('interests')}
                placeholder="AI/ML, investing, hiking..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any other notes about this contact..."
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/contacts">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
