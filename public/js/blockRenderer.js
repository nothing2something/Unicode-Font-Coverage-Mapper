export class BlockRenderer {
    constructor(container, onConfigChange, onAddFallback) {
        this.container = container;
        this.onConfigChange = onConfigChange; // Callback when font changes
        this.onAddFallback = onAddFallback; // Callback to add fallback logic if needed
    }

    render(block, availableFonts, currentConfig) {
        // currentConfig = { fonts: [primary, fallback1, ...] }
        const selectedFonts = currentConfig.fonts || [];
        const primaryFont = selectedFonts[0] || '';
        const fallbackFonts = selectedFonts.slice(1);

        const card = document.createElement('div');
        card.className = 'block-card';
        card.dataset.blockId = block.id; // Assuming block has 'id' or we use index

        // Header
        const header = document.createElement('div');
        header.className = 'block-header';
        header.innerHTML = `
            <div class="block-title">${block.block}</div>
            <div class="block-meta">${block.range} (${block.startCode} - ${block.endCode}) | Total: ${block.endCode - block.startCode + 1}</div>
        `;
        card.appendChild(header);

        // Font Selectors Container
        const selectorsContainer = document.createElement('div');
        selectorsContainer.className = 'font-selectors';

        // Primary Font
        const primaryRow = this.createFontSelector('Primary Font', availableFonts, primaryFont, (val) => {
            this.updateConfig(block, 0, val);
        });
        selectorsContainer.appendChild(primaryRow);

        // Fallback Fonts
        fallbackFonts.forEach((fontName, index) => {
            const fallbackRow = this.createFontSelector(`Fallback ${index + 1}`, availableFonts, fontName, (val) => {
                this.updateConfig(block, index + 1, val);
            });
            selectorsContainer.appendChild(fallbackRow);
        });

        // Add Fallback Button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn text-btn small';
        addBtn.textContent = '+ Add Fallback Font';
        addBtn.onclick = () => this.addFallback(block);
        selectorsContainer.appendChild(addBtn);

        card.appendChild(selectorsContainer);

        // Stats Area
        const stats = document.createElement('div');
        stats.className = 'coverage-stats';
        stats.id = `stats-${block.id}`;
        // Default text or loading state
        stats.innerHTML = '<span class="stat-item">Select fonts to view coverage</span>';

        // If we have stats data passed in or cached, render it?
        // For now, let app.js trigger update stats

        card.appendChild(stats);

        this.container.appendChild(card);
        return card;
    }

    createFontSelector(label, fonts, selectedValue, onChange) {
        const row = document.createElement('div');
        row.className = 'font-row';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        row.appendChild(labelEl);

        const select = document.createElement('select');
        select.className = 'font-select';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select Font --';
        select.appendChild(defaultOption);

        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font;
            if (font === selectedValue) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = (e) => onChange(e.target.value);
        row.appendChild(select);

        return row;
    }

    updateConfig(block, index, value) {
        this.onConfigChange(block, index, value);
    }

    addFallback(block) {
        this.onAddFallback(block);
    }

    updateStats(blockId, stats) {
        const statsContainer = document.getElementById(`stats-${blockId}`);
        if (statsContainer) {
            statsContainer.innerHTML = `
                <span class="stat-item">Available: <strong>${stats.available}</strong></span>
                <span class="stat-item" style="color: var(--danger)">Missing: <strong>${stats.missing}</strong></span>
            `;
        }
    }
}
