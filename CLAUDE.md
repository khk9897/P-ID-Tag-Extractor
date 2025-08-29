# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally

## Architecture Overview

This is a browser-based P&ID (Piping and Instrumentation Diagram) Smart Digitizer built with React 19 and Vite. The application processes PDF files to extract engineering tags and relationships, with all processing happening client-side for security.

### Core Components Structure

The application follows a component-based architecture:

- **App.tsx**: Main application state management and orchestration
- **Workspace.tsx**: Central workspace containing PDF viewer and side panel
- **Header.tsx**: Top navigation with PDF controls and project management
- **SidePanel.tsx**: Tag list management and Excel export functionality
- **PdfViewer.tsx**: Core PDF rendering and tag visualization
- **SelectionPanel.tsx**: Bottom panel for creating tags from selected text

### Key Services

1. **taggingService.ts**: Multi-pass PDF text extraction with sophisticated spatial analysis
   - Pass 1: Instrument tag assembly (function + number components)
   - Pass 2: Pattern-based extraction using regex
   - Pass 3: Drawing number detection via spatial algorithms
   - Final: Raw text collection for annotations

2. **excelExporter.ts**: Structured Excel report generation
   - Creates Equipment, Line, and Instrument worksheets
   - Processes relationships (Connection, Installation, Annotation, Note)
   - Aggregates related data with proper formatting

### State Management

The app uses React state with lifting patterns:
- Global state in App.tsx (tags, relationships, rawTextItems, patterns, tolerances)
- Viewer state passed down (currentPage, scale, mode, selection)
- Local storage for user preferences (patterns, tolerances)

### Data Model

Core entities:
- **Tags**: Extracted entities with category, bbox, page, and source items
- **Relationships**: Connections between tags (4 types: Connection, Installation, Annotation, Note)
- **RawTextItems**: Unprocessed text fragments for manual tag creation
- **Categories**: Equipment, Line, Instrument, DrawingNumber, NotesAndHolds

### Key Features

1. **Tag Recognition**: Regex-based pattern matching with customizable patterns
2. **Spatial Analysis**: Tolerance-based component combination and proximity detection
3. **Relationship Management**: Visual connection tools with keyboard shortcuts
4. **Project Management**: JSON export/import for work continuity
5. **Excel Export**: Structured reports with relationship mapping

### Configuration

- **constants.ts**: Default regex patterns and tolerance settings
- **types.ts**: TypeScript definitions for all data structures
- Settings are persisted to localStorage and can be customized per project

### Dependencies

- React 19 (via ESM CDN)
- Vite for build tooling
- PDF.js (loaded globally) for PDF processing
- XLSX (loaded globally) for Excel export
- UUID for unique identifiers

### Development Notes

- Uses ES modules with CDN imports for React
- PDF.js worker configured in App.tsx
- Tailwind CSS for styling with custom animations
- No external server dependencies - fully client-side processing
- Korean documentation in README.md for end users