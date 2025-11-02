import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Format a phone number into E.123 international display format.
 * - Defaults to Singapore if no country can be inferred
 * - Returns the input as-is if parsing fails
 */
export function formatPhoneNumber(rawNumber, defaultCountry = 'SG') {
    if (!rawNumber) return '';
    try {
        const phoneNumber = parsePhoneNumberFromString(String(rawNumber), defaultCountry);
        if (phoneNumber) {
            return phoneNumber.formatInternational(); // e.g., "+65 6123 4567"
        }
    } catch (err) {
        console.error('Failed to parse phone number:', err, 'Raw number:', rawNumber);
        // Return raw input if parsing fails
    }
    return String(rawNumber);
}


