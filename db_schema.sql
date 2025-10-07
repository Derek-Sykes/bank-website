-- bank_app schema for Bank Website
CREATE DATABASE IF NOT EXISTS bank_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bank_app;

CREATE TABLE IF NOT EXISTS `user` (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  f_name VARCHAR(100) NULL,
  l_name VARCHAR(100) NULL,
  refresh_token VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_category_user
    FOREIGN KEY (user_id) REFERENCES `user`(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS item (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NULL,
  name VARCHAR(120) NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  goal DECIMAL(12,2) NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_user
    FOREIGN KEY (user_id) REFERENCES `user`(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_item_category
    FOREIGN KEY (category_id) REFERENCES category(category_id)
    ON DELETE SET NULL,
  INDEX idx_item_user (user_id),
  INDEX idx_item_category (category_id)
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_user_email ON `user`(email);
