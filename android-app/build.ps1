$ErrorActionPreference = "Stop"

$JAVA_HOME = "C:\Users\Mahmoud\.bubblewrap\jdk\jdk-17.0.11+9"
$SDK_ROOT = "C:\Users\Mahmoud\.bubblewrap\android_sdk"
$BUILD_TOOLS = "$SDK_ROOT\build-tools\33.0.2"
$PLATFORM = "$SDK_ROOT\platforms\android-33"
$ANDROID_JAR = "$PLATFORM\android.jar"

$env:JAVA_HOME = $JAVA_HOME
$env:PATH = "$JAVA_HOME\bin;$BUILD_TOOLS;$env:PATH"

$APP_DIR = "d:\zn\android-app"
Set-Location $APP_DIR

# Clean bin
Remove-Item -Recurse -Force "$APP_DIR\bin\*" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$APP_DIR\bin\res", "$APP_DIR\bin\gen", "$APP_DIR\bin\classes" -Force | Out-Null

Write-Host "1. Compiling resources with aapt2..."
& "$BUILD_TOOLS\aapt2.exe" compile --dir "$APP_DIR\res" -o "$APP_DIR\bin\res.zip"

Write-Host "2. Linking resources with aapt2..."
& "$BUILD_TOOLS\aapt2.exe" link -I "$ANDROID_JAR" `
    --manifest "$APP_DIR\AndroidManifest.xml" `
    --java "$APP_DIR\bin\gen" `
    -o "$APP_DIR\bin\app.unaligned.apk" `
    "$APP_DIR\bin\res.zip"

Write-Host "3. Compiling Java sources..."
$javaFiles = Get-ChildItem -Path "$APP_DIR\src", "$APP_DIR\bin\gen" -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName
& "$JAVA_HOME\bin\javac.exe" -encoding UTF-8 -source 1.8 -target 1.8 -cp "$ANDROID_JAR" -d "$APP_DIR\bin\classes" $javaFiles

Write-Host "4. Dexing classes with d8..."
$classFiles = Get-ChildItem -Path "$APP_DIR\bin\classes" -Filter "*.class" -Recurse | Select-Object -ExpandProperty FullName
& "$JAVA_HOME\bin\java.exe" -cp "$BUILD_TOOLS\lib\d8.jar" com.android.tools.r8.D8 --min-api 21 --lib "$ANDROID_JAR" --output "$APP_DIR\bin" $classFiles

Write-Host "5. Adding classes.dex to APK..."
Set-Location "$APP_DIR\bin"
& "$JAVA_HOME\bin\jar.exe" -uf "$APP_DIR\bin\app.unaligned.apk" classes.dex
Set-Location $APP_DIR

Write-Host "6. Aligning APK with zipalign..."
& "$BUILD_TOOLS\zipalign.exe" -v -f 4 "$APP_DIR\bin\app.unaligned.apk" "$APP_DIR\bin\app.aligned.apk"

Write-Host "7. Signing APK..."
$KEYSTORE = "$APP_DIR\release.keystore"
if (-not (Test-Path $KEYSTORE)) {
    & "$JAVA_HOME\bin\keytool.exe" -genkeypair -v `
        -keystore $KEYSTORE -alias zsystems `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass zsystems123 -keypass zsystems123 `
        -dname "CN=Z-Systems, OU=ERP, O=ZSystems, L=Cairo, C=EG"
}

& "$JAVA_HOME\bin\java.exe" -jar "$BUILD_TOOLS\lib\apksigner.jar" sign `
    --ks $KEYSTORE `
    --ks-pass pass:zsystems123 `
    --key-pass pass:zsystems123 `
    --out "d:\zn\zf.apk" `
    "$APP_DIR\bin\app.aligned.apk"

Copy-Item -Force "d:\zn\zf.apk" "d:\zn\Z-Systems-ERP.apk"
Copy-Item -Force "d:\zn\zf.apk" "d:\zn\frontend\public\zf.apk"
Copy-Item -Force "d:\zn\zf.apk" "d:\zn\frontend\public\Z-Systems-ERP.apk"

Write-Host "SUCCESS! Generated d:\zn\zf.apk and d:\zn\Z-Systems-ERP.apk"
Get-Item "d:\zn\zf.apk" | Select-Object Name, Length
