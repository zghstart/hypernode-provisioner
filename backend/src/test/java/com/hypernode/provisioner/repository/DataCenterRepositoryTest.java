package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.DataCenter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DataCenter Repository Test
 */
@DataJpaTest
class DataCenterRepositoryTest {

    @Autowired
    private DataCenterRepository repository;

    @Test
    void shouldCreateAndFindDataCenter() {
        // Given
        DataCenter dataCenter = DataCenter.builder()
            .name("Test DataCenter")
            .httpProxy("http://proxy.example.com")
            .enabled(true)
            .build();

        // When
        DataCenter saved = repository.save(dataCenter);
        Optional<DataCenter> found = repository.findById(saved.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Test DataCenter");
        assertThat(found.get().getHttpProxy()).isEqualTo("http://proxy.example.com");
    }

    @Test
    void shouldFindDataCenterByName() {
        // Given
        DataCenter dataCenter = DataCenter.builder()
            .name("Production DC")
            .enabled(true)
            .build();
        repository.save(dataCenter);

        // When
        Optional<DataCenter> found = repository.findByName("Production DC");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Production DC");
    }

    @Test
    void shouldNotFindNonExistentDataCenter() {
        // When
        Optional<DataCenter> found = repository.findById("non-existent-id");

        // Then
        assertThat(found).isEmpty();
    }
}
