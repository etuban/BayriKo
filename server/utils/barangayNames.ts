/**
 * List of Philippine barangay names for random organization generation
 */
export const barangayNames = [
  "San Antonio",
  "San Jose",
  "San Isidro",
  "San Miguel",
  "San Roque",
  "San Pedro",
  "San Pablo",
  "San Juan",
  "San Rafael",
  "Santa Maria",
  "Santo Niño",
  "Santa Cruz",
  "Santo Tomas",
  "Santa Rosa",
  "Santa Ana",
  "Santo Domingo",
  "San Nicolas",
  "San Francisco",
  "San Vicente",
  "San Agustin",
  "Poblacion",
  "Mabini",
  "Rizal",
  "Buena Vista",
  "Bagong Silang",
  "Malibay",
  "Pinagkaisahan",
  "Pinagbuhatan",
  "Malanday",
  "Manggahan",
  "Maybunga",
  "Commonwealth",
  "Batasan Hills",
  "Holy Spirit",
  "Payatas",
  "Kamuning",
  "Diliman",
  "Pansol",
  "Masambong",
  "Pasong Tamo",
  "BF Homes",
  "Greenhills",
  "Moonwalk",
  "Sun Valley",
  "Don Bosco",
  "Fortune",
  "Ususan",
  "Western Bicutan",
  "Pembo",
  "Comembo"
];

/**
 * Generate a random barangay-based organization name
 */
export function generateRandomBarangayOrgName(): string {
  const randomBarangay = barangayNames[Math.floor(Math.random() * barangayNames.length)];
  const randomNumber = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  
  return `Barangay ${randomBarangay} ${randomNumber}`;
}