/**
 * CSV Analysis Utility for Smart Import
 *
 * Analyzes CSV data to:
 * - Detect which columns have data vs empty
 * - Auto-map populated columns to system fields
 * - Identify unmapped columns for potential notes merging
 */

export type Confidence = 'high' | 'medium' | 'low';

export interface ColumnAnalysis {
  index: number;
  header: string;
  hasData: boolean;           // At least 1 row has non-empty value
  dataCount: number;          // Number of rows with data
  populationPercent: number;  // Percentage of rows with data
  sampleValue: string;        // First non-empty value found
  suggestedField: string | null;  // System field match
  confidence: Confidence;
}

export interface AnalysisResult {
  totalRows: number;
  populatedColumns: ColumnAnalysis[];  // Columns with data
  emptyColumns: string[];              // Column names with no data (hidden)
  mappedColumns: ColumnAnalysis[];     // Has data + auto-mapped to system field
  unmappedColumns: ColumnAnalysis[];   // Has data but no field match
}

// System fields that can be mapped to
export const SYSTEM_FIELDS = [
  { value: '__skip__', label: 'Skip this column' },
  { value: 'firstName', label: 'First Name *', required: true },
  { value: 'lastName', label: 'Last Name' },
  { value: 'primaryEmail', label: 'Primary Email' },
  { value: 'secondaryEmail', label: 'Secondary Email' },
  { value: 'primaryPhone', label: 'Primary Phone' },
  { value: 'secondaryPhone', label: 'Secondary Phone' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
  { value: 'linkedinUrl', label: 'LinkedIn URL' },
  { value: 'websiteUrl', label: 'Website / Portfolio' },
  { value: 'streetAddress', label: 'Street Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State / Region' },
  { value: 'zipCode', label: 'ZIP / Postal Code' },
  { value: 'country', label: 'Country' },
  { value: 'location', label: 'Location (General)' },
  { value: 'referredBy', label: 'Referred By' },
  { value: 'howWeMet', label: 'How We Met' },
  { value: 'whyNow', label: 'Why Now' },
  { value: 'expertise', label: 'Expertise' },
  { value: 'interests', label: 'Interests' },
  { value: 'notes', label: 'Notes' },
] as const;

// Field mapping rules with patterns and priorities
// Priority determines which field wins when multiple match
interface FieldMappingRule {
  field: string;
  patterns: RegExp[];
  priority: number;
}

const FIELD_MAPPING_RULES: FieldMappingRule[] = [
  // Name fields - high priority
  {
    field: 'firstName',
    patterns: [
      /^first[\s_-]?name$/i,
      /^given[\s_-]?name$/i,
      /^first$/i,
    ],
    priority: 1
  },
  {
    field: 'lastName',
    patterns: [
      /^last[\s_-]?name$/i,
      /^family[\s_-]?name$/i,
      /^surname$/i,
      /^last$/i,
    ],
    priority: 1
  },

  // Email fields - Google format: "E-mail 1 - Value"
  {
    field: 'primaryEmail',
    patterns: [
      /^e[\s_-]?mail$/i,
      /^email$/i,
      /^e-mail$/i,
      /^e[\s_-]?mail\s*1\s*[-–]\s*value$/i,  // Google: "E-mail 1 - Value"
      /^e[\s_-]?mail\s*1$/i,
      /^primary[\s_-]?email$/i,
    ],
    priority: 1
  },
  {
    field: 'secondaryEmail',
    patterns: [
      /^e[\s_-]?mail\s*2\s*[-–]\s*value$/i,  // Google: "E-mail 2 - Value"
      /^e[\s_-]?mail\s*2$/i,
      /^e[\s_-]?mail\s*3\s*[-–]\s*value$/i,  // Also capture 3rd email as secondary
      /^secondary[\s_-]?email$/i,
      /^other[\s_-]?email$/i,
    ],
    priority: 2
  },

  // Phone fields - Google format: "Phone 1 - Value"
  {
    field: 'primaryPhone',
    patterns: [
      /^phone$/i,
      /^phone\s*1\s*[-–]\s*value$/i,  // Google: "Phone 1 - Value"
      /^phone\s*1$/i,
      /^mobile$/i,
      /^cell$/i,
      /^primary[\s_-]?phone$/i,
      /^telephone$/i,
    ],
    priority: 1
  },
  {
    field: 'secondaryPhone',
    patterns: [
      /^phone\s*2\s*[-–]\s*value$/i,  // Google: "Phone 2 - Value"
      /^phone\s*2$/i,
      /^phone\s*3\s*[-–]\s*value$/i,  // Also capture 3rd phone as secondary
      /^work[\s_-]?phone$/i,
      /^home[\s_-]?phone$/i,
      /^secondary[\s_-]?phone$/i,
      /^other[\s_-]?phone$/i,
    ],
    priority: 2
  },

  // Organization fields - Google format: "Organization 1 - Name"
  {
    field: 'company',
    patterns: [
      /^company$/i,
      /^organization$/i,
      /^organization\s*1?\s*[-–]\s*name$/i,  // Google: "Organization 1 - Name"
      /^employer$/i,
      /^org$/i,
    ],
    priority: 1
  },
  {
    field: 'title',
    patterns: [
      /^title$/i,
      /^job[\s_-]?title$/i,
      /^position$/i,
      /^organization\s*1?\s*[-–]\s*title$/i,  // Google: "Organization 1 - Title"
      /^role$/i,
    ],
    priority: 1
  },

  // Address fields - Google format: "Address 1 - Street", "Address 1 - City", etc.
  {
    field: 'streetAddress',
    patterns: [
      /^street[\s_-]?address$/i,
      /^address\s*1?\s*[-–]\s*street$/i,  // Google: "Address 1 - Street"
      /^street$/i,
      /^address\s*line\s*1$/i,
    ],
    priority: 1
  },
  {
    field: 'city',
    patterns: [
      /^city$/i,
      /^address\s*1?\s*[-–]\s*city$/i,  // Google: "Address 1 - City"
    ],
    priority: 1
  },
  {
    field: 'state',
    patterns: [
      /^state$/i,
      /^region$/i,
      /^province$/i,
      /^address\s*1?\s*[-–]\s*region$/i,  // Google: "Address 1 - Region"
    ],
    priority: 1
  },
  {
    field: 'zipCode',
    patterns: [
      /^zip[\s_-]?code$/i,
      /^postal[\s_-]?code$/i,
      /^zip$/i,
      /^postcode$/i,
      /^address\s*1?\s*[-–]\s*postal[\s_-]?code$/i,  // Google: "Address 1 - Postal Code"
    ],
    priority: 1
  },
  {
    field: 'country',
    patterns: [
      /^country$/i,
      /^address\s*1?\s*[-–]\s*country$/i,  // Google: "Address 1 - Country"
    ],
    priority: 1
  },
  {
    field: 'location',
    patterns: [
      /^location$/i,
      /^address$/i,
      /^address\s*1?\s*[-–]\s*formatted$/i,  // Google: "Address 1 - Formatted"
    ],
    priority: 2  // Lower priority than specific address fields
  },

  // Website - Google format: "Website 1 - Value"
  // Note: LinkedIn URLs are handled specially in detectFieldMapping()
  {
    field: 'websiteUrl',
    patterns: [
      /^website$/i,
      /^website\s*1\s*[-–]\s*value$/i,  // Google: "Website 1 - Value"
      /^website\s*[2-9]\s*[-–]\s*value$/i,  // Other website slots
      /^portfolio$/i,
      /^blog$/i,
      /^personal[\s_-]?site$/i,
      /^url$/i,
    ],
    priority: 1
  },
  {
    field: 'linkedinUrl',
    patterns: [
      /linkedin/i,
      /^profile[\s_-]?url$/i,
    ],
    priority: 1
  },

  // Relation/Referral - Google format: "Relation 1 - Value"
  {
    field: 'referredBy',
    patterns: [
      /^relation\s*1?\s*[-–]\s*value$/i,  // Google: "Relation 1 - Value"
      /^relation\s*[2-9]\s*[-–]\s*value$/i,  // Other relation slots
      /^referred[\s_-]?by$/i,
      /^referrer$/i,
      /^introduced[\s_-]?by$/i,
      /^connection$/i,
    ],
    priority: 1
  },

  // Notes
  {
    field: 'notes',
    patterns: [
      /^notes?$/i,
      /^comments?$/i,
      /^description$/i,
    ],
    priority: 1
  },
];

// Columns to explicitly skip (labels, types, empty/system columns)
const SKIP_COLUMN_PATTERNS = [
  /[-–]\s*label$/i,    // "E-mail 1 - Label", "Phone 1 - Label", etc.
  /[-–]\s*type$/i,     // "E-mail 1 - Type", "Phone 1 - Type", etc.
  /^photo$/i,
  /^group[\s_-]?membership$/i,
  /yomi/i,             // Japanese phonetic fields
  /phonetic/i,
];

/**
 * Check if a column should be explicitly skipped
 */
function shouldSkipColumn(header: string): boolean {
  const normalizedHeader = header.trim();
  return SKIP_COLUMN_PATTERNS.some(pattern => pattern.test(normalizedHeader));
}

/**
 * Check if a URL is a LinkedIn profile URL
 * Exported so it can be used during row-level processing
 */
export function isLinkedInUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('linkedin.com');
}

/**
 * Detect which system field a CSV header should map to
 * @param header - The CSV column header
 * @param _sampleValue - Unused, kept for backwards compatibility. URL detection now happens at row level in buildContactFromRow()
 */
export function detectFieldMapping(header: string, _sampleValue?: string): { field: string; priority: number } | null {
  const normalizedHeader = header.trim();

  // Check if this column should be skipped
  if (shouldSkipColumn(normalizedHeader)) {
    return { field: '__skip__', priority: 0 };
  }

  for (const rule of FIELD_MAPPING_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalizedHeader)) {
        // NOTE: LinkedIn URL detection is now handled at row level in buildContactFromRow()
        // This allows proper routing when a website column contains mixed URL types
        return { field: rule.field, priority: rule.priority };
      }
    }
  }

  return null;
}

/**
 * Calculate confidence level for a field mapping
 */
export function calculateConfidence(header: string, sampleValue: string | undefined): Confidence {
  const mapping = detectFieldMapping(header, sampleValue);

  if (!mapping || mapping.field === '__skip__') return 'low';

  // High confidence: exact match or priority 1 with data
  if (mapping.priority === 1 && sampleValue) {
    return 'high';
  }

  // Medium confidence: priority 2 or no sample value
  if (mapping.priority === 2 || !sampleValue) {
    return 'medium';
  }

  return 'low';
}

/**
 * Analyze a CSV file to determine column population and mapping
 */
export function analyzeCSV(headers: string[], rows: string[][]): AnalysisResult {
  const analysis: ColumnAnalysis[] = headers.map((header, index) => {
    // Get all values for this column
    const values = rows.map(row => row[index]?.trim() || '');
    const nonEmptyValues = values.filter(v => v.length > 0);
    const sampleValue = nonEmptyValues[0] || '';

    // Pass sample value for smart detection (e.g., LinkedIn URLs in website columns)
    const mapping = detectFieldMapping(header, sampleValue);

    // Treat explicitly skipped columns as having no mapping
    const suggestedField = mapping?.field === '__skip__' ? null : (mapping?.field || null);

    return {
      index,
      header,
      hasData: nonEmptyValues.length > 0,
      dataCount: nonEmptyValues.length,
      populationPercent: rows.length > 0 ? Math.round((nonEmptyValues.length / rows.length) * 100) : 0,
      sampleValue,
      suggestedField,
      confidence: calculateConfidence(header, sampleValue),
    };
  });

  // Separate populated and empty columns
  const populated = analysis.filter(c => c.hasData);
  const empty = analysis.filter(c => !c.hasData).map(c => c.header);

  // Among populated, separate mapped vs unmapped
  const mapped = populated.filter(c => c.suggestedField !== null);
  const unmapped = populated.filter(c => c.suggestedField === null);

  // Handle duplicate field mappings - keep highest confidence / most data
  const fieldAssignments = new Map<string, ColumnAnalysis>();
  const finalMapped: ColumnAnalysis[] = [];
  const demotedToUnmapped: ColumnAnalysis[] = [];

  for (const col of mapped) {
    const field = col.suggestedField!;
    const existing = fieldAssignments.get(field);

    if (!existing) {
      fieldAssignments.set(field, col);
      finalMapped.push(col);
    } else {
      // Compare - keep the one with more data or higher confidence
      const existingScore = getColumnScore(existing);
      const newScore = getColumnScore(col);

      if (newScore > existingScore) {
        // Replace existing with new
        const existingIndex = finalMapped.findIndex(c => c.index === existing.index);
        if (existingIndex !== -1) {
          finalMapped.splice(existingIndex, 1);
          demotedToUnmapped.push(existing);
        }
        fieldAssignments.set(field, col);
        finalMapped.push(col);
      } else {
        // Keep existing, demote new
        demotedToUnmapped.push(col);
      }
    }
  }

  return {
    totalRows: rows.length,
    populatedColumns: populated,
    emptyColumns: empty,
    mappedColumns: finalMapped,
    unmappedColumns: [...unmapped, ...demotedToUnmapped],
  };
}

/**
 * Score a column for comparison (used when multiple columns map to same field)
 */
function getColumnScore(col: ColumnAnalysis): number {
  let score = col.dataCount;

  // Boost for high confidence
  if (col.confidence === 'high') score += 1000;
  else if (col.confidence === 'medium') score += 500;

  return score;
}

/**
 * Format unmapped column data for inclusion in notes field
 */
export function formatUnmappedDataForNotes(
  unmappedData: Array<{ header: string; value: string }>
): string {
  return unmappedData
    .filter(c => c.value.trim())
    .map(c => `[${c.header}: ${c.value}]`)
    .join(' ');
}

/**
 * Build a contact object from a CSV row using the mapping
 *
 * IMPORTANT: This function performs row-level URL detection to properly
 * route LinkedIn URLs to linkedinUrl even if the column was mapped to websiteUrl.
 * This is necessary because website columns can contain mixed URL types.
 */
export function buildContactFromRow(
  row: string[],
  mapping: Record<string, string>, // columnIndex -> fieldName
  unmappedColumns: Array<{ index: number; header: string }>,
  includeUnmapped: boolean
): Record<string, string | null> {
  const contact: Record<string, string | null> = {};

  // Apply mapped fields with row-level URL detection
  for (const [columnIndex, fieldName] of Object.entries(mapping)) {
    if (fieldName && fieldName !== '__skip__') {
      const value = row[parseInt(columnIndex)]?.trim() || null;
      if (value) {
        // Handle notes specially - append rather than replace
        if (fieldName === 'notes' && contact.notes) {
          contact.notes = `${contact.notes}\n${value}`;
        }
        // Row-level URL detection: check if websiteUrl value is actually a LinkedIn URL
        else if (fieldName === 'websiteUrl' && isLinkedInUrl(value)) {
          // Route LinkedIn URLs to linkedinUrl field if not already filled
          if (!contact.linkedinUrl) {
            contact.linkedinUrl = value;
          } else {
            // linkedinUrl already filled, put this one in notes
            const note = `[Additional LinkedIn: ${value}]`;
            contact.notes = contact.notes ? `${contact.notes}\n${note}` : note;
          }
        }
        // Row-level URL detection: verify linkedinUrl mapping actually contains LinkedIn
        else if (fieldName === 'linkedinUrl' && !isLinkedInUrl(value)) {
          // This isn't actually a LinkedIn URL, route to websiteUrl instead
          if (!contact.websiteUrl) {
            contact.websiteUrl = value;
          } else {
            // websiteUrl already filled, put this one in notes
            const note = `[Additional website: ${value}]`;
            contact.notes = contact.notes ? `${contact.notes}\n${note}` : note;
          }
        }
        else {
          contact[fieldName] = value;
        }
      }
    }
  }

  // Add unmapped data to notes if requested
  if (includeUnmapped && unmappedColumns.length > 0) {
    const unmappedData = unmappedColumns
      .map(col => ({
        header: col.header,
        value: row[col.index]?.trim() || '',
      }))
      .filter(item => item.value);

    if (unmappedData.length > 0) {
      const formatted = formatUnmappedDataForNotes(unmappedData);
      if (formatted) {
        contact.notes = contact.notes
          ? `${contact.notes}\n\n${formatted}`
          : formatted;
      }
    }
  }

  return contact;
}

/**
 * Check if we have the minimum required fields to import a contact
 */
export function hasRequiredFields(contact: Record<string, string | null>): boolean {
  // First name is required
  return Boolean(contact.firstName?.trim());
}

/**
 * Get human-readable label for a field
 */
export function getFieldLabel(fieldValue: string): string {
  const field = SYSTEM_FIELDS.find(f => f.value === fieldValue);
  return field?.label || fieldValue;
}
