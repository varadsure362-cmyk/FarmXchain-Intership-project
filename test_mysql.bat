@echo off
setlocal enabledelayedexpansion
set PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin;%PATH%
mysql -h localhost -u varad -pvarad@123 -e "SELECT user, host FROM mysql.user WHERE user='varad';"
