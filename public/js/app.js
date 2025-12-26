import { apiClient } from './apiClient.js';
import { BlockRenderer } from './blockRenderer.js';
import { importExport } from './importExport.js';

class App {
    constructor() {
        this.blocks = [];
        this.fonts = [];
        this.config = {}; // Map blockId -> { fonts: [] }
        this.renderer = null;

        this.init();
    }

    async init() {
        this.setupDOM();
        this.setupResizer();

        try {
            await this.loadData();
            this.renderBlocks();
        } catch (err) {
            console.error('Initialization failed:', err);
            alert('Failed to load initial data. Check console.');
        }
    }

    setupDOM() {
        const blocksList = document.getElementById('blocks-list');
        this.renderer = new BlockRenderer(
            blocksList,
            this.handleConfigChange.bind(this),
            this.handleAddFallback.bind(this)
        );

        // Header controls
        document.getElementById('refresh-fonts').onclick = () => this.refreshFonts();

        document.getElementById('font-upload').onchange = (e) => this.handleFontUpload(e.target.files);

        document.getElementById('export-btn').onclick = () => this.handleExport();

        document.getElementById('import-json').onchange = (e) => this.handleImport(e.target.files[0]);

        document.getElementById('generate-all-btn').onclick = () => this.generateFullReport();
    }

    setupResizer() {
        const resizer = document.getElementById('drag-handle');
        const leftPanel = document.getElementById('blocks-panel');
        const rightPanel = document.getElementById('preview-panel');
        const container = document.querySelector('.split-container');

        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            resizer.classList.add('resizing');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const containerRect = container.getBoundingClientRect();
            // Calculate percentage
            const x = e.clientX - containerRect.left;
            const percent = (x / containerRect.width) * 100;

            if (percent > 20 && percent < 80) {
                leftPanel.style.width = `${percent}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                resizer.classList.remove('resizing');
            }
        });
    }

    async loadData() {
        const [blocks, fonts] = await Promise.all([
            apiClient.getUnicodeBlocks(),
            apiClient.getFonts()
        ]);
        this.blocks = blocks;
        this.fonts = fonts;
        console.log('Loaded blocks:', blocks.length, 'fonts:', fonts.length);
    }

    async refreshFonts() {
        this.fonts = await apiClient.getFonts();
        // Re-render to update dropdowns
        this.renderBlocks();
    }

    renderBlocks() {
        const container = document.getElementById('blocks-list');
        container.innerHTML = ''; // Clear loading

        this.blocks.forEach(block => {
            // Ensure config exists
            if (!this.config[block.block]) {
                this.config[block.block] = { fonts: [] };
            }

            // Pass the current configuration
            const currentConfig = this.config[block.block];
            const card = this.renderer.render(block, this.fonts, currentConfig);

            // If we have stats already computed (e.g. from import), update them?
            // For now, if we have fonts selected, we should trigger analysis
            if (currentConfig.fonts.length > 0) {
                this.analyzeBlock(block);
            }
        });
    }

    async handleConfigChange(block, fontIndex, fontValue) {
        console.log('Config change:', block.block, fontIndex, fontValue);

        const blockConfig = this.config[block.block];
        const newFonts = [...blockConfig.fonts];

        // Ensure array is big enough
        while (newFonts.length <= fontIndex) {
            newFonts.push('');
        }

        newFonts[fontIndex] = fontValue;

        // Filter out empty strings from the end, but keep order?
        // Actually, we want to keep gaps? No, gaps are bad for fallback logic.
        // Prompt says "Check fallback font 1... Continue checking all".
        // If "Primary" is empty, technically fallback 1 becomes primary.
        // But UI distinguishes positions.
        // For simplicity: We store exactly what UI has.
        // But for analysis, we might filter empty strings.

        blockConfig.fonts = newFonts;

        // Update UI logic is handled by re-rendering OR we assume BlockRenderer handles local state changes?
        // BlockRenderer.render creates NEW elements.
        // Ideally we don't re-render the whole list effectively resetting scroll.
        // So BlockRenderer should just be calling this to update GLOBAL state.

        // Trigger analysis
        await this.analyzeBlock(block);
    }

    handleAddFallback(block) {
        const blockConfig = this.config[block.block];
        blockConfig.fonts.push('');
        // Re-render just this block?
        // Simpler to clear and re-render JUST this block card.
        // But implementing targeted re-render needs access to DOM element.
        // For MVP, we can refresh the list position?
        // Let's rely on BlockRenderer to be smart?
        // Actually, BlockRenderer creates new Elements.
        // Let's implement a hack: re-render everything (performance hit?)
        // Better: find the card and replace it.

        const card = document.querySelector(`.block-card[data-block-id="${block.id}"]`);
        if (card) {
            // Re-render
            const newCard = this.renderer.render(block, this.fonts, blockConfig);
            card.replaceWith(newCard);
        }
    }

    async analyzeBlock(block) {
        const blockConfig = this.config[block.block];
        // Filter empty fonts for analysis
        const activeFonts = blockConfig.fonts.filter(f => f);

        if (activeFonts.length === 0) {
            this.renderer.updateStats(block.id, { available: 0, missing: (block.endCode - block.startCode + 1) });
            return;
        }

        try {
            const result = await apiClient.analyzeCoverage(block, activeFonts);
            this.renderer.updateStats(block.id, result.stats);
        } catch (e) {
            console.error(e);
        }
    }

    async handleFontUpload(files) {
        if (!files || files.length === 0) return;

        let uploaded = 0;
        for (let i = 0; i < files.length; i++) {
            try {
                await apiClient.uploadFont(files[i]);
                uploaded++;
            } catch (e) {
                console.error('Upload failed', files[i].name);
            }
        }

        if (uploaded > 0) {
            alert(`Uploaded ${uploaded} fonts.`);
            await this.refreshFonts();
        }
    }

    async generateFullReport() {
        const validBlocks = [];
        // Only include blocks that have at least one font?
        // System prompt: "This logic must be applied to all Unicode blocks defined in the CSV file"
        // Even if empty?
        // "Report values must be... Missing font... Unassigned...".
        // If no font selected, everything is "Missing font" (or Unassigned).
        // So we should send ALL blocks.

        this.blocks.forEach(block => {
            const cfg = this.config[block.block];
            validBlocks.push({
                ...block,
                fonts: cfg ? cfg.fonts.filter(f => f) : []
            });
        });

        try {
            const report = await apiClient.generateReport(validBlocks);
            document.getElementById('json-output').textContent = JSON.stringify(report, null, 2);
        } catch (e) {
            document.getElementById('json-output').textContent = 'Error: ' + e.message;
        }
    }

    async handleExport() {
        const filename = document.getElementById('export-filename').value || 'report.json';
        // Generate most recent data first
        await this.generateFullReport();

        const content = document.getElementById('json-output').textContent;
        try {
            const json = JSON.parse(content);
            importExport.downloadReport(json, filename);
        } catch (e) {
            alert('No valid report to export. Generate it first.');
        }
    }

    async handleImport(file) {
        if (!file) return;
        try {
            const restoredConfig = await importExport.handleImport(file);
            console.log('Restored config:', restoredConfig);

            // restoredConfig is { blockName: [font1, font2] }

            // Merge into our config
            Object.keys(restoredConfig).forEach(blockName => {
                this.config[blockName] = { fonts: restoredConfig[blockName] };
            });

            // Re-render UI
            this.renderBlocks(); // Updates all dropdowns

            // Trigger usage of imported fonts?
            alert('Configuration imported successfully!');
        } catch (e) {
            console.error(e);
            alert('Import failed');
        }
    }
}

// Start app
new App();
