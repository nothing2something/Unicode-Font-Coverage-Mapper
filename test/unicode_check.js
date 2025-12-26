const codePoints = [
    0x0041, // A (Assigned)
    0x0378, // Reserved (Unassigned)
    0x0379, // Reserved (Unassigned)
    0x037A, // Assigned 
    0xFFFF, // Non-character
    0x10FFFF // Max
];

console.log('Testing Unicode Property Escapes for Unassigned (Cn) detection:');

codePoints.forEach(cp => {
    const char = String.fromCodePoint(cp);
    // matches Cn (Unassigned)
    const isUnassigned = /\p{Cn}/u.test(char);
    console.log(`U+${cp.toString(16).toUpperCase()}: isUnassigned = ${isUnassigned}`);
});
