const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const parseUnicodeBlocks = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                // The CSV headers might be ".S..No.", "Block", "Range" or similar due to the file content we saw.
                // We need to map them correctly.
                // Based on view_file output: .S..No.,Block,Range and values like .U+0020....U+007E.

                // Let's normalize the keys first
                const cleanedData = {};
                Object.keys(data).forEach(key => {
                    if (key.includes('S..No')) cleanedData.id = data[key];
                    else if (key.trim() === 'Block') cleanedData.block = data[key];
                    else if (key.trim() === 'Range') cleanedData.range = data[key];
                });

                if (cleanedData.block && cleanedData.range) {
                    // Clean the range string: .U+0020....U+007E. -> U+0020..U+007E
                    let rangeRaw = cleanedData.range.replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
                    rangeRaw = rangeRaw.replace(/\.{2,}/g, '..'); // Replace multiple dots with double dot

                    // Extract start and end code points
                    const parts = rangeRaw.split('..');
                    if (parts.length === 2) {
                        cleanedData.range = rangeRaw;
                        cleanedData.startCode = parseInt(parts[0].replace('U+', ''), 16);
                        cleanedData.endCode = parseInt(parts[1].replace('U+', ''), 16);
                        results.push(cleanedData);
                    }
                }
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

module.exports = { parseUnicodeBlocks };
