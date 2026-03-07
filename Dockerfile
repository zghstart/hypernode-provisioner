# HyperNode-Provisioner Docker Development Environment
# This Docker setup simulates GPU nodes for testing Ansible playbooks

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ssh \
    curl \
    wget \
    git \
    vim \
    net-tools \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Install Ansible
RUN pip3 install ansible==9.7.0 redis==5.0.1

# Create user for Ansible
RUN useradd -m -s /bin/bash ansible && \
    echo "ansible:ansible" | chpasswd && \
    mkdir -p /home/ansible/.ssh && \
    chmod 700 /home/ansible/.ssh

# Set working directory
WORKDIR /workspace

# Copy playbooks
COPY playbooks/ /workspace/playbooks/
COPY backend/ /workspace/backend/

# Set permissions
RUN chown -R ansible:ansible /workspace

# Expose SSH port
EXPOSE 22

# Default command
CMD ["/bin/bash"]
