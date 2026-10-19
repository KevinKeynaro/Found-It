CREATE TABLE items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  location_found VARCHAR(150) NOT NULL,
  date_found DATE NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_public_id VARCHAR(255) NOT NULL,
  status ENUM('found', 'returned') NOT NULL DEFAULT 'found',
  posted_by INT UNSIGNED NOT NULL,
  returned_at TIMESTAMP NULL DEFAULT NULL,
  returned_by INT UNSIGNED NULL DEFAULT NULL,
  returned_to VARCHAR(100) NULL DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by INT UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_items_list (deleted_at, status, date_found),
  KEY idx_items_posted_by (posted_by),
  CONSTRAINT fk_items_posted_by FOREIGN KEY (posted_by) REFERENCES users (id),
  CONSTRAINT fk_items_returned_by FOREIGN KEY (returned_by) REFERENCES users (id),
  CONSTRAINT fk_items_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id),
  CONSTRAINT chk_items_returned CHECK (
    (status = 'found' AND returned_at IS NULL AND returned_by IS NULL AND returned_to IS NULL)
    OR (status = 'returned' AND returned_at IS NOT NULL AND returned_by IS NOT NULL)
  ),
  CONSTRAINT chk_items_deleted CHECK (
    (deleted_at IS NULL AND deleted_by IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
