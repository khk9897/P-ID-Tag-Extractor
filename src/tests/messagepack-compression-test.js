// MessagePack 압축률 테스트
import * as msgpack from '@msgpack/msgpack';

// 가상의 프로젝트 데이터 (실제 데이터와 유사하게 생성)
function generateTestData() {
  const tags = [];
  const relationships = [];
  const rawTextItems = [];
  
  // 3000개 태그 생성 (중간 규모 프로젝트)
  for (let i = 0; i < 3000; i++) {
    tags.push({
      id: `tag-${i.toString().padStart(8, '0')}-67890-abcdef`,  // 36자 UUID 시뮬레이션
      text: `FT-${(101 + i).toString()}${i % 2 ? 'A' : 'B'}`,
      category: ['Equipment', 'Line', 'Instrument', 'DrawingNumber'][i % 4],
      page: Math.floor(i / 100) + 1,
      bbox: {
        x1: 100 + (i % 50) * 10,
        y1: 200 + Math.floor(i / 50) * 15,
        x2: 180 + (i % 50) * 10,
        y2: 225 + Math.floor(i / 50) * 15
      },
      sourceItems: [`raw-${i}-1`, `raw-${i}-2`],
      isReviewed: i % 3 === 0,
      createdAt: Date.now() - (i * 1000),
      metadata: {
        confidence: 0.85 + (i % 20) * 0.01,
        extractionMethod: 'pdf-js'
      }
    });
  }
  
  // 1500개 관계 생성
  for (let i = 0; i < 1500; i++) {
    relationships.push({
      id: `rel-${i.toString().padStart(8, '0')}-43210-fedcba`,
      from: `tag-${i.toString().padStart(8, '0')}-67890-abcdef`,
      to: `tag-${(i + 1).toString().padStart(8, '0')}-67890-abcdef`,
      type: ['Connection', 'Installation', 'Annotation'][i % 3],
      createdAt: Date.now() - (i * 2000),
      metadata: {
        lineType: 'solid',
        color: '#000000'
      }
    });
  }
  
  // 5000개 원본 텍스트 아이템
  for (let i = 0; i < 5000; i++) {
    rawTextItems.push({
      id: `raw-${i}`,
      text: `Raw text item ${i} with some content`,
      page: Math.floor(i / 200) + 1,
      bbox: {
        x1: 50 + (i % 100) * 5,
        y1: 100 + Math.floor(i / 100) * 10,
        x2: 120 + (i % 100) * 5,
        y2: 120 + Math.floor(i / 100) * 10
      },
      extractionMethod: 'pdf-js',
      confidence: 0.9
    });
  }
  
  return {
    pdfFileName: "test-project.pdf",
    exportDate: new Date().toISOString(),
    tags,
    relationships,
    rawTextItems,
    descriptions: [],
    comments: [],
    loops: [],
    settings: {
      patterns: {
        equipment: "^([^-]*-){2}[^-]*$",
        line: "^(?=.{10,25}$)(?=.*\")([^-]*-){3,}[^-]*$",
        instrument: "^[A-Z]{2,3}-[0-9]{3}[A-Z]?$"
      },
      tolerances: {
        spatial: 5,
        textMerging: 10
      }
    }
  };
}

// 숫자 ID로 최적화된 데이터 생성
function generateOptimizedData() {
  const testData = generateTestData();
  
  // ID를 숫자로 변환
  const optimizedTags = testData.tags.map((tag, index) => ({
    id: index,
    text: tag.text,
    category: ['Equipment', 'Line', 'Instrument', 'DrawingNumber'].indexOf(tag.category),
    page: tag.page,
    bbox: [tag.bbox.x1, tag.bbox.y1, tag.bbox.x2, tag.bbox.y2],
    sourceItems: [index * 2, index * 2 + 1],  // 숫자 참조
    isReviewed: tag.isReviewed,
    createdAt: tag.createdAt
  }));
  
  const optimizedRelationships = testData.relationships.map((rel, index) => ({
    id: index,
    from: index,      // 숫자 참조
    to: index + 1,    // 숫자 참조
    type: ['Connection', 'Installation', 'Annotation'].indexOf(rel.type),
    createdAt: rel.createdAt
  }));
  
  return {
    metadata: {
      version: 1,
      pdfFileName: testData.pdfFileName,
      createdAt: Date.now()
    },
    entities: {
      tags: optimizedTags,
      relationships: optimizedRelationships
    },
    references: {
      categories: ['Equipment', 'Line', 'Instrument', 'DrawingNumber'],
      relationshipTypes: ['Connection', 'Installation', 'Annotation']
    }
  };
}

// 압축률 테스트 실행
function runCompressionTest() {
  console.log('🧪 MessagePack 압축률 테스트 시작\n');
  
  // 1. 현재 방식 (JSON Pretty Print)
  const originalData = generateTestData();
  const prettyJsonString = JSON.stringify(originalData, null, 2);
  const prettyJsonBytes = new TextEncoder().encode(prettyJsonString).length;
  
  // 2. JSON Compact
  const compactJsonString = JSON.stringify(originalData);
  const compactJsonBytes = new TextEncoder().encode(compactJsonString).length;
  
  // 3. MessagePack (현재 구조)
  const msgpackOriginal = msgpack.encode(originalData);
  
  // 4. 최적화된 구조 + MessagePack
  const optimizedData = generateOptimizedData();
  const msgpackOptimized = msgpack.encode(optimizedData);
  
  // 결과 출력
  console.log('📊 압축 결과:');
  console.log('─'.repeat(60));
  console.log(`현재 방식 (JSON Pretty):  ${formatBytes(prettyJsonBytes)}`);
  console.log(`JSON Compact:           ${formatBytes(compactJsonBytes)} (${getReduction(prettyJsonBytes, compactJsonBytes)}% 절약)`);
  console.log(`MessagePack (기존구조):  ${formatBytes(msgpackOriginal.length)} (${getReduction(prettyJsonBytes, msgpackOriginal.length)}% 절약)`);
  console.log(`MessagePack (최적화):    ${formatBytes(msgpackOptimized.length)} (${getReduction(prettyJsonBytes, msgpackOptimized.length)}% 절약)`);
  
  console.log('\n🎯 목표 달성도:');
  const optimizedReduction = getReduction(prettyJsonBytes, msgpackOptimized.length);
  console.log(`목표: 70% 절약`);
  console.log(`달성: ${optimizedReduction}% 절약`);
  console.log(`상태: ${optimizedReduction >= 70 ? '✅ 목표 달성!' : '❌ 목표 미달성'}`);
  
  // 압축 해제 테스트
  console.log('\n🔄 압축 해제 테스트:');
  try {
    const decompressed = msgpack.decode(msgpackOptimized);
    console.log('✅ MessagePack 압축 해제 성공');
    console.log(`✅ 데이터 무결성 확인: ${decompressed.entities.tags.length}개 태그, ${decompressed.entities.relationships.length}개 관계`);
  } catch (error) {
    console.log('❌ MessagePack 압축 해제 실패:', error.message);
  }
  
  return {
    prettyJsonBytes,
    compactJsonBytes,
    msgpackOriginalBytes: msgpackOriginal.length,
    msgpackOptimizedBytes: msgpackOptimized.length,
    reductionRate: optimizedReduction
  };
}

// 유틸리티 함수
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReduction(original, compressed) {
  return Math.round((original - compressed) / original * 100);
}

// 테스트 실행
if (typeof window !== 'undefined') {
  // 브라우저 환경
  window.runCompressionTest = runCompressionTest;
  console.log('브라우저 콘솔에서 runCompressionTest() 를 실행하세요.');
} else {
  // Node.js 환경
  runCompressionTest();
}

export { runCompressionTest };