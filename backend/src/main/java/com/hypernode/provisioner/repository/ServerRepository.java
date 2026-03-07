package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServerRepository extends JpaRepository<Server, String> {
    Optional<Server> findByIpAddress(String ipAddress);
    List<Server> findByStatus(String status);
    List<Server> findByDataCenter_Id(String dataCenterId);
    boolean existsByIpAddress(String ipAddress);
    long countBySshKeyProfileId(String sshKeyProfileId);
    List<Server> findBySshKeyProfileId(String sshKeyProfileId);
}
