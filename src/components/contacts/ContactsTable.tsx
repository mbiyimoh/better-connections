'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  User,
  Sparkles,
  Mail,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Plus,
  X,
  SlidersHorizontal,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Contact, ContactsResponse, TagCategory } from '@/types/contact';
import { getDisplayName, getInitials as getContactInitials, getAvatarColor } from '@/types/contact';
import Link from 'next/link';

function getRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const categoryColors: Record<TagCategory, { bg: string; text: string; dot: string }> = {
  RELATIONSHIP: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  OPPORTUNITY: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  EXPERTISE: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  INTEREST: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
};

const sources = ['MANUAL', 'CSV', 'GOOGLE', 'LINKEDIN', 'ICLOUD', 'OUTLOOK'] as const;
const relationships = [
  { value: '1', label: 'Weak' },
  { value: '2', label: 'Casual' },
  { value: '3', label: 'Good' },
  { value: '4', label: 'Strong' },
];

function TagBadge({ tag }: { tag: { text: string; category: TagCategory } }) {
  const colors = categoryColors[tag.category];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', colors.bg, colors.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {tag.text}
    </span>
  );
}

type SortField = 'firstName' | 'lastName' | 'primaryEmail' | 'company' | 'lastContactDate' | 'enrichmentScore' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function ContactsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [pageInput, setPageInput] = useState('');

  // URL-based state - don't read localStorage during render to avoid hydration mismatch
  const currentPage = Number(searchParams.get('page') || '1');
  const urlLimit = searchParams.get('limit');
  const limit = Number(urlLimit || '100');
  const searchQuery = searchParams.get('search') || '';
  const sortField = (searchParams.get('sort') || 'lastName') as SortField;
  const sortOrder = (searchParams.get('order') || 'asc') as SortOrder;
  const sourceFilter = searchParams.get('source') || '';
  const relationshipFilter = searchParams.get('relationship') || '';
  const categoryFilter = searchParams.get('category') || '';
  const minScoreFilter = searchParams.get('minScore') || '';
  const maxScoreFilter = searchParams.get('maxScore') || '';

  // Count active filters
  const activeFilters = [sourceFilter, relationshipFilter, categoryFilter, minScoreFilter, maxScoreFilter].filter(Boolean).length;

  // Update URL params helper
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when filters change (except when changing page)
    if (!('page' in updates)) {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Debounced search
  const handleSearch = useDebouncedCallback((term: string) => {
    updateParams({ search: term || null });
  }, 300);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortOrder,
      });
      if (searchQuery) params.set('search', searchQuery);
      if (sourceFilter) params.set('source', sourceFilter);
      if (relationshipFilter) params.set('relationship', relationshipFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (minScoreFilter) params.set('minScore', minScoreFilter);
      if (maxScoreFilter) params.set('maxScore', maxScoreFilter);

      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');

      const data: ContactsResponse = await res.json();
      setContacts(data.contacts);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, searchQuery, sortField, sortOrder, sourceFilter, relationshipFilter, categoryFilter, minScoreFilter, maxScoreFilter, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Load page size preference from localStorage (only if no URL param)
  useEffect(() => {
    const saved = localStorage.getItem('contactsPageSize');
    // Only apply saved preference if there's no limit in URL
    if (saved && !urlLimit) {
      updateParams({ limit: saved });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        updateParams({ page: String(currentPage - 1) });
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        updateParams({ page: String(currentPage + 1) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, updateParams]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      updateParams({ order: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ sort: field, order: 'asc' });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast({
        title: 'Contact deleted',
        description: 'The contact has been removed.',
      });
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} contacts?`)) return;

    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast({
        title: 'Contacts deleted',
        description: `${selectedIds.size} contacts have been removed.`,
      });
      setSelectedIds(new Set());
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contacts',
        variant: 'destructive',
      });
    }
  };

  const clearAllFilters = () => {
    router.push(pathname);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      updateParams({ page: String(page) });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
      setPageInput('');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-30" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-gold-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-gold-primary" />
    );
  };

  const startRecord = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, total);

  return (
    <div className="flex h-full flex-col p-6">
      {/* Page Header - 33 Strategies Style */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
            01 — Your Network
          </p>
          <h1 className="font-display text-[28px] text-white">Contacts</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/contacts/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-5 flex gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search contacts..."
            defaultValue={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-bg-secondary border-border text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-border text-text-secondary relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilters > 0 && (
                <Badge className="ml-2 bg-gold-primary text-bg-primary h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-bg-secondary border-border" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-text-primary">Filters</h4>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-text-secondary h-8 px-2">
                    <X className="h-4 w-4 mr-1" /> Clear all
                  </Button>
                )}
              </div>

              {/* Source Filter */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Source</label>
                <Select
                  value={sourceFilter || 'all'}
                  onValueChange={(value) => updateParams({ source: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="bg-bg-tertiary border-border">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-secondary border-border">
                    <SelectItem value="all">All sources</SelectItem>
                    {sources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Relationship Strength Filter */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Relationship</label>
                <Select
                  value={relationshipFilter || 'all'}
                  onValueChange={(value) => updateParams({ relationship: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="bg-bg-tertiary border-border">
                    <SelectValue placeholder="Any strength" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-secondary border-border">
                    <SelectItem value="all">Any strength</SelectItem>
                    {relationships.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Tag Category</label>
                <Select
                  value={categoryFilter || 'all'}
                  onValueChange={(value) => updateParams({ category: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="bg-bg-tertiary border-border">
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-secondary border-border">
                    <SelectItem value="all">Any category</SelectItem>
                    {(['RELATIONSHIP', 'OPPORTUNITY', 'EXPERTISE', 'INTEREST'] as const).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', categoryColors[cat].dot)} />
                          <span className="capitalize">{cat.toLowerCase()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Score Range Filter */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">
                  Enrichment Score: {scoreRange[0]}% - {scoreRange[1]}%
                </label>
                <Slider
                  value={scoreRange}
                  onValueChange={(value) => setScoreRange(value as [number, number])}
                  onValueCommit={(value) => {
                    const vals = value as [number, number];
                    updateParams({
                      minScore: vals[0] > 0 ? String(vals[0]) : null,
                      maxScore: vals[1] < 100 ? String(vals[1]) : null,
                    });
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="py-4"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Button */}
        <Button variant="outline" className="border-border text-text-secondary" asChild>
          <a href={`/api/contacts/export?${searchParams.toString()}`} download>
            <Download className="h-4 w-4 mr-2" />
            Export
          </a>
        </Button>
      </div>

      {/* Table */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-bg-secondary">
        {isLoading ? (
          <div className="p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="mb-4 flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 px-4">
            <Users className="mb-4 h-16 w-16 text-text-tertiary opacity-30" />
            <p className="mb-2 text-xl font-semibold text-text-primary">
              {searchQuery || activeFilters > 0 ? 'No results found' : 'Welcome to Better Contacts'}
            </p>
            <p className="mb-8 text-base text-text-secondary text-center max-w-md">
              {searchQuery || activeFilters > 0
                ? 'Try adjusting your search or filters'
                : 'Import your existing contacts to get started, or add them one by one.'}
            </p>
            {!searchQuery && activeFilters === 0 && (
              <div className="flex flex-col items-center gap-4 w-full max-w-md">
                {/* Primary Import Button */}
                <Button asChild size="lg" className="bg-gold-primary hover:bg-gold-light text-black px-8">
                  <Link href="/contacts/import">
                    <Upload className="mr-2 h-5 w-5" />
                    Import Contacts
                  </Link>
                </Button>
                <p className="text-sm text-text-tertiary">
                  Supports iCloud (.vcf) and Google Contacts (.csv)
                </p>
                {/* Secondary Manual Add */}
                <Button asChild variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
                  <Link href="/contacts/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Or add a contact manually
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-bg-tertiary hover:bg-bg-tertiary">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-text-tertiary"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center">
                      First Name
                      <SortIcon field="firstName" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-text-tertiary"
                    onClick={() => handleSort('lastName')}
                  >
                    <div className="flex items-center">
                      Last Name
                      <SortIcon field="lastName" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-text-tertiary"
                    onClick={() => handleSort('primaryEmail')}
                  >
                    <div className="flex items-center">
                      Email
                      <SortIcon field="primaryEmail" />
                    </div>
                  </TableHead>
                  <TableHead className="text-text-tertiary">Title / Company</TableHead>
                  <TableHead className="text-text-tertiary">Tags</TableHead>
                  <TableHead
                    className="cursor-pointer text-text-tertiary"
                    onClick={() => handleSort('enrichmentScore')}
                  >
                    <div className="flex items-center">
                      Score
                      <SortIcon field="enrichmentScore" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-text-tertiary"
                    onClick={() => handleSort('lastContactDate')}
                  >
                    <div className="flex items-center">
                      Last Contact
                      <SortIcon field="lastContactDate" />
                    </div>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const isSelected = selectedIds.has(contact.id);
                  return (
                    <TableRow
                      key={contact.id}
                      className={cn(
                        'cursor-pointer border-border',
                        isSelected && 'bg-gold-subtle'
                      )}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectOne(contact.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback
                              style={{ background: getAvatarColor(contact) }}
                              className="text-xs font-medium text-white/90"
                            >
                              {getContactInitials(contact)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-white truncate">
                            {contact.firstName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        <span className="truncate">{contact.lastName || '—'}</span>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        <span className="truncate">{contact.primaryEmail || '—'}</span>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        <div className="truncate">
                          {contact.organizationalTitle || contact.title || contact.company ? (
                            <>
                              {contact.organizationalTitle}
                              {contact.organizationalTitle && contact.title && ', '}
                              {contact.title}
                              {(contact.organizationalTitle || contact.title) && contact.company && ' · '}
                              {contact.company}
                            </>
                          ) : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {contact.tags.slice(0, 2).map((tag) => (
                            <TagBadge key={tag.id} tag={tag} />
                          ))}
                          {contact.tags.length > 2 && (
                            <span className="text-xs text-text-tertiary">
                              +{contact.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            contact.enrichmentScore >= 80
                              ? 'bg-success/20 text-success border-success/30'
                              : contact.enrichmentScore >= 50
                              ? 'bg-gold-subtle text-gold-primary border-gold-primary/30'
                              : 'bg-warning/20 text-warning border-warning/30'
                          )}
                        >
                          {contact.enrichmentScore}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-tertiary">
                        {getRelativeTime(contact.lastContactDate)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}`)}>
                              <User className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/enrich?id=${contact.id}`)}>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Quick Enrich
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Draft Intro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(contact.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="flex items-center gap-4">
                <p className="text-sm text-text-secondary">
                  Showing <span className="font-medium text-text-primary">{startRecord}</span> to{' '}
                  <span className="font-medium text-text-primary">{endRecord}</span> of{' '}
                  <span className="font-medium text-text-primary">{total}</span> contacts
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">Per page:</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(value) => {
                      localStorage.setItem('contactsPageSize', value);
                      updateParams({ limit: value, page: '1' });
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8 bg-bg-tertiary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-secondary border-border">
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-text-secondary">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 mx-2">
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="w-16 h-8 text-center bg-bg-tertiary border-border text-text-primary"
                    placeholder={String(currentPage)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="h-8 border-border"
                    disabled={!pageInput}
                  >
                    Go
                  </Button>
                </form>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-border bg-bg-tertiary px-5 py-3 shadow-lg">
          <span className="font-medium text-white">{selectedIds.size} selected</span>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Delete
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
