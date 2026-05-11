from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# MySQL 접속 주소 (도커 환경 기준)
# 형식: mysql+pymysql://유저이름:비밀번호@도커컨테이너이름:포트/데이터베이스이름
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:rootdpassword@db:3306/univ_db"

# Engine: 데이터베이스와 직접적인 통신을 담당하는 핵심 엔진
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal: 나중에 데이터를 넣고 뺄 때 사용할 임시 대화 창구
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: 우리가 만든 models.py의 클래스들이 상속받을 부모 (이걸 통해 테이블을 인식함)
Base = declarative_base()