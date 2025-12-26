const { loadFont, hasGlyph } = require('./fontManager');
const { isAssigned } = require('./unicodeData');

/**
 * Analyze coverage for a specific block and font selection
 * @param {Object} block - The block object with startCode and endCode
 * @param {Array} fontNames - Array of font filenames in priority order
 */
const analyzeBlockCoverage = async (block, fontNames) => {
    const fonts = [];

    // Load all fonts
    for (const fontName of fontNames) {
        try {
            const font = await loadFont(fontName);
            fonts.push({ name: fontName, font });
        } catch (e) {
            console.error(`Failed to load font ${fontName} for analysis`);
        }
    }

    const coverage = [];
    let availableCount = 0;
    let missingCount = 0;

    for (let codePoint = block.startCode; codePoint <= block.endCode; codePoint++) {
        // Step 1: Check if assigned
        if (!isAssigned(codePoint)) {
            coverage.push({
                codePoint,
                status: 'Unassigned code point',
                fontUsed: null
            });
            continue;
        }

        // Step 2: Check fonts in order
        let found = false;
        let usedFont = null;

        for (const { name, font } of fonts) {
            if (hasGlyph(font, codePoint)) {
                found = true;
                usedFont = name;
                break;
            }
        }

        if (found) {
            coverage.push({
                codePoint,
                status: 'Available',
                fontUsed: usedFont
            });
            availableCount++;
        } else {
            coverage.push({
                codePoint,
                status: 'Missing font',
                fontUsed: null
            });
            missingCount++;
        }
    }

    return {
        blockName: block.block,
        coverage,
        stats: {
            total: block.endCode - block.startCode + 1,
            available: availableCount,
            missing: missingCount
        }
    };
};

module.exports = { analyzeBlockCoverage };
