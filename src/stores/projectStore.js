// ProjectStore - 프로젝트 Export/Import 및 Excel 내보내기 전담
import { create } from 'zustand';
import { exportToExcel } from '../services/excelExporter.ts';

const useProjectStore = create((set, get) => ({
  // State
  isExporting: false,
  isImporting: false,
  
  // Actions
  setIsExporting: (isExporting) => set({ isExporting }),
  setIsImporting: (isImporting) => set({ isImporting }),

  // 🟢 Project Data Validation
  validateProjectData: (data) => {
    // Basic structure validation
    if (!data || typeof data !== 'object') return false;
    
    // Required fields validation
    const requiredFields = ['pdfFileName', 'exportDate', 'tags', 'relationships', 'rawTextItems'];
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // Type validation for arrays
    const arrayFields = ['tags', 'relationships', 'rawTextItems'];
    for (const field of arrayFields) {
      if (!Array.isArray(data[field])) return false;
    }
    
    // Optional arrays validation
    const optionalArrays = ['descriptions', 'equipmentShortSpecs', 'comments', 'loops'];
    for (const field of optionalArrays) {
      if (data[field] && !Array.isArray(data[field])) return false;
    }
    
    // Settings validation
    if (data.settings && typeof data.settings !== 'object') return false;
    
    // Basic tag structure validation (sample check)
    if (data.tags.length > 0) {
      const sampleTag = data.tags[0];
      if (!sampleTag.id || !sampleTag.text || !sampleTag.category || !sampleTag.bbox) {
        return false;
      }
    }
    
    // Basic relationship structure validation (sample check)
    if (data.relationships.length > 0) {
      const sampleRel = data.relationships[0];
      if (!sampleRel.id || !sampleRel.from || !sampleRel.to || !sampleRel.type) {
        return false;
      }
    }
    
    return true;
  },

  // 🟢 Project Data Sanitization
  sanitizeProjectData: (data) => {
    // Sanitize strings to prevent XSS
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+="[^"]*"/gi, '');
    };
    
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const sanitized = { ...obj };
      for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = sanitizeString(sanitized[key]);
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          if (Array.isArray(sanitized[key])) {
            sanitized[key] = sanitized[key].map(item => 
              typeof item === 'object' ? sanitizeObject(item) : 
              typeof item === 'string' ? sanitizeString(item) : item
            );
          } else {
            sanitized[key] = sanitizeObject(sanitized[key]);
          }
        }
      }
      return sanitized;
    };
    
    return sanitizeObject(data);
  },

  // 🟢 Export Project to JSON
  exportProject: (pdfFile, tags, relationships, rawTextItems, descriptions, equipmentShortSpecs, comments, loops, patterns, tolerances, appSettings) => {
    if (!pdfFile) {
      alert("No PDF file is currently loaded.");
      return;
    }

    set({ isExporting: true });

    try {
      const projectData = {
        pdfFileName: pdfFile.name,
        exportDate: new Date().toISOString(),
        tags,
        relationships,
        rawTextItems,
        descriptions: descriptions || [],
        equipmentShortSpecs: equipmentShortSpecs || [],
        comments: comments || [],
        loops: loops || [],
        settings: {
          patterns: patterns || {},
          tolerances: tolerances || {},
          appSettings: appSettings || {},
        },
      };

      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = pdfFile.name.replace(/\.pdf$/i, '') + '-project.json';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Project exported successfully: ${fileName}`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(`Failed to export project: ${error.message}`);
    } finally {
      set({ isExporting: false });
    }
  },

  // 🟢 Import Project from JSON File
  importProject: async (file, pdfFile, onLoadProjectData, onAlert, onShowConfirmation) => {
    if (!file || !pdfFile) {
      onAlert("Please open a PDF file before importing a project file.");
      return;
    }
    
    // File size validation (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      onAlert("Project file is too large. Maximum file size is 50MB.");
      return;
    }
    
    // File type validation
    if (!file.name.toLowerCase().endsWith('.json')) {
      onAlert("Please select a valid JSON project file.");
      return;
    }

    set({ isImporting: true });

    const store = get();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result;
          if (!content) {
            throw new Error("File content is empty");
          }
          
          // Additional JSON parsing security
          if (content.includes('<script>') || content.includes('javascript:')) {
            throw new Error("Project file contains potentially malicious content");
          }
          
          const projectData = JSON.parse(content);
          
          // Validate project data
          if (!store.validateProjectData(projectData)) {
            throw new Error("Invalid project file structure or corrupted data");
          }
          
          // Sanitize data
          const sanitizedData = store.sanitizeProjectData(projectData);
          
          // Check PDF filename match
          if (sanitizedData.pdfFileName !== pdfFile.name) {
            const sanitizedOldName = sanitizedData.pdfFileName?.replace(/[<>]/g, '') || 'Unknown';
            onShowConfirmation(
              `This project file seems to be for a different PDF ("${sanitizedOldName}"). You currently have "${pdfFile.name}" open. Do you want to load the project data anyway?`,
              () => {
                onLoadProjectData(sanitizedData);
                resolve();
              }
            );
          } else {
            onLoadProjectData(sanitizedData);
            resolve();
          }
        } catch (error) {
          let errorMessage = "Could not load project. ";
          
          if (error instanceof SyntaxError) {
            errorMessage += "The file contains invalid JSON format.";
          } else if (error.message.includes('malicious')) {
            errorMessage += "The file contains potentially unsafe content.";
          } else if (error.message.includes('Invalid project')) {
            errorMessage += "The file structure is invalid or corrupted.";
          } else {
            errorMessage += "The file might be corrupted or in an invalid format.";
          }
          
          onAlert(errorMessage);
          reject(new Error(errorMessage));
        } finally {
          set({ isImporting: false });
        }
      };
      
      reader.onerror = () => {
        const errorMsg = "Error reading file. Please try again.";
        onAlert(errorMsg);
        set({ isImporting: false });
        reject(new Error(errorMsg));
      };
      
      reader.readAsText(file);
    });
  },

  // 🟢 Export to Excel
  exportToExcel: (tags, relationships, descriptions, comments) => {
    try {
      exportToExcel(tags, relationships, descriptions, comments);
      console.log('✅ Excel export completed successfully');
    } catch (error) {
      console.error('❌ Excel export failed:', error);
      alert(`Failed to export to Excel: ${error.message}`);
    }
  },

  // 🟢 Load Project Data (used by import)
  loadProjectData: (projectData, onSetTags, onSetRelationships, onSetRawTextItems, onSetDescriptions, onSetEquipmentShortSpecs, onSetLoops, onSetComments, onSetPatterns, onSetTolerances, onSetAppSettings) => {
    const store = get();
    
    // Validate project data
    if (!store.validateProjectData(projectData)) {
      throw new Error("Invalid project file structure or corrupted data");
    }
    
    // Sanitize data
    const sanitizedData = store.sanitizeProjectData(projectData);
    
    try {
      // Load core data
      if (onSetTags) onSetTags(sanitizedData.tags);
      if (onSetRelationships) onSetRelationships(sanitizedData.relationships);
      if (onSetRawTextItems) onSetRawTextItems(sanitizedData.rawTextItems);
      if (onSetDescriptions) onSetDescriptions(sanitizedData.descriptions || []);
      if (onSetEquipmentShortSpecs) onSetEquipmentShortSpecs(sanitizedData.equipmentShortSpecs || []);
      if (onSetLoops) onSetLoops(sanitizedData.loops || []);
      if (onSetComments) onSetComments(sanitizedData.comments || []);
      
      // Load settings if available
      if (sanitizedData.settings?.patterns && onSetPatterns) {
        onSetPatterns(sanitizedData.settings.patterns);
      }
      if (sanitizedData.settings?.tolerances && onSetTolerances) {
        onSetTolerances(sanitizedData.settings.tolerances);
      }
      if (sanitizedData.settings?.appSettings && onSetAppSettings) {
        onSetAppSettings(sanitizedData.settings.appSettings);
      }
      
      console.log('✅ Project data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load project data:', error);
      throw error;
    }
  },

  // 🟢 Get Project Statistics
  getProjectStats: (tags, relationships, rawTextItems, descriptions, equipmentShortSpecs, comments, loops) => {
    return {
      tags: tags?.length || 0,
      relationships: relationships?.length || 0,
      rawTextItems: rawTextItems?.length || 0,
      descriptions: descriptions?.length || 0,
      equipmentShortSpecs: equipmentShortSpecs?.length || 0,
      comments: comments?.length || 0,
      loops: loops?.length || 0,
      total: (tags?.length || 0) + (relationships?.length || 0) + (rawTextItems?.length || 0) + 
             (descriptions?.length || 0) + (equipmentShortSpecs?.length || 0) + (comments?.length || 0) + (loops?.length || 0)
    };
  }
}));

export default useProjectStore;