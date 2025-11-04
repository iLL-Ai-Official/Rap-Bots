/**
 * Legal Compliance Configuration
 * 
 * Jurisdiction restrictions and age requirements for wager battles
 */

/**
 * Restricted jurisdictions for wager battles
 * Users in these states/countries cannot participate in money-involved features
 */
export const RESTRICTED_JURISDICTIONS = [
  // United States - States with strict gambling laws
  'WA', // Washington state
  'ID', // Idaho  
  'NV', // Nevada (specific laws)
  'UT', // Utah
  'HI', // Hawaii
  
  // Add more as legal landscape changes
  // Format: US state codes (2-letter) or country codes (ISO 3166-1 alpha-2)
];

/**
 * Age requirements by jurisdiction
 * Default is 18, but some jurisdictions require 21+
 */
export const AGE_REQUIREMENTS: Record<string, number> = {
  default: 18, // Default age requirement
  
  // United States - States with 21+ requirement
  'AL': 21, // Alabama
  'AK': 21, // Alaska
  'AZ': 21, // Arizona
  'AR': 21, // Arkansas
  'CA': 21, // California (for certain gambling)
  'IA': 21, // Iowa
  'LA': 21, // Louisiana
  'MA': 21, // Massachusetts
  'MI': 21, // Michigan
  'MS': 21, // Mississippi
  'NE': 21, // Nebraska
  'NV': 21, // Nevada
  'NJ': 21, // New Jersey
  'NM': 21, // New Mexico
  'NY': 21, // New York
  'OK': 21, // Oklahoma
  'SD': 21, // South Dakota
  
  // Add more jurisdictions as needed
};

/**
 * Current Terms of Service version
 * Increment when ToS is updated to require re-acceptance
 */
export const CURRENT_TOS_VERSION = "1.0.0";

/**
 * Spending limits (USDC)
 * These are maximum defaults - users can set lower limits
 */
export const DEFAULT_SPENDING_LIMITS = {
  dailyLimitUSDC: "50.00",
  perTransactionLimitUSDC: "25.00",
  minTransactionUSDC: "1.00",
  maxTransactionUSDC: "100.00",
};

/**
 * Get age requirement for a jurisdiction
 */
export function getAgeRequirement(jurisdiction?: string | null): number {
  if (!jurisdiction) {
    return AGE_REQUIREMENTS.default;
  }
  
  return AGE_REQUIREMENTS[jurisdiction.toUpperCase()] || AGE_REQUIREMENTS.default;
}

/**
 * Check if a jurisdiction is restricted for wager battles
 */
export function isJurisdictionRestricted(jurisdiction?: string | null): boolean {
  if (!jurisdiction) {
    return false; // No jurisdiction = not explicitly restricted
  }
  
  return RESTRICTED_JURISDICTIONS.includes(jurisdiction.toUpperCase());
}

/**
 * Validate age against jurisdiction requirement
 */
export function isUserOfLegalAge(birthDate: Date, jurisdiction?: string | null): boolean {
  const requiredAge = getAgeRequirement(jurisdiction);
  const age = calculateAge(birthDate);
  return age >= requiredAge;
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
