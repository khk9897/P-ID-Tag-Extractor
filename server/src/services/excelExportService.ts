import * as XLSX from 'xlsx';
import { WorkBook, WorkSheet } from 'xlsx';

// Type definitions (matching client types)
export interface Tag {
  id: string;
  category: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  sourceItems: any[];
  isReviewed?: boolean;
  description?: string;
}

export interface Relationship {
  id: string;
  type: string;
  fromTagId: string;
  toTagId: string;
  fromTag?: Tag;
  toTag?: Tag;
}

export interface Description {
  id: string;
  name: string;
  type: 'Note' | 'Hold';
  scope: string;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  sourceItems: any[];
  isReviewed?: boolean;
}

export interface EquipmentShortSpec {
  id: string;
  equipmentTag: string;
  specification: string;
}

export interface Loop {
  id: string;
  name: string;
  tags: string[];
  type?: string;
  description?: string;
}

export interface ExportOptions {
  includeReviewedOnly?: boolean;
  includeUnreviewedOnly?: boolean;
  includeDescriptions?: boolean;
  includeRelationships?: boolean;
  includeEquipmentSpecs?: boolean;
  includeLoops?: boolean;
  customTemplate?: string;
}

export class ExcelExportService {
  // Main export method
  generateExcel(
    tags: Tag[],
    relationships: Relationship[] = [],
    descriptions: Description[] = [],
    equipmentShortSpecs: EquipmentShortSpec[] = [],
    loops: Loop[] = [],
    options: ExportOptions = {}
  ): Buffer {
    // Create a new workbook
    const workbook: WorkBook = XLSX.utils.book_new();

    // Apply filters if specified
    const filteredTags = this.filterTags(tags, options);
    const filteredDescriptions = this.filterDescriptions(descriptions, options);

    // Create main Tags sheet
    this.createTagsSheet(workbook, filteredTags);

    // Create Relationships sheet if requested and data exists
    if (options.includeRelationships !== false && relationships.length > 0) {
      this.createRelationshipsSheet(workbook, relationships, filteredTags);
    }

    // Create Descriptions sheet if requested and data exists
    if (options.includeDescriptions !== false && filteredDescriptions.length > 0) {
      this.createDescriptionsSheet(workbook, filteredDescriptions);
    }

    // Create Equipment Specs sheet if requested and data exists
    if (options.includeEquipmentSpecs !== false && equipmentShortSpecs.length > 0) {
      this.createEquipmentSpecsSheet(workbook, equipmentShortSpecs);
    }

    // Create Loops sheet if requested and data exists
    if (options.includeLoops !== false && loops.length > 0) {
      this.createLoopsSheet(workbook, loops, filteredTags);
    }

    // Convert workbook to buffer
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  private filterTags(tags: Tag[], options: ExportOptions): Tag[] {
    let filtered = tags;

    if (options.includeReviewedOnly) {
      filtered = filtered.filter(tag => tag.isReviewed === true);
    } else if (options.includeUnreviewedOnly) {
      filtered = filtered.filter(tag => tag.isReviewed !== true);
    }

    return filtered;
  }

  private filterDescriptions(descriptions: Description[], options: ExportOptions): Description[] {
    let filtered = descriptions;

    if (options.includeReviewedOnly) {
      filtered = filtered.filter(desc => desc.isReviewed === true);
    } else if (options.includeUnreviewedOnly) {
      filtered = filtered.filter(desc => desc.isReviewed !== true);
    }

    return filtered;
  }

  private createTagsSheet(workbook: WorkBook, tags: Tag[]): void {
    const headers = [
      'Category',
      'Tag Name',
      'Page',
      'X Position',
      'Y Position',
      'Width',
      'Height',
      'Review Status',
      'Description'
    ];

    const data = tags.map(tag => [
      tag.category,
      tag.name,
      tag.page,
      Math.round(tag.x),
      Math.round(tag.y),
      Math.round(tag.width),
      Math.round(tag.height),
      tag.isReviewed ? 'Reviewed' : 'Not Reviewed',
      tag.description || ''
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 15 },  // Category
      { width: 25 },  // Tag Name
      { width: 8 },   // Page
      { width: 12 },  // X Position
      { width: 12 },  // Y Position
      { width: 10 },  // Width
      { width: 10 },  // Height
      { width: 15 },  // Review Status
      { width: 30 }   // Description
    ];

    // Apply header styling
    this.styleHeaderRow(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tags');
  }

  private createRelationshipsSheet(workbook: WorkBook, relationships: Relationship[], tags: Tag[]): void {
    const headers = [
      'Relationship Type',
      'From Tag',
      'From Category',
      'To Tag',
      'To Category',
      'From Page',
      'To Page'
    ];

    // Create a tag lookup for efficient access
    const tagLookup = new Map(tags.map(tag => [tag.id, tag]));

    const data = relationships.map(rel => {
      const fromTag = tagLookup.get(rel.fromTagId);
      const toTag = tagLookup.get(rel.toTagId);

      return [
        rel.type,
        fromTag?.name || rel.fromTagId,
        fromTag?.category || '',
        toTag?.name || rel.toTagId,
        toTag?.category || '',
        fromTag?.page || '',
        toTag?.page || ''
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 18 },  // Relationship Type
      { width: 25 },  // From Tag
      { width: 15 },  // From Category
      { width: 25 },  // To Tag
      { width: 15 },  // To Category
      { width: 10 },  // From Page
      { width: 10 }   // To Page
    ];

    this.styleHeaderRow(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relationships');
  }

  private createDescriptionsSheet(workbook: WorkBook, descriptions: Description[]): void {
    const headers = [
      'Type',
      'Name',
      'Scope',
      'Number',
      'Page',
      'X Position',
      'Y Position',
      'Review Status'
    ];

    const data = descriptions.map(desc => [
      desc.type,
      desc.name,
      desc.scope,
      desc.number,
      desc.page,
      Math.round(desc.x),
      Math.round(desc.y),
      desc.isReviewed ? 'Reviewed' : 'Not Reviewed'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 10 },  // Type
      { width: 30 },  // Name
      { width: 15 },  // Scope
      { width: 10 },  // Number
      { width: 8 },   // Page
      { width: 12 },  // X Position
      { width: 12 },  // Y Position
      { width: 15 }   // Review Status
    ];

    this.styleHeaderRow(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Descriptions');
  }

  private createEquipmentSpecsSheet(workbook: WorkBook, specs: EquipmentShortSpec[]): void {
    const headers = [
      'Equipment Tag',
      'Specification'
    ];

    const data = specs.map(spec => [
      spec.equipmentTag,
      spec.specification
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 25 },  // Equipment Tag
      { width: 50 }   // Specification
    ];

    this.styleHeaderRow(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipment Specs');
  }

  private createLoopsSheet(workbook: WorkBook, loops: Loop[], tags: Tag[]): void {
    const headers = [
      'Loop Name',
      'Type',
      'Description',
      'Tag Count',
      'Tags'
    ];

    // Create tag lookup
    const tagLookup = new Map(tags.map(tag => [tag.id, tag]));

    const data = loops.map(loop => {
      const tagNames = loop.tags
        .map(tagId => tagLookup.get(tagId)?.name || tagId)
        .join(', ');

      return [
        loop.name,
        loop.type || '',
        loop.description || '',
        loop.tags.length,
        tagNames
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 20 },  // Loop Name
      { width: 15 },  // Type
      { width: 30 },  // Description
      { width: 12 },  // Tag Count
      { width: 60 }   // Tags
    ];

    this.styleHeaderRow(worksheet, headers.length);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loops');
  }

  private styleHeaderRow(worksheet: WorkSheet, columnCount: number): void {
    // Apply basic styling to header row (row 1)
    for (let col = 0; col < columnCount; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '366092' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
  }

  // Create summary sheet with statistics
  createSummarySheet(workbook: WorkBook, tags: Tag[], relationships: Relationship[], descriptions: Description[]): void {
    const categoryStats = this.calculateCategoryStats(tags);
    const reviewStats = this.calculateReviewStats(tags, descriptions);
    const pageStats = this.calculatePageStats(tags);

    const summaryData = [
      ['P&ID Analysis Summary', ''],
      ['', ''],
      ['Total Tags', tags.length.toString()],
      ['Total Relationships', relationships.length.toString()],
      ['Total Descriptions', descriptions.length.toString()],
      ['', ''],
      ['Tag Categories:', ''],
      ...Object.entries(categoryStats).map(([category, count]) => [`  ${category}`, count.toString()]),
      ['', ''],
      ['Review Status:', ''],
      [`  Reviewed Tags`, reviewStats.reviewedTags.toString()],
      [`  Unreviewed Tags`, reviewStats.unreviewedTags.toString()],
      [`  Reviewed Descriptions`, reviewStats.reviewedDescriptions.toString()],
      [`  Unreviewed Descriptions`, reviewStats.unreviewedDescriptions.toString()],
      ['', ''],
      ['Pages:', ''],
      ...Object.entries(pageStats).map(([page, count]) => [`  Page ${page}`, count.toString()])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 25 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  private calculateCategoryStats(tags: Tag[]): Record<string, number> {
    const stats: Record<string, number> = {};
    tags.forEach(tag => {
      stats[tag.category] = (stats[tag.category] || 0) + 1;
    });
    return stats;
  }

  private calculateReviewStats(tags: Tag[], descriptions: Description[]): {
    reviewedTags: number;
    unreviewedTags: number;
    reviewedDescriptions: number;
    unreviewedDescriptions: number;
  } {
    return {
      reviewedTags: tags.filter(t => t.isReviewed).length,
      unreviewedTags: tags.filter(t => !t.isReviewed).length,
      reviewedDescriptions: descriptions.filter(d => d.isReviewed).length,
      unreviewedDescriptions: descriptions.filter(d => !d.isReviewed).length
    };
  }

  private calculatePageStats(tags: Tag[]): Record<string, number> {
    const stats: Record<string, number> = {};
    tags.forEach(tag => {
      const page = tag.page.toString();
      stats[page] = (stats[page] || 0) + 1;
    });
    return stats;
  }

  // Generate filename with timestamp
  generateFilename(projectName?: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const baseName = projectName ? `${projectName}_export` : 'pid_export';
    return `${baseName}_${timestamp}.xlsx`;
  }

  // Validate export data
  validateExportData(tags: Tag[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(tags)) {
      errors.push('Tags must be an array');
    } else if (tags.length === 0) {
      errors.push('No tags available for export');
    } else {
      // Validate required fields
      tags.forEach((tag, index) => {
        if (!tag.id) errors.push(`Tag ${index}: Missing ID`);
        if (!tag.name) errors.push(`Tag ${index}: Missing name`);
        if (!tag.category) errors.push(`Tag ${index}: Missing category`);
        if (typeof tag.page !== 'number') errors.push(`Tag ${index}: Invalid page number`);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}