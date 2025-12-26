const API_BASE = 'http://localhost:3000/api';

export const apiClient = {
    async getUnicodeBlocks() {
        const response = await fetch(`${API_BASE}/unicode-blocks`);
        if (!response.ok) throw new Error('Failed to fetch unicode blocks');
        return response.json();
    },

    async getFonts() {
        const response = await fetch(`${API_BASE}/fonts`);
        if (!response.ok) throw new Error('Failed to fetch fonts');
        return response.json();
    },

    async uploadFont(file) {
        const formData = new FormData();
        formData.append('font', file);
        const response = await fetch(`${API_BASE}/upload-font`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to upload font');
        return response.json();
    },

    async analyzeCoverage(block, fonts) {
        const response = await fetch(`${API_BASE}/analyze-coverage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ block, fonts })
        });
        if (!response.ok) throw new Error('Failed to analyze coverage');
        return response.json();
    },

    async generateReport(blocksConfig) {
        const response = await fetch(`${API_BASE}/generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocksConfig })
        });
        if (!response.ok) throw new Error('Failed to generate report');
        return response.json();
    },

    async importConfig(file) {
        const formData = new FormData();
        formData.append('report', file);
        const response = await fetch(`${API_BASE}/import-config`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Failed to import config');
        return response.json();
    }
};
