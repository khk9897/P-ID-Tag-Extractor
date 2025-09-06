// Mock tRPC Client - 백엔드 없이 프론트엔드 연동 테스트
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

// Mock 서버 응답을 시뮬레이션하는 함수들
const mockResponses = {
  // 태그 관련 API
  'tag.getAll': () => Promise.resolve([
    { id: 1, text: 'FT-101A', category: 'Instrument', page: 1, bbox: [100, 200, 180, 225] },
    { id: 2, text: 'PV-102B', category: 'Equipment', page: 1, bbox: [200, 300, 280, 325] },
    { id: 3, text: '1"-WS-001', category: 'Line', page: 2, bbox: [50, 150, 150, 175] }
  ]),
  
  'tag.create': (input) => Promise.resolve({
    id: Date.now(),
    createdAt: new Date().toISOString(),
    isReviewed: false,
    ...input
  }),
  
  'tag.update': (input) => Promise.resolve({
    success: true,
    updated: input
  }),
  
  'tag.delete': (input) => Promise.resolve({
    success: true,
    deletedId: input.id
  }),
  
  // 프로젝트 관련 API
  'project.getAll': () => Promise.resolve([
    { 
      id: 'proj-1', 
      name: 'Test Project 1', 
      pdfFileName: 'drawing-1.pdf',
      createdAt: '2024-01-15T10:30:00Z',
      tagCount: 150,
      status: 'active'
    },
    { 
      id: 'proj-2', 
      name: 'Test Project 2', 
      pdfFileName: 'drawing-2.pdf',
      createdAt: '2024-01-16T14:20:00Z',
      tagCount: 89,
      status: 'draft'
    }
  ]),
  
  'project.getById': (input) => Promise.resolve({
    id: input.id,
    name: `Project ${input.id}`,
    data: {
      tags: [
        { id: 1, text: 'FT-101A', category: 'Instrument' },
        { id: 2, text: 'PV-102B', category: 'Equipment' }
      ],
      relationships: [
        { id: 1, from: 1, to: 2, type: 'Connection' }
      ]
    }
  }),
  
  // 사용자 인증 관련 API
  'auth.login': (input) => Promise.resolve({
    success: true,
    user: {
      id: 'user-1',
      email: input.email,
      name: 'Test User'
    },
    token: 'mock-jwt-token'
  }),
  
  'auth.getProfile': () => Promise.resolve({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    preferences: {
      theme: 'light',
      sidebarWidth: 350
    }
  })
};

// Mock HTTP 링크 (실제 서버 호출 대신 mock 데이터 반환)
const mockHttpLink = () => ({
  request: ({ path, input }) => {
    console.log(`🔌 Mock tRPC Call: ${path}`, input);
    
    const mockFn = mockResponses[path];
    if (mockFn) {
      // 실제 네트워크 지연 시뮬레이션
      return new Promise(resolve => {
        setTimeout(() => {
          const result = mockFn(input);
          console.log(`✅ Mock Response for ${path}:`, result);
          resolve(result);
        }, 200 + Math.random() * 300); // 200-500ms 지연
      });
    } else {
      console.error(`❌ No mock response for: ${path}`);
      return Promise.reject(new Error(`No mock response for ${path}`));
    }
  }
});

// Mock tRPC 클라이언트 생성
export const createMockTRPCClient = () => {
  return createTRPCProxyClient({
    links: [mockHttpLink()]
  });
};

// 타입 안전성 테스트를 위한 스키마 정의 (실제로는 백엔드에서 가져옴)
export const mockAppRouter = {
  tag: {
    getAll: () => mockResponses['tag.getAll'](),
    create: (input) => mockResponses['tag.create'](input),
    update: (input) => mockResponses['tag.update'](input),
    delete: (input) => mockResponses['tag.delete'](input)
  },
  project: {
    getAll: () => mockResponses['project.getAll'](),
    getById: (input) => mockResponses['project.getById'](input)
  },
  auth: {
    login: (input) => mockResponses['auth.login'](input),
    getProfile: () => mockResponses['auth.getProfile']()
  }
};

// 사용 예시
export const trpcExample = {
  // 모든 태그 조회
  async getAllTags() {
    const client = createMockTRPCClient();
    return client.tag.getAll.query();
  },
  
  // 태그 생성
  async createTag(tagData) {
    const client = createMockTRPCClient();
    return client.tag.create.mutate(tagData);
  },
  
  // 프로젝트 조회
  async getProject(projectId) {
    const client = createMockTRPCClient();
    return client.project.getById.query({ id: projectId });
  },
  
  // 사용자 로그인
  async login(credentials) {
    const client = createMockTRPCClient();
    return client.auth.login.mutate(credentials);
  }
};

export default createMockTRPCClient;