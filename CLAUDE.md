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
- **SidePanel.tsx**: Tag list management with page filtering, description editing, and Excel export functionality
- **PdfViewer.tsx**: Core PDF rendering and tag visualization
- **SelectionPanel.tsx**: Bottom panel for creating tags from selected text

### Key Services

1. **taggingService.ts**: Multi-pass PDF text extraction with sophisticated spatial analysis
   - Pass 1: Instrument tag assembly (function + number components)
   - Pass 2: Pattern-based extraction using regex
   - Pass 3: Drawing number detection via spatial algorithms
   - Final: Raw text collection for annotations

2. **excelExporter.ts**: Structured Excel report generation
   - Creates Equipment, Line, Instrument, and Description worksheets
   - Processes relationships (Connection, Installation, Annotation, Note)
   - Aggregates related data with proper formatting
   - Supports Note & Hold data with page-specific numbering

### State Management

The app uses React state with lifting patterns:
- Global state in App.tsx (tags, relationships, descriptions, rawTextItems, patterns, tolerances, visibilitySettings)
- Viewer state passed down (currentPage, scale, mode, selection)
- UI state management (page filtering, edit modes, selections, advanced visibility controls)
- Local storage for user preferences (patterns, tolerances, visibility settings)

### Data Model

Core entities:
- **Tags**: Extracted entities with category, bbox, page, source items, and optional review status (`isReviewed?: boolean`)
- **Relationships**: Connections between tags (6 types: Connection, Installation, Annotation, Note, Description, EquipmentShortSpec)
- **Descriptions**: Note & Hold entities with metadata (type, scope, number) and page-specific numbering
- **RawTextItems**: Unprocessed text fragments for manual tag creation
- **Categories**: Equipment, Line, Instrument, DrawingNumber, NotesAndHolds
- **VisibilitySettings**: Granular controls for tags, relationships, descriptions, and equipment specs

### Key Features

1. **Tag Recognition**: Regex-based pattern matching with customizable patterns including enhanced Line detection with length and inch symbol requirements
2. **Spatial Analysis**: Tolerance-based component combination and proximity detection with PDF viewBox offset correction
3. **Relationship Management**: Visual connection tools with keyboard shortcuts
4. **Description Management**: Note & Hold auto-linking with page-specific numbering
5. **Review System**: Tag review status tracking with checkbox interface and filtering (All/Reviewed/Not Reviewed)
6. **Advanced Visibility Controls**: Granular show/hide controls for each tag type and relationship category with preserved interaction for hidden elements
7. **Responsive UI**: Single-line header layout with flex-wrap for narrow browser widths
8. **Advanced UI Controls**: Page filtering, read/edit mode toggles, and improved layouts
9. **Project Management**: JSON export/import for work continuity with review status preservation
10. **Excel Export**: Structured reports with relationship mapping and Description sheet

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
- PDF.js worker configured in App.tsx with viewBox offset handling for coordinate accuracy
- Tailwind CSS for styling with custom animations and responsive design patterns
- SVG rendering with ultra-low opacity for hidden tag interaction (rgba(255, 255, 255, 0.003))
- No external server dependencies - fully client-side processing
- Korean documentation in README.md for end users
- Enhanced Line pattern regex: `^(?=.{10,25}$)(?=.*")([^-]*-){3,}[^-]*$` for improved accuracy