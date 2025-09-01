# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Server (Backend)
- `cd server && npm run dev` - Start server with hot reload
- `cd server && npm run build` - Build server for production
- `cd server && npm run start` - Start production server
- `cd server && npm run test` - Run server tests
- `cd server && npm run typecheck` - TypeScript validation

### Client (Frontend) 
- `cd client && npm run dev` - Start client development server
- `cd client && npm run build` - Build client for production
- `cd client && npm run preview` - Preview client production build

## Architecture Overview

This is a **server-based P&ID Smart Digitizer** built with a modern client-server architecture for intranet deployment. The application processes PDF files to extract engineering tags and relationships using a centralized server approach.

### 🏗️ Server Architecture

#### Backend Services (Node.js + Express + TypeScript)
- **FileService**: PDF file upload, storage, and metadata management
- **ProjectService**: Project lifecycle management and data persistence  
- **PdfProcessingService**: PDF analysis and tag extraction with WebSocket progress
- **WebSocketService**: Real-time communication for processing updates
- **DatabaseService**: SQLite database operations and schema management

#### API Routes
- **`/api/files/*`**: File upload, download, and management endpoints
- **`/api/projects/*`**: Project CRUD operations and PDF processing
- **`/health`**: Server health check endpoint
- **`/ws`**: WebSocket endpoint for real-time updates

#### Database Schema (SQLite)
- **users**: User authentication and profile data
- **projects**: Project metadata and processing results (JSON storage)
- **file_uploads**: PDF file metadata and storage paths
- **user_settings**: Personal configuration and patterns
- **shared_settings**: Organization-wide default settings
- **audit_logs**: User activity tracking and security logging

### 🎨 Client Architecture

#### Frontend Components (React + Vite + TypeScript)
- **App.tsx**: Main application state management and API integration
- **Workspace.tsx**: Central workspace containing PDF viewer and side panel
- **Header.tsx**: Top navigation with PDF controls and project management
- **SidePanel.tsx**: Tag list management with page filtering, description editing, and Excel export functionality
- **PdfViewer.tsx**: Core PDF rendering and tag visualization
- **SelectionPanel.tsx**: Bottom panel for creating tags from selected text

#### Client Services
- **apiClient.ts**: HTTP client for server communication with error handling
- **websocket.ts**: WebSocket client for real-time progress updates

### 🔄 State Management

#### Client State (React)
- **Local UI State**: Component-level state for user interactions
- **API Integration**: Server data synchronization via HTTP/WebSocket
- **Real-time Updates**: WebSocket for processing progress and notifications
- **Error Handling**: Centralized error management and user feedback

#### Server State (Database + Memory)
- **Persistent Data**: All project data stored in SQLite database
- **Session Management**: User sessions and authentication state
- **Processing Queue**: Background PDF processing with progress tracking
- **File Storage**: Physical file management and metadata

### Data Model

Core entities:
- **Tags**: Extracted entities with category, bbox, page, source items, and optional review status (`isReviewed?: boolean`)
- **Relationships**: Connections between tags (4 types: Connection, Installation, Annotation, Note)
- **Descriptions**: Note & Hold entities with metadata (type, scope, number) and page-specific numbering
- **RawTextItems**: Unprocessed text fragments for manual tag creation
- **Categories**: Equipment, Line, Instrument, DrawingNumber, NotesAndHolds

### Key Features

1. **Tag Recognition**: Regex-based pattern matching with customizable patterns
2. **Spatial Analysis**: Tolerance-based component combination and proximity detection
3. **Relationship Management**: Visual connection tools with keyboard shortcuts
4. **Description Management**: Note & Hold auto-linking with page-specific numbering
5. **Review System**: Tag review status tracking with checkbox interface and filtering (All/Reviewed/Not Reviewed)
6. **Advanced UI Controls**: Page filtering, read/edit mode toggles, and improved layouts
7. **Project Management**: JSON export/import for work continuity with review status preservation
8. **Excel Export**: Structured reports with relationship mapping and Description sheet

### Configuration

- **constants.ts**: Default regex patterns and tolerance settings
- **types.ts**: TypeScript definitions for all data structures
- Settings are persisted to localStorage and can be customized per project

### 📦 Dependencies

#### Server Dependencies
- **Express**: Web framework and API routing
- **SQLite3**: Embedded database for data persistence
- **Multer**: File upload middleware with validation
- **WebSocket**: Real-time communication protocol
- **PDF.js**: Server-side PDF processing (Node.js compatible)
- **TypeScript**: Type safety and development experience
- **XLSX**: Server-side Excel file generation

#### Client Dependencies
- **React 18**: UI framework with hooks and modern patterns
- **Vite**: Build tool and development server
- **TypeScript**: Type safety for frontend code
- **PDF.js**: Client-side PDF rendering and visualization
- **UUID**: Unique identifier generation

### 🛠️ Development Notes

#### Server Development
- **ES Modules**: Full ESM support for modern Node.js
- **Hot Reload**: `tsx watch` for development server
- **Database Migrations**: Auto-applied schema on server start
- **File Storage**: Local file system with configurable upload directory
- **WebSocket Integration**: Real-time progress updates during processing
- **Error Handling**: Comprehensive error logging and user feedback
- **Security**: Input validation, file type restrictions, session management

#### Client Development
- **Modern React**: Hooks-based architecture with functional components
- **TypeScript**: Strict type checking for better development experience
- **API Integration**: HTTP client with automatic error handling and retries
- **WebSocket Client**: Real-time updates from server processing
- **PDF Rendering**: Client-side PDF.js for document visualization
- **Responsive Design**: Tailwind CSS for consistent styling

#### Deployment
- **Intranet Ready**: Designed for internal corporate networks
- **SQLite Database**: No external database server required
- **File System Storage**: Local or network storage for uploaded files
- **Session Management**: In-memory or database-backed sessions
- **Multi-user Support**: User isolation and data security