package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.SshKeyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SshKeyProfileRepository extends JpaRepository<SshKeyProfile, String> {
    Optional<SshKeyProfile> findByName(String name);
    Optional<SshKeyProfile> findByFingerprint(String fingerprint);
    boolean existsByName(String name);
}
