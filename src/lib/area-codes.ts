/**
 * US area code to location mapping.
 * Data sources: NANPA, Wikipedia
 * Note: Area codes cover regions, not specific cities.
 * We use the primary/largest city for each code.
 */

export interface AreaCodeInfo {
  code: string;
  city: string;
  state: string;
  stateAbbr: string;
}

/**
 * Major US area codes mapped to primary city/state.
 * Covers ~150 of the most common area codes.
 */
export const US_AREA_CODES: Record<string, AreaCodeInfo> = {
  // California
  '209': { code: '209', city: 'Stockton', state: 'California', stateAbbr: 'CA' },
  '213': { code: '213', city: 'Los Angeles', state: 'California', stateAbbr: 'CA' },
  '310': { code: '310', city: 'Los Angeles', state: 'California', stateAbbr: 'CA' },
  '323': { code: '323', city: 'Los Angeles', state: 'California', stateAbbr: 'CA' },
  '408': { code: '408', city: 'San Jose', state: 'California', stateAbbr: 'CA' },
  '415': { code: '415', city: 'San Francisco', state: 'California', stateAbbr: 'CA' },
  '510': { code: '510', city: 'Oakland', state: 'California', stateAbbr: 'CA' },
  '619': { code: '619', city: 'San Diego', state: 'California', stateAbbr: 'CA' },
  '650': { code: '650', city: 'San Mateo', state: 'California', stateAbbr: 'CA' },
  '707': { code: '707', city: 'Santa Rosa', state: 'California', stateAbbr: 'CA' },
  '714': { code: '714', city: 'Anaheim', state: 'California', stateAbbr: 'CA' },
  '818': { code: '818', city: 'Burbank', state: 'California', stateAbbr: 'CA' },
  '858': { code: '858', city: 'San Diego', state: 'California', stateAbbr: 'CA' },
  '909': { code: '909', city: 'San Bernardino', state: 'California', stateAbbr: 'CA' },
  '916': { code: '916', city: 'Sacramento', state: 'California', stateAbbr: 'CA' },
  '949': { code: '949', city: 'Irvine', state: 'California', stateAbbr: 'CA' },

  // New York
  '212': { code: '212', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '315': { code: '315', city: 'Syracuse', state: 'New York', stateAbbr: 'NY' },
  '347': { code: '347', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '516': { code: '516', city: 'Hempstead', state: 'New York', stateAbbr: 'NY' },
  '518': { code: '518', city: 'Albany', state: 'New York', stateAbbr: 'NY' },
  '585': { code: '585', city: 'Rochester', state: 'New York', stateAbbr: 'NY' },
  '607': { code: '607', city: 'Binghamton', state: 'New York', stateAbbr: 'NY' },
  '631': { code: '631', city: 'Suffolk County', state: 'New York', stateAbbr: 'NY' },
  '646': { code: '646', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '716': { code: '716', city: 'Buffalo', state: 'New York', stateAbbr: 'NY' },
  '718': { code: '718', city: 'New York', state: 'New York', stateAbbr: 'NY' },
  '845': { code: '845', city: 'Poughkeepsie', state: 'New York', stateAbbr: 'NY' },
  '914': { code: '914', city: 'Yonkers', state: 'New York', stateAbbr: 'NY' },
  '917': { code: '917', city: 'New York', state: 'New York', stateAbbr: 'NY' },

  // Texas
  '210': { code: '210', city: 'San Antonio', state: 'Texas', stateAbbr: 'TX' },
  '214': { code: '214', city: 'Dallas', state: 'Texas', stateAbbr: 'TX' },
  '254': { code: '254', city: 'Waco', state: 'Texas', stateAbbr: 'TX' },
  '281': { code: '281', city: 'Houston', state: 'Texas', stateAbbr: 'TX' },
  '361': { code: '361', city: 'Corpus Christi', state: 'Texas', stateAbbr: 'TX' },
  '409': { code: '409', city: 'Beaumont', state: 'Texas', stateAbbr: 'TX' },
  '469': { code: '469', city: 'Dallas', state: 'Texas', stateAbbr: 'TX' },
  '512': { code: '512', city: 'Austin', state: 'Texas', stateAbbr: 'TX' },
  '713': { code: '713', city: 'Houston', state: 'Texas', stateAbbr: 'TX' },
  '817': { code: '817', city: 'Fort Worth', state: 'Texas', stateAbbr: 'TX' },
  '832': { code: '832', city: 'Houston', state: 'Texas', stateAbbr: 'TX' },
  '903': { code: '903', city: 'Tyler', state: 'Texas', stateAbbr: 'TX' },
  '915': { code: '915', city: 'El Paso', state: 'Texas', stateAbbr: 'TX' },
  '956': { code: '956', city: 'Laredo', state: 'Texas', stateAbbr: 'TX' },
  '972': { code: '972', city: 'Dallas', state: 'Texas', stateAbbr: 'TX' },

  // Florida
  '239': { code: '239', city: 'Fort Myers', state: 'Florida', stateAbbr: 'FL' },
  '305': { code: '305', city: 'Miami', state: 'Florida', stateAbbr: 'FL' },
  '321': { code: '321', city: 'Orlando', state: 'Florida', stateAbbr: 'FL' },
  '352': { code: '352', city: 'Gainesville', state: 'Florida', stateAbbr: 'FL' },
  '386': { code: '386', city: 'Daytona Beach', state: 'Florida', stateAbbr: 'FL' },
  '407': { code: '407', city: 'Orlando', state: 'Florida', stateAbbr: 'FL' },
  '561': { code: '561', city: 'West Palm Beach', state: 'Florida', stateAbbr: 'FL' },
  '727': { code: '727', city: 'St. Petersburg', state: 'Florida', stateAbbr: 'FL' },
  '754': { code: '754', city: 'Fort Lauderdale', state: 'Florida', stateAbbr: 'FL' },
  '772': { code: '772', city: 'Port St. Lucie', state: 'Florida', stateAbbr: 'FL' },
  '786': { code: '786', city: 'Miami', state: 'Florida', stateAbbr: 'FL' },
  '813': { code: '813', city: 'Tampa', state: 'Florida', stateAbbr: 'FL' },
  '850': { code: '850', city: 'Tallahassee', state: 'Florida', stateAbbr: 'FL' },
  '863': { code: '863', city: 'Lakeland', state: 'Florida', stateAbbr: 'FL' },
  '904': { code: '904', city: 'Jacksonville', state: 'Florida', stateAbbr: 'FL' },
  '941': { code: '941', city: 'Sarasota', state: 'Florida', stateAbbr: 'FL' },
  '954': { code: '954', city: 'Fort Lauderdale', state: 'Florida', stateAbbr: 'FL' },

  // Illinois
  '217': { code: '217', city: 'Springfield', state: 'Illinois', stateAbbr: 'IL' },
  '224': { code: '224', city: 'Elgin', state: 'Illinois', stateAbbr: 'IL' },
  '309': { code: '309', city: 'Peoria', state: 'Illinois', stateAbbr: 'IL' },
  '312': { code: '312', city: 'Chicago', state: 'Illinois', stateAbbr: 'IL' },
  '331': { code: '331', city: 'Aurora', state: 'Illinois', stateAbbr: 'IL' },
  '618': { code: '618', city: 'East St. Louis', state: 'Illinois', stateAbbr: 'IL' },
  '630': { code: '630', city: 'Naperville', state: 'Illinois', stateAbbr: 'IL' },
  '708': { code: '708', city: 'Cicero', state: 'Illinois', stateAbbr: 'IL' },
  '773': { code: '773', city: 'Chicago', state: 'Illinois', stateAbbr: 'IL' },
  '815': { code: '815', city: 'Rockford', state: 'Illinois', stateAbbr: 'IL' },
  '847': { code: '847', city: 'Evanston', state: 'Illinois', stateAbbr: 'IL' },
  '872': { code: '872', city: 'Chicago', state: 'Illinois', stateAbbr: 'IL' },

  // Northeast
  '201': { code: '201', city: 'Jersey City', state: 'New Jersey', stateAbbr: 'NJ' },
  '202': { code: '202', city: 'Washington', state: 'District of Columbia', stateAbbr: 'DC' },
  '203': { code: '203', city: 'New Haven', state: 'Connecticut', stateAbbr: 'CT' },
  '215': { code: '215', city: 'Philadelphia', state: 'Pennsylvania', stateAbbr: 'PA' },
  '301': { code: '301', city: 'Silver Spring', state: 'Maryland', stateAbbr: 'MD' },
  '302': { code: '302', city: 'Wilmington', state: 'Delaware', stateAbbr: 'DE' },
  '401': { code: '401', city: 'Providence', state: 'Rhode Island', stateAbbr: 'RI' },
  '410': { code: '410', city: 'Baltimore', state: 'Maryland', stateAbbr: 'MD' },
  '412': { code: '412', city: 'Pittsburgh', state: 'Pennsylvania', stateAbbr: 'PA' },
  '413': { code: '413', city: 'Springfield', state: 'Massachusetts', stateAbbr: 'MA' },
  '508': { code: '508', city: 'Worcester', state: 'Massachusetts', stateAbbr: 'MA' },
  '571': { code: '571', city: 'Arlington', state: 'Virginia', stateAbbr: 'VA' },
  '603': { code: '603', city: 'Manchester', state: 'New Hampshire', stateAbbr: 'NH' },
  '609': { code: '609', city: 'Trenton', state: 'New Jersey', stateAbbr: 'NJ' },
  '610': { code: '610', city: 'Allentown', state: 'Pennsylvania', stateAbbr: 'PA' },
  '617': { code: '617', city: 'Boston', state: 'Massachusetts', stateAbbr: 'MA' },
  '703': { code: '703', city: 'Arlington', state: 'Virginia', stateAbbr: 'VA' },
  '757': { code: '757', city: 'Virginia Beach', state: 'Virginia', stateAbbr: 'VA' },
  '802': { code: '802', city: 'Burlington', state: 'Vermont', stateAbbr: 'VT' },
  '804': { code: '804', city: 'Richmond', state: 'Virginia', stateAbbr: 'VA' },

  // Midwest
  '216': { code: '216', city: 'Cleveland', state: 'Ohio', stateAbbr: 'OH' },
  '248': { code: '248', city: 'Troy', state: 'Michigan', stateAbbr: 'MI' },
  '262': { code: '262', city: 'Kenosha', state: 'Wisconsin', stateAbbr: 'WI' },
  '313': { code: '313', city: 'Detroit', state: 'Michigan', stateAbbr: 'MI' },
  '314': { code: '314', city: 'St. Louis', state: 'Missouri', stateAbbr: 'MO' },
  '316': { code: '316', city: 'Wichita', state: 'Kansas', stateAbbr: 'KS' },
  '317': { code: '317', city: 'Indianapolis', state: 'Indiana', stateAbbr: 'IN' },
  '319': { code: '319', city: 'Cedar Rapids', state: 'Iowa', stateAbbr: 'IA' },
  '402': { code: '402', city: 'Omaha', state: 'Nebraska', stateAbbr: 'NE' },
  '414': { code: '414', city: 'Milwaukee', state: 'Wisconsin', stateAbbr: 'WI' },
  '440': { code: '440', city: 'Parma', state: 'Ohio', stateAbbr: 'OH' },
  '513': { code: '513', city: 'Cincinnati', state: 'Ohio', stateAbbr: 'OH' },
  '515': { code: '515', city: 'Des Moines', state: 'Iowa', stateAbbr: 'IA' },
  '586': { code: '586', city: 'Warren', state: 'Michigan', stateAbbr: 'MI' },
  '612': { code: '612', city: 'Minneapolis', state: 'Minnesota', stateAbbr: 'MN' },
  '614': { code: '614', city: 'Columbus', state: 'Ohio', stateAbbr: 'OH' },
  '616': { code: '616', city: 'Grand Rapids', state: 'Michigan', stateAbbr: 'MI' },
  '651': { code: '651', city: 'St. Paul', state: 'Minnesota', stateAbbr: 'MN' },
  '734': { code: '734', city: 'Ann Arbor', state: 'Michigan', stateAbbr: 'MI' },
  '816': { code: '816', city: 'Kansas City', state: 'Missouri', stateAbbr: 'MO' },

  // West
  '206': { code: '206', city: 'Seattle', state: 'Washington', stateAbbr: 'WA' },
  '253': { code: '253', city: 'Tacoma', state: 'Washington', stateAbbr: 'WA' },
  '303': { code: '303', city: 'Denver', state: 'Colorado', stateAbbr: 'CO' },
  '360': { code: '360', city: 'Vancouver', state: 'Washington', stateAbbr: 'WA' },
  '385': { code: '385', city: 'Salt Lake City', state: 'Utah', stateAbbr: 'UT' },
  '425': { code: '425', city: 'Bellevue', state: 'Washington', stateAbbr: 'WA' },
  '480': { code: '480', city: 'Mesa', state: 'Arizona', stateAbbr: 'AZ' },
  '503': { code: '503', city: 'Portland', state: 'Oregon', stateAbbr: 'OR' },
  '505': { code: '505', city: 'Albuquerque', state: 'New Mexico', stateAbbr: 'NM' },
  '509': { code: '509', city: 'Spokane', state: 'Washington', stateAbbr: 'WA' },
  '520': { code: '520', city: 'Tucson', state: 'Arizona', stateAbbr: 'AZ' },
  '602': { code: '602', city: 'Phoenix', state: 'Arizona', stateAbbr: 'AZ' },
  '623': { code: '623', city: 'Glendale', state: 'Arizona', stateAbbr: 'AZ' },
  '702': { code: '702', city: 'Las Vegas', state: 'Nevada', stateAbbr: 'NV' },
  '720': { code: '720', city: 'Denver', state: 'Colorado', stateAbbr: 'CO' },
  '725': { code: '725', city: 'Las Vegas', state: 'Nevada', stateAbbr: 'NV' },
  '775': { code: '775', city: 'Reno', state: 'Nevada', stateAbbr: 'NV' },
  '801': { code: '801', city: 'Salt Lake City', state: 'Utah', stateAbbr: 'UT' },
  '808': { code: '808', city: 'Honolulu', state: 'Hawaii', stateAbbr: 'HI' },
  '907': { code: '907', city: 'Anchorage', state: 'Alaska', stateAbbr: 'AK' },
  '971': { code: '971', city: 'Portland', state: 'Oregon', stateAbbr: 'OR' },

  // Southeast
  '205': { code: '205', city: 'Birmingham', state: 'Alabama', stateAbbr: 'AL' },
  '225': { code: '225', city: 'Baton Rouge', state: 'Louisiana', stateAbbr: 'LA' },
  '251': { code: '251', city: 'Mobile', state: 'Alabama', stateAbbr: 'AL' },
  '252': { code: '252', city: 'Greenville', state: 'North Carolina', stateAbbr: 'NC' },
  '256': { code: '256', city: 'Huntsville', state: 'Alabama', stateAbbr: 'AL' },
  '270': { code: '270', city: 'Bowling Green', state: 'Kentucky', stateAbbr: 'KY' },
  '334': { code: '334', city: 'Montgomery', state: 'Alabama', stateAbbr: 'AL' },
  '404': { code: '404', city: 'Atlanta', state: 'Georgia', stateAbbr: 'GA' },
  '423': { code: '423', city: 'Chattanooga', state: 'Tennessee', stateAbbr: 'TN' },
  '478': { code: '478', city: 'Macon', state: 'Georgia', stateAbbr: 'GA' },
  '502': { code: '502', city: 'Louisville', state: 'Kentucky', stateAbbr: 'KY' },
  '504': { code: '504', city: 'New Orleans', state: 'Louisiana', stateAbbr: 'LA' },
  '615': { code: '615', city: 'Nashville', state: 'Tennessee', stateAbbr: 'TN' },
  '678': { code: '678', city: 'Atlanta', state: 'Georgia', stateAbbr: 'GA' },
  '704': { code: '704', city: 'Charlotte', state: 'North Carolina', stateAbbr: 'NC' },
  '770': { code: '770', city: 'Roswell', state: 'Georgia', stateAbbr: 'GA' },
  '803': { code: '803', city: 'Columbia', state: 'South Carolina', stateAbbr: 'SC' },
  '843': { code: '843', city: 'Charleston', state: 'South Carolina', stateAbbr: 'SC' },
  '865': { code: '865', city: 'Knoxville', state: 'Tennessee', stateAbbr: 'TN' },
  '901': { code: '901', city: 'Memphis', state: 'Tennessee', stateAbbr: 'TN' },
  '910': { code: '910', city: 'Fayetteville', state: 'North Carolina', stateAbbr: 'NC' },
  '912': { code: '912', city: 'Savannah', state: 'Georgia', stateAbbr: 'GA' },
  '919': { code: '919', city: 'Raleigh', state: 'North Carolina', stateAbbr: 'NC' },
  '980': { code: '980', city: 'Charlotte', state: 'North Carolina', stateAbbr: 'NC' },
};

/**
 * Extract area code from a phone number string.
 * Handles various formats: +1 (415) 555-1234, 415-555-1234, 4155551234
 */
export function extractAreaCode(phone: string): string | null {
  if (!phone) return null;

  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');

  // Need at least 10 digits for US number
  if (digits.length < 10) return null;

  // Handle country code prefix
  if (digits.startsWith('1') && digits.length >= 11) {
    return digits.slice(1, 4);
  }

  // Standard 10-digit format
  if (digits.length >= 10) {
    return digits.slice(0, 3);
  }

  return null;
}

/**
 * Suggest a hometown based on phone number area code.
 * Returns null if area code not found or non-US number.
 */
export function suggestHometownFromPhone(phone: string): string | null {
  const areaCode = extractAreaCode(phone);
  if (!areaCode) return null;

  const info = US_AREA_CODES[areaCode];
  if (!info) return null;

  return `${info.city}, ${info.stateAbbr}`;
}

/**
 * Get full area code info for display.
 */
export function getAreaCodeInfo(phone: string): AreaCodeInfo | null {
  const areaCode = extractAreaCode(phone);
  if (!areaCode) return null;
  return US_AREA_CODES[areaCode] || null;
}
