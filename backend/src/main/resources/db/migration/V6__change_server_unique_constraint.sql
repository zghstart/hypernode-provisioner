ALTER TABLE servers DROP CONSTRAINT IF EXISTS servers_ip_address_key;
ALTER TABLE servers DROP CONSTRAINT IF EXISTS uk_h01fa7w8tfbumyt7271vatmxo;

ALTER TABLE servers ADD CONSTRAINT uk_server_ip_port UNIQUE (ip_address, ssh_port);
