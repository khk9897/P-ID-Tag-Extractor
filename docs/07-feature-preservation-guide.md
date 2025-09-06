# P&ID Smart Digitizer 기능 보존 가이드

## 📋 개요

P&ID Smart Digitizer의 리팩토링 과정에서 반드시 유지되어야 할 핵심 기능들을 정리한 문서입니다. 각 기능의 현재 구현 방식(AS-IS)과 리팩토링 후 구현 계획(TO-BE)을 상세히 비교하여, 기능 손실 없이 안전한 리팩토링을 보장합니다.

---

## 🎯 핵심 기능 목록

### 1. **PDF 처리 및 태그 추출**

#### **기능 설명**
PDF 파일을 로드하고 자동으로 엔지니어링 태그를 인식하여 추출하는 핵심 기능

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 600-650)
const handleFileSelect = async (file: File) => {
  setPdfFile(file);
  const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
  const pdf = await loadingTask.promise;
  setPdfDoc(pdf);
  
  // taggingService.ts에서 추출
  const { tags: extractedTags, rawTextItems: extractedRawText } = 
    await extractTags(pdf, patterns, tolerances, appSettings);
  
  setTags(extractedTags);
  setRawTextItems(extractedRawText);
};
```

**문제점:**
- 모든 로직이 App.tsx에 집중
- 에러 처리 미흡
- 대용량 PDF 처리 시 메모리 이슈

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/pdfStore.ts
class PDFStore {
  async loadPDF(file: File) {
    try {
      this.setLoading(true);
      const pdf = await PDFService.load(file);
      this.setPdfDoc(pdf);
      
      // 청크 단위 처리
      await this.processInChunks(pdf);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoading(false);
    }
  }
  
  private async processInChunks(pdf: PDFDocument) {
    const chunkSize = 10; // 10페이지씩 처리
    for (let i = 0; i < pdf.numPages; i += chunkSize) {
      await this.processPageChunk(pdf, i, Math.min(i + chunkSize, pdf.numPages));
    }
  }
}
```

**개선사항:**
- ✅ 도메인별 책임 분리
- ✅ 청크 기반 처리로 메모리 효율성
- ✅ 체계적인 에러 처리

---

### 2. **태그 관리 (CRUD)**

#### **기능 설명**
태그 생성, 수정, 삭제, 검토 상태 관리 기능

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 700-850)
const handleCreateTag = useCallback((itemsToConvert: RawTextItem[], category: CategoryType) => {
  // 100줄의 복잡한 로직
  const newTags = itemsToConvert.map(item => ({
    id: uuidv4(),
    text: item.text,
    category,
    page: item.page,
    bbox: item.bbox,
    sourceItems: [item],
    isReviewed: false
  }));
  
  setTags(prevTags => [...prevTags, ...newTags]);
  setRawTextItems(prev => prev.filter(item => 
    !itemsToConvert.some(converted => converted.id === item.id)
  ));
}, []);

const handleUpdateTagText = useCallback((tagId: string, newText: string) => {
  setTags(prevTags => prevTags.map(tag => 
    tag.id === tagId ? { ...tag, text: newText } : tag
  ));
}, []);

const handleToggleReviewStatus = useCallback((tagId: string) => {
  setTags(prevTags => prevTags.map(tag => 
    tag.id === tagId ? { ...tag, isReviewed: !tag.isReviewed } : tag
  ));
}, []);
```

**문제점:**
- 상태 변경 로직이 App.tsx에 분산
- 관련 엔티티 동기화 수동 관리
- Undo/Redo 기능 없음

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/tagStore.ts
class TagStore {
  private tags = observable.map<string, Tag>();
  private history = new UndoRedoManager<Tag>();
  
  @action
  createTag(data: CreateTagRequest) {
    // 검증
    const validation = TagService.validate(data);
    if (!validation.isValid) throw new Error(validation.errors.join(', '));
    
    // 생성
    const tag = TagService.createTag(data);
    
    // 트랜잭션으로 상태 변경
    runInAction(() => {
      this.tags.set(tag.id, tag);
      this.history.push('create', tag);
      
      // 관련 상태 자동 업데이트
      rawTextStore.removeItems(data.sourceItems);
      eventBus.emit('tag:created', tag);
    });
  }
  
  @action
  updateTag(id: string, updates: Partial<Tag>) {
    const tag = this.tags.get(id);
    if (!tag) throw new Error(`Tag ${id} not found`);
    
    const oldTag = { ...tag };
    const newTag = { ...tag, ...updates };
    
    runInAction(() => {
      this.tags.set(id, newTag);
      this.history.push('update', { old: oldTag, new: newTag });
      eventBus.emit('tag:updated', { old: oldTag, new: newTag });
    });
  }
  
  @action
  toggleReviewStatus(id: string) {
    const tag = this.tags.get(id);
    if (!tag) return;
    
    this.updateTag(id, { isReviewed: !tag.isReviewed });
  }
  
  // Undo/Redo 지원
  @action
  undo() {
    const action = this.history.undo();
    if (action) this.applyHistoryAction(action);
  }
  
  @action
  redo() {
    const action = this.history.redo();
    if (action) this.applyHistoryAction(action);
  }
}
```

**개선사항:**
- ✅ 중앙집중식 상태 관리
- ✅ 자동 관련 엔티티 동기화
- ✅ Undo/Redo 기능 추가
- ✅ 트랜잭션 기반 상태 변경

---

### 3. **관계(Relationship) 관리**

#### **기능 설명**
태그 간 연결관계, 설치관계, 주석관계 등 생성 및 관리

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 900-1000)
const handleCreateRelationship = useCallback((fromTag: Tag, toTag: Tag, type: RelationshipType) => {
  const newRelationship: Relationship = {
    id: uuidv4(),
    from: fromTag.id,
    to: toTag.id,
    type
  };
  
  setRelationships(prev => [...prev, newRelationship]);
}, []);

// PdfViewer.tsx에서 클릭 이벤트 처리
const handleTagClick = (tag: Tag) => {
  if (mode === 'connect' && relationshipStartTag) {
    onCreateRelationship(relationshipStartTag, tag, RelationshipType.Connection);
    setRelationshipStartTag(null);
    setMode('select');
  }
};
```

**문제점:**
- 관계 검증 로직 없음
- 양방향 관계 지원 미흡
- OPC 관계 특별 처리 분산

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/relationshipStore.ts
class RelationshipStore {
  private relationships = observable.map<string, Relationship>();
  private fromIndex = new Map<string, Set<string>>();
  private toIndex = new Map<string, Set<string>>();
  
  @action
  createRelationship(from: string, to: string, type: RelationshipType) {
    // 검증
    if (!RelationshipService.canConnect(from, to, type)) {
      throw new Error('Invalid relationship');
    }
    
    // 특별 처리 (OPC)
    if (type === RelationshipType.OffPageConnection) {
      return this.createOPCRelationship(from, to);
    }
    
    const relationship = RelationshipService.create(from, to, type);
    
    runInAction(() => {
      this.relationships.set(relationship.id, relationship);
      this.updateIndexes(relationship);
      eventBus.emit('relationship:created', relationship);
    });
  }
  
  private createOPCRelationship(from: string, to: string) {
    // OPC 특별 로직
    const group = this.findOPCGroup(from, to);
    const relationship = {
      ...RelationshipService.create(from, to, RelationshipType.OffPageConnection),
      metadata: {
        opcGroup: group,
        opcStatus: 'connected',
        opcCount: this.getOPCGroupCount(group)
      }
    };
    
    // 양방향 관계 자동 생성
    this.createBidirectionalOPC(relationship);
  }
  
  // O(1) 조회를 위한 인덱스
  getRelationshipsFrom(tagId: string): Relationship[] {
    const ids = this.fromIndex.get(tagId) || new Set();
    return Array.from(ids).map(id => this.relationships.get(id)!);
  }
  
  getRelationshipsTo(tagId: string): Relationship[] {
    const ids = this.toIndex.get(tagId) || new Set();
    return Array.from(ids).map(id => this.relationships.get(id)!);
  }
}
```

**개선사항:**
- ✅ 관계 검증 로직 통합
- ✅ OPC 특별 처리 중앙화
- ✅ O(1) 조회를 위한 인덱싱
- ✅ 양방향 관계 자동 관리

---

### 4. **Description (Note & Hold) 관리**

#### **기능 설명**
Note & Hold 태그와 관련 설명 텍스트 관리, 페이지별 번호 자동 부여

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 1100-1200)
const handleCreateDescription = useCallback((selectedItems: (Tag | RawTextItem)[]) => {
  const pageNumber = selectedItems[0].page;
  const existingDescriptions = descriptions.filter(d => d.page === pageNumber);
  const nextNumber = existingDescriptions.length + 1;
  
  const newDescription: Description = {
    id: uuidv4(),
    text: selectedItems.map(item => item.text).join(' '),
    page: pageNumber,
    bbox: calculateBoundingBox(selectedItems),
    sourceItems: selectedItems,
    metadata: {
      type: 'Note',
      scope: 'General',
      number: nextNumber
    }
  };
  
  setDescriptions(prev => [...prev, newDescription]);
}, [descriptions]);
```

**문제점:**
- 페이지별 번호 관리 로직 복잡
- Note/Hold 구분 수동
- 관련 태그 연결 관리 어려움

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/descriptionStore.ts
class DescriptionStore {
  private descriptions = observable.map<string, Description>();
  private pageNumbering = new Map<number, { notes: number, holds: number }>();
  
  @action
  createDescription(items: (Tag | RawTextItem)[], type: 'Note' | 'Hold') {
    const page = items[0].page;
    const number = this.getNextNumber(page, type);
    
    const description = DescriptionService.create({
      items,
      type,
      number,
      page
    });
    
    runInAction(() => {
      this.descriptions.set(description.id, description);
      this.updatePageNumbering(page, type);
      
      // 자동 관계 생성
      this.createDescriptionRelationships(description, items);
    });
  }
  
  private getNextNumber(page: number, type: 'Note' | 'Hold'): number {
    const numbering = this.pageNumbering.get(page) || { notes: 0, holds: 0 };
    return type === 'Note' ? numbering.notes + 1 : numbering.holds + 1;
  }
  
  private createDescriptionRelationships(description: Description, items: any[]) {
    // Note & Hold 태그 찾기
    const noteHoldTags = items.filter(item => 
      item.category === Category.NotesAndHolds
    );
    
    // 자동 관계 생성
    noteHoldTags.forEach(tag => {
      relationshipStore.createRelationship(
        tag.id,
        description.id,
        RelationshipType.Description
      );
    });
  }
  
  // 페이지별 Description 조회
  getDescriptionsByPage(page: number): Description[] {
    return Array.from(this.descriptions.values())
      .filter(d => d.page === page)
      .sort((a, b) => a.metadata.number - b.metadata.number);
  }
}
```

**개선사항:**
- ✅ 자동 페이지별 번호 관리
- ✅ Note/Hold 타입별 번호 분리
- ✅ 관련 태그 자동 연결
- ✅ 효율적인 페이지별 조회

---

### 5. **댓글 시스템**

#### **기능 설명**
태그, 관계, 설명 등에 우선순위별 댓글 추가 및 해결 상태 관리

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 1300-1400)
const [comments, setComments] = useState<Comment[]>([]);

const handleCreateComment = useCallback((
  targetId: string,
  targetType: CommentTargetType,
  content: string,
  priority: CommentPriority = 'medium'
) => {
  const newComment: Comment = {
    id: uuidv4(),
    targetId,
    targetType,
    content,
    author: 'User',
    timestamp: Date.now(),
    isResolved: false,
    priority
  };
  
  setComments(prev => [...prev, newComment]);
}, []);

const handleResolveComment = useCallback((commentId: string) => {
  setComments(prev => prev.map(comment =>
    comment.id === commentId
      ? { ...comment, isResolved: true }
      : comment
  ));
}, []);
```

**문제점:**
- 대상별 댓글 조회 비효율적
- 댓글 통계 실시간 계산
- 스레드형 대댓글 미지원

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/commentStore.ts  
class CommentStore {
  private comments = observable.map<string, Comment>();
  private targetIndex = new Map<string, Set<string>>();
  private threadIndex = new Map<string, Comment[]>();
  
  @computed
  get statistics() {
    const all = Array.from(this.comments.values());
    return {
      total: all.length,
      open: all.filter(c => !c.isResolved).length,
      high: all.filter(c => c.priority === 'high' && !c.isResolved).length,
      byTarget: this.getStatisticsByTarget()
    };
  }
  
  @action
  createComment(data: CreateCommentRequest) {
    const comment = CommentService.create({
      ...data,
      author: userStore.currentUser.name,
      timestamp: Date.now()
    });
    
    runInAction(() => {
      this.comments.set(comment.id, comment);
      this.updateTargetIndex(comment);
      
      // 스레드 처리
      if (data.parentId) {
        this.addToThread(data.parentId, comment);
      }
      
      // 알림
      this.notifyMentions(comment);
    });
  }
  
  @action
  resolveComment(id: string, resolution?: string) {
    const comment = this.comments.get(id);
    if (!comment) return;
    
    runInAction(() => {
      comment.isResolved = true;
      comment.resolvedBy = userStore.currentUser.id;
      comment.resolvedAt = Date.now();
      comment.resolutionComment = resolution;
      
      eventBus.emit('comment:resolved', comment);
    });
  }
  
  // O(1) 대상별 댓글 조회
  getCommentsByTarget(targetId: string): Comment[] {
    const ids = this.targetIndex.get(targetId) || new Set();
    return Array.from(ids)
      .map(id => this.comments.get(id)!)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // 스레드형 댓글 조회
  getCommentThread(rootId: string): Comment[] {
    return this.threadIndex.get(rootId) || [];
  }
}
```

**개선사항:**
- ✅ O(1) 대상별 댓글 조회
- ✅ 실시간 통계 계산 (computed)
- ✅ 스레드형 댓글 지원
- ✅ 멘션 및 알림 시스템

---

### 6. **Loop 자동 생성 및 관리**

#### **기능 설명**
Instrument 태그를 분석하여 자동으로 Loop 그룹 생성

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 1500-1600)
const handleAutoGenerateLoops = useCallback(() => {
  const instrumentTags = tags.filter(tag => tag.category === Category.Instrument);
  const loopGroups = new Map<string, Tag[]>();
  
  instrumentTags.forEach(tag => {
    const match = tag.text.match(/^([A-Z]+)-(\d+)/);
    if (match) {
      const loopId = `${match[1]}-${match[2]}`;
      if (!loopGroups.has(loopId)) {
        loopGroups.set(loopId, []);
      }
      loopGroups.get(loopId)!.push(tag);
    }
  });
  
  const newLoops: Loop[] = Array.from(loopGroups.entries()).map(([loopId, loopTags]) => ({
    id: loopId,
    tagIds: loopTags.map(t => t.id),
    createdAt: new Date().toISOString(),
    isAutoGenerated: true
  }));
  
  setLoops(newLoops);
}, [tags]);
```

**문제점:**
- Loop 패턴 하드코딩
- 중복 Loop 처리 미흡
- Loop 편집 기능 제한적

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/loopStore.ts
class LoopStore {
  private loops = observable.map<string, Loop>();
  private patterns = [
    /^([A-Z]+)-(\d+)/,        // Standard: FT-101
    /^(\d+)([A-Z]+)(\d+)/,    // Alternative: 101FT01
  ];
  
  @action
  autoGenerateLoops() {
    const instrumentTags = tagStore.getTagsByCategory(Category.Instrument);
    const detected = LoopService.detectLoops(instrumentTags, this.patterns);
    
    runInAction(() => {
      // 기존 자동 생성 Loop 제거
      this.clearAutoGeneratedLoops();
      
      // 새로운 Loop 생성
      detected.forEach(loopData => {
        if (!this.isDuplicateLoop(loopData)) {
          const loop = LoopService.createLoop(loopData);
          this.loops.set(loop.id, loop);
        }
      });
      
      // 통계 업데이트
      this.updateStatistics();
    });
  }
  
  @action
  manualCreateLoop(name: string, tagIds: string[], notes?: string) {
    const loop: Loop = {
      id: uuidv4(),
      name,
      tagIds,
      notes,
      createdAt: new Date().toISOString(),
      isAutoGenerated: false
    };
    
    this.loops.set(loop.id, loop);
  }
  
  @action
  updateLoop(id: string, updates: Partial<Loop>) {
    const loop = this.loops.get(id);
    if (!loop) return;
    
    // 자동 생성 Loop도 편집 가능
    const updated = { ...loop, ...updates, isAutoGenerated: false };
    this.loops.set(id, updated);
  }
  
  private isDuplicateLoop(loopData: any): boolean {
    return Array.from(this.loops.values()).some(loop => 
      loop.tagIds.length === loopData.tagIds.length &&
      loop.tagIds.every(id => loopData.tagIds.includes(id))
    );
  }
}
```

**개선사항:**
- ✅ 유연한 Loop 패턴 관리
- ✅ 중복 Loop 자동 감지
- ✅ 수동/자동 Loop 통합 관리
- ✅ Loop 편집 기능 강화

---

### 7. **Excel 내보내기**

#### **기능 설명**
추출된 데이터를 구조화된 Excel 파일로 내보내기

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 1700-1750)
const handleExportToExcel = useCallback(async () => {
  if (!pdfFile) return;
  
  try {
    setIsExporting(true);
    await exportToExcel(
      tags,
      relationships,
      descriptions,
      comments,
      pdfFile.name
    );
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    setIsExporting(false);
  }
}, [tags, relationships, descriptions, comments, pdfFile]);
```

**문제점:**
- 모든 데이터 일괄 전달
- 대용량 데이터 처리 시 메모리 이슈
- 진행률 표시 없음

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/exportStore.ts
class ExportStore {
  @observable progress = 0;
  @observable isExporting = false;
  
  @action
  async exportToExcel(options: ExportOptions = {}) {
    this.isExporting = true;
    this.progress = 0;
    
    try {
      const exporter = new ExcelExporter({
        onProgress: (progress) => this.setProgress(progress)
      });
      
      // 청크 단위 스트리밍 내보내기
      await exporter.exportStreaming({
        tags: tagStore.getAllTags(),
        relationships: relationshipStore.getAllRelationships(),
        descriptions: descriptionStore.getAllDescriptions(),
        comments: commentStore.getAllComments(),
        loops: loopStore.getAllLoops(),
        options
      });
      
      notificationStore.success('Export completed successfully');
    } catch (error) {
      notificationStore.error(`Export failed: ${error.message}`);
    } finally {
      this.isExporting = false;
      this.progress = 0;
    }
  }
  
  @action
  async exportPartial(pages: number[]) {
    // 특정 페이지만 내보내기
    const filteredData = {
      tags: tagStore.getTagsByPages(pages),
      relationships: relationshipStore.getRelationshipsByPages(pages),
      // ...
    };
    
    await this.exportToExcel({ data: filteredData, partial: true });
  }
}
```

**개선사항:**
- ✅ 스트리밍 기반 내보내기
- ✅ 진행률 실시간 표시
- ✅ 부분 내보내기 지원
- ✅ 메모리 효율적 처리

---

### 8. **프로젝트 저장/불러오기**

#### **기능 설명**
작업 내용을 JSON 형태로 저장하고 나중에 불러오기

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 1800-1900)
const handleExportProject = useCallback(() => {
  const projectData: ProjectData = {
    pdfFileName: pdfFile?.name || '',
    exportDate: new Date().toISOString(),
    tags,
    relationships,
    rawTextItems,
    descriptions,
    equipmentShortSpecs,
    comments,
    loops,
    settings: { patterns, tolerances, appSettings }
  };
  
  const json = JSON.stringify(projectData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `pid-project-${Date.now()}.json`;
  a.click();
}, [/* many dependencies */]);

const handleImportProject = useCallback((file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target?.result as string) as ProjectData;
    
    setTags(data.tags || []);
    setRelationships(data.relationships || []);
    setRawTextItems(data.rawTextItems || []);
    // ... set all other states
  };
  reader.readAsText(file);
}, []);
```

**문제점:**
- Pretty JSON으로 파일 크기 증가
- 버전 호환성 없음
- 대용량 프로젝트 로딩 느림

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/projectStore.ts
class ProjectStore {
  @action
  async saveProject(options: SaveOptions = {}) {
    const projectData = this.collectProjectData();
    
    // 버전 정보 추가
    projectData.version = APP_VERSION;
    projectData.checksum = this.calculateChecksum(projectData);
    
    // 압축 옵션
    if (options.compress) {
      const compressed = await CompressionService.compress(projectData);
      await FileService.saveCompressed(compressed, options.filename);
    } else {
      await FileService.saveJSON(projectData, options.filename);
    }
    
    // 최근 프로젝트 기록
    recentProjectsStore.add(options.filename);
  }
  
  @action
  async loadProject(file: File) {
    try {
      loadingStore.start('Loading project...');
      
      // 파일 타입 감지
      const isCompressed = await FileService.isCompressed(file);
      const data = isCompressed
        ? await CompressionService.decompress(file)
        : await FileService.readJSON(file);
      
      // 버전 호환성 체크
      if (data.version !== APP_VERSION) {
        data = await MigrationService.migrate(data, APP_VERSION);
      }
      
      // 무결성 검증
      if (!this.verifyChecksum(data)) {
        throw new Error('Project data corrupted');
      }
      
      // 상태 복원
      await this.restoreProjectData(data);
      
      notificationStore.success('Project loaded successfully');
    } catch (error) {
      notificationStore.error(`Failed to load project: ${error.message}`);
    } finally {
      loadingStore.stop();
    }
  }
  
  private async restoreProjectData(data: ProjectData) {
    // 트랜잭션으로 모든 상태 한번에 복원
    transaction(() => {
      tagStore.restore(data.tags);
      relationshipStore.restore(data.relationships);
      descriptionStore.restore(data.descriptions);
      commentStore.restore(data.comments);
      loopStore.restore(data.loops);
      settingsStore.restore(data.settings);
    });
  }
}
```

**개선사항:**
- ✅ 압축 옵션으로 70% 크기 감소
- ✅ 버전 호환성 및 마이그레이션
- ✅ 무결성 검증
- ✅ 트랜잭션 기반 상태 복원

---

### 9. **가시성 설정 (Visibility Settings)**

#### **기능 설명**
태그 카테고리별, 관계 유형별 표시/숨김 제어

#### **AS-IS (현재 구현)**
```typescript
// App.tsx (라인 2000-2100)
const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
  tags: {
    equipment: true,
    line: true,
    instrument: true,
    // ...
  },
  relationships: {
    connection: true,
    installation: true,
    // ...
  },
  descriptions: true,
  equipmentShortSpecs: true
});

const toggleTagVisibility = useCallback((category: keyof VisibilitySettings['tags']) => {
  setVisibilitySettings(prev => ({
    ...prev,
    tags: {
      ...prev.tags,
      [category]: !prev.tags[category]
    }
  }));
}, []);
```

**문제점:**
- 깊은 중첩 객체 업데이트 복잡
- 일괄 토글 기능 제한적
- 설정 지속성 없음

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/visibilityStore.ts
class VisibilityStore {
  @observable settings: VisibilitySettings;
  
  constructor() {
    this.settings = this.loadFromLocalStorage() || DEFAULT_VISIBILITY;
    
    // 자동 저장
    reaction(
      () => toJS(this.settings),
      settings => this.saveToLocalStorage(settings),
      { delay: 500 }
    );
  }
  
  @action
  toggleTag(category: CategoryType) {
    this.settings.tags[category] = !this.settings.tags[category];
  }
  
  @action
  toggleRelationship(type: RelationshipType) {
    this.settings.relationships[type] = !this.settings.relationships[type];
  }
  
  @action
  toggleAllTags(visible: boolean) {
    Object.keys(this.settings.tags).forEach(key => {
      this.settings.tags[key] = visible;
    });
  }
  
  @action
  toggleAllRelationships(visible: boolean) {
    Object.keys(this.settings.relationships).forEach(key => {
      this.settings.relationships[key] = visible;
    });
  }
  
  @action
  applyPreset(preset: 'all' | 'minimal' | 'review' | 'custom') {
    this.settings = VisibilityPresets[preset];
  }
  
  // 필터링된 데이터 제공
  @computed
  get visibleTags() {
    return tagStore.getAllTags().filter(tag => 
      this.settings.tags[tag.category]
    );
  }
  
  @computed
  get visibleRelationships() {
    return relationshipStore.getAllRelationships().filter(rel =>
      this.settings.relationships[rel.type]
    );
  }
}
```

**개선사항:**
- ✅ 간단한 토글 메서드
- ✅ 일괄 토글 기능
- ✅ 프리셋 지원
- ✅ 자동 로컬 저장

---

### 10. **키보드 단축키**

#### **기능 설명**
효율적인 작업을 위한 키보드 단축키 지원

#### **AS-IS (현재 구현)**
```typescript
// PdfViewer.tsx (라인 500-600)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Delete
    if (e.key === 'Delete' && selectedTagIds.length > 0) {
      onDeleteTags(selectedTagIds);
    }
    
    // Ctrl+A
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      const allTagIds = currentTags.map(t => t.id);
      setSelectedTagIds(allTagIds);
    }
    
    // P key - Previous page
    if (e.key === 'p' && !e.ctrlKey) {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
    
    // N key - Next page
    if (e.key === 'n' && !e.ctrlKey) {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedTagIds, currentPage, totalPages]);
```

**문제점:**
- 여러 컴포넌트에 분산된 핸들러
- 단축키 충돌 가능성
- 커스터마이징 불가

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/keyboardStore.ts
class KeyboardStore {
  private shortcuts = new Map<string, ShortcutHandler>();
  private customShortcuts = new Map<string, string>();
  
  constructor() {
    this.registerDefaultShortcuts();
    this.loadCustomShortcuts();
    this.setupGlobalListener();
  }
  
  private registerDefaultShortcuts() {
    // 삭제
    this.register('Delete', {
      handler: () => tagStore.deleteSelected(),
      description: 'Delete selected tags',
      context: 'global'
    });
    
    // 전체 선택
    this.register('Ctrl+A', {
      handler: () => selectionStore.selectAll(),
      description: 'Select all visible tags',
      context: 'viewer'
    });
    
    // 페이지 네비게이션
    this.register('P', {
      handler: () => navigationStore.previousPage(),
      description: 'Go to previous page',
      context: 'global',
      preventDefault: true
    });
    
    this.register('N', {
      handler: () => navigationStore.nextPage(),
      description: 'Go to next page',
      context: 'global',
      preventDefault: true
    });
    
    // Undo/Redo
    this.register('Ctrl+Z', {
      handler: () => historyStore.undo(),
      description: 'Undo last action'
    });
    
    this.register('Ctrl+Y', {
      handler: () => historyStore.redo(),
      description: 'Redo last action'
    });
  }
  
  @action
  customizeShortcut(action: string, newShortcut: string) {
    // 충돌 체크
    if (this.shortcuts.has(newShortcut)) {
      throw new Error(`Shortcut ${newShortcut} already in use`);
    }
    
    this.customShortcuts.set(action, newShortcut);
    this.saveCustomShortcuts();
  }
  
  private setupGlobalListener() {
    window.addEventListener('keydown', (e) => {
      const shortcut = this.getShortcutString(e);
      const handler = this.shortcuts.get(shortcut);
      
      if (handler && this.isContextValid(handler.context)) {
        if (handler.preventDefault) {
          e.preventDefault();
        }
        handler.handler();
      }
    });
  }
  
  // 단축키 도움말 생성
  @computed
  get shortcutHelp() {
    return Array.from(this.shortcuts.entries()).map(([key, handler]) => ({
      shortcut: this.customShortcuts.get(handler.action) || key,
      description: handler.description,
      context: handler.context
    }));
  }
}
```

**개선사항:**
- ✅ 중앙집중식 단축키 관리
- ✅ 단축키 커스터마이징
- ✅ 컨텍스트별 단축키 활성화
- ✅ 단축키 도움말 자동 생성

---

## 📊 기능 보존 체크리스트

| 기능 | 우선순위 | AS-IS 위치 | TO-BE 위치 | 상태 |
|------|---------|-----------|-----------|------|
| PDF 로드 및 태그 추출 | 🔴 Critical | App.tsx | pdfStore.ts | ⏳ |
| 태그 CRUD | 🔴 Critical | App.tsx | tagStore.ts | ⏳ |
| 관계 관리 | 🔴 Critical | App.tsx | relationshipStore.ts | ⏳ |
| Description 관리 | 🟡 High | App.tsx | descriptionStore.ts | ⏳ |
| 댓글 시스템 | 🟡 High | App.tsx | commentStore.ts | ⏳ |
| Loop 자동 생성 | 🟡 High | App.tsx | loopStore.ts | ⏳ |
| Excel 내보내기 | 🔴 Critical | App.tsx | exportStore.ts | ⏳ |
| 프로젝트 저장/불러오기 | 🔴 Critical | App.tsx | projectStore.ts | ⏳ |
| **프로젝트 병합 시스템** | 🔴 Critical | 신규 | projectMerger.ts | ⏳ |
| 가시성 설정 | 🟢 Medium | App.tsx | visibilityStore.ts | ⏳ |
| 키보드 단축키 | 🟢 Medium | PdfViewer.tsx | keyboardStore.ts | ⏳ |
| 검토 상태 관리 | 🟡 High | App.tsx | tagStore.ts | ⏳ |
| Equipment Short Spec | 🟢 Medium | App.tsx | equipmentStore.ts | ⏳ |
| OPC 관계 특별 처리 | 🟡 High | taggingService.ts | relationshipStore.ts | ⏳ |
| 패턴/공차 설정 | 🔴 Critical | App.tsx | settingsStore.ts | ⏳ |
| 색상 설정 | 🟢 Medium | App.tsx | settingsStore.ts | ⏳ |

---

## 🚀 마이그레이션 전략

### **Phase 1: Store 구조 구축 (1주)**
1. Zustand 설치 및 기본 Store 생성
2. 기존 상태와 Store 병행 운영
3. 점진적 마이그레이션

### **Phase 2: 핵심 기능 이전 (2주)**
1. 태그/관계 관리 Store 이전
2. PDF 처리 로직 분리
3. 테스트 및 검증

### **Phase 3: 부가 기능 이전 (1주)**
1. 댓글, Description, Loop 이전
2. 가시성, 키보드 단축키 이전
3. 통합 테스트

### **Phase 4: 최적화 및 정리 (1주)**
1. App.tsx 정리 (150줄 목표)
2. 성능 최적화
3. 문서화

---

## 🎯 성공 기준

1. **기능 완전성**: 모든 기존 기능이 정상 작동
2. **성능 향상**: 페이지 전환 1초 이내, 메모리 사용량 50% 감소
3. **코드 품질**: App.tsx 90% 축소, 테스트 커버리지 80%
4. **사용자 경험**: 기존과 동일하거나 개선된 UX
5. **확장성**: 새 기능 추가 시간 50% 단축

---

## 🔄 **신규 기능: 프로젝트 병합 시스템**

### **11. 다중 사용자 작업 결과 통합**

#### **기능 설명**
여러 사용자가 작업한 프로젝트 데이터를 지능적으로 병합하는 시스템

#### **AS-IS (현재 구현)**
```typescript
// App.tsx - 기본적인 JSON Import만 지원
const handleImportProject = useCallback((data: any) => {
  // 단순 데이터 덮어쓰기
  setTags(data.tags || []);
  setRelationships(data.relationships || []);
  setDescriptions(data.descriptions || []);
  setComments(data.comments || []);
  // 기존 데이터는 완전 삭제됨
}, []);

const handleExportProject = useCallback(() => {
  const projectData = {
    pdfFileName,
    tags,
    relationships, 
    descriptions,
    comments,
    patterns,
    tolerances
  };
  
  // JSON 파일로 내보내기
  downloadJSON(projectData, `${pdfFileName}_project.json`);
}, [tags, relationships, descriptions, ...]);
```

**문제점:**
- 단순 덮어쓰기만 지원
- 충돌 해결 없음
- 작업 결과 손실 위험

#### **TO-BE (리팩토링 계획)**
```typescript
// stores/projectMerger.ts
class ProjectMerger {
  @observable mergeStatus: MergeStatus = 'idle';
  @observable conflicts: ConflictItem[] = [];
  @observable mergeProgress = 0;

  @action
  async mergeProjects(sourceData: ProjectData, options: MergeOptions) {
    try {
      this.mergeStatus = 'processing';
      this.conflicts = [];
      
      // 1. 사전 검증
      const validation = await this.validateMergeData(sourceData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // 2. 충돌 탐지
      const conflicts = await this.detectConflicts(sourceData);
      if (conflicts.length > 0 && !options.autoResolve) {
        this.conflicts = conflicts;
        this.mergeStatus = 'conflicts_detected';
        return { status: 'conflicts', conflicts };
      }
      
      // 3. 자동 해결
      const resolvedData = await this.resolveConflicts(sourceData, conflicts, options);
      
      // 4. 데이터 병합
      const mergedResult = await this.performMerge(resolvedData, options);
      
      // 5. 결과 검증
      const finalValidation = await this.validateMergedData(mergedResult);
      if (!finalValidation.isValid) {
        await this.rollback();
        throw new Error('Merged data validation failed');
      }
      
      // 6. Store 업데이트
      await this.applyMergedData(mergedResult);
      
      this.mergeStatus = 'completed';
      return { status: 'success', result: mergedResult };
      
    } catch (error) {
      this.mergeStatus = 'failed';
      throw error;
    }
  }
  
  private async detectConflicts(sourceData: ProjectData): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = [];
    const currentTags = tagStore.tags;
    
    // 태그 충돌 감지
    for (const sourceTag of sourceData.tags) {
      const existingTag = currentTags.find(t => 
        t.page === sourceTag.page && 
        this.isOverlapping(t.bbox, sourceTag.bbox)
      );
      
      if (existingTag && existingTag.text !== sourceTag.text) {
        conflicts.push({
          type: 'tag_conflict',
          location: { page: sourceTag.page, bbox: sourceTag.bbox },
          existing: existingTag,
          incoming: sourceTag,
          severity: this.calculateConflictSeverity(existingTag, sourceTag),
          autoResolvable: this.canAutoResolve(existingTag, sourceTag)
        });
      }
    }
    
    // 관계 충돌 감지
    for (const sourceRel of sourceData.relationships) {
      const duplicateRel = relationshipStore.relationships.find(r =>
        r.from === sourceRel.from && r.to === sourceRel.to && r.type === sourceRel.type
      );
      
      if (duplicateRel) {
        conflicts.push({
          type: 'relationship_duplicate',
          existing: duplicateRel,
          incoming: sourceRel,
          severity: 'low',
          autoResolvable: true
        });
      }
    }
    
    return conflicts;
  }
  
  private async resolveConflicts(
    sourceData: ProjectData, 
    conflicts: ConflictItem[], 
    options: MergeOptions
  ): Promise<ProjectData> {
    const resolved = { ...sourceData };
    
    for (const conflict of conflicts) {
      switch (options.conflictResolution) {
        case 'keep_existing':
          // 기존 데이터 유지, 신규 데이터 제거
          resolved.tags = resolved.tags.filter(t => t.id !== conflict.incoming.id);
          break;
          
        case 'keep_incoming':
          // 신규 데이터 적용, 기존 데이터 대체
          tagStore.deleteTag(conflict.existing.id);
          break;
          
        case 'merge_intelligent':
          // 지능적 병합 (위치가 다르면 둘 다 유지, 같으면 더 최근 것 적용)
          const mergedTag = await this.intelligentMerge(conflict.existing, conflict.incoming);
          resolved.tags = resolved.tags.map(t => 
            t.id === conflict.incoming.id ? mergedTag : t
          );
          break;
          
        case 'create_variant':
          // 변형 생성 (예: TAG-001 → TAG-001-v2)
          const variantTag = await this.createVariant(conflict.incoming);
          resolved.tags = resolved.tags.map(t => 
            t.id === conflict.incoming.id ? variantTag : t
          );
          break;
      }
    }
    
    return resolved;
  }
  
  @action
  async exportForMerging(userInfo: UserInfo, workScope: WorkScope) {
    const exportData = {
      metadata: {
        exportedBy: userInfo.id,
        exportedAt: Date.now(),
        workScope,
        version: '1.0'
      },
      projectInfo: {
        id: projectStore.currentProject.id,
        name: projectStore.currentProject.name,
        pdfChecksum: projectStore.pdfChecksum
      },
      data: {
        tags: tagStore.tags.filter(t => this.isInWorkScope(t, workScope)),
        relationships: relationshipStore.relationships.filter(r => this.isInWorkScope(r, workScope)),
        descriptions: descriptionStore.descriptions.filter(d => this.isInWorkScope(d, workScope)),
        comments: commentStore.comments.filter(c => this.isInWorkScope(c, workScope))
      }
    };
    
    return exportData;
  }
}

// 사용 예시
const mergeOptions: MergeOptions = {
  conflictResolution: 'merge_intelligent',
  autoResolve: true,
  validateResult: true,
  preserveHistory: true
};

await projectMerger.mergeProjects(importedData, mergeOptions);
```

**개선사항:**
- ✅ 지능적 충돌 탐지 및 해결
- ✅ 다양한 병합 전략 (keep_existing, keep_incoming, merge_intelligent, create_variant)
- ✅ 작업 영역 기반 부분 병합
- ✅ 롤백 지원으로 안전성 확보
- ✅ 상세한 병합 결과 리포트

### **통합 워크플로우**

```typescript
// 전체 협업 워크플로우
class CollaborationWorkflow {
  // 1. 작업 할당
  async assignWork(projectId: string, assignments: WorkAssignment[]) {
    for (const assignment of assignments) {
      await workAssignmentStore.createAssignment({
        projectId,
        userId: assignment.userId,
        scope: assignment.scope,
        type: assignment.type
      });
    }
  }
  
  // 2. 작업 진행률 추적
  @computed
  get projectProgress() {
    const assignments = workAssignmentStore.getByProject(this.currentProjectId);
    const totalProgress = assignments.reduce((sum, a) => sum + a.progress, 0);
    return totalProgress / assignments.length;
  }
  
  // 3. 작업 완료 및 통합
  async integrateWork(userId: string, workData: ProjectData) {
    // 작업 검증
    const validation = await this.validateWork(workData, userId);
    if (!validation.isValid) {
      throw new Error(`Work validation failed: ${validation.errors.join(', ')}`);
    }
    
    // 충돌 확인 및 해결
    const mergeResult = await projectMerger.mergeProjects(workData, {
      conflictResolution: 'merge_intelligent',
      autoResolve: true
    });
    
    if (mergeResult.status === 'conflicts') {
      // 수동 충돌 해결 UI 표시
      return { status: 'requires_manual_resolution', conflicts: mergeResult.conflicts };
    }
    
    // 통합 완료
    await workAssignmentStore.markCompleted(userId);
    return { status: 'integrated', result: mergeResult };
  }
}
```

---

이 문서는 리팩토링 과정에서 지속적으로 업데이트되며, 각 기능의 구현 상태와 테스트 결과를 추적합니다.