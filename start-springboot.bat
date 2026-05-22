@echo off
echo ============================================================
echo   AI-Powered Document Audit System — Spring Boot + React
echo ============================================================

set MVN=C:\Users\USER\.m2\wrapper\dists\apache-maven-3.9.12\59fe215c0ad6947fea90184bf7add084544567b927287592651fda3782e0e798\bin\mvn.cmd

echo.
echo [1/2] Starting Spring Boot backend on http://localhost:8080
cd /d "%~dp0backend-spring"
start "Spring Boot API" cmd /k "%MVN% spring-boot:run -q"

echo.
echo [2/2] Starting React frontend on http://localhost:3000
cd /d "%~dp0frontend"
start "React Frontend" cmd /k "npm start"

echo.
echo ============================================================
echo   System starting... Please wait 30-60 seconds
echo   Backend:  http://localhost:8080/api/status
echo   Frontend: http://localhost:3000
echo   Swagger:  http://localhost:8080/swagger-ui.html
echo.
echo   Default Accounts:
echo     admin@audit.local    / admin123    (Administrator)
echo     auditor@audit.local  / auditor123  (Auditor)
echo     manager@audit.local  / manager123  (Document Manager)
echo     viewer@audit.local   / viewer123   (Viewer)
echo ============================================================
pause
