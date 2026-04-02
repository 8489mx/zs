@echo off
cd /d %~dp0
if exist data\zstore.db del /f /q data\zstore.db
if exist data\zstore.db-shm del /f /q data\zstore.db-shm
if exist data\zstore.db-wal del /f /q data\zstore.db-wal
echo Database deleted. Start the app again to recreate it.
pause
