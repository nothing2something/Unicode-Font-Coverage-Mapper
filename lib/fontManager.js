const opentype = require('opentype.js');
const path = require('path');

const fontCache = {};

/**
 * Load a font by filename from the Fonts directory
 */
const loadFont = async (filename) => {
    if (fontCache[filename]) {
        return fontCache[filename];
    }

    const fontPath = path.join(__dirname, '../Fonts', filename);

    return new Promise((resolve, reject) => {
        opentype.load(fontPath, (err, font) => {
            if (err) {
                console.error(`Could not load font: ${filename}`, err);
                reject(err);
            } else {
                fontCache[filename] = font;
                resolve(font);
            }
        });
    });
};

/**
 * Check if a font has a glyph for a specific code point
 */
const hasGlyph = (font, codePoint) => {
    if (!font) return false;
    // explicit glyph detection
    const glyph = font.charToGlyph(String.fromCodePoint(codePoint));
    // .notdef usually has index 0. If glyph index is 0, it means missing glyph in many fonts,
    // though opentype.js might return a glyph object where .name is '.notdef' or .index is 0.
    return glyph && glyph.index !== 0;
};

module.exports = { loadFont, hasGlyph };
