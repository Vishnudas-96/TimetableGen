@echo off
echo Stopping Timetable servers...
taskkill /f /fi "WINDOWTITLE eq Timetable Backend*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Timetable Frontend*" >nul 2>&1
taskkill /f /im "python.exe" /fi "WINDOWTITLE eq Timetable*" >nul 2>&1
echo Done.
pause
