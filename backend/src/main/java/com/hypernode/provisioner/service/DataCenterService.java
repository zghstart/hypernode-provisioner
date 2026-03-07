package com.hypernode.provisioner.service;

import com.hypernode.provisioner.entity.DataCenter;
import com.hypernode.provisioner.repository.DataCenterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * DataCenter Service
 * 数据中心配置服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataCenterService {

    private final DataCenterRepository dataCenterRepository;

    /**
     * 获取所有数据中心
     */
    public List<DataCenter> getAllDataCenters() {
        return dataCenterRepository.findAll();
    }

    /**
     * 根据 ID 获取数据中心
     */
    public Optional<DataCenter> getById(String id) {
        return dataCenterRepository.findById(id);
    }

    /**
     * 根据名称获取数据中心
     */
    public Optional<DataCenter> getByName(String name) {
        return dataCenterRepository.findByName(name);
    }

    /**
     * 创建数据中心
     */
    public DataCenter create(DataCenter dataCenter) {
        dataCenter.setId(null);
        return dataCenterRepository.save(dataCenter);
    }

    /**
     * 更新数据中心
     */
    public DataCenter update(DataCenter dataCenter) {
        return dataCenterRepository.save(dataCenter);
    }

    /**
     * 删除数据中心
     */
    public void delete(String id) {
        dataCenterRepository.deleteById(id);
    }

    /**
     * 获取有效的数据中心列表
     */
    public List<DataCenter> getEnabledDataCenters() {
        return dataCenterRepository.findAll().stream()
            .filter(DataCenter::getEnabled)
            .toList();
    }
}
