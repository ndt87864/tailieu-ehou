@echo off
echo.
echo  Building Tailieu Questions Chrome Extension...
echo.

set EXTENSION_DIR=c:\tailieu\src\chrome-extension
set BUILD_DIR=c:\tailieu\chrome-extension-build
set ARCHIVE_NAME=tailieu-questions-extension.zip

echo  Extension directory: %EXTENSION_DIR%
echo.

REM Check if extension directory exists
if not exist "%EXTENSION_DIR%" (
    echo Extension directory not found: %EXTENSION_DIR%
    pause
    exit /b 1
)

REM Clean previous build
echo  Cleaning previous build...
if exist "%BUILD_DIR%" (
    rmdir /s /q "%BUILD_DIR%"
)

REM Create build directory
mkdir "%BUILD_DIR%"

REM Copy files to build directory
echo  Copying extension files...
copy "%EXTENSION_DIR%\manifest.json" "%BUILD_DIR%\"
copy "%EXTENSION_DIR%\popup.html" "%BUILD_DIR%\"
copy "%EXTENSION_DIR%\popup.js" "%BUILD_DIR%\"
copy "%EXTENSION_DIR%\content.js" "%BUILD_DIR%\"
copy "%EXTENSION_DIR%\styles.css" "%BUILD_DIR%\"
copy "%EXTENSION_DIR%\README.md" "%BUILD_DIR%\"

REM Copy icons if they exist
if exist "%EXTENSION_DIR%\icons" (
    echo  Copying icons...
    xcopy "%EXTENSION_DIR%\icons" "%BUILD_DIR%\icons" /e /i
) else (
    echo   No icons directory found, creating placeholder...
    mkdir "%BUILD_DIR%\icons"
    echo Add your icon files here > "%BUILD_DIR%\icons\README.txt"
)

REM Create ZIP archive using PowerShell
echo  Creating ZIP archive...
powershell -command "Compress-Archive -Path '%BUILD_DIR%\*' -DestinationPath '%BUILD_DIR%\%ARCHIVE_NAME%' -Force"

REM Summary
echo.
echo Build completed successfully!
echo.
echo  Build location: %BUILD_DIR%
echo  Archive: %BUILD_DIR%\%ARCHIVE_NAME%
echo.
echo Next steps:
echo 1. Open Chrome and go to chrome://extensions/
echo 2. Enable 'Developer mode'
echo 3. Click 'Load unpacked' and select: %BUILD_DIR%
echo 4. Or install the ZIP file if your Chrome supports it
echo.
echo  Happy testing!
echo.
pause