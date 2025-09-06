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
- **SidePanel.tsx**: Tag list management with page filtering, description editing, comment system, and Excel export functionality
- **CommentModal.tsx**: Modal interface for creating, editing, and managing comments with priority levels
- **CommentIndicator.tsx**: Visual comment indicator with count and priority display
- **PdfViewer.tsx**: Core PDF rendering and tag visualization
- **SelectionPanel.tsx**: Bottom panel for creating tags from selected text

### Key Services

1. **taggingService.ts**: Multi-pass PDF text extraction with sophisticated spatial analysis
   - Pass 1: Instrument tag assembly (function + number components)
   - Pass 2: Pattern-based extraction using regex
   - Pass 3: Drawing number detection via spatial algorithms
   - Final: Raw text collection for annotations

2. **excelExporter.ts**: Structured Excel report generation
   - Creates Equipment, Line, Instrument, Description, and Comments worksheets
   - Processes relationships (Connection, Installation, Annotation, Note)
   - Aggregates related data with proper formatting
   - Supports Note & Hold data with page-specific numbering
   - Includes comprehensive comment data with priority levels and resolution status

### State Management

The app uses React state with lifting patterns:
- Global state in App.tsx (tags, relationships, descriptions, rawTextItems, comments, patterns, tolerances, visibilitySettings)
- Viewer state passed down (currentPage, scale, mode, selection)
- UI state management (page filtering, edit modes, selections, advanced visibility controls, comment filters)
- Local storage for user preferences (patterns, tolerances, visibility settings, sidebar width)
- Comment system with CRUD operations and priority-based filtering

### Data Model

Core entities:
- **Tags**: Extracted entities with category, bbox, page, source items, and optional review status (`isReviewed?: boolean`)
- **Relationships**: Connections between tags (6 types: Connection, Installation, Annotation, Note, Description, EquipmentShortSpec)
- **Descriptions**: Note & Hold entities with metadata (type, scope, number) and page-specific numbering
- **Comments**: User comments with target references, priority levels (High/Medium/Low), and resolution tracking
- **RawTextItems**: Unprocessed text fragments for manual tag creation
- **Categories**: Equipment, Line, Instrument, DrawingNumber, NotesAndHolds
- **VisibilitySettings**: Granular controls for tags, relationships, descriptions, and equipment specs

### Key Features

1. **Tag Recognition**: Regex-based pattern matching with customizable patterns including enhanced Line detection with length and inch symbol requirements
2. **Spatial Analysis**: Tolerance-based component combination and proximity detection with PDF viewBox offset correction
3. **Relationship Management**: Visual connection tools with keyboard shortcuts
4. **Description Management**: Note & Hold auto-linking with page-specific numbering
5. **Review System**: Tag review status tracking with checkbox interface and filtering (All/Reviewed/Not Reviewed)
6. **Comment System**: Comprehensive commenting with priority levels, resolution tracking, and filtering capabilities
7. **Advanced Visibility Controls**: Granular show/hide controls for each tag type and relationship category with preserved interaction for hidden elements
8. **Smart UI Design**: Compact filter interface combining Review & Comment filters with intuitive icons (✅ ☐ 💬+ 💬-)
9. **Resizable Interface**: Drag-to-resize sidebar with localStorage persistence for user preferences
10. **Enhanced Search**: Search input with clear button (X) for improved user experience
11. **Responsive UI**: Single-line header layout with flex-wrap for narrow browser widths
12. **Advanced UI Controls**: Page filtering, read/edit mode toggles, and improved layouts
13. **Project Management**: JSON export/import for work continuity with review status and comment preservation
14. **Excel Export**: Structured reports with relationship mapping, Description sheet, and comprehensive Comment tracking

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

### Future Architecture (CSR + Backend API)

The application is designed to transition from the current client-only SPA to a comprehensive web service with:
- **Frontend**: React 19 + Vite (CSR maintained for performance)
- **Backend**: Node.js/Express API server  
- **Database**: PostgreSQL with 19 tables for user management, project data, and collaboration
- **Multi-user Collaboration**: Work assignment and result merging (not concurrent editing)

See `docs/00-service-architecture-overview.md` for complete architecture details.

## Development Principles - 기초부터 차근차근

### Problem-Solving Approach
ALWAYS start with the most basic, fundamental solutions before attempting complex implementations:

#### 1. Environment and Context First
- **Screen/Resolution Issues**: Consider `window.innerHeight`, `getBoundingClientRect()`, and actual viewport dimensions FIRST
- **Layout Problems**: Verify basic CSS flexbox, positioning, and container relationships  
- **Dynamic Sizing**: Use browser APIs to measure real available space, not assumed values

#### 2. Basic APIs Before Complex Logic
- Use standard web APIs (`getBoundingClientRect`, `ResizeObserver`, `window` properties) before custom calculations
- Prefer simple, direct measurements over complex mathematical formulas
- Test basic functionality before adding advanced features

#### 3. Step-by-Step Problem Isolation
1. **Identify Root Cause**: What is the actual problem? (e.g., "different monitor resolutions" not "height calculation")
2. **Simplest Solution First**: Try the most straightforward approach
3. **Incremental Improvement**: Add complexity only when basic solution is proven to work
4. **Verify Each Step**: Ensure each component works before moving to the next

#### 4. Common Pitfalls to Avoid
- ❌ Assuming fixed pixel values work across different screen sizes
- ❌ Implementing complex dynamic calculations without understanding basic layout
- ❌ Ignoring browser environment (screen size, resolution, viewport)
- ❌ Adding multiple solutions simultaneously instead of testing one at a time

#### 5. React Component Layout Best Practices
- **Dynamic Height**: Always consider screen dimensions and actual container positions
- **react-window**: Use real measured heights, not hardcoded values
- **Responsive Design**: Account for different monitor resolutions and window sizes
- **ResizeObserver**: Essential for dynamic layouts that adapt to screen changes

**Key Lesson**: Most UI layout problems have simple, fundamental solutions using basic web APIs. Complex custom logic is rarely the answer.

## 리팩토링 참조 문서

리팩토링 작업시 다음 문서들을 참조하세요:

### 핵심 가이드
- `docs/01-architecture-refactoring-plan.md` - 8주 리팩토링 계획 및 AS-IS/TO-BE 비교
- `docs/07-feature-preservation-guide.md` - 기존 기능 보존 가이드 (AS-IS → TO-BE 매핑)
- `docs/08-ui-component-refactoring-guide.md` - UI 컴포넌트 구조 변경 가이드

### 기술 설계
- `docs/02-session-data-management.md` - 세션 데이터 관리 설계
- `docs/03-database-schema-design.md` - RDBMS 스키마 설계
- `docs/05-performance-optimization.md` - 성능 최적화 가이드

### 빠른 참조
- `docs/04-database-schema-summary.md` - 데이터베이스 스키마 요약 (19개 테이블)
- `docs/06-todo-list.md` - 개발 로드맵 & TODO 관리
- `docs/09-user-auth-project-management.md` - 사용자 인증 및 프로젝트 관리 UI

**중요**: 리팩토링 각 단계에서 해당 문서를 참조하여 정확한 구현 방향을 확인하세요.
- 모든 작업 끝날때 마다 TODO MD 파일 업데이트해.
- 작업 끝날때 마다 docs/06-todo-list.mddocs/06-todo-list.md 업데이트 해.
- todo 정리하고, 다음 할것도 그 todo에 따라서 해. 만약 그 todo 보다 더 추천하는게 있으면 나에게 확인 받고 업테이트 하고, 진행해. 앞으로 계속 그렇게해