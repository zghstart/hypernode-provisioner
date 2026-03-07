package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.ConfigTemplate;
import com.hypernode.provisioner.service.ConfigTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * ConfigTemplate Controller
 * 配置模板控制器
 */
@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class ConfigTemplateController {

    private final ConfigTemplateService configTemplateService;

    /**
     * 获取所有配置模板（可选按数据中心筛选）
     */
    @GetMapping
    public ResponseEntity<List<ConfigTemplate>> getAllTemplates(
            @RequestParam(required = false) String datacenterId) {
        if (datacenterId != null && !datacenterId.isBlank()) {
            return ResponseEntity.ok(configTemplateService.getByDataCenterId(datacenterId));
        }
        return ResponseEntity.ok(configTemplateService.getAllTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConfigTemplate> getById(@PathVariable String id) {
        return configTemplateService.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<ConfigTemplate> getByName(@PathVariable String name) {
        return configTemplateService.getByName(name)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ConfigTemplate> create(@RequestBody ConfigTemplate template) {
        ConfigTemplate created = configTemplateService.create(template);
        return ResponseEntity.created(URI.create("/api/v1/templates/" + created.getId()))
            .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConfigTemplate> update(@PathVariable String id,
                                                  @RequestBody ConfigTemplate template) {
        template.setId(id);
        ConfigTemplate updated = configTemplateService.update(template);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        configTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
