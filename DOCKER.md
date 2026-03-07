# Docker 部署配置说明

## 项目结构

```
.docker/
├── docker-compose.yml          # 主要的 Docker Compose 配置
├── docker-compose.override.yml # 开发环境覆盖配置
└── .dockerignore               # Docker 忽略文件

backend/
├── Dockerfile                  # 后端 Docker 镜像构建文件
└── .dockerignore

frontend/
├── Dockerfile                  # 前端 Docker 镜像构建文件
└── .dockerignore
```

## Docker Compose 服务

| 服务名 | 端口 | 描述 |
|--------|------|------|
| backend | 8080 | Spring Boot 后端 API |
| frontend | 3000 | Next.js 前端应用 |
| database | 5432 | PostgreSQL 数据库 |
| redis | 6379 | Redis 缓存服务 |

## 环境变量

### 后端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| SPRING_PROFILES_ACTIVE | prod | Spring 配置文件 |
| SPRING_DATASOURCE_URL | jdbc:postgresql://database:5432/hypernode | 数据库连接 |
| SPRING_DATASOURCE_USERNAME | hypernode | 数据库用户名 |
| SPRING_DATASOURCE_PASSWORD | hypernode123 | 数据库密码 |
| SPRING_REDIS_HOST | redis | Redis 主机 |
| SPRING_REDIS_PORT | 6379 | Redis 端口 |

### 数据库环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| POSTGRES_DB | hypernode | 数据库名 |
| POSTGRES_USER | hypernode | 数据库用户 |
| POSTGRES_PASSWORD | hypernode123 | 数据库密码 |

## 构建镜像

```bash
# 构建所有镜像
docker-compose build

# 构建特定服务
docker-compose build backend
docker-compose build frontend

# 构建后启动
docker-compose up -d --build
```

## 日常管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart backend
```

## 数据持久化

使用 Docker Volumes 保存数据：

```bash
# 查看卷
docker volume ls

# 删除卷（慎用）
docker volume rm hypernode_postgres-data
docker volume rm hypernode_redis-data
```

## 扩展部署

### 多节点部署

修改 `docker-compose.yml` 添加更多后端实例：

```yaml
services:
  backend:
    deploy:
      replicas: 3
```

### 网络配置

```yaml
networks:
  hypernode-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.25.0.0/16
```

## 故障排查

```bash
# 检查容器状态
docker-compose ps

# 查看容器详情
docker inspect hypernode-backend

# 进入容器
docker-compose exec backend sh
docker-compose exec frontend sh

# 重新创建容器
docker-compose up -d --force-recreate backend
```

## 安全配置

### 使用私有镜像仓库

```bash
# 登录仓库
docker login myregistry.com

# 使用私有镜像
docker-compose pull myregistry.com/hypernode-backend:latest
```

### 环境变量安全

避免在 `.env` 文件中存储敏感信息，使用 Docker Secrets：

```bash
# 创建 secret
echo "my-secret" | docker secret create db_password -

# 使用 secret
services:
  backend:
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```
