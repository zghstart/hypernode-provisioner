package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.DataCenter;
import com.hypernode.provisioner.entity.Server;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Server Repository Test
 */
@DataJpaTest
class ServerRepositoryTest {

    @Autowired
    private ServerRepository repository;

    @Autowired
    private DataCenterRepository dataCenterRepository;

    @Test
    void shouldCreateAndFindServer() {
        // Given
        DataCenter dataCenter = dataCenterRepository.save(DataCenter.builder()
            .name("Test DC")
            .build());

        Server server = Server.builder()
            .ipAddress("192.168.1.10")
            .sshPort(22)
            .username("deploy")
            .dataCenter(dataCenter)
            .gpuTopology("{\"gpu_count\": 8, \"gpu_model\": \"H100\"}")
            .status("PROVISIONED")
            .build();

        // When
        Server saved = repository.save(server);
        Optional<Server> found = repository.findById(saved.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getIpAddress()).isEqualTo("192.168.1.10");
    }

    @Test
    void shouldFindServerByIpAddress() {
        // Given
        Server server = Server.builder()
            .ipAddress("192.168.1.20")
            .sshPort(22)
            .username("deploy")
            .status("PROVISIONED")
            .build();
        repository.save(server);

        // When
        Optional<Server> found = repository.findByIpAddress("192.168.1.20");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getIpAddress()).isEqualTo("192.168.1.20");
    }

    @Test
    void shouldFindByStatus() {
        // Given
        Server server1 = Server.builder()
            .ipAddress("192.168.1.10")
            .sshPort(22)
            .username("deploy")
            .status("PROVISIONING")
            .build();

        Server server2 = Server.builder()
            .ipAddress("192.168.1.20")
            .sshPort(22)
            .username("deploy")
            .status("PROVISIONED")
            .build();

        repository.save(server1);
        repository.save(server2);

        // When
        var provisioningServers = repository.findByStatus("PROVISIONING");

        // Then
        assertThat(provisioningServers).hasSize(1);
        assertThat(provisioningServers.get(0).getStatus()).isEqualTo("PROVISIONING");
    }
}
