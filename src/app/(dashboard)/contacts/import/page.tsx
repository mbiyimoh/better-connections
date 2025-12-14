'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ParsedData = {
  headers: string[];
  rows: string[][];
};

type FieldMapping = Record<string, string>;

const contactFields = [
  { value: '', label: 'Skip this column' },
  { value: 'name', label: 'Name *', required: true },
  { value: 'email', label: 'Email' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
  { value: 'location', label: 'Location' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedinUrl', label: 'LinkedIn URL' },
  { value: 'howWeMet', label: 'How We Met' },
  { value: 'whyNow', label: 'Why Now' },
  { value: 'expertise', label: 'Expertise' },
  { value: 'interests', label: 'Interests' },
  { value: 'notes', label: 'Notes' },
];

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; skipped: number; errors: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      parseCSV(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseCSV(file);
    }
  }, []);

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          toast({
            title: 'Empty file',
            description: 'The CSV file appears to be empty or has no data rows.',
            variant: 'destructive',
          });
          return;
        }

        const headers = data[0] ?? [];
        const rows = data.slice(1).filter((row): row is string[] => Array.isArray(row) && row.some(cell => cell?.trim()));

        setParsedData({ headers, rows });

        // Auto-detect field mappings
        const autoMapping: FieldMapping = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().trim();
          const matchingField = contactFields.find(f => {
            const normalizedField = f.value.toLowerCase();
            return normalizedField === normalizedHeader ||
                   normalizedHeader.includes(normalizedField) ||
                   (normalizedField === 'name' && (normalizedHeader.includes('name') || normalizedHeader === 'full name')) ||
                   (normalizedField === 'email' && normalizedHeader.includes('email')) ||
                   (normalizedField === 'phone' && (normalizedHeader.includes('phone') || normalizedHeader.includes('mobile'))) ||
                   (normalizedField === 'company' && (normalizedHeader.includes('company') || normalizedHeader.includes('organization'))) ||
                   (normalizedField === 'title' && (normalizedHeader.includes('title') || normalizedHeader.includes('position') || normalizedHeader.includes('job'))) ||
                   (normalizedField === 'location' && (normalizedHeader.includes('location') || normalizedHeader.includes('city') || normalizedHeader.includes('address'))) ||
                   (normalizedField === 'linkedinUrl' && normalizedHeader.includes('linkedin'));
          });
          if (matchingField && matchingField.value) {
            autoMapping[index.toString()] = matchingField.value;
          }
        });
        setFieldMapping(autoMapping);
        setStep('mapping');
      },
      error: (error) => {
        toast({
          title: 'Parse error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleMappingChange = (columnIndex: string, field: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [columnIndex]: field,
    }));
  };

  const hasNameMapping = Object.values(fieldMapping).includes('name');

  const handleStartImport = async () => {
    if (!parsedData || !hasNameMapping) return;

    setStep('importing');
    setImportProgress(0);

    const results = { success: 0, skipped: 0, errors: 0 };
    const totalRows = parsedData.rows.length;

    for (let i = 0; i < totalRows; i++) {
      const row = parsedData.rows[i];
      if (!row) continue;

      const contact: Record<string, string> = {};

      // Map row data to contact fields
      Object.entries(fieldMapping).forEach(([columnIndex, field]) => {
        const cellValue = row[parseInt(columnIndex)];
        if (field && cellValue) {
          contact[field] = cellValue.trim();
        }
      });

      // Skip if no name
      if (!contact.name) {
        results.skipped++;
        setImportProgress(((i + 1) / totalRows) * 100);
        continue;
      }

      try {
        const res = await fetch('/api/contacts/import/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact, skipDuplicates }),
        });

        if (res.ok) {
          results.success++;
        } else {
          const data = await res.json();
          if (data.skipped) {
            results.skipped++;
          } else {
            results.errors++;
          }
        }
      } catch {
        results.errors++;
      }

      setImportProgress(((i + 1) / totalRows) * 100);
    }

    setImportResults(results);
    setStep('complete');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/contacts" className="inline-flex items-center text-text-secondary hover:text-text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Link>
        <h1 className="text-[28px] font-bold text-white">Import Contacts</h1>
        <p className="text-text-secondary mt-1">Upload a CSV file to import multiple contacts at once.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Upload', 'Map Fields', 'Import'].map((label, index) => {
          const stepIndex = ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step);
          const isActive = index <= Math.min(stepIndex, 2);
          const isCurrent = (index === 0 && step === 'upload') ||
                           (index === 1 && step === 'mapping') ||
                           (index === 2 && ['importing', 'complete'].includes(step));
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                isActive ? 'bg-gold-primary text-bg-primary' : 'bg-bg-tertiary text-text-tertiary'
              )}>
                {index + 1}
              </div>
              <span className={cn(
                'text-sm',
                isCurrent ? 'text-text-primary font-medium' : 'text-text-secondary'
              )}>
                {label}
              </span>
              {index < 2 && <div className="w-8 h-px bg-border mx-2" />}
            </div>
          );
        })}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <Card className="bg-bg-secondary border-border">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Drag and drop a CSV file or click to browse.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
                isDragging ? 'border-gold-primary bg-gold-subtle' : 'border-border hover:border-text-tertiary'
              )}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-text-tertiary" />
              <p className="text-text-primary mb-2">Drop your CSV file here</p>
              <p className="text-sm text-text-tertiary mb-4">or</p>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && parsedData && (
        <div className="space-y-6">
          <Card className="bg-bg-secondary border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Map CSV Columns
              </CardTitle>
              <CardDescription>
                Match your CSV columns to contact fields. Name is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parsedData.headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-48 text-text-secondary truncate">{header}</div>
                    <div className="text-text-tertiary">→</div>
                    <Select
                      value={fieldMapping[index.toString()] || ''}
                      onValueChange={(value) => handleMappingChange(index.toString(), value)}
                    >
                      <SelectTrigger className="w-48 bg-bg-tertiary border-border">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-secondary border-border">
                        {contactFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-text-tertiary truncate flex-1">
                      Sample: {parsedData.rows[0]?.[index] || '(empty)'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-bg-secondary border-border">
            <CardHeader>
              <CardTitle>Preview (First 5 Rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {Object.entries(fieldMapping)
                        .filter(([, field]) => field)
                        .map(([index, field]) => (
                          <th key={index} className="px-3 py-2 text-left text-text-tertiary font-medium">
                            {contactFields.find(f => f.value === field)?.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border">
                        {Object.entries(fieldMapping)
                          .filter(([, field]) => field)
                          .map(([index]) => (
                            <td key={index} className="px-3 py-2 text-text-secondary truncate max-w-[200px]">
                              {row[parseInt(index)] || '-'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="bg-bg-secondary border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                />
                <label htmlFor="skipDuplicates" className="text-sm text-text-secondary">
                  Skip contacts with duplicate emails
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={handleStartImport} disabled={!hasNameMapping}>
              {!hasNameMapping && <AlertCircle className="mr-2 h-4 w-4" />}
              Import {parsedData.rows.length} Contacts
            </Button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-6 text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-gold-primary animate-spin" />
            <h3 className="text-xl font-medium text-text-primary mb-2">Importing Contacts</h3>
            <p className="text-text-secondary mb-6">Please wait while we import your contacts...</p>
            <Progress value={importProgress} className="max-w-md mx-auto" />
            <p className="text-sm text-text-tertiary mt-2">{Math.round(importProgress)}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && importResults && (
        <Card className="bg-bg-secondary border-border">
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-medium text-text-primary mb-2">Import Complete</h3>
            <div className="flex justify-center gap-8 my-6">
              <div>
                <div className="text-2xl font-bold text-success">{importResults.success}</div>
                <div className="text-sm text-text-tertiary">Imported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{importResults.skipped}</div>
                <div className="text-sm text-text-tertiary">Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{importResults.errors}</div>
                <div className="text-sm text-text-tertiary">Errors</div>
              </div>
            </div>
            <Button onClick={() => router.push('/contacts')}>
              View Contacts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
