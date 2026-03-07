---

# 📄 PRD_Architecture.md

## GPU 算力节点自动化配置与验证平台 (HyperNode-Provisioner)

**产品需求文档及技术架构白皮书 v0.2 (开发版本)**

---

### 1. 项目背景与目标

本项目旨在打造一个面向智算中心（Data Center）的高性能 GPU 算力节点自动化配置与性能验证 Web 平台。
系统针对顶级硬件（如 8卡 HGX H100/H200/B200, ConnectX-7 NDR 400G 网卡，双路 NUMA 架构），从纯净的 Ubuntu 22.04/24.04 裸金属服务器开始，自动化完成底层硬件级调优、NVIDIA 生态依赖锁定、以及多机多卡互联性能的深度压测。最终交付的是能完美榨干 400G 网络与 NVLink 带宽的极客级裸机开发底座。

---

### 2. 领域模型抽象 (Core Domain Models)

后端数据库层面需严格抽象以下实体，为 Ansible 任务提供上下文：

* **DataCenter (数据中心/区域)**
* **属性**：`id`, `name`, `http_proxy`, `https_proxy`, `apt_mirror`, `huggingface_mirror`。
* **作用**：解决离线/限流环境并发下载问题。Ansible 执行时需将代理信息作为全局环境变量注入。


* **Server (服务器资产)**
* **属性**：`id`, `ip_address`, `ssh_port`, `username`, `password_encrypted`, `private_key_encrypted`, `datacenter_id`, `gpu_topology`, `status`, `created_at`, `updated_at`。
* **安全要求**：
  * **生产环境**：强制使用 **HashiCorp Vault KV2 引擎**，后端通过 AppRole 认证动态获取 SSH 凭证，数据库仅存储 Vault 的 `secret_id` 而非明文凭证。
  * **开发环境**：可使用 **Jasypt** (AES-256) 加密，但需配合数据库透明加密（TDE）或 AWS KMS。
  * **内存安全**：使用 `@RefreshScope` 动态轮换密钥，设置 JVM GC 提升短生命周期对象清理频率。


* **Task DAG (任务有向无环图)**
* **属性**：`task_id`, `server_id`, `status`, `current_step`, `logs`, `rollback_required`, `retry_count`, `started_at`, `completed_at`。
* **功能**：支持依赖检查，提供 **"Force Run (强制执行)"** 模式覆盖异常状态，支持 **"Rollback (回滚)"** 操作。


* **ConfigTemplate (配置模板)**
* **属性**：`id`, `name`, `description`, `variables` (JSONB), `ansible_vars` (JSONB), `created_by`, `created_at`。
* **作用**：支持多版本部署场景（如 RHEL 8 + Driver 535 + CUDA 12.1），DataCenter 可关联模板实现配置复用。

---

### 3. 核心自动化执行逻辑 (基于 Ansible)

这是本系统的灵魂。AI 助手在编写 `playbooks/` 目录下的剧本时，必须严格遵守以下硬核规范：

#### 3.1 环境预检 (Pre-flight Check) - [只读不写]

执行任何安装前，收集并上报系统状态：

* **NTP 时钟同步**：检查 `chronyc sources` 确保集群时间无漂移。
* **网卡固件 (Firmware)**：使用 `mstflint` 探测 IB 网卡固件版本，但不主动下载覆盖。
* **中断亲和性 (IRQ Affinity)**：通过 `/proc/irq/*/smp_affinity_list` 或 `show_irq_affinity.sh` 检查 400G 网卡队列是否已绑定到对应的 NUMA 核心。

#### 3.2 自动化部署流 (Provisioning DAG)

1. **禁用 Nouveau 驱动**：写入 `/etc/modprobe.d/blacklist-nouveau.conf`，执行 `update-initramfs -u`，并重启服务器。
2. **现代化网络源注入**：安装 `cuda-keyring`，添加官方 CUDA Network Repo（必须注入 DataCenter 代理）。
3. **精准版本安装与锁定 (核心！)**：
   * 必须同时安装：`nvidia-driver-xxx-open` 和匹配大版本的 `nvidia-fabricmanager-xxx`（HGX 架构必备）。
   * **改进建议**：改用 `apt preferences` pin 优先级，而非 `apt-mark hold` 全局锁定，以便安全更新非关键包。

4. **CUDA Toolkit 铺设**：通过 APT 安装完整的 `cuda-toolkit-xx-x` 到 `/usr/local/cuda`。
5. **环境变量防冲突注入**：在 `/etc/profile.d/cuda.sh` 中配置 `PATH` 和 `LD_LIBRARY_PATH`。**关键约束**：必须将系统级 CUDA 路径追加到 `$PATH` 的**末尾** (`export PATH=$PATH:/usr/local/cuda/bin`)，绝不可覆盖用户未来使用的 Conda 环境。
6. **开启持久化模式**：启动 `nvidia-persistenced` 或执行 `nvidia-smi -pm 1`。
7. **网络性能解封**：关闭 `irqbalance` 服务，使用 OFED 自带的调优脚本（如 `mlnx_tune -p HIGH_THROUGHPUT`）配置中断亲和性。

#### 3.3 性能与验证压测 (Benchmarking)

* **单机验证**：静默编译并运行 CUDA Samples 里的 `p2pBandwidthLatencyTest` (NVLink) 和 `bandwidthTest` (PCIe)。
* **多机验证**：利用 HPC-X/OpenMPI 拉起 `nccl-tests` (如 `all_reduce_perf`)，测试 IB RDMA 真实吞吐量。
* **烤机监控**：集成 `gpu-burn`，结合 NVIDIA DCGM 将功耗、温度数据实时传回后端。

#### 3.4 幂等性与回滚机制

* **幂等性检查**：每个步骤执行前进行 state 识别（如检查 `/etc/nvidia/persistenced` 存在则跳过步骤 6）。
* **回滚机制**：每个 Phase 需实现对应 `rollback.yml`：
  * 驱动卸载脚本（步骤 1 回滚）
  * CUDA 移除脚本（步骤 4 回滚）
  * 网络配置还原（步骤 7 回滚）

#### 3.5 Ansible Result Callback Plugin (新增)

自定义 Callback Plugin 以支持幂等性追踪：

```python
# callbacks/hypernode_callback.py
from ansible.plugins.callback import CallbackBase
import json

class CallbackModule(CallbackBase):
    def v2_runner_on_ok(self, result, **kwargs):
        host = result._host
        task = result._task

        # 标记幂等性状态
        if hasattr(result, '_result') and 'skipped' in result._result:
            status = 'IDEMPOTENT_SKIPPED'
        elif 'changed' in result._result:
            status = 'CHANGED'
        else:
            status = 'SUCCESS'

        event = {
            'task_id': task.name,
            'host': host.name,
            'status': status,
            'timestamp': datetime.utcnow().isoformat()
        }
        # 发送到 Redis channel
        redis_client.publish('ansible:events', json.dumps(event))
```

---

### 4. 技术栈选型

* **后端引擎**：JDK 21 + **Spring Boot 3 (WebMVC)**。
* **并发模型**：使用 **虚拟线程 (Virtual Threads)** 调用 Ansible。
  * **⚠️ 关键变更**：放弃 `ProcessBuilder` 直接调用 Ansible，改用 **Ansible Runner** (Python 库) 或 **Ansible Controller API**，通过 gRPC/HTTP 与后端通信。若使用 ProcessBuilder，必须限制并发数并使用 `CompletableFuture` 包装，避免虚拟线程阻塞堆积。
* **日志与通信**：配置 Ansible 环境变量 `ANSIBLE_STDOUT_CALLBACK=json`，后端解析 JSON 日志，通过 **SSE (Server-Sent Events)** 推送给前端。
* **消息队列**：采用 **Redis Streams** 作为主要消息通道（替代 Pub/Sub），支持任务进度恢复；WebSocket 作为连接断开时的回退机制。
  * **高可用要求**：部署 Redis Sentinel 或 Cluster 模式，为关键 Stream 开启 AOF 持久化 (`appendonly yes` + `appendfsync everysec`)，定期备份消费者组偏移量。


* **前端工程**：Next.js (React) 或 Vue 3 (Nuxt)。
* **UI 风格**：Tailwind CSS + Shadcn UI + Framer Motion。对标 Apple 官网，实现极致流畅的动画过渡、毛玻璃质感、优雅的 Toast 日志弹窗。

---

### 5. 🤖 致 AI 助手 (Claude Code / Roo Code) 的协作规范

为了确保工程质量，请你（AI 助手）在执行任务时严格遵循以下工作流和环境约束：

#### 5.1 运行环境约束

* **Tmux 特权模式**：本工程必须在 `tmux` 会话中执行。你被授予全量 Shell 执行权限，可操作 `git`、`gh` CLI 以及调用 `ansible-playbook`。
* **Hybrid Repo 模式 (关键变更)**：
  * `backend/` 和 `frontend/` 作为独立仓库（加速 CI/CD，解耦构建流程）
  * `playbooks/` 作为独立 Git Submodule 或打包为 Docker Image（版本独立管理）
  * **推荐结构**：
  ```text
  HyperNode-Provisioner/
  ├── backend/       # Spring Boot 3 工程 (独立仓库)
  ├── frontend/      # Next.js/Vue 前端工程 (独立仓库)
  ├── playbooks/     # Ansible YAML 剧本与 hosts 模板 (Submodule/Container)
  ├── docs/          # 设计文档与 PRD
  └── .claude/       # Claude Code 配置（Claude Flow V3）
  ```

#### 5.2 GitHub Issue 与 Bug 追踪机制 (强制执行)

在自动化开发和测试 Ansible 与底层硬件交互时，如遇报错阻断，**严禁自行无限试错篡改代码**。必须遵循以下流程：

1. 使用宿主机的 `gh` 命令行工具，创建一个 Issue 记录该 Bug：
```bash
gh issue create --title "[BUG] <简短描述>" --body "错误描述与复现步骤... \n 堆栈日志: <粘贴完整 JSON 报错或 Java 堆栈>"
```

2. 在创建 Issue 后，在终端中向人类开发者报告，并给出你的修复建议。
3. 等待人类开发者 Approve 后，再编写代码修复，并提交 Commit 附带 `Fixes #<issue编号>`。

---

### 6. 领域事件设计 (Domain Events)

#### 6.1 事件清单

| 事件名称 | 触发条件 | 用途 |
|----------|----------|------|
| `GPUProvisionStarted` | 任务开始执行 | 初始化进度追踪 |
| `ProvisionStepCompleted` | 每个步骤完成 | 更新任务进度 |
| `ProvisionStepFailed` | 步骤执行失败 | 触发告警和回滚决策 |
| `ProvisionCompleted` | 整个任务完成 | 通知前端更新状态 |
| `BenchmarkStarted` | 开始压测 | 初始化监控图表 |
| `BenchmarkCompleted` | 压测完成 | 更新性能数据 |
| `RollbackTriggered` | 回滚开始 | 记录回滚操作日志 |
| `RollbackCompleted` | 回滚完成 | 通知用户处理结果 |

#### 6.2 事件结构示例

```java
public interface DomainEvent {
    String eventId();
    LocalDateTime timestamp();
    String aggregateId();  // 对应 server_id
}

public record GPUProvisionStarted(
    String eventId,
    LocalDateTime timestamp,
    String serverId,
    Map<String, Object> context
) implements DomainEvent {}

public record ProvisionStepFailed(
    String eventId,
    LocalDateTime timestamp,
    String serverId,
    int step,
    String error,
    String stacktrace
) implements DomainEvent {}

public record BenchmarkCompleted(
    String eventId,
    LocalDateTime timestamp,
    String serverId,
    Map<String, Double> metrics  // NVLink, PCIe, RDMA 吞吐量
) implements DomainEvent {}
```

---

### 7. Redis Streams 设计

#### 7.1 Stream 命名规范

| Stream 名称 | 用途 | 消费者组 |
|-------------|------|----------|
| `ansible:events:{taskId}` | 任务进度追踪 | `sse-subscribers` |
| `ansible:events:global` | 全局事件广播 | `monitoring`, `logging` |
| `ansible:results:{taskId}` | 任务结果持久化 | `backend-service` |

#### 7.2 消费者组配置

```java
// 后端 Redis 配置
@Bean
RedisMessageListenerContainer redisContainer(RedisConnectionFactory factory) {
    var container = new RedisMessageListenerContainer();
    container.setConnectionFactory(factory);
    container.setConnectionFactory(factory);

    // SSE 订阅者消费者组（支持断线重连）
    container.addMessageListener(sseMessageAdapter,
        List.of(new PatternTopic("ansible:events:*")));

    return container;
}

// 进度查询接口（支持恢复）
@GetMapping("/api/tasks/{taskId}/progress")
public ResponseEntity<ProgressResponse> getProgress(
    @PathVariable String taskId,
    @RequestParam(required = false) String lastEventId) {

    var events = redisOps.opsForStream()
        .read(StreamReadOptions.empty().count(100),
              StreamOffset.fromLeft(taskId, lastEventId));

    return ResponseEntity.ok(progressMapper.map(events));
}
```

---

### 8. 安全性设计

| 风险 | 缓解措施 |
|------|----------|
| SSH 凭证内存驻留 | 生产环境使用 Vault AppRole 动态获取凭证；数据库仅存储 `secret_id`；设置 JVM GC 提升短生命周期对象清理 |
| Ansible vault 密钥 | 外置到 HashiCorp Vault KV2 引擎，禁用任何硬编码；生产环境强制使用，开发环境可降级为 Jasypt |
| DCGM 监控数据传输 | 启用 TLS 1.3 + mTLS；使用 SPIFFE/SPIRE 实现零信任网络，每个节点颁发短期证书（24h 有效期） |
| `force run` 操作 | 增加二次确认弹窗 + 操作审计日志（记录操作人、IP、时间） |
| Redis 单点故障 | 部署 Sentinel 或 Cluster 模式；开启 AOF 持久化 (`appendonly yes` + `appendfsync everysec`)；定期备份消费者组偏移量 |
| 环境变量注入 | 使用 Ansible `environment` 关键字，避免全局污染 |

---

### 8.1 高风险项专项说明

#### 8.1.1 Ansible 执行引擎选型（高风险）
**风险描述**：使用 `ProcessBuilder` 直接调用 Ansible 在虚拟线程下可能导致线程阻塞堆积，Ansible 本身是 Python 进程，大量并发时进程调度开销显著。

**实施方案**：
1. **推荐方案**：改用 **Ansible Runner** (Python 库) 作为控制器，通过 gRPC/HTTP 与后端通信
2. **降级方案**：若坚持使用 ProcessBuilder，必须：
   - 限制并发数（建议不超过 10 个并发任务）
   - 使用 `CompletableFuture` 包装异步调用
   - 实现队列缓冲和拒绝策略

#### 8.1.2 Redis 高可用（高风险）
**风险描述**：Redis 是核心基础设施，Stream 消息丢失会导致任务状态不一致。

**实施方案**：
1. 部署 Redis Sentinel（三节点：1 主 2 从）或 Cluster 模式
2. 为关键 Stream 设置 AOF 持久化：
   ```properties
   appendonly yes
   appendfsync everysec
   ```
3. 定期备份消费者组偏移量到冷存储
4. 后端实现消费者组恢复逻辑（从最后一次提交的偏移量恢复）

#### 8.1.3 SSH 凭证安全管理（高风险）
**风险描述**：Jasypt AES-256 仅适用于开发环境，生产环境密码加密后存数据库仍可能被内部人员攻击。

**实施方案**：
1. 生产环境强制使用 **Vault KV2 引擎**
2. 后端服务使用 **Vault AppRole** 认证（绑定 IP + CIDR）
3. 动态获取 SSH 凭证，**数据库不存储明文凭证**，仅存储 Vault 的 `secret_id`
4. 数据库开启透明加密（TDE）或使用 AWS KMS
5. 凭证访问日志全量审计

---

### 9. AI 开发阶段规划 (Action Plan)

请读取完本篇文档后，按照以下顺序分阶段执行，每个阶段完成并验证后，向我确认再进入下一阶段：

* **Phase 0: 离线验证环境** (新增，优先执行)
  * 搭建本地模拟环境（Docker + fake GPU 节点）
  * 编写 Ansible Playbook 验证脚本
  * 定义 SSE API Contract (OpenAPI 3.0)
  * **目的**：避免在真实硬件上返工

* **Phase 1: Playbook 核心开发** (原 Phase 2 提前)
  * 在 `playbooks/` 目录下编写 `provision_gpu_node.yml`，严格实现 [3.2 自动化部署流] 的所有细节（特别是代理注入和幂等性检查）。
  * 在 `playbooks/` 目录下编写 `rollback_gpu_node.yml`，实现完整的回滚机制。
  * 在 `playbooks/callbacks/` 目录下实现自定义 `hypernode_callback.py`。
  * **新增**：Playbook 单元测试（pytest + ansible-test）。
  * **注意**：此阶段可完全离线开发，无需后端支持。

* **Phase 2: 后端引擎**
  * 搭建 Spring Boot 3 骨架，配置 JDK 21 虚拟线程支持。
  * 实现 Redis Streams 消息通道集成（支持 Sentinel/Cluster 模式）。
  * 设计 Flyway/Liquibase SQL 脚本，完成 DataCenter、Server、Task、ConfigTemplate 实体的 JPA 映射（支持 Vault/KMS 或 Jasypt 加密）。
  * 实现 `AnsibleProcessService`（优先使用 Ansible Runner API，其次 CompletableFuture + ProcessBuilder）。
  * **新增**：SSE 接口实现与 OpenAPI 3.0 文档。

* **Phase 3: 前端骨架**
  * 使用 Next.js 初始化前端，引入 Shadcn UI。
  * 构建 DataCenter 列表页和 Server 资源管理页面。
  * 实现任务进度条组件（SSE 消费者）。
  * **新增**：实现任务重试与回滚的前端 UI。

* **Phase 4: 压测与图表**
  * 集成 DCGM 监控日志解析。
  * 前端实现 `gpu-burn` 和 `nccl-tests` 结果的图表渲染（折线图/柱状图）。
  * **新增**：实现 Prometheus/Node Exporter 集成，支持监控告警。

* **Phase 5: 生产就绪** (新增)
  * HashiCorp Vault 集成（AppRole 认证 + KV2 引擎）
  * TLS/mTLS 配置（SPIFFE/SPIRE 零信任网络）
  * 操作审计日志（force run、rollback 等敏感操作）
  * 灰度发布支持（10% 先验证，通过后全量）
  * 集群高可用部署（Redis Sentinel + 后端多实例）

---

### 10. 架构评审记录 (v0.1)

| 维度 | 等级 | 说明 |
|------|------|------|
| 领域建模 | ⭐⭐⭐⭐ | 4 实体抽象清晰，引入领域事件 |
| 技术选型 | ⭐⭐⭐⭐⭐ | Spring Boot 3 + Ansible 组合优秀 |
| 幂等性设计 | ⭐⭐⭐⭐ | 自定义 Callback Plugin + state 识别 |
| 回滚机制 | ⭐⭐⭐⭐ | rollback.yml + 触发条件定义 |
| 可观测性 | ⭐⭐⭐⭐ | Redis Streams + SSE + Prometheus |
| 安全性 | ⭐⭐⭐⭐ | Vault/KMS + mTLS + 操作审计 |

**综合评分：8.8/10 → 9.2/10** (已补充高风险项专项说明)

---

### 11. 待决事项 (To Be Decided)

| 事项 | 说明 | 决策人 |
|------|------|--------|
| 仓库拆分 | **采用 Hybrid Repo**：`backend/` 和 `frontend/` 独立仓库，`playbooks/` 作为 Submodule 或 Docker Image | 开发团队 |
| 密钥管理 | **生产环境强制 Vault KV2 + AppRole**；开发环境可降级为 Jasypt + TDE | DevOps |
| 前端框架 | Next.js vs Vue 3 | 前端负责人 |
| 监控告警阈值 | GPU 温度、功耗阈值设定 | 运维团队 |
| Ansible 执行引擎 | **强制使用 Ansible Runner API**；ProcessBuilder 仅作为降级方案（需限制并发数 ≤10） | 架构师 |
| Redis 高可用 | **强制部署 Sentinel/Cluster**；AOF 持久化配置；消费者组偏移量定期备份 | DevOps |

---

### 12. 已实现功能清单 (v0.3 — 2026-03-06)

#### 12.1 后端实现状态

| 模块 | 文件 | 状态 | 说明 |
|------|------|------|------|
| **领域实体** | `Server.java` | ✅ 完成 | SSH 私钥认证（`privateKeyEncrypted`），密码字段保留但强制为空 |
| | `DataCenter.java` | ✅ 完成 | 代理、镜像源、启用状态 |
| | `Task.java` | ✅ 完成 | DAG 状态机 + metadata JSON + 强制执行标记 |
| | `ConfigTemplate.java` | ✅ 完成 | 模板变量 + Ansible 变量 + 数据中心关联 |
| | `AuditLog.java` | ✅ 完成 | 审计日志持久化实体，支持 4 种操作类型 |
| **Repository 层** | `AuditLogRepository.java` | ✅ 完成 | 分页查询 + 按 action/targetId/时间范围筛选 |
| **服务层** | `ServerService.java` | ✅ 完成 | 强制 SSH 私钥、格式校验、加密存储、轮换接口 |
| | `SecurityAuditService.java` | ✅ 完成 | 4 种审计方法持久化到数据库（替换原 console.log） |
| | `TaskExecutionService.java` | ✅ 完成 | 真实调用 `AnsibleProcessService`，实时 stdout 解析步骤检测，Redis Stream 进度推送 |
| | `AnsibleProcessService.java` | ✅ 完成 | ProcessBuilder 封装，extraVars 注入，JSON stdout callback |
| | `RedisStreamService.java` | ✅ 完成 | 8 种 Domain Event 发布 |
| **控制器层** | `ProvisionController.java` | ✅ 完成 | 支持 `templateId` 参数，合并模板变量 + 数据中心代理注入 Ansible |
| | `AuditController.java` | ✅ 完成 | 分页查询 + 筛选 API |
| | `BenchmarkController.java` | ⚠️ Mock | GPU Burn/NCCL 接口框架完成，返回模拟数据 |
| | `TaskExecutionController.java` | ✅ 完成 | 适配新签名，真实任务状态查询 |
| **数据库迁移** | `V1__init_schema.sql` | ✅ 完成 | 4 个核心表 DDL + 索引 |
| | `V2__create_audit_log.sql` | ✅ 完成 | audit_logs 表 + 索引 |
| **配置** | `application.yml` | ✅ 完成 | Flyway 启用，`ddl-auto: validate`，baseline-on-migrate |
| | `build.gradle` | ✅ 完成 | Spring Boot 3.4.3 + Gradle 9 + Flyway + Hypersistence Utils |

#### 12.2 前端实现状态

| 页面/组件 | 文件 | 状态 | 说明 |
|-----------|------|------|------|
| **全局主题** | `globals.css` | ✅ 完成 | 深色科技风：glassmorphism、渐变文字、点阵背景、自定义滚动条、动画系统 |
| | `layout.tsx` | ✅ 完成 | `Inter` + `JetBrains Mono` 字体，强制 dark 模式，全局 `<Toaster />` |
| | `tailwind.config.js` | ✅ 完成 | `cyber` 调色板、`pulse-glow` 动画 |
| **布局组件** | `sidebar.tsx` | ✅ 完成 | 8 个导航项（含压测监控、审计日志），neon 激活指示器，系统状态脉冲 |
| | `navbar.tsx` | ✅ 完成 | glassmorphic 顶栏，面包屑，通知铃铛 |
| | `layout.tsx (wrapper)` | ✅ 完成 | 点阵纹理 + 径向渐变背景 |
| **UI 组件** | `Card` / `Button` / `Progress` / `Dialog` | ✅ 完成 | 全部适配深色主题，glassmorphic 风格 |
| | `sonner.tsx` (Toaster) | ✅ 完成 | 深色主题 Toast 通知 |
| | `provision-card.tsx` | ✅ 完成 | 垂直时间线步骤可视化 |
| **控制台** | `/` (page.tsx) | ✅ 完成 | 实时指标卡片（服务器/GPU/任务统计），快速导航 |
| **数据中心** | `/datacenters` | ✅ 完成 | CRUD + 代理/镜像详情 + Toast 通知 |
| **节点管理** | `/servers` | ✅ 完成 | SSH 私钥认证、表格布局、状态 Badge、进度条、**部署选模板弹窗**、**批量选择 + 批量部署/回滚**、Toast 通知 |
| **部署任务** | `/tasks` | ✅ 完成 | SSE 实时订阅、任务统计、操作按钮（部署/回滚/强制/继续）、Toast 通知 |
| **配置模板** | `/templates` | ✅ 完成 | CRUD + 数据中心筛选 + 变量预览 + Toast 通知 |
| **压测监控** | `/benchmark` | ✅ 完成 | 节点选择器、GPU Burn 折线图（recharts）、NCCL 柱状图、NVLink/RDMA 指标、综合报告 |
| **审计日志** | `/audit` | ✅ 完成 | 时间线布局、操作类型 Badge（4 种）、筛选、分页 |
| **API 客户端** | `api.ts` | ✅ 完成 | 类型安全封装，31 个 API 方法（含 6 个 benchmark + 1 个 audit） |
| | `sse.ts` | ✅ 完成 | SSE 客户端，provision-progress/completed/error 事件 |

#### 12.3 技术栈版本

| 组件 | 版本 |
|------|------|
| JDK | 21 |
| Spring Boot | 3.4.3 |
| Gradle | 9.3.1 |
| Flyway | (managed by Spring Boot BOM) |
| PostgreSQL Driver | 42.7.4 |
| Hypersistence Utils | 3.9.0 |
| Lombok | 1.18.34 |
| Next.js | 14.2.35 |
| React | 18 |
| Tailwind CSS | 3.x |
| Shadcn UI | radix-ui primitives |
| recharts | (for benchmark charts) |
| sonner | (Toast notifications) |
| lucide-react | (Icons) |

#### 12.4 待实现功能（Phase 4-5 路线图）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| BenchmarkController 真实数据 | P1 | 对接 `gpu-burn` + `nccl-tests` 实际执行，解析日志返回 metrics |
| DCGM 监控集成 | P1 | 解析 NVIDIA DCGM 实时数据，推送到前端图表 |
| Prometheus/Node Exporter | P2 | 监控告警阈值（GPU 温度、功耗） |
| HashiCorp Vault 集成 | P2 | AppRole 认证 + KV2 引擎替代 Jasypt |
| TLS/mTLS (SPIFFE/SPIRE) | P3 | 零信任网络，短期证书 |
| 灰度发布支持 | P3 | 10% 先验证，通过后全量 |
| Ansible Runner API | P3 | 替代 ProcessBuilder，解决虚拟线程阻塞问题 |
| Redis Sentinel/Cluster | P2 | 高可用部署 |
| OpenAPI 3.0 文档 | P2 | SSE 接口规范 |

---

### 13. 架构变更记录

| 版本 | 日期 | 变更内容 | 影响范围 |
|------|------|----------|----------|
| v0.3 | 2026-03-06 | 实现 5 批次功能增强：审计日志持久化 + Flyway 迁移、模板化部署 + 真实 Ansible 调用、压测监控页面、审计日志页面 + Toast 通知、部署选模板 + 批量操作；升级 Spring Boot 3.4.3 + Gradle 9；前端全面类型安全重构 | 后端全部服务层 + 前端 7 个页面 + API 客户端 |
| v0.2 | 2026-03-04 | 补充高风险项专项说明：Ansible Runner API 替代 ProcessBuilder、Redis Sentinel/Cluster 高可用、Vault KV2 + AppRole 认证、Hybrid Repo 模式 | 架构设计、开发规划 |
| v0.1 | 初始 | Phase 1-4 开发规划 | 架构设计 |

**(END OF PRD)**
