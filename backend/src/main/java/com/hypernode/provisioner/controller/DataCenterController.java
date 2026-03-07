package com.hypernode.provisioner.controller;

import com.hypernode.provisioner.entity.DataCenter;
import com.hypernode.provisioner.service.DataCenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * DataCenter Controller
 * 数据中心配置控制器
 */
@RestController
@RequestMapping("/api/v1/datacenters")
@RequiredArgsConstructor
public class DataCenterController {

    private final DataCenterService dataCenterService;

    /**
     * 获取所有数据中心
     */
    @GetMapping
    public ResponseEntity<List<DataCenter>> getAllDataCenters() {
        return ResponseEntity.ok(dataCenterService.getAllDataCenters());
    }

    /**
     * 根据 ID 获取数据中心
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataCenter> getById(@PathVariable String id) {
        return dataCenterService.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 创建数据中心
     */
    @PostMapping
    public ResponseEntity<DataCenter> create(@RequestBody DataCenter dataCenter) {
        DataCenter created = dataCenterService.create(dataCenter);
        return ResponseEntity.created(URI.create("/api/v1/datacenters/" + created.getId()))
            .body(created);
    }

    /**
     * 更新数据中心
     */
    @PutMapping("/{id}")
    public ResponseEntity<DataCenter> update(@PathVariable String id,
                                              @RequestBody DataCenter dataCenter) {
        dataCenter.setId(id);
        DataCenter updated = dataCenterService.update(dataCenter);
        return ResponseEntity.ok(updated);
    }

    /**
     * 删除数据中心
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        dataCenterService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
