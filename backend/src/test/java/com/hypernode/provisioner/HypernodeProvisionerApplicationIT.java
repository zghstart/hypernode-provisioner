package com.hypernode.provisioner;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Application Integration Test
 */
@SpringBootTest
class HypernodeProvisionerApplicationIT {

    @Test
    void contextLoads() {
        // This test verifies that the Spring context loads successfully
        assertThat(true).isTrue();
    }
}
