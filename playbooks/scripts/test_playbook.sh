#!/bin/bash
# test_playbook.sh
# Test Ansible playbook syntax and simulate execution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAYBOOK_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing Ansible Playbooks ==="

# Check if ansible is installed
if ! command -v ansible-playbook &> /dev/null; then
    echo "Ansible not found, installing..."
    pip3 install ansible==9.7.0
fi

# Validate syntax
echo "Validating playbook syntax..."
ansible-playbook --syntax-check "$PLAYBOOK_DIR/provision_gpu_node.yml"
ansible-playbook --syntax-check "$PLAYBOOK_DIR/rollback_gpu_node.yml"

# Check inventory
echo "Checking inventory..."
ansible -i "$PLAYBOOK_DIR/hosts" gpu_nodes --list-hosts

# Test connection (would fail without real hosts)
echo "Testing connection (expected to fail without real hosts)..."
ansible -i "$PLAYBOOK_DIR/hosts" gpu_nodes -m ping || true

echo "=== Playbook tests completed ==="
