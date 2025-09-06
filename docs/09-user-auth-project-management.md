# P&ID Smart Digitizer 사용자 인증 & 프로젝트 관리 UI 설계서

## 📋 개요

P&ID Smart Digitizer의 다중 사용자 지원을 위한 사용자 인증 시스템과 프로젝트 관리 UI 설계서입니다. 로그인, 회원가입, 프로젝트 선택/생성, 협업 관리 등의 사용자 인터페이스와 워크플로우를 정의합니다.

---

## 🎯 핵심 요구사항

### 1. **사용자 인증 시스템**
- **로그인/회원가입**: 이메일 기반 계정 시스템
- **프로필 관리**: 사용자 정보, 환경 설정
- **세션 관리**: 자동 로그인, 보안 세션 유지
- **권한 관리**: 역할별 접근 권한 제어

### 2. **프로젝트 관리 시스템**
- **프로젝트 생성/선택**: PDF 업로드 및 프로젝트 초기화
- **프로젝트 목록**: 개인/공유 프로젝트 구분 표시
- **협업자 관리**: 사용자 초대, 권한 설정
- **작업 할당**: 페이지별, 카테고리별 작업 분담

### 3. **협업 워크플로우**
- **작업 진행률**: 개인/전체 진행 상황 대시보드
- **통합 관리**: 작업 결과 병합 및 충돌 해결
- **알림 시스템**: 작업 완료, 충돌 발생 알림

---

## 🏗️ UI 컴포넌트 구조

### **1. 인증 화면 구조**

```
src/components/auth/
├── AuthLayout.tsx              # 인증 화면 레이아웃
├── LoginForm.tsx               # 로그인 폼
├── SignupForm.tsx              # 회원가입 폼
├── ForgotPasswordForm.tsx      # 비밀번호 찾기
├── UserProfile.tsx             # 사용자 프로필
└── SessionGuard.tsx            # 인증 가드 컴포넌트
```

### **2. 프로젝트 관리 구조**

```
src/components/project/
├── ProjectDashboard.tsx        # 프로젝트 대시보드
├── ProjectList.tsx             # 프로젝트 목록
├── ProjectCard.tsx             # 프로젝트 카드
├── ProjectSelector.tsx         # 프로젝트 선택기
├── CreateProjectModal.tsx      # 프로젝트 생성 모달
├── ProjectSettings.tsx         # 프로젝트 설정
├── CollaboratorManager.tsx     # 협업자 관리
└── WorkAssignmentPanel.tsx     # 작업 할당 패널
```

### **3. 협업 관리 구조**

```
src/components/collaboration/
├── IntegrationDashboard.tsx    # 통합 대시보드
├── MergeConflictModal.tsx      # 병합 충돌 해결
├── WorkProgressPanel.tsx       # 작업 진행률 패널
├── NotificationCenter.tsx      # 알림 센터
└── ActivityFeed.tsx            # 활동 피드
```

---

## 🎨 UI/UX 설계

### **1. 로그인 화면**

#### **LoginForm.tsx**
```typescript
interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onSignup: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSignup, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">P&ID Smart Digitizer</h1>
          <p className="text-slate-400">Engineering Document Processing Platform</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이메일을 입력하세요"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-300">로그인 상태 유지</span>
            </label>
            
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <div className="mt-6 text-center">
          <p className="text-slate-400">
            계정이 없으신가요?{' '}
            <button onClick={onSignup} className="text-blue-400 hover:text-blue-300 font-medium">
              회원가입
            </button>
          </p>
        </div>

        {/* 게스트 로그인 (개발용) */}
        <div className="mt-4 text-center">
          <button
            onClick={() => onLogin({ email: 'guest@example.com', password: 'guest' })}
            className="text-slate-500 hover:text-slate-400 text-sm"
          >
            게스트로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};
```

### **2. 프로젝트 대시보드**

#### **ProjectDashboard.tsx**
```typescript
interface ProjectDashboardProps {
  user: User;
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
  user, 
  onSelectProject, 
  onCreateProject 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = useMemo(() => {
    return projects
      .filter(project => {
        if (filter === 'owned') return project.ownerId === user.id;
        if (filter === 'shared') return project.ownerId !== user.id;
        return true;
      })
      .filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [projects, filter, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 헤더 */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">P&ID Smart Digitizer</h1>
              <p className="text-slate-400">안녕하세요, {user.displayName}님!</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={onCreateProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>새 프로젝트</span>
              </button>
              
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 및 검색 */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            {['all', 'owned', 'shared'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as any)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === filterType
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {filterType === 'all' && '전체'}
                {filterType === 'owned' && '내 프로젝트'}
                {filterType === 'shared' && '공유받은 프로젝트'}
              </button>
            ))}
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 프로젝트 그리드 */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUser={user}
                onClick={() => onSelectProject(project)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-2 text-sm font-medium text-slate-400">프로젝트가 없습니다</h3>
            <p className="mt-1 text-sm text-slate-500">새 프로젝트를 생성하여 시작하세요.</p>
            <div className="mt-6">
              <button
                onClick={onCreateProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                첫 번째 프로젝트 만들기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
```

### **3. 프로젝트 카드**

#### **ProjectCard.tsx**
```typescript
interface ProjectCardProps {
  project: Project;
  currentUser: User;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, currentUser, onClick }) => {
  const isOwner = project.ownerId === currentUser.id;
  const collaboratorCount = project.collaborators?.length || 0;
  
  return (
    <div
      onClick={onClick}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer hover:shadow-xl"
    >
      {/* 프로젝트 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white truncate">{project.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{project.pdfFileName}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {isOwner ? (
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
              소유자
            </span>
          ) : (
            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
              협업자
            </span>
          )}
        </div>
      </div>

      {/* 프로젝트 통계 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-sm text-slate-400">페이지</div>
          <div className="text-xl font-bold text-white">{project.pageCount}</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-sm text-slate-400">진행률</div>
          <div className="text-xl font-bold text-white">{project.completionPercentage}%</div>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mb-4">
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${project.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 프로젝트 상태 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <UsersIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">{collaboratorCount + 1}명 참여</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">{formatDate(project.lastAccessedAt)}</span>
        </div>
      </div>

      {/* 협업자 아바타 */}
      {collaboratorCount > 0 && (
        <div className="flex items-center mt-4 -space-x-2">
          {project.collaborators.slice(0, 3).map((collaborator) => (
            <div
              key={collaborator.id}
              className="w-8 h-8 bg-slate-600 rounded-full border-2 border-slate-800 flex items-center justify-center"
            >
              <span className="text-xs text-white font-medium">
                {collaborator.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
          {collaboratorCount > 3 && (
            <div className="w-8 h-8 bg-slate-600 rounded-full border-2 border-slate-800 flex items-center justify-center">
              <span className="text-xs text-white font-medium">+{collaboratorCount - 3}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### **4. 작업 할당 패널**

#### **WorkAssignmentPanel.tsx**
```typescript
interface WorkAssignmentPanelProps {
  project: Project;
  collaborators: User[];
  assignments: WorkAssignment[];
  onAssignWork: (assignment: CreateWorkAssignmentRequest) => Promise<void>;
  onUpdateProgress: (assignmentId: string, progress: number) => Promise<void>;
}

export const WorkAssignmentPanel: React.FC<WorkAssignmentPanelProps> = ({
  project,
  collaborators,
  assignments,
  onAssignWork,
  onUpdateProgress
}) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'pages' | 'categories'>('pages');
  const [assignmentScope, setAssignmentScope] = useState<any>({});

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">작업 할당 관리</h3>
        <button
          onClick={() => setIsAssigning(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>작업 할당</span>
        </button>
      </div>

      {/* 전체 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-300">전체 프로젝트 진행률</span>
          <span className="text-sm text-slate-400">{project.completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
            style={{ width: `${project.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 할당 목록 */}
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {assignment.assignedUser.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-white">{assignment.assignedUser.displayName}</div>
                  <div className="text-sm text-slate-400">
                    {assignment.type === 'pages' && `페이지 ${assignment.scope.pages.join(', ')}`}
                    {assignment.type === 'categories' && `카테고리: ${assignment.scope.categories.join(', ')}`}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  assignment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  assignment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                  assignment.status === 'assigned' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {assignment.status === 'completed' && '완료'}
                  {assignment.status === 'in_progress' && '진행중'}
                  {assignment.status === 'assigned' && '할당됨'}
                  {assignment.status === 'reviewed' && '검토완료'}
                </span>
                <span className="text-sm text-slate-400">{assignment.progressPercentage}%</span>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  assignment.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${assignment.progressPercentage}%` }}
              />
            </div>

            {/* 할당 세부사항 */}
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400">할당일:</span>
                <div className="text-white">{formatDate(assignment.assignedAt)}</div>
              </div>
              <div>
                <span className="text-slate-400">예상 시간:</span>
                <div className="text-white">{assignment.estimatedHours}시간</div>
              </div>
              <div>
                <span className="text-slate-400">우선순위:</span>
                <div className="text-white capitalize">{assignment.priority}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 작업 할당 모달 */}
      {isAssigning && (
        <CreateWorkAssignmentModal
          project={project}
          collaborators={collaborators}
          onAssign={onAssignWork}
          onClose={() => setIsAssigning(false)}
        />
      )}
    </div>
  );
};
```

---

## 🔄 사용자 워크플로우

### **1. 첫 방문 사용자**
```
1. 로그인 화면 → 회원가입 → 이메일 인증
2. 첫 프로젝트 생성 → PDF 업로드 → 자동 태그 추출
3. 기본 설정 (패턴, 색상) → 작업 시작
```

### **2. 기존 사용자**
```
1. 로그인 → 프로젝트 대시보드
2. 프로젝트 선택 또는 새 프로젝트 생성
3. 협업자 초대 (필요시) → 작업 할당
4. 개별 작업 → 결과 통합
```

### **3. 협업자 워크플로우**
```
1. 초대 링크로 접근 → 회원가입/로그인
2. 프로젝트 권한 확인 → 할당된 작업 확인
3. 담당 영역 작업 완료 → 결과 내보내기
4. 프로젝트 관리자가 통합 → 최종 검토
```

---

## 📱 반응형 설계

### **모바일 최적화**
- **단일 컬럼 레이아웃**: 작은 화면에서 세로 배치
- **터치 친화적**: 44px 이상 터치 영역
- **간소화된 네비게이션**: 햄버거 메뉴, 바텀 네비게이션
- **스와이프 제스처**: 프로젝트 카드 스와이프로 액션 메뉴

### **태블릿 최적화**
- **2컬럼 레이아웃**: 프로젝트 카드 그리드
- **사이드바 네비게이션**: 고정 사이드바 메뉴
- **분할 화면**: 프로젝트 목록 + 상세보기

---

## 🔒 보안 고려사항

### **1. 인증 보안**
- **JWT 토큰**: 액세스/리프레시 토큰 분리
- **세션 만료**: 24시간 자동 만료, 갱신 가능
- **브루트 포스 방지**: 5회 실패시 5분 잠금
- **2FA 지원**: 향후 확장 계획

### **2. 데이터 보안**
- **권한 검증**: 모든 API 요청 권한 확인
- **데이터 암호화**: 민감 데이터 암호화 저장
- **감사 로그**: 모든 중요 작업 로그 기록

---

## 🎯 성능 최적화

### **1. 로딩 성능**
- **지연 로딩**: 프로젝트 카드 이미지 지연 로딩
- **가상화**: 프로젝트 목록 가상 스크롤
- **캐싱**: 프로젝트 메타데이터 로컬 캐시

### **2. 사용자 경험**
- **로딩 스켈레톤**: 데이터 로딩 중 스켈레톤 UI
- **낙관적 업데이트**: UI 즉시 업데이트 후 서버 동기화
- **에러 복구**: 네트워크 에러시 자동 재시도

---

## 📋 구현 우선순위

### **Phase 1: 기본 인증 시스템 (1주)**
- [ ] 로그인/회원가입 UI
- [ ] 사용자 인증 Store (Zustand)
- [ ] 세션 관리 시스템
- [ ] 기본 프로필 관리

### **Phase 2: 프로젝트 관리 (1주)**
- [ ] 프로젝트 대시보드 UI
- [ ] 프로젝트 생성/선택 기능
- [ ] 프로젝트 목록 관리
- [ ] 기본 협업자 관리

### **Phase 3: 협업 기능 (2주)**
- [ ] 작업 할당 시스템
- [ ] 진행률 추적 대시보드
- [ ] 프로젝트 병합 UI
- [ ] 충돌 해결 인터페이스

### **Phase 4: 고급 기능 (1주)**
- [ ] 알림 시스템
- [ ] 활동 피드
- [ ] 고급 검색/필터
- [ ] 모바일 최적화

---

이 설계서는 P&ID Smart Digitizer의 다중 사용자 지원을 위한 완전한 UI/UX 가이드라인을 제공하며, 리팩토링과 함께 점진적으로 구현됩니다.