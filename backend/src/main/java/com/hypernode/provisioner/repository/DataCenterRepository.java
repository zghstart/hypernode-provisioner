package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.DataCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DataCenterRepository extends JpaRepository<DataCenter, String> {
    Optional<DataCenter> findByName(String name);
    boolean existsByName(String name);
}
