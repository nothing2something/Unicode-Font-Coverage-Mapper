const { parseUnicodeBlocks } = require('../lib/csvParser');
const { loadFont, hasGlyph } = require('../lib/fontManager');
const { analyzeBlockCoverage } = require('../lib/glyphDetector');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Starting Verification ---');

    // 1. Test CSV Parsing
    console.log('\n[Test 1] CSV Parser');
    try {
        const blocks = await parseUnicodeBlocks(path.join(__dirname, '../Unicode-Blocks/Unicode-Blocks.csv'));
        if (blocks.length > 300) {
            console.log('PASS: Loaded', blocks.length, 'blocks');
            const firstBlock = blocks[0];
            if (firstBlock.startCode === 0x0020 && firstBlock.endCode === 0x007E) {
                console.log('PASS: First block range correct (Basic Latin)');
            } else {
                console.error('FAIL: First block range mismatch', firstBlock);
            }
        } else {
            console.error('FAIL: Too few blocks loaded');
        }
    } catch (e) {
        console.error('FAIL: CSV Parser error', e);
    }

    // 2. Test Font Loading
    console.log('\n[Test 2] Font Manager');
    const existingFont = 'CharisSIL-Regular.ttf'; // We know this exists
    try {
        const font = await loadFont(existingFont);
        if (font) {
            console.log('PASS: Loaded existing font', existingFont);

            // Check glyph 'A' (U+0041)
            if (hasGlyph(font, 0x0041)) {
                console.log('PASS: Font has glyph for U+0041');
            } else {
                console.error('FAIL: Font missing U+0041');
            }

            // Check a likely missing glyph (e.g. Emoji logic?)
            // CharisSIL is a serif font, might miss strict emoji blocks.
            // Let's check U+1F600 (Emoji)
            if (!hasGlyph(font, 0x1F600)) {
                console.log('PASS: Font correctly reports missing glyph for U+1F600');
            } else {
                console.log('WARN: Font has U+1F600? Unexpected but possible.');
            }

        }
    } catch (e) {
        console.error('FAIL: Font loading error', e);
    }

    // 3. Test Glyph Detector
    console.log('\n[Test 3] Glyph Detector');
    try {
        // Test Basic Latin with CharisSIL
        const basicLatin = { block: "Basic Latin", startCode: 0x0020, endCode: 0x007E };
        const result = await analyzeBlockCoverage(basicLatin, [existingFont]);

        if (result.stats.available > 90) { // Most should be there
            console.log(`PASS: Basic Latin coverage good (${result.stats.available}/${result.stats.total})`);
        } else {
            console.error('FAIL: Basic Latin coverage too low');
        }

        // Test with fallback
        // Let's simulate a case where primary misses and fallback hits.
        // Hard to find without knowing font coverage exactly.
        // But we can check if coverage structure is valid.
        const output = result.coverage[0];
        if (output.codePoint === 0x0020 && output.fontUsed === existingFont) {
            console.log('PASS: Coverage output format correct');
        } else {
            console.error('FAIL: Coverage output format invalid', output);
        }

    } catch (e) {
        console.error('FAIL: Glyph Detector error', e);
    }

    console.log('\n--- Verification Complete ---');
}

runTests();
