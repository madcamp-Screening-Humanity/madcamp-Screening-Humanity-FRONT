# 구현 계획 - Screening Humanity 프로젝트 대규모 수정

현재 프로젝트의 캐릭터 선택 흐름, 배경 선택 삭제, AI 시나리오 분석 연동, 대화 프롬프트 주입, 캐릭터 생성 UX 변경 및 CRUD 기능을 구현합니다.

## 1. 백엔드 (Backend) 수정 사항

### 1.1 데이터 모델 및 CRUD 구현
- [ ] `app/models/character.py` 생성: 캐릭터 정보를 저장하는 SQLAlchemy 모델 생성.
- [ ] `app/models/user.py` 수정: 유저와 캐릭터 간의 관계(Relationship) 추가.
- [ ] `app/api/characters.py` 생성: 캐릭터 목록 조회(Preset/User), 생성, 조회, 수정, 삭제 API 구현.
- [ ] `app/main.py`: 새로운 캐릭터 라우터 등록 및 DB 테이블 생성 연동.

### 1.2 AI 분석 API 구현
- [ ] `app/api/story.py` 생성:
    - `POST /api/v1/story/analyze`: 사용자의 상황 설정 텍스트를 분석하여 드라마틱한 줄거리 생성.
    - `POST /api/v1/story/generate-character`: 캐릭터 기본 정보를 바탕으로 상세 페르소나/성격/말투 생성.
- [ ] LLM 연동: OpenAI 또는 Gemini API를 연동하여 실제 텍스트 생성 로직 구현.

### 1.3 채팅 시스템 수정
- [ ] `app/api/chat.py` 수정: 채팅 시작 시 전달된 페르소나와 상황 정보를 시스템 프롬프트에 주입하는 로직 강화.

## 2. 프론트엔드 (Frontend) 수정 사항

### 2.1 상태 관리 (Store) 변경
- [ ] `lib/store.ts`:
    - `scenario` 타입에서 `background` 제거.
    - 캐릭터 선택 시 즉시 다음 단계로 넘어가는 로직 및 선택된 캐릭터 데이터 저장 확인.

### 2.2 UI/UX 수정
- [ ] `components/character-select-modal.tsx`:
    - 캐릭터 클릭 시 확인 모달 없이 즉시 선택 및 `scenario-setup`으로 이동.
    - '저장된 캐릭터' 탭에서 수정/삭제 버튼 추가.
- [ ] `components/scenario-setup.tsx`:
    - 배경 선택(background) UI 및 관련 로직 완전히 제거.
    - 상황 입력 후 '시작하기' 클릭 시 AI 분석 API를 호출하여 줄거리 생성 후 진행.
- [ ] `components/character-creation-wizard.tsx`:
    - 'AI로 자동 생성' 버튼 제거.
    - 기본 정보 입력 후 '다음' 클릭 시 로딩 표시와 함께 백엔드 AI 생성 API 호출 및 데이터 자동 채우기.
- [ ] `components/chat-room.tsx`:
    - 첫 메시지 시작 시 시스템 프롬프트(페르소나 + 줄거리)가 잘 적용되도록 수정.

### 2.3 API 연동
- [ ] `lib/api/client.ts`: 
    - 새로 구현된 백엔드 캐릭터 CRUD 및 스토리 분석 API 엔드포인트 연동.

## 3. 작업 순서
1. **백엔드 모델 및 DB 설정**: 캐릭터 테이블 생성.
2. **백엔드 캐릭터 CRUD API**: 기본 기능 구현.
3. **백엔드 AI 분석 API**: LLM 연동 및 엔드포인트 구현.
4. **프론트엔드 API 클라이언트**: 백엔드와 연동 준비.
5. **프론트엔드 UI 수정**: 배경 제거, 선택 흐름 변경, 캐릭터 생성 UX 변경.
6. **통합 테스트 및 디버깅**: 전체 흐름 확인.
