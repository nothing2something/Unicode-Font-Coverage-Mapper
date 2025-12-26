import { apiClient } from './apiClient.js';

export const importExport = {
    downloadReport(reportData, filename) {
        if (!filename.endsWith('.json')) filename += '.json';

        const dataStr = JSON.stringify(reportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const textInput = document.createElement('a');
        textInput.href = url;
        textInput.download = filename;
        document.body.appendChild(textInput);
        textInput.click();
        document.body.removeChild(textInput);
        URL.revokeObjectURL(url);
    },

    async handleImport(file) {
        // We upload to backend to specific logic or parse here?
        // Prompt says "When a JSON file is imported: Restore font selections..."
        // The backend has /api/import-config to help parsing if needed.
        // Let's use the backend endpoint as planned to be safe with large files.
        return await apiClient.importConfig(file);
    }
};
