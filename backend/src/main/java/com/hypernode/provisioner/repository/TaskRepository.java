package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByServerId(String serverId);
    List<Task> findByStatus(String status);
    Optional<Task> findTopByServerIdOrderByCreatedAtDesc(String serverId);
    List<Task> findByServerIdAndStatus(String serverId, String status);
}
