package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.ConfigTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConfigTemplateRepository extends JpaRepository<ConfigTemplate, String> {
    Optional<ConfigTemplate> findByName(String name);
    List<ConfigTemplate> findByDataCenter_Id(String dataCenterId);
    List<ConfigTemplate> findByEnabledTrue();
}
