-- Identity images: validator coldkey identity image and subnet logo (https URLs only).
ALTER TABLE validator ADD COLUMN image text;
ALTER TABLE subnet ADD COLUMN logo text;
