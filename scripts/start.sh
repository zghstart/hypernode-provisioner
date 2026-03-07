#!/bin/bash
# HyperNode Provisioner - Quick Start Script

set -e

echo "========================================"
echo "  HyperNode Provisioner - 启动脚本"
echo "========================================"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: 未找到 Docker，请先安装 Docker"
    exit 1
fi

# 检查 docker-compose 是否安装
if ! command -v docker compose &> /dev/null; then
    echo "错误: 未找到 docker compose，请先安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "提示: 未找到 .env 文件，使用默认配置"
    cp .env.example .env
fi

# 创建日志目录
mkdir -p backend/logs

# 启动服务
echo ""
echo "正在启动服务..."
docker compose up -d

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "服务状态:"
docker compose ps

# 显示访问地址
echo ""
echo "========================================"
echo "  启动完成！"
echo "========================================"
echo ""
echo "访问地址:"
echo "  前端:       http://localhost:3000"
echo "  后端 API:   http://localhost:8080"
echo "  Redis管理:  http://localhost:8081"
echo ""
echo "常用命令:"
echo "  查看日志:   docker compose logs -f"
echo "  停止服务:   docker compose down"
echo "  重启服务:   docker compose restart"
echo ""
