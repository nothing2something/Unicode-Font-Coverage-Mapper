/**
 * Checks if a code point is a valid assigned Unicode character.
 * Uses native JavaScript Unicode Property Escapes to check for 'Unassigned' (Cn) category.
 */

const isAssigned = (codePoint) => {
    try {
        const char = String.fromCodePoint(codePoint);
        // \p{Cn} matches "Unassigned" characters. 
        // We also want to consider "Noncharacter" code points (which technically fall under Cn often, but specific ranges exist).
        // However, \p{Cn} is the standard "Unassigned".

        // If it matches Cn, it is Unassigned. So isAssigned is false.
        return !/\p{Cn}/u.test(char);
    } catch (e) {
        // Fallback for invalid code points
        return false;
    }
};

module.exports = { isAssigned };
