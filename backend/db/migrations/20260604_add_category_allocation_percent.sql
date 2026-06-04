ALTER TABLE category
  ADD COLUMN allocation_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER description,
  ADD CONSTRAINT category_allocation_percent_chk CHECK (allocation_percent >= 0 AND allocation_percent <= 100);
