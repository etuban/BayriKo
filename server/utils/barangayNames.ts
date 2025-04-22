// List of Barangay names in the Philippines (subset)
const barangayNames = [
  'Poblacion', 'San Jose', 'San Isidro', 'San Antonio', 'Santo Niño', 
  'Santa Cruz', 'Santa Maria', 'San Pedro', 'San Miguel', 'San Roque',
  'Malabon', 'Marikina', 'Mandaluyong', 'Makati', 'Pasay', 'Pasig',
  'Greenhills', 'Bagong Silang', 'Batasan Hills', 'Commonwealth',
  'Payatas', 'Fairview', 'North Fairview', 'South Fairview', 'Novaliches',
  'Tondo', 'Sampaloc', 'Quiapo', 'Intramuros', 'Malate', 'Ermita',
  'Paco', 'Pandacan', 'Santa Ana', 'San Andres', 'Santa Mesa',
  'Cubao', 'Kamias', 'Kamuning', 'Galas', 'Santol', 'Valencia',
  'Barangka', 'Malanday', 'Concepcion', 'Barangka Ilaya', 'Addition Hills',
  'Plainview', 'Barangka Itaas', 'San Joaquin', 'Daang Bakal', 'Hagdang Bato',
  'Hulo', 'Mabini-J. Rizal', 'Malamig', 'Barangay Heights', 'New Zaniga',
  'Vergara', 'Wack-Wack Greenhills', 'Highway Hills', 'Burol', 'Pagasa',
  'Talon', 'BF Homes', 'Moonwalk', 'Don Bosco', 'Sun Valley',
  'Parañaque', 'Las Piñas', 'Muntinlupa', 'Taguig', 'Pateros',
  'Caloocan', 'Malabon', 'Navotas', 'Valenzuela'
];

// List of descriptive prefixes for organization names
const orgPrefixes = [
  'United', 'Progressive', 'New', 'Modern', 'Integrated', 
  'Advanced', 'Metro', 'Global', 'Pacific', 'Philippine',
  'East', 'West', 'North', 'South', 'Central',
  'Golden', 'Silver', 'Platinum', 'Royal', 'Premium',
  'Elite', 'Prime', 'Superior', 'Pioneer', 'Innovative'
];

// List of organization types
const orgTypes = [
  'Cooperative', 'Association', 'Group', 'Organization', 'Development Council',
  'Foundation', 'Industries', 'Enterprises', 'Solutions', 'Services',
  'Corporation', 'Company', 'Partners', 'Consultants', 'Professionals',
  'Network', 'Alliance', 'Ventures', 'Builders', 'Community'
];

/**
 * Generates a random organization name based on Philippine barangay naming patterns
 * Format: [Prefix] [Barangay Name] [Type]
 * Examples: "United Poblacion Cooperative", "Progressive San Jose Enterprises"
 */
export function generateRandomBarangayOrgName(): string {
  const randomPrefix = orgPrefixes[Math.floor(Math.random() * orgPrefixes.length)];
  const randomBarangay = barangayNames[Math.floor(Math.random() * barangayNames.length)];
  const randomType = orgTypes[Math.floor(Math.random() * orgTypes.length)];
  
  return `${randomPrefix} ${randomBarangay} ${randomType}`;
}