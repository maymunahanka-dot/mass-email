@echo off
echo ========================================
echo Firebase Storage CORS Fix Script
echo ========================================
echo.

echo Step 1: Checking if Google Cloud CLI is installed...
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Google Cloud CLI not found!
    echo.
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    echo After installation, restart this script.
    pause
    exit /b 1
)
echo [OK] Google Cloud CLI found!
echo.

echo Step 2: Authenticating with Google Cloud...
gcloud auth login
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Authentication failed!
    pause
    exit /b 1
)
echo [OK] Authenticated successfully!
echo.

echo Step 3: Setting project...
gcloud config set project fashiontallycloud
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to set project!
    pause
    exit /b 1
)
echo [OK] Project set to fashiontallycloud
echo.

echo Step 4: Applying CORS configuration...
gsutil cors set cors.json gs://fashiontallycloud.firebasestorage.app
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to apply CORS configuration!
    pause
    exit /b 1
)
echo [OK] CORS configuration applied!
echo.

echo Step 5: Verifying CORS configuration...
gsutil cors get gs://fashiontallycloud.firebasestorage.app
echo.

echo Step 6: Deploying storage rules...
echo Checking if Firebase CLI is installed...
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Firebase CLI not found!
    echo Install it with: npm install -g firebase-tools
    echo Then run: firebase deploy --only storage
    echo.
) else (
    firebase deploy --only storage
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to deploy storage rules!
        pause
        exit /b 1
    )
    echo [OK] Storage rules deployed!
)

echo.
echo ========================================
echo Fix Applied Successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Clear your browser cache (Ctrl+Shift+Delete)
echo 2. Restart your development server
echo 3. Try uploading an image again
echo.
echo Note: CORS changes may take 5-10 minutes to propagate
echo.
pause
