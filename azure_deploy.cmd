@ECHO OFF
REM Require git remote : https://username@projectigniter-demo.scm.azurewebsites.net:443/projectigniter-demo.git

git subtree push --prefix dist azure master
