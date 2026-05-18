# 프로젝트 아키텍처 (통신 흐름)

분석된 `docker-compose.yml`, `main.py`, `App.js` 설정 코드를 바탕으로 구성한 프론트엔드, 백엔드, 데이터베이스 간의 통신 흐름 아키텍처 다이어그램입니다.

```mermaid
graph TD
    %% 접속자
    User((Web Browser))
    
    %% 서비스 구성 요소
    subgraph Docker Compose Environment
        Frontend["Frontend Service<br/>(React)"]
        Backend["Backend Service<br/>(FastAPI)"]
        DB[("Database Service<br/>MySQL 8.0")]
    end
    
    %% 프론트 접속
    User -->|"1. 웹페이지 접속<br/>(http://localhost:3000)"| Frontend
    
    %% 프론트엔드 -> 백엔드 통신 (Axios API 요청)
    User -.->|"2. API 요청 (Axios)<br/>GET / POST / PUT / DELETE<br/>(http://localhost:8000/api/*)"| Backend
    Backend -.->|"5. JSON 데이터 응답<br/>(CORS 허용: localhost:3000)"| User
    
    %% 백엔드 -> DB 통신 (SQLAlchemy ORM)
    Backend -->|"3. SQL 쿼리 실행<br/>(SQLAlchemy ORM, TCP 3306)"| DB
    DB -.->|"4. 데이터 반환"| Backend

    %% 노드 스타일링
    style User fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000
    style Frontend fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000
    style Backend fill:#05998b,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#e48e00,stroke:#333,stroke-width:2px,color:#fff
```

```mermaid
classDiagram
    class App {
        +fetchUserData()
        +refreshUserData()
        +navigateTo(next)
        +login()
        +logout()
        +addAssignment(newAssignment)
        +updateAssignment(updatedAssignment)
        +deleteAssignment(assignmentId)
        +toggleAssignmentComplete(assignmentId)
        +openAssignmentFromSidebar(assignment)
        +clearOpenAssignmentDate()
        +renderContent(p)
    }

    class Timetable {
        +showMessage(text, type)
        +changeLectureType(nextType)
        +changeCollege(nextCollege)
        +changeDivision(nextDivision)
        +changeLiberalType(nextType)
        +hasConflict(newEntries)
        +updateActivePlan(updater)
        +addLecture(lecture)
        +deleteLecture(lectureId)
        +clearLectures()
        +openSavedPlan(planKey)
        +saveTimetable()
    }

    class AssignmentPage {
        +resetForm(date)
        +movePrevMonth()
        +moveNextMonth()
        +selectDate(dateKey)
        +goBackToCalendar()
        +addCustomChecklist()
        +removeChecklistItem(itemId)
        +toggleFormChecklist(itemId)
        +handleSubmit(e)
        +handleChecklistChange(assignmentId, itemId)
    }

    class GradeCalculator {
        +updateStat(key, val)
        +scoreToGrade(score)
        +calcRisk(course)
    }

    class EnrollmentPage {
        +generateCode()
        +enrollCourse(course)
        +cancelCourse(course)
        +handleAction(action, course)
    }

    class MyPage {
        +onLogin()
        +onLogout()
    }

    class AcademicSection {
        +AcademicSection(enrolledCourses)
    }

    class Sidebar {
        +onLogin()
        +onLogout()
        +onToggleAssignmentComplete()
        +onOpenAssignment()
    }

    class Navbar {
        +onNavigate(activePage)
    }

    App --> Navbar : props(activePage, navigateTo)
    App --> Sidebar : props(login, logout, toggleAssignmentComplete, openAssignmentFromSidebar)
    App --> Timetable : props(refreshUserData, activePlan)
    App --> GradeCalculator : props(savedLectures, assignments)
    App --> AssignmentPage : props(addAssignment, updateAssignment, deleteAssignment, toggleAssignmentComplete)
    App --> EnrollmentPage : props(lectureCatalog, savedPlans)
    App --> MyPage : props(login, logout)
    App --> AcademicSection : props(enrolledCourses)
```

### 아키텍처 상세 설명

1. **Frontend (`web` 서비스)** 
   * **환경**: React 기반 (포트 `3000`)
   * **역할**: 클라이언트에게 UI를 렌더링하고 사용자 입력을 받습니다. 내부적으로 `Axios` 라이브러리를 사용하여 백엔드 서버(`API_BASE_URL: http://localhost:8000`)에 RESTful API를 호출합니다.

2. **Backend (`backend` 서비스)**
   * **환경**: Python FastAPI 기반 (포트 `8000`)
   * **역할**: 프론트엔드의 요청을 받아 비즈니스 로직을 처리합니다. `main.py`에 구성된 CORS 미들웨어를 통해 `http://localhost:3000` (프론트엔드)에서 오는 교차 출처 요청을 안전하게 허용합니다. 요청 처리를 위해 `SQLAlchemy` ORM을 사용하여 DB와 소통합니다.

3. **Database (`db` 서비스)**
   * **환경**: MySQL 8.0 (포트 `3306`)
   * **역할**: `docker-compose.yml`에서 설정된 `univ_db` 데이터베이스에 과제, 시간표, 사용자 정보 등을 영구적으로 저장합니다. 백엔드가 DB 헬스체크를 통과한 후 연결되어 테이블 생성 및 시드 데이터 주입을 진행합니다.
