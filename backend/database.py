"""
database.py - 데이터베이스 연결 설정 모듈

SQLAlchemy를 사용하여 MySQL 데이터베이스와의 연결을 설정합니다.
Docker 환경에서 실행되는 MySQL 컨테이너에 접속하기 위한 설정을 포함합니다.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =============================================================================
# 데이터베이스 연결 URL 설정
# =============================================================================
# MySQL 접속 주소 (도커 환경 기준)
# 형식: mysql+pymysql://유저이름:비밀번호@도커컨테이너이름:포트/데이터베이스이름
# - mysql+pymysql: MySQL 데이터베이스에 pymysql 드라이버로 접속
# - root:rootdpassword: 데이터베이스 접속 계정 정보
# - db:3306: Docker Compose에서 정의된 DB 서비스명과 MySQL 기본 포트
# - univ_db: 사용할 데이터베이스 이름
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:rootdpassword@db:3306/univ_db"

# =============================================================================
# SQLAlchemy 핵심 객체 생성
# =============================================================================

# Engine: 데이터베이스와 직접적인 통신을 담당하는 핵심 엔진
# - 커넥션 풀(Connection Pool)을 관리하여 효율적인 DB 연결 재사용
# - SQL 쿼리를 실제 데이터베이스로 전송하는 역할
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal: 데이터베이스 세션 팩토리
# - 각 API 요청마다 새로운 세션을 생성하여 트랜잭션을 관리
# - autocommit=False: 명시적으로 commit()을 호출해야 변경사항이 저장됨
# - autoflush=False: 쿼리 실행 전 자동으로 flush하지 않음 (성능 최적화)
# - bind=engine: 위에서 생성한 엔진과 연결
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: 모든 ORM 모델 클래스의 부모 클래스
# - models.py에서 정의하는 User, Lecture 등의 클래스가 이를 상속받음
# - SQLAlchemy가 이 Base를 통해 테이블 구조를 인식하고 자동 생성
# - Base.metadata.create_all(engine) 호출 시 상속받은 모든 모델의 테이블 생성
Base = declarative_base()
