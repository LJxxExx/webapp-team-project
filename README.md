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


graph TB
    subgraph Frontend ["Frontend (React)"]
        App["App.js"] --> Nav["Navbar"]
        App --> Sidebar["Sidebar"]
        App --> Timetable["Timetable"]
        App --> GradeCalc["GradeCalculator"]
        App --> AssignPage["AssignmentPage"]
        App --> EnrollPage["EnrollmentPage"]
        App --> MyPage["MyPage"]
        App --> Academic["AcademicSection"]
    end

    subgraph Backend ["Backend (FastAPI)"]
        Main["main.py (Endpoints)"]
        Models["models.py (ORM Models)"]
        DBEngine["database.py (DB Engine)"]
        
        Main -.-> Models
        Models -.-> DBEngine
        
        subgraph APIs ["APIs"]
            ApiLec["/api/lectures"]
            ApiTime["/api/users/{id}/timetable"]
            ApiEnroll["/api/users/{id}/enrollments"]
            ApiAssign["/api/users/{id}/assignments"]
            ApiAssignId["/api/assignments/{id}"]
        end
        
        Main --- ApiLec
        Main --- ApiTime
        Main --- ApiEnroll
        Main --- ApiAssign
        Main --- ApiAssignId
    end

    subgraph Database ["Database (MySQL)"]
        UserTbl["User Table"]
        AssignTbl["Assignment Table"]
        EnrollTbl["Enrollment Table"]
        LecTbl["Lecture Table"]
        LecMeetTbl["LectureMeeting Table"]
    end

    %% Communication (프론트 -> 백엔드)
    App -- "Axios (HTTP/JSON)" --> Main
    
    %% Relationships (백엔드 -> DB)
    Models --- UserTbl
    Models --- AssignTbl
    Models --- EnrollTbl
    Models --- LecTbl
    Models --- LecMeetTbl

    UserTbl -- "1:N" --> AssignTbl
    UserTbl -- "1:N" --> EnrollTbl
    LecTbl -- "1:N" --> EnrollTbl
    LecTbl -- "1:N" --> LecMeetTbl
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
