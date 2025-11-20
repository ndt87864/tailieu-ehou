@echo off
REM Deploy Firestore Indexes to Firebase
REM Requires Firebase CLI to be installed: npm install -g firebase-tools

echo ====================================
echo  Deploying Firestore Indexes
echo ====================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Firebase CLI is not installed!
    echo Please install it by running: npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

REM Check if firestore.indexes.json exists
if not exist "firestore.indexes.json" (
    echo ERROR: firestore.indexes.json not found!
    echo Please make sure the file exists in the current directory.
    echo.
    pause
    exit /b 1
)

echo Found firestore.indexes.json
echo.

REM Login check
echo Checking Firebase authentication...
firebase projects:list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo You need to login to Firebase first.
    echo.
    firebase login
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Firebase login failed!
        pause
        exit /b 1
    )
)

echo.
echo Deploying indexes to Firebase...
echo This may take a few minutes...
echo.

firebase deploy --only firestore:indexes

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo  SUCCESS: Indexes deployed!
    echo ====================================
    echo.
    echo NOTE: Firestore indexes may take several minutes to build.
    echo You can check the status in the Firebase Console:
    echo https://console.firebase.google.com/project/tailieu-ehou/firestore/indexes
    echo.
) else (
    echo.
    echo ====================================
    echo  ERROR: Index deployment failed!
    echo ====================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause
