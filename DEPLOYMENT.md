# 部署指南

## 目录
1. [系统要求](#系统要求)
2. [本地开发环境](#本地开发环境)
3. [Docker 部署](#docker-部署)
4. [生产环境部署](#生产环境部署)
5. [监控与运维](#监控与运维)
6. [故障排除](#故障排除)

## 系统要求

### 最低配置
- **CPU**: 4 核
- **内存**: 8 GB RAM
- **存储**: 50 GB 可用空间
- **网络**: 1 Gbps

### 推荐配置 (H100/H200 集群)
- **CPU**: 16 核
- **内存**: 64 GB RAM
- **存储**: 200 GB SSD
- **网络**: 10 Gbps

## 本地开发环境

### 前提条件
- JDK 21+
- Node.js 20+
- Docker 24+
- Docker Compose 2.20+

### 快速启动

```bash
# 克隆项目
git clone <repository-url>
cd hypernode-provisioner

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 访问地址
- 前端: http://localhost:3000
- 后端 API: http://localhost:8080
- Redis Commander: http://localhost:8081

## Docker 部署

### 环境变量配置

复制 `.env.example` 到 `.env` 并填写必要的配置：

```bash
cp .env.example .env
nano .env
```

### 生产构建

```bash
# 构建后端
cd backend
./gradlew clean assemble -Dspring.profiles.active=prod

# 构建前端
cd frontend
npm ci
npm run build
```

### 部署命令

```bash
# 构建并启动
docker-compose -f docker-compose.yml up -d --build

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 生产环境部署

### 配置文件

创建生产环境配置文件 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  backend:
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=${PROD_DB_URL}
      - SPRING_DATASOURCE_USERNAME=${PROD_DB_USER}
      - SPRING_DATASOURCE_PASSWORD=${PROD_DB_PASSWORD}
      - SPRING_VAULT_TOKEN=${PROD_VAULT_TOKEN}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

### 部署步骤

```bash
# 1. 复制配置文件
cp .env.example .env
# 编辑 .env 填写生产环境配置

# 2. 启动服务
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. 验证部署
docker-compose ps
docker-compose logs backend
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker-compose pull
docker-compose up -d --build

# 查看更新日志
docker-compose logs -f
```

## 监控与运维

### 健康检查

后端 API 提供了标准的健康检查端点：

```bash
# 应用健康检查
curl http://localhost:8080/actuator/health

# 数据库健康检查
curl http://localhost:8080/actuator/health/database

# Redis 健康检查
curl http://localhost:8080/actuator/health/redis
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 实时跟踪日志
docker-compose logs --tail=100 -f
```

### 数据备份

```bash
# 备份 PostgreSQL 数据
docker exec hypernode-database pg_dump -U hypernode hypernode > backup.sql

# 恢复数据
docker exec -i hypernode-database psql -U hypernode hypernode < backup.sql
```

### 容器管理

```bash
# 重启服务
docker-compose restart backend
docker-compose restart frontend

# 停止服务
docker-compose stop

# 启动服务
docker-compose start

# 删除容器
docker-compose down
```

## 故障排除

### 常见问题

**1. 端口被占用**

```bash
# 检查端口占用
lsof -i :8080
lsof -i :3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:8080"  # 修改为 "8081:8080"
```

**2. 数据库连接失败**

```bash
# 检查数据库容器
docker-compose ps database

# 查看数据库日志
docker-compose logs database

# 验证数据库连接
docker exec -it hypernode-database psql -U hypernode -d hypernode
```

**3. 前端无法连接后端**

检查环境变量：
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SSE_URL`

确保后端服务正在运行：
```bash
docker-compose ps backend
docker-compose logs backend
```

### 日志位置

- **后端日志**: `/opt/hypernode/logs/app.log`
- **Redis Commander**: http://localhost:8081

### 支持

如遇问题，请检查：
1. 所有容器状态: `docker-compose ps`
2. 服务日志: `docker-compose logs`
3. 网络连接: `docker-compose exec backend ping database`
