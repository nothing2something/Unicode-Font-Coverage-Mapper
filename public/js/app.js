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
        blockConfig.fonts = newFonts;

        // Trigger analysis
        await this.analyzeBlock(block);

        // Update Live Preview
        this.updateLivePreview();
    }

    handleAddFallback(block) {
        const blockConfig = this.config[block.block];
        blockConfig.fonts.push('');

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
            // If fonts are removed, we should update preview too
            this.updateLivePreview();
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

    async updateLivePreview() {
        // Filter only blocks that have configured fonts
        const configuredBlocks = [];
        this.blocks.forEach(block => {
            const cfg = this.config[block.block];
            const activeFonts = cfg ? cfg.fonts.filter(f => f) : [];

            if (activeFonts.length > 0) {
                configuredBlocks.push({
                    ...block,
                    fonts: activeFonts
                });
            }
        });

        if (configuredBlocks.length === 0) {
            document.getElementById('json-output').textContent = JSON.stringify({
                status: "Select fonts to view live preview..."
            }, null, 2);
            return;
        }

        try {
            // We use the same generate-report endpoint, but with a filtered list
            const report = await apiClient.generateReport(configuredBlocks);
            document.getElementById('json-output').textContent = JSON.stringify(report, null, 2);
        } catch (e) {
            console.error('Live preview error:', e);
        }
    }

    async handleExport() {
        const filename = document.getElementById('export-filename').value || 'report.json';
        // Check current content validity
        const content = document.getElementById('json-output').textContent;
        try {
            const json = JSON.parse(content);
            // If it's just the status message, warn user? Or just export it? 
            // Better to force full report generation if they hit export?
            // "JSON Report Preview should be rendered automatically... Generate Full Report button is clicked".
            // If they click Export, they likely want what they see OR the full report.
            // Let's assume Export exports what is in the preview box.

            if (json.status && Object.keys(json).length === 1) {
                // It's likely the placeholder.
                if (!confirm("The report preview seems empty or incomplete. Export anyway?")) return;
            }
            importExport.downloadReport(json, filename);
        } catch (e) {
            alert('No valid report to export.');
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

            // Update Live Preview
            this.updateLivePreview();

            alert('Configuration imported successfully!');
        } catch (e) {
            console.error(e);
            alert('Import failed');
        }
    }
}

// Start app
new App();
