import React from 'react';
import './App.css';

/*
메인페이지 예시

*/
function App() {
  return (
    <div className="container">
      {/* 네비게이션 영역 */}
      <header>
        <nav>
          <ul>
            <li><a href="#none">메인</a></li>
            <li><a href="#none">학점 계산기</a></li>
            <li><a href="#none">과제</a></li>
            <li><a href="#none">수강신청 연습</a></li>
            <li><a href="#none">마이페이지</a></li>
          </ul>
        </nav>
      </header>

      {/* 본문 영역 */}
      <div className="main-layout">
        
        {/* 좌측 사이드바 */}
        <div className="left-column">
          <div className="box">
            내 정보
          </div>
          
          <div className="box">
            <h2 className="box-title">과제 요약</h2>
            <ul className="reminder-list">
              <li>
                <input type="checkbox" id="task1" />
                <label htmlFor="task1">
                  컴퓨터구조 레포트 제출
                  <span className="deadline">오늘 23:59 까지</span>
                </label>
              </li>
              <li>
                <input type="checkbox" id="task2" />
                <label htmlFor="task2">
                  운영체제 프로세스 스케줄링 구현
                  <span className="deadline">D-3</span>
                </label>
              </li>
              <li>
                <input type="checkbox" id="task3" />
                <label htmlFor="task3">
                  데이터구조 알고리즘 문제 풀이
                  <span className="deadline">D-5</span>
                </label>
              </li>
            </ul>
          </div>
        </div>

        {/* 우측 메인 콘텐츠 */}
        <div className="right-column">
          <div className="box">
            <div className="timetable-header-wrap">
              <h2>시간표</h2>
              <button className="btn-settings">시간표 설정</button>
            </div>
            
            <table className="timetable">
              <thead>
                <tr>
                  <th className="time-col">시간</th>
                  <th>월</th>
                  <th>화</th>
                  <th>수</th>
                  <th>목</th>
                  <th>금</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="time-col">09:00</td>
                  <td></td>
                  <td><div className="subject">운영체제</div></td>
                  <td></td>
                  <td><div className="subject">운영체제</div></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="time-col">10:00</td>
                  <td></td>
                  <td><div className="subject">운영체제</div></td>
                  <td></td>
                  <td><div className="subject">운영체제</div></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="time-col">11:00</td>
                  <td><div className="subject">컴퓨터구조</div></td>
                  <td></td>
                  <td><div className="subject">컴퓨터구조</div></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="time-col">12:00</td>
                  <td><div className="subject">컴퓨터구조</div></td>
                  <td></td>
                  <td><div className="subject">컴퓨터구조</div></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="time-col">13:00</td>
                  <td colSpan="5" style={{ backgroundColor: '#fafafa', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                    점심 시간
                  </td>
                </tr>
                <tr>
                  <td className="time-col">14:00</td>
                  <td></td>
                  <td><div className="subject">데이터구조</div></td>
                  <td></td>
                  <td><div className="subject">데이터구조</div></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="time-col">15:00</td>
                  <td></td>
                  <td><div className="subject">데이터구조</div></td>
                  <td></td>
                  <td><div className="subject">데이터구조</div></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="time-col">16:00</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><div className="subject">알고리즘특강</div></td>
                </tr>
                <tr>
                  <td className="time-col">17:00</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><div className="subject">알고리즘특강</div></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="box academic-resources">
            <h2 className="box-title">학술 자료</h2>
            <p>학술 논문 및 관련 자료 검색</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;