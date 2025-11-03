@ECHO OFF
SET DIR=%~dp0

IF NOT "%JAVA_HOME%"=="" GOTO findJavaFromJavaHome

SET JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
IF "%ERRORLEVEL%" == "0" GOTO execute

ECHO ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH. >&2
GOTO fail

:findJavaFromJavaHome
SET JAVA_EXE=%JAVA_HOME%\bin\java.exe

IF EXIST "%JAVA_EXE%" GOTO execute

ECHO ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% >&2
GOTO fail

:execute
SET CLASSPATH=%DIR%\gradle\wrapper\gradle-wrapper.jar
"%JAVA_EXE%" -Dorg.gradle.appname=Gradle -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
GOTO end

:fail
EXIT /B 1

:end
EXIT /B 0
