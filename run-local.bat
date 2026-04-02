@echo off
cd /d %~dp0
call npm config set registry https://registry.npmjs.org/
if not exist node_modules (
  echo Installing backend and frontend dependencies from npmjs...
  call npm install --registry=https://registry.npmjs.org/
) else (
  if not exist frontend
ode_modules (
    echo Installing frontend dependencies from npmjs...
    call npm --prefix frontend install --registry=https://registry.npmjs.org/
  )
)
echo Building React frontend and starting server on http://localhost:3000 ...
call npm start
pause
