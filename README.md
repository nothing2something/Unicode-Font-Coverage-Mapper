# Unicode Font Coverage Mapping System

A full-stack web application designed to analyze Unicode coverage across font files. It maps fonts to Unicode characters within defined blocks, detects glyph support, and generates deterministic JSON reports.

## Features

- **Unicode Block Management**: Automatically parses standard Unicode block definitions.
- **Font Management**: Upload and manage TTF/OTF fonts.
- **Detailed Coverage Analysis**: 
  - Verification of glyph presence per character.
  - Support for primary and multiple fallback fonts per block.
  - Detection of missing fonts and unassigned code points.
- **Interactive UI**: Split-panel design for configuration and real-time JSON preview.
- **Import/Export**: Save reports and restore configuration state.

## Setup Instructions

1. **Prerequisites**: Node.js (v14+) installed.
2. **Installation**:
   ```bash
   npm install
   ```
3. **Start Server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## Usage Workflow

1. **Upload Fonts**:
   - Use the "Upload Fonts" button in the header.
   - Select multiple `.ttf` or `.otf` files.
   - Fonts are saved to the `Fonts/` directory.

2. **Configure Blocks**:
   - The left panel displays all Unicode blocks.
   - For each block, select a "Primary Font".
   - Optionally add "Fallback Fonts". The system checks fonts in order (Primary -> Fallback 1 -> ...).

3. **Analyze & Generate**:
   - Coverage stats (Available/Missing) update automatically when fonts are selected.
   - Click "Generate Full Report" to create the JSON output for all blocks.

4. **Export/Import**:
   - **Export**: Enter a filename and click "Export JSON" to download the report.
   - **Import**: Click "Import JSON" to load a previously generated report. This restores the font selections for the blocks found in the report.

## Technical Details

### Glyph Detection Logic
For each Unicode code point in a block:
1. Checks if the code point is officially assigned (basic check). If not, marks as `"Unassigned code point"`.
2. Checks the **Primary Font** for the glyph.
3. If missing, checks **Fallback Fonts** in sequence.
4. If the glyph is found, records the font name.
5. If no font has the glyph, marks as `"Missing font"`.

### Report Format
The output JSON follows this structure:
```json
{
  "Block Name": {
    "U+XXXX": "FontName.ttf",
    "U+YYYY..U+ZZZZ": "FontName.ttf",
    "U+AAAA": "Missing font"
  }
}
```
Consecutive characters with the same result are grouped into ranges (e.g., `U+0020..U+007E`).

## File Structure
- `server.js`: Express backend entry point.
- `lib/`: Backend logic modules (CSV parser, Font manager, Glyph detector).
- `public/`: Frontend assets (HTML, CSS, JS).
- `Fonts/`: Directory storing uploaded font files.
- `Unicode-Blocks/`: Directory containing the block definition CSV.
