#!/bin/bash
# install_dependencies.sh
# Install all dependencies for GPU node provisioning

set -e

echo "=== Installing GPU Node Provisioning Dependencies ==="

# Update package list
apt-get update

# Install Python and pip
apt-get install -y python3 python3-pip python3-venv

# Install Ansible
pip3 install ansible==9.7.0

# Install NVIDIA dependencies (for simulation/testing)
apt-get install -y \
    nvidia-driver-535-open \
    nvidia-fabricmanager-535 \
    cuda-toolkit-12-2 \
    --allow-downgrades 2>/dev/null || true

# Install benchmark tools
apt-get install -y \
    nvmetools \
    nccl-tests \
    gpu-burn \
    --allow-downgrades 2>/dev/null || true

# Install monitoring tools
apt-get install -y \
    nvml-tool \
    dcgm \
    --allow-downgrades 2>/dev/null || true

echo "=== Dependencies installed successfully ==="
