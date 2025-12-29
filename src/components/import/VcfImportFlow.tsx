'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ImportMergeReview, DuplicateResolution } from './ImportMergeReview';
import type { ParsedContact, SkippedEntry, FieldConflict } from '@/lib/vcf-parser';

type ImportStep = 'upload' | 'analyzing' | 'review' | 'importing' | 'complete';

interface ExistingContact {
  id: string;
  firstName: string;
  lastName: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  title: string | null;
  company: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  enrichmentScore: number;
}

interface DuplicateAnalysis {
  incoming: ParsedContact;
  existing: ExistingContact;
  conflicts: FieldConflict[];
  autoMergeFields: string[];
}

interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ tempId: string; error: string }>;
}

interface VcfImportFlowProps {
  onComplete?: () => void;
}

export function VcfImportFlow({ onComplete }: VcfImportFlowProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [error, setError] = useState<string | null>(null);

  // Analysis data
  const [newContacts, setNewContacts] = useState<ParsedContact[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateAnalysis[]>([]);
  const [skippedEntries, setSkippedEntries] = useState<SkippedEntry[]>([]);

  // Import results
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contacts/import/vcf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to process file');
        setStep('upload');
        return;
      }

      setNewContacts(data.analysis.newContacts);
      setDuplicates(data.analysis.duplicates);
      setSkippedEntries(data.analysis.skipped);

      // If there are duplicates, show review; otherwise go straight to import
      if (data.analysis.duplicates.length > 0) {
        setStep('review');
      } else {
        await commitImport(data.analysis.newContacts, []);
      }
    } catch {
      setError('Failed to upload file. Please try again.');
      setStep('upload');
    }
  }, []);

  const commitImport = async (
    contacts: ParsedContact[],
    resolutions: DuplicateResolution[]
  ) => {
    setStep('importing');

    try {
      const response = await fetch('/api/contacts/import/vcf/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newContacts: contacts,
          duplicateResolutions: resolutions,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Import failed');
        setStep('upload');
        return;
      }

      setSummary(data.summary);
      setStep('complete');
    } catch {
      setError('Import failed. Please try again.');
      setStep('upload');
    }
  };

  const handleMergeConfirm = (resolutions: DuplicateResolution[]) => {
    commitImport(newContacts, resolutions);
  };

  const handleMergeCancel = () => {
    setStep('upload');
    setNewContacts([]);
    setDuplicates([]);
    setSkippedEntries([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/vcard': ['.vcf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: step !== 'upload',
  });

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* Upload Step */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-colors
                ${isDragActive
                  ? 'border-[#C9A227] bg-[#C9A227]/10'
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
              <p className="text-lg font-medium text-white mb-2">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your .vcf file'}
              </p>
              <p className="text-sm text-zinc-400 mb-4">
                or click to browse
              </p>
              <p className="text-xs text-zinc-500">
                Maximum file size: 10MB
              </p>
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-6 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <h4 className="text-sm font-medium text-white mb-2">How to export from iCloud</h4>
              <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Go to iCloud.com and sign in</li>
                <li>Open Contacts</li>
                <li>Select the contacts you want to export (or Cmd+A for all)</li>
                <li>Click the gear icon and choose &quot;Export vCard&quot;</li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#C9A227] animate-spin" />
            <p className="text-lg font-medium text-white">Analyzing contacts...</p>
            <p className="text-sm text-zinc-400 mt-2">This may take a moment for large files</p>
          </motion.div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <ImportMergeReview
            duplicates={duplicates}
            onConfirm={handleMergeConfirm}
            onCancel={handleMergeCancel}
          />
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <motion.div
            key="importing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#C9A227] animate-spin" />
            <p className="text-lg font-medium text-white">Importing contacts...</p>
            <p className="text-sm text-zinc-400 mt-2">
              Importing {newContacts.length + duplicates.length} contacts
            </p>
          </motion.div>
        )}

        {/* Complete Step */}
        {step === 'complete' && summary && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-semibold text-white mb-6">Import Complete</h3>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{summary.created}</p>
                <p className="text-sm text-zinc-400">Created</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{summary.updated}</p>
                <p className="text-sm text-zinc-400">Updated</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-400">{summary.skipped}</p>
                <p className="text-sm text-zinc-400">Skipped</p>
              </div>
            </div>

            {skippedEntries.length > 0 && (
              <p className="text-sm text-zinc-500 mb-6">
                {skippedEntries.length} entries could not be imported (missing name or invalid format)
              </p>
            )}

            {summary.errors.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-red-400 mb-2">
                  {summary.errors.length} error(s) occurred:
                </p>
                <ul className="text-sm text-red-300 list-disc list-inside">
                  {summary.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onComplete}
              className="px-6 py-3 rounded-lg bg-[#C9A227] text-black font-medium hover:bg-[#E5C766] transition-colors"
            >
              View Contacts
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
