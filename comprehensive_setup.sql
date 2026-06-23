-- Comprehensive user setup
DROP USER IF EXISTS 'varad'@'localhost';
DROP USER IF EXISTS 'varad'@'%';

-- Create users for both localhost and any host
CREATE USER 'varad'@'localhost' IDENTIFIED BY 'varad@123';
CREATE USER 'varad'@'%' IDENTIFIED BY 'varad@123';

-- Grant privileges to farmxchain_auth database
GRANT ALL PRIVILEGES ON farmxchain_auth.* TO 'varad'@'localhost';
GRANT ALL PRIVILEGES ON farmxchain_auth.* TO 'varad'@'%';

-- Grant global privileges
GRANT ALL PRIVILEGES ON *.* TO 'varad'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'varad'@'%' WITH GRANT OPTION;

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SELECT user, host FROM mysql.user WHERE user='varad';
SHOW GRANTS FOR 'varad'@'localhost';
