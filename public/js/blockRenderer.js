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

        const container = document.createElement('div');
        container.className = 'custom-select-container';

        // Input field for searching
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'font-search-input';
        input.placeholder = 'Select or type to search...';
        input.value = selectedValue;

        // Clear functionality if needed, for instance if user clears text, empty string
        input.onchange = (e) => {
            // If user manually types something that isn't in list, we might want to allow it or reset
            // For now, let's strictly rely on selection or exact match?
            // Actually, the requirement says "typed content may contain any part of the font name", usually implies filtering.
            // We should probably only allow valid selections on blur if exact match, or just use the click handler.
        };

        const optionsList = document.createElement('div');
        optionsList.className = 'font-options-list';

        const renderOptions = (filterText = '') => {
            optionsList.innerHTML = '';
            const lowerFilter = filterText.toLowerCase();

            // "None" option
            const defaultOption = document.createElement('div');
            defaultOption.className = 'font-option';
            defaultOption.textContent = '-- None --';
            defaultOption.dataset.value = '';
            defaultOption.onclick = () => selectOption('');
            optionsList.appendChild(defaultOption);

            const filteredFonts = fonts.filter(font =>
                font.toLowerCase().includes(lowerFilter)
            );

            if (filteredFonts.length === 0) {
                const noMatch = document.createElement('div');
                noMatch.className = 'font-option no-match';
                noMatch.textContent = 'No fonts found';
                optionsList.appendChild(noMatch);
            }

            filteredFonts.forEach(font => {
                const option = document.createElement('div');
                option.className = 'font-option';
                option.textContent = font;
                option.dataset.value = font;
                if (font === selectedValue) option.classList.add('selected');

                option.onclick = () => selectOption(font);
                optionsList.appendChild(option);
            });
        };

        const selectOption = (value) => {
            input.value = value;
            optionsList.classList.remove('show');
            onChange(value);
        };

        // Event Listeners
        input.onfocus = () => {
            renderOptions(input.value); // Show all or filter by current value? usually show all or filter if user starts typing.
            // Let's filter by current value immediately so they see context, OR show all.
            // Requirement: "typed content may contain any part of the font name"
            // Usually standard behavior: focus -> show all (or filtered by current text), user types -> filter.
            renderOptions('');
            optionsList.classList.add('show');
        };

        input.oninput = (e) => {
            renderOptions(e.target.value);
            optionsList.classList.add('show');
        };

        // Click outside to close - tricky in component only, but we can use blur with delay
        input.onblur = () => {
            setTimeout(() => {
                optionsList.classList.remove('show');
                // Optional: valid value check
                // if (!fonts.includes(input.value) && input.value !== '') {
                //    input.value = selectedValue; // Revert if invalid?
                // } 
                // Let's simple hide for now. If they typed "Ari" and left, value remains "Ari". 
                // But onChange isn't triggered unless they clicked. 
                // If we want to support "Type 'Arial' and hit tab", we need to handle that.
                // Let's try to match exactly or revert?
                // For simplicity, we only commit on click.
                // However, user might expect typing exact name to work.

                const typed = input.value;
                if (typed !== selectedValue) {
                    // Check if exact match exists
                    const exact = fonts.find(f => f === typed);
                    if (exact) {
                        onChange(exact);
                    } else if (typed === '') {
                        onChange('');
                    } else {
                        // Revert to last known good
                        input.value = selectedValue;
                    }
                }
            }, 200);
        };

        container.appendChild(input);
        container.appendChild(optionsList);
        row.appendChild(container);

        return row;
    }

    updateConfig(block, index, value) {
        this.onConfigChange(block, index, value);
    }

    addFallback(block) {
        this.onAddFallback(block);
    }

    updateStats(blockId, stats) {
        const card = document.querySelector(`.block-card[data-block-id="${blockId}"]`);
        const statsContainer = document.getElementById(`stats-${blockId}`);

        if (card && statsContainer) {
            // Calculate status
            let statusClass = 'status-none'; // Default
            if (stats.available === stats.total) {
                statusClass = 'status-full';
            } else if (stats.available > 0) {
                statusClass = 'status-partial';
            }

            // Remove old status classes
            card.classList.remove('status-full', 'status-partial', 'status-none');
            // Add new status class
            card.classList.add(statusClass);

            statsContainer.innerHTML = `
                <span class="stat-item">Available: <strong>${stats.available}</strong></span>
                <span class="stat-item" style="color: var(--danger)">Missing: <strong>${stats.missing}</strong></span>
            `;
        }
    }
}
