/**
 * Generate a JSON report from coverage data
 * Structure: "Block Name": { "Range": "Font or Status" }
 */
const generateReport = (coverageDataList) => {
    const report = {};

    coverageDataList.forEach(blockData => {
        const blockReport = {};
        const coverage = blockData.coverage;

        if (coverage.length === 0) return;

        let currentStart = coverage[0].codePoint;
        let currentValue = getReportValue(coverage[0]);
        let currentEnd = currentStart;

        for (let i = 1; i < coverage.length; i++) {
            const item = coverage[i];
            const value = getReportValue(item);

            if (value === currentValue && item.codePoint === currentEnd + 1) {
                // Continue range
                currentEnd = item.codePoint;
            } else {
                // End previous range and write to report
                writeRange(blockReport, currentStart, currentEnd, currentValue);

                // Start new range
                currentStart = item.codePoint;
                currentEnd = item.codePoint;
                currentValue = value;
            }
        }
        // Write final range
        writeRange(blockReport, currentStart, currentEnd, currentValue);

        report[blockData.blockName] = blockReport;
    });

    return report;
};

const getReportValue = (item) => {
    if (item.status === 'Unassigned code point') return 'Unassigned code point';
    if (item.status === 'Missing font') return 'Missing font';
    return item.fontUsed;
};

const writeRange = (reportObject, start, end, value) => {
    const rangeKey = formatRange(start, end);
    reportObject[rangeKey] = value;
};

const formatRange = (start, end) => {
    const toHex = (n) => 'U+' + n.toString(16).toUpperCase().padStart(4, '0');
    if (start === end) {
        return toHex(start);
    }
    return `${toHex(start)}..${toHex(end)}`;
};

module.exports = { generateReport };
