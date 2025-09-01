import { extractTags, Category } from './taggingService.js';
import { FileService } from './fileService.js';
import { ProjectService } from './projectService.js';
import { getDatabase } from '../database/connection.js';
import { ProcessingProgress, WebSocketMessage } from '../types/index.js';
// import * as pdfjsLib from 'pdfjs-dist';
import fs from 'fs/promises';
import WebSocket from 'ws';

// TODO: Configure PDF.js for Node.js environment
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./node_modules/pdfjs-dist/build/pdf.worker.js', import.meta.url).href;

export class PdfProcessingService {
  private fileService: FileService;
  private projectService: ProjectService;
  private wsClients: Map<number, WebSocket> = new Map();

  constructor() {
    this.fileService = new FileService();
    this.projectService = new ProjectService();
  }

  // Register WebSocket client for progress updates
  registerWebSocketClient(projectId: number, ws: WebSocket) {
    this.wsClients.set(projectId, ws);
    
    ws.on('close', () => {
      this.wsClients.delete(projectId);
    });
  }

  // Send progress update via WebSocket
  private sendProgress(projectId: number, progress: ProcessingProgress) {
    const ws = this.wsClients.get(projectId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'progress',
        projectId,
        data: progress
      };
      ws.send(JSON.stringify(message));
    }
  }

  // Send completion message via WebSocket
  private sendComplete(projectId: number, data: any) {
    const ws = this.wsClients.get(projectId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'complete',
        projectId,
        data
      };
      ws.send(JSON.stringify(message));
    }
  }

  // Send error message via WebSocket
  private sendError(projectId: number, error: string) {
    const ws = this.wsClients.get(projectId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'error',
        projectId,
        data: { error }
      };
      ws.send(JSON.stringify(message));
    }
  }

  async processPdfFile(
    projectId: number,
    filePath: string,
    patterns: any,
    tolerances: any,
    appSettings?: any
  ): Promise<{
    tags: any[];
    rawTextItems: any[];
    relationships: any[];
    descriptions: any[];
    equipmentShortSpecs: any[];
    loops: any[];
  }> {
    console.log(`📊 Starting PDF processing for project ${projectId}`);
    
    try {
      // Update project status to processing
      await this.projectService.updateProjectStatus(projectId, 'processing');
      
      // TODO: Load PDF document - temporarily disabled for API testing
      // For now, simulate processing with dummy data
      const totalPages = 5; // Simulate 5 pages
      console.log(`📄 Simulating processing of ${totalPages} pages`);

      // Initialize progress
      const progress: ProcessingProgress = { current: 0, total: totalPages, stage: 'initializing' };
      this.sendProgress(projectId, progress);
      
      // Update project with initial progress
      await this.projectService.updateProjectProgress(projectId, progress);

      let allTags: any[] = [];
      let allRawTextItems: any[] = [];

      // Simulate processing each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        console.log(`📄 Simulating processing page ${pageNum}/${totalPages}`);
        
        const pageProgress: ProcessingProgress = {
          current: pageNum,
          total: totalPages,
          stage: 'processing',
          message: `Processing page ${pageNum} of ${totalPages}`
        };
        
        this.sendProgress(projectId, pageProgress);
        await this.projectService.updateProjectProgress(projectId, pageProgress);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Add dummy tags for testing
        allTags.push({
          id: `tag-${pageNum}-1`,
          text: `PT-${1000 + pageNum}`,
          page: pageNum,
          bbox: { x1: 100, y1: 100, x2: 200, y2: 120 },
          category: 'Instrument'
        });

        allRawTextItems.push({
          id: `raw-${pageNum}-1`,
          text: `Raw text item ${pageNum}`,
          page: pageNum,
          bbox: { x1: 300, y1: 100, x2: 400, y2: 120 }
        });
      }

      console.log(`✅ Simulated extraction: ${allTags.length} tags and ${allRawTextItems.length} raw text items`);

      // Initialize other data structures (same as client-side logic)
      const relationships: any[] = [];
      const descriptions: any[] = [];
      const equipmentShortSpecs: any[] = [];
      let loops: any[] = [];

      // Auto-generate loops if enabled
      if (appSettings?.autoGenerateLoops) {
        loops = this.autoGenerateLoops(allTags);
        console.log(`🔄 Auto-generated ${loops.length} loops`);
      }

      const finalProgress: ProcessingProgress = {
        current: totalPages,
        total: totalPages,
        stage: 'completed',
        message: 'Processing completed successfully'
      };
      
      this.sendProgress(projectId, finalProgress);

      // Save results to project
      const projectData = {
        tags_data: allTags,
        raw_text_items_data: allRawTextItems,
        relationships_data: relationships,
        descriptions_data: descriptions,
        equipment_short_specs_data: equipmentShortSpecs,
        loops_data: loops,
        processing_progress: finalProgress
      };

      await this.projectService.updateProjectData(projectId, projectData);
      await this.projectService.updateProjectStatus(projectId, 'completed');

      // Send completion message
      this.sendComplete(projectId, {
        tagsCount: allTags.length,
        rawTextItemsCount: allRawTextItems.length,
        loopsCount: loops.length
      });

      console.log(`✅ PDF processing completed for project ${projectId}`);

      return {
        tags: allTags,
        rawTextItems: allRawTextItems,
        relationships,
        descriptions,
        equipmentShortSpecs,
        loops
      };

    } catch (error) {
      console.error(`❌ PDF processing failed for project ${projectId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update project status
      await this.projectService.updateProjectStatus(projectId, 'error');
      await this.projectService.updateProjectError(projectId, errorMessage);
      
      // Send error message
      this.sendError(projectId, errorMessage);
      
      throw error;
    }
  }

  private autoGenerateLoops(tags: any[]): any[] {
    const instrumentTags = tags.filter(t => t.category === Category.Instrument);
    
    if (instrumentTags.length === 0) {
      return [];
    }

    // Group by 1-letter prefix and number
    const groups = new Map<string, any[]>();
    
    for (const tag of instrumentTags) {
      const parsed = this.parseInstrumentTag(tag.text);
      if (!parsed) continue;
      
      const key = `${parsed.function.charAt(0)}-${parsed.number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tag);
    }
    
    // Create loops from groups with multiple tags
    const loops: any[] = [];
    for (const [groupKey, groupTags] of groups.entries()) {
      if (groupTags.length > 1) {
        const loopId = this.generateLoopId(groupTags) || groupKey;
        
        loops.push({
          id: loopId,
          tagIds: groupTags.map(t => t.id),
          createdAt: new Date().toISOString(),
          isAutoGenerated: true
        });
      }
    }
    
    return loops;
  }

  private parseInstrumentTag(text: string) {
    const cleanText = text.trim();
    
    // Match patterns: "PT-7083 C", "PZV-7012 A", "PIC-101", etc.
    const match = cleanText.match(/^([A-Z]{1,4})-?(\d+)[\s]*([A-Z]*)$/);
    if (match) {
      return {
        function: match[1].trim(),
        number: parseInt(match[2]),
        suffix: match[3].trim()
      };
    }
    
    // Try alternative pattern without dash: "PT7083C"
    const altMatch = cleanText.match(/^([A-Z]{1,4})(\d+)([A-Z]*)$/);
    if (altMatch) {
      return {
        function: altMatch[1].trim(),
        number: parseInt(altMatch[2]),
        suffix: altMatch[3].trim()
      };
    }
    
    return null;
  }

  private generateLoopId(instrumentTags: any[]) {
    if (instrumentTags.length === 0) return null;
    
    const firstTag = instrumentTags[0];
    const parsed = this.parseInstrumentTag(firstTag.text);
    if (!parsed) return firstTag.text.charAt(0) + '-' + '000';
    
    // Find common function prefix among all tags
    let commonPrefix = parsed.function;
    for (const tag of instrumentTags.slice(1)) {
      const tagParsed = this.parseInstrumentTag(tag.text);
      if (tagParsed && tagParsed.number === parsed.number) {
        // Find common prefix between functions
        let i = 0;
        while (i < commonPrefix.length && i < tagParsed.function.length && 
               commonPrefix[i] === tagParsed.function[i]) {
          i++;
        }
        commonPrefix = commonPrefix.substring(0, i);
      }
    }
    
    // Fallback to first letter if no common prefix
    if (commonPrefix.length === 0) {
      commonPrefix = parsed.function.charAt(0);
    }
    
    return `${commonPrefix}-${parsed.number}`;
  }
}