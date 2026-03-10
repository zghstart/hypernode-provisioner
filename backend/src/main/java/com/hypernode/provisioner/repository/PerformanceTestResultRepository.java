package com.hypernode.provisioner.repository;

import com.hypernode.provisioner.entity.PerformanceTestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 性能测试结果仓库
 */
@Repository
public interface PerformanceTestResultRepository extends JpaRepository<PerformanceTestResult, String> {

    /**
     * 根据服务器 ID 获取测试结果列表
     */
    List<PerformanceTestResult> findByServerId(String serverId);

    /**
     * 根据服务器 ID 和测试类型获取测试结果列表
     */
    List<PerformanceTestResult> findByServerIdAndTestType(String serverId, String testType);

    /**
     * 根据服务器 ID 和状态获取测试结果列表
     */
    List<PerformanceTestResult> findByServerIdAndStatus(String serverId, String status);
}
