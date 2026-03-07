package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.ConfigTemplate;
import com.hypernode.provisioner.repository.ConfigTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * ConfigTemplate Service
 * 配置模板服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConfigTemplateService {

    private final ConfigTemplateRepository configTemplateRepository;

    public List<ConfigTemplate> getAllTemplates() {
        return configTemplateRepository.findAll();
    }

    public Optional<ConfigTemplate> getById(String id) {
        return configTemplateRepository.findById(id);
    }

    public Optional<ConfigTemplate> getByName(String name) {
        return configTemplateRepository.findByName(name);
    }

    public List<ConfigTemplate> getEnabledTemplates() {
        return configTemplateRepository.findByEnabledTrue();
    }

    public ConfigTemplate create(ConfigTemplate template) {
        template.setId(null);
        return configTemplateRepository.save(template);
    }

    public ConfigTemplate update(ConfigTemplate template) {
        return configTemplateRepository.save(template);
    }

    public void delete(String id) {
        configTemplateRepository.deleteById(id);
    }

    /**
     * 根据数据中心 ID 获取模板
     */
    public List<ConfigTemplate> getByDataCenterId(String dataCenterId) {
        return configTemplateRepository.findByDataCenter_Id(dataCenterId);
    }
}
