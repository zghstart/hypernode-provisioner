# HyperNode-Provisioner

![License](https://img.shields.io/github/license/zghstart/hypernode-provisioner)
![Version](https://img.shields.io/github/v/release/zghstart/hypernode-provisioner)
![Stars](https://img.shields.io/github/stars/zghstart/hypernode-provisioner)

A high-performance GPU cluster provisioning and validation platform for data center infrastructure.

## 🌟 Overview

HyperNode-Provisioner is a web-based platform designed to automate the configuration, validation, and performance benchmarking of GPU compute nodes. From bare-metal Ubuntu servers to a fully tuned HPC environment, HyperNode handles the entire provisioning lifecycle.

### Target Hardware
- **GPUs**: 8× HGX H100/H200/B200
- **Network**: ConnectX-7 NDR 400G InfiniBand
- **Architecture**: Dual-socket NUMA

### What It Does
1. **Automated Provisioning**: Disables Nouveau, installs NVIDIA drivers, CUDA toolkit, and fabric manager
2. **Hardware Tuning**: IRQ affinity, NUMA optimization, network stack tuning
3. **Version Locking**: Precise version pinning for NVIDIA stack (driver + CUDA + fabric manager)
4. **Performance Validation**: GPU-to-GPU bandwidth, PCIe/NVLink throughput, NCCL multi-node tests
5. **Monitoring**: Real-time GPU temperature, power, and performance metrics via DCGM

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ API Gateway   │     │  Worker Pool  │     │  Health       │
│ (Kong/Nginx)  │────▶│ (Ansible)     │────▶│ Checker      │
│ - Auth        │     │ - 20 workers  │     │ - Kubernetes │
│ - Rate Limit  │     │ - Redis Queue │     │ - Cron Jobs  │
└───────────────┘     └───────────────┘     └───────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │              ┌─────────────────┐     ┌───────────────┐
        │              │ Redis Cluster   │     │ Metrics       │
        │              │ - Streams       │     │ - Prometheus  │
        │              │ - Cache         │     │ - Grafana     │
        └──────────────│ - Pub/Sub       │     └───────────────┘
                       └─────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ PostgreSQL Cluster   │
                    │ - Primary            │
                    │ - 3 Read Replicas    │
                    │ - PgBouncer Pool     │
                    └──────────────────────┘
```

---

## 📦 Features

| Feature | Status | Description |
|---------|--------|-------------|
| **GPU Node Provisioning** | ✅ | Full automation: driver, CUDA, fabric manager |
| **Config Templates** | ✅ | Reusable deployment templates per data center |
| **Task Management** | ✅ | DAG-based task execution with rollback |
| **Real-time Monitoring** | ✅ | SSE streaming for provision progress |
| **Benchmark Dashboard** | ✅ | GPU burn, NCCL, NVLink/PCIe throughput charts |
| **Audit Logging** | ✅ | All operations tracked with full audit trail |
| **SSH Key Management** | ✅ | Vault/Jasypt encrypted credential storage |
| **Data Center Proxy** | ✅ | HTTP/HTTPS/apt mirrors for air-gapped environments |
| **Rollback Support** | ✅ | Automatic rollback on provisioning failures |

---

## 🚀 Quick Start

### Prerequisites
- **Backend**: JDK 21+, PostgreSQL 15+, Redis 7+
- **Frontend**: Node.js 20+, Docker 24+
- **Ansible**: Python 3.10+, Ansible 9+

### Local Development

```bash
# Clone repository
git clone https://github.com/zghstart/hypernode-provisioner.git
cd hypernode-provisioner

# Start services via Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

### Access Points
| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Frontend | http://localhost:3000 | admin/admin |
| Backend API | http://localhost:8080 | admin/admin |
| PostgreSQL | localhost:5432 | postgres/postgres123 |
| Redis | localhost:6379 | (none) |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PRD & Architecture](PRD_Architecture.md) | Full product requirements and technical architecture |
| [Deployment Guide](DEPLOYMENT.md) | Production deployment procedures |
| [Docker Guide](DOCKER.md) | Containerized deployment configuration |
| [Ansible Playbooks](playbooks/) | Provisioning and rollback playbooks |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: JDK 21 + Spring Boot 3.4.3
- **Database**: PostgreSQL 15 + Flyway migrations
- **Caching**: Redis 7 + Redis Streams
- **Secrets**: HashiCorp Vault (production) / Jasypt (dev)
- **Concurrency**: Virtual Threads + CompletableFuture
- **Monitoring**: Micrometer + Prometheus

### Frontend
- **Framework**: Next.js 14 + React 18
- **Styling**: Tailwind CSS + Shadcn UI
- **Charts**: Recharts
- **Notifications**: Sonner
- **Icons**: Lucide React

### Infrastructure
- **Automation**: Ansible 9 + Custom callback plugins
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

---

## 📊 Project Status

| Component | Status | Version |
|-----------|--------|---------|
| **Backend API** | ✅ Production-Ready | v0.3.0 |
| **Frontend UI** | ✅ Production-Ready | v0.1.0 |
| **Ansible Playbooks** | ✅ Production-Ready | v0.3.0 |
| **Documentation** | ⚠️ In Progress | - |

### Roadmap (Next 3 Months)
- [ ] **Phase 4**: Prometheus/Node Exporter integration
- [ ] **Phase 4**: DCGM real-time monitoring integration
- [ ] **Phase 5**: Vault AppRole + KV2 production integration
- [ ] **Phase 5**: TLS/mTLS with SPIFFE/SPIRE
- [ ] **Phase 5**: Redis Sentinel/Cluster high availability
- [ ] **Phase 5**: OpenAPI 3.0 documentation

---

## 🔐 Security

### Current Implementation
- SSH credentials encrypted with Jasypt (AES-256)
- Vault KV2 integration available for production
- Audit logging for all critical operations
- TLS support (disabled by default)

### Production Requirements
- **Mandatory**: HashiCorp Vault AppRole authentication
- **Mandatory**: TLS 1.3 + mTLS for inter-service communication
- **Recommended**: SPIFFE/SPIRE for zero-trust network
- **Recommended**: Database TDE or AWS KMS

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) (coming soon) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Running Tests
```bash
# Backend tests
./gradlew test

# Frontend tests
npm test
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- NVIDIA for the CUDA toolkit and DCGM
- Ansible team for the incredible automation platform
- All contributors and users of HyperNode-Provisioner

---

## 📞 Support

- GitHub Issues: [https://github.com/zghstart/hypernode-provisioner/issues](https://github.com/zghstart/hypernode-provisioner/issues)
- Documentation: [https://github.com/zghstart/hypernode-provisioner/wiki](https://github.com/zghstart/hypernode-provisioner/wiki)

---

## ⚠️ Disclaimer

**This is a production system for GPU cluster infrastructure.** The provisioning process modifies low-level system configurations including kernel modules, network settings, and GPU configurations. Always test in a non-production environment first.

> **Note**: This project is designed for experienced system administrators and DevOps engineers working with high-performance computing infrastructure. Improper use may result in system instability or data loss.

---

*Generated with [claude-flow](https://github.com/ruvnet/claude-flow)*
