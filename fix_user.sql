DROP USER IF EXISTS 'varad'@'localhost';
CREATE USER 'varad'@'localhost' IDENTIFIED BY 'varad@123';
GRANT ALL PRIVILEGES ON farmex.* TO 'varad'@'localhost';
GRANT ALL PRIVILEGES ON *.* TO 'varad'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SELECT user, host FROM mysql.user WHERE user='varad';
