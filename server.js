const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { parseUnicodeBlocks } = require('./lib/csvParser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure storage for uploaded fonts
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'Fonts/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Routes

// Get all Unicode blocks
app.get('/api/unicode-blocks', async (req, res) => {
    try {
        const blocks = await parseUnicodeBlocks(path.join(__dirname, 'Unicode-Blocks', 'Unicode-Blocks.csv'));
        res.json(blocks);
    } catch (error) {
        console.error('Error parsing CSV:', error);
        res.status(500).json({ error: 'Failed to parse Unicode blocks' });
    }
});

// Get available fonts
app.get('/api/fonts', (req, res) => {
    const fontsDir = path.join(__dirname, 'Fonts');
    fs.readdir(fontsDir, (err, files) => {
        if (err) {
            // If directory doesn't exist, return empty
            return res.json([]);
        }
        const fonts = files.filter(file => file.endsWith('.ttf') || file.endsWith('.otf'));
        res.json(fonts);
    });
});

// Upload font
app.post('/api/upload-font', upload.single('font'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'Font uploaded successfully', filename: req.file.originalname });
});

const { analyzeBlockCoverage } = require('./lib/glyphDetector');
const { generateReport } = require('./lib/reportGenerator');

// Analyze coverage for a single block
app.post('/api/analyze-coverage', async (req, res) => {
    const { block, fonts } = req.body;
    // block expected structure: { block: "Name", startCode: 123, endCode: 456 }
    if (!block || !fonts) {
        return res.status(400).json({ error: 'Missing block or fonts data' });
    }

    try {
        const result = await analyzeBlockCoverage(block, fonts);
        res.json(result);
    } catch (error) {
        console.error('Error analyzing coverage:', error);
        res.status(500).json({ error: 'Failed to analyze coverage' });
    }
});

// Generate full report
app.post('/api/generate-report', async (req, res) => {
    const { blocksConfig } = req.body;
    // blocksConfig: Array of { block: "Name", startCode: N, endCode: M, fonts: ["..."] }

    if (!blocksConfig || !Array.isArray(blocksConfig)) {
        return res.status(400).json({ error: 'Invalid blocks configuration' });
    }

    try {
        const coverageResults = [];
        for (const config of blocksConfig) {
            const result = await analyzeBlockCoverage(config, config.fonts);
            coverageResults.push(result);
        }

        const report = generateReport(coverageResults);
        res.json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Import config (Restore state from report)
app.post('/api/import-config', upload.single('report'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const report = JSON.parse(fileContent);

        // delete temp file
        fs.unlinkSync(req.file.path);

        const restoredConfig = {};

        // Iterate blocks in report
        Object.keys(report).forEach(blockName => {
            const blockData = report[blockName];
            const usedFonts = new Set();

            Object.values(blockData).forEach(value => {
                if (value !== 'Missing font' && value !== 'Unassigned code point') {
                    usedFonts.add(value);
                }
            });

            // We return the list of fonts found in the report for this block
            // Order is not guaranteed to match original "primary/fallback" exactly if some were unused,
            // but we can return what we know.
            restoredConfig[blockName] = Array.from(usedFonts);
        });

        res.json(restoredConfig);
    } catch (error) {
        console.error('Error importing report:', error);
        res.status(500).json({ error: 'Failed to parse imported report' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
