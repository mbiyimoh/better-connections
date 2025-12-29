'use client';

import { useState, useCallback, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  EyeOff,
  Cloud,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  analyzeCSV,
  SYSTEM_FIELDS,
  buildContactFromRow,
  hasRequiredFields,
  getFieldLabel,
  type AnalysisResult,
  type ColumnAnalysis,
} from '@/lib/csv-analysis';
import { ImportSourceCard } from '@/components/import/ImportSourceCard';
import { VcfImportFlow } from '@/components/import/VcfImportFlow';

type ImportSource = 'select' | 'icloud' | 'csv';

type ParsedData = {
  headers: string[];
  rows: string[][];
};

type CsvImportStep = 'upload' | 'mapping' | 'importing' | 'complete';

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Source selection
  const [source, setSource] = useState<ImportSource>('select');

  // CSV import state
  const [csvStep, setCsvStep] = useState<CsvImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Mapping state
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [selectedUnmapped, setSelectedUnmapped] = useState<Set<number>>(new Set());
  const [isEditingMappings, setIsEditingMappings] = useState(false);
  const [showEmptyColumns, setShowEmptyColumns] = useState(false);

  // Import options
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; skipped: number; errors: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Compute if we have required fields mapped
  const hasFirstNameMapping = useMemo(() => {
    return Object.values(fieldMapping).includes('firstName');
  }, [fieldMapping]);

  // Reset to source selection
  const resetToSourceSelection = () => {
    setSource('select');
    setCsvStep('upload');
    setParsedData(null);
    setAnalysis(null);
    setFieldMapping({});
    setSelectedUnmapped(new Set());
    setImportProgress(0);
    setImportResults(null);
  };

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      parseCSV(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseCSV(file);
    }
  }, []);

  // Parse CSV and analyze
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
        const rows = data.slice(1).filter((row): row is string[] =>
          Array.isArray(row) && row.some(cell => cell?.trim())
        );

        setParsedData({ headers, rows });

        // Analyze CSV to get column statistics and auto-mappings
        const analysisResult = analyzeCSV(headers, rows);
        setAnalysis(analysisResult);

        // Build initial field mapping from auto-detected mappings
        const autoMapping: Record<string, string> = {};
        analysisResult.mappedColumns.forEach(col => {
          if (col.suggestedField) {
            autoMapping[col.index.toString()] = col.suggestedField;
          }
        });
        setFieldMapping(autoMapping);

        // Pre-select unmapped columns that have data (user can uncheck)
        const initialSelected = new Set<number>();
        analysisResult.unmappedColumns.forEach(col => {
          // Auto-select columns that look useful (not photo, labels, etc.)
          const lowerHeader = col.header.toLowerCase();
          const isLikelyUseful = !lowerHeader.includes('photo') &&
                                  !lowerHeader.includes('group') &&
                                  !lowerHeader.includes('label') &&
                                  !lowerHeader.includes('type') &&
                                  !lowerHeader.includes('yomi') &&
                                  !lowerHeader.includes('phonetic');
          if (isLikelyUseful) {
            initialSelected.add(col.index);
          }
        });
        setSelectedUnmapped(initialSelected);

        setCsvStep('mapping');
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

  // Handle mapping change
  const handleMappingChange = (columnIndex: string, field: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [columnIndex]: field,
    }));
  };

  // Toggle unmapped column selection
  const toggleUnmappedColumn = (index: number) => {
    setSelectedUnmapped(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Select/deselect all unmapped
  const toggleAllUnmapped = () => {
    if (!analysis) return;
    if (selectedUnmapped.size === analysis.unmappedColumns.length) {
      setSelectedUnmapped(new Set());
    } else {
      setSelectedUnmapped(new Set(analysis.unmappedColumns.map(c => c.index)));
    }
  };

  // Start import
  const handleStartImport = async () => {
    if (!parsedData || !analysis || !hasFirstNameMapping) return;

    setCsvStep('importing');
    setImportProgress(0);

    const results = { success: 0, skipped: 0, errors: 0 };
    const totalRows = parsedData.rows.length;

    // Get unmapped columns that are selected for notes merge
    const unmappedForNotes = analysis.unmappedColumns
      .filter(col => selectedUnmapped.has(col.index))
      .map(col => ({ index: col.index, header: col.header }));

    for (let i = 0; i < totalRows; i++) {
      const row = parsedData.rows[i];
      if (!row) continue;

      // Build contact from row
      const contact = buildContactFromRow(
        row,
        fieldMapping,
        unmappedForNotes,
        true // include unmapped in notes
      );

      // Skip if missing required fields
      if (!hasRequiredFields(contact)) {
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
    setCsvStep('complete');
  };

  // Render column mapping row
  const renderMappingRow = (col: ColumnAnalysis, editable: boolean = false) => (
    <div
      key={col.index}
      className="flex items-center gap-4 py-2 border-b border-border last:border-b-0"
    >
      <div className="w-48 text-text-secondary truncate" title={col.header}>
        {col.header}
      </div>
      <div className="text-text-tertiary">→</div>
      {editable ? (
        <Select
          value={fieldMapping[col.index.toString()] || '__skip__'}
          onValueChange={(value) => handleMappingChange(col.index.toString(), value)}
        >
          <SelectTrigger className="w-48 bg-bg-tertiary border-border">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent className="bg-bg-secondary border-border">
            {SYSTEM_FIELDS.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-48 text-text-primary">
          {getFieldLabel(fieldMapping[col.index.toString()] || col.suggestedField || '')}
        </div>
      )}
      <div className="flex-1 text-sm text-text-tertiary truncate" title={col.sampleValue}>
        Sample: {col.sampleValue || '(empty)'}
      </div>
      <Badge variant="secondary" className="text-xs">
        {col.populationPercent}%
      </Badge>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-6">
          {source === 'select' ? (
            <Link href="/contacts" className="inline-flex items-center text-text-secondary hover:text-text-primary mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Link>
          ) : (
            <button
              onClick={resetToSourceSelection}
              className="inline-flex items-center text-text-secondary hover:text-text-primary mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import Options
            </button>
          )}
          <h1 className="text-[28px] font-bold text-white">Import Contacts</h1>
          <p className="text-text-secondary mt-1">
            {source === 'select'
              ? 'Choose where you want to import contacts from.'
              : source === 'icloud'
              ? 'Import contacts from your iCloud address book.'
              : 'Upload a CSV file to import contacts.'}
          </p>
        </div>

        {/* Source Selection */}
        {source === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImportSourceCard
              icon={Cloud}
              title="Import from iCloud"
              description="Export your iCloud contacts as a vCard file and upload here."
              fileTypeHint="Accepts .vcf files"
              onClick={() => setSource('icloud')}
            />
            <ImportSourceCard
              icon={FileSpreadsheet}
              title="Import from Google Contacts"
              description="Export your Google contacts as a CSV file and upload here."
              fileTypeHint="Accepts .csv files"
              onClick={() => setSource('csv')}
            />
          </div>
        )}

        {/* iCloud VCF Import */}
        {source === 'icloud' && (
          <VcfImportFlow onComplete={() => router.push('/contacts')} />
        )}

        {/* CSV Import Flow */}
        {source === 'csv' && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
              {['Upload', 'Review Mapping', 'Import'].map((label, index) => {
                const stepIndex = ['upload', 'mapping', 'importing', 'complete'].indexOf(csvStep);
                const isActive = index <= Math.min(stepIndex, 2);
                const isCurrent = (index === 0 && csvStep === 'upload') ||
                                 (index === 1 && csvStep === 'mapping') ||
                                 (index === 2 && ['importing', 'complete'].includes(csvStep));
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
            {csvStep === 'upload' && (
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

            {/* Mapping Step - Smart Review */}
            {csvStep === 'mapping' && parsedData && analysis && (
              <div className="space-y-6">
                {/* Summary Banner */}
                <Card className="bg-bg-secondary border-border">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-6 text-center">
                      <div>
                        <div className="text-2xl font-bold text-gold-primary">{analysis.totalRows}</div>
                        <div className="text-sm text-text-tertiary">Contacts Found</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-primary">{parsedData.headers.length}</div>
                        <div className="text-sm text-text-tertiary">Total Columns</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success">{analysis.populatedColumns.length}</div>
                        <div className="text-sm text-text-tertiary">With Data</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-tertiary">{analysis.emptyColumns.length}</div>
                        <div className="text-sm text-text-tertiary">Empty (Hidden)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Confirmed Mappings Card */}
                <Card className="bg-bg-secondary border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-success" />
                        Confirmed Mappings
                      </CardTitle>
                      <CardDescription>
                        {analysis.mappedColumns.length} columns auto-mapped to system fields
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingMappings(!isEditingMappings)}
                    >
                      {isEditingMappings ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Done
                        </>
                      ) : (
                        <>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {analysis.mappedColumns.map(col => renderMappingRow(col, isEditingMappings))}
                    </div>

                    {/* Show unmapped columns when editing */}
                    {isEditingMappings && analysis.unmappedColumns.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm text-text-tertiary mb-2">
                          Unmapped columns with data (assign a field or leave for notes):
                        </div>
                        <div className="space-y-1">
                          {analysis.unmappedColumns.map(col => renderMappingRow(col, true))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Extra Data Card (Unmapped Columns) */}
                {analysis.unmappedColumns.length > 0 && (
                  <Card className="bg-bg-secondary border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-warning" />
                          Extra Data (Not Mapped)
                        </CardTitle>
                        <CardDescription>
                          Select columns to include in the Notes field
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllUnmapped}
                      >
                        {selectedUnmapped.size === analysis.unmappedColumns.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.unmappedColumns.map(col => (
                          <div
                            key={col.index}
                            className="flex items-center gap-4 py-2 border-b border-border last:border-b-0"
                          >
                            <Checkbox
                              id={`unmapped-${col.index}`}
                              checked={selectedUnmapped.has(col.index)}
                              onCheckedChange={() => toggleUnmappedColumn(col.index)}
                            />
                            <label
                              htmlFor={`unmapped-${col.index}`}
                              className="flex-1 flex items-center gap-4 cursor-pointer"
                            >
                              <div className="w-40 text-text-secondary truncate" title={col.header}>
                                {col.header}
                              </div>
                              <div className="flex-1 text-sm text-text-tertiary truncate" title={col.sampleValue}>
                                Sample: {col.sampleValue || '(empty)'}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {col.populationPercent}%
                              </Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-bg-tertiary rounded-lg text-sm text-text-secondary">
                        Selected items will be added to Notes as: [FieldName: value] [FieldName2: value2]
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty Columns (Collapsible) */}
                {analysis.emptyColumns.length > 0 && (
                  <Card className="bg-bg-secondary border-border">
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => setShowEmptyColumns(!showEmptyColumns)}
                    >
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-text-tertiary">
                          {showEmptyColumns ? (
                            <Eye className="h-5 w-5" />
                          ) : (
                            <EyeOff className="h-5 w-5" />
                          )}
                          {analysis.emptyColumns.length} Empty Columns (Hidden)
                        </span>
                        {showEmptyColumns ? (
                          <ChevronUp className="h-4 w-4 text-text-tertiary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-text-tertiary" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    {showEmptyColumns && (
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {analysis.emptyColumns.map((header, i) => (
                            <Badge key={i} variant="outline" className="text-text-tertiary">
                              {header}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Import Options */}
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
                  <Button variant="outline" onClick={() => {
                    setCsvStep('upload');
                    setParsedData(null);
                    setAnalysis(null);
                    setFieldMapping({});
                    setSelectedUnmapped(new Set());
                  }}>
                    Back
                  </Button>
                  <Button onClick={handleStartImport} disabled={!hasFirstNameMapping}>
                    {!hasFirstNameMapping && <AlertCircle className="mr-2 h-4 w-4" />}
                    Import {analysis.totalRows} Contacts
                  </Button>
                </div>

                {/* Validation Warning */}
                {!hasFirstNameMapping && (
                  <div className="text-center text-sm text-warning">
                    Please map a column to &quot;First Name&quot; to continue
                  </div>
                )}
              </div>
            )}

            {/* Importing Step */}
            {csvStep === 'importing' && (
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
            {csvStep === 'complete' && importResults && (
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
          </>
        )}
      </div>
    </div>
  );
}
