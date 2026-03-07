ALTER TABLE ssh_key_profiles ALTER COLUMN private_key_encrypted TYPE TEXT;
ALTER TABLE servers ALTER COLUMN private_key_encrypted TYPE TEXT;
