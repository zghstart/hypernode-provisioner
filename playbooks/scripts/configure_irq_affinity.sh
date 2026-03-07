#!/bin/bash
# configure_irq_affinity.sh
# 配置 InfiniBand 网卡的中断亲和性到对应 NUMA 节点的 CPU 核心

IB_INTERFACE=${1:-ib0}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Configuring IRQ affinity for ${IB_INTERFACE}..."

# 获取网卡的中断号
get_irqs_for_interface() {
    local iface=$1
    local irqs=()

    for irq_dir in /proc/irq/*/; do
        local irq=$(basename "$irq_dir")
        local smp_affinity="$irq_dir/smp_affinity_list"

        if [ -f "$smp_affinity" ]; then
            local irq_iface=$(cat "$irq_dir/profile" 2>/dev/null | grep -oP '(?<=interface=)[^ ]+' || echo "")
            local irq_name=$(cat "$irq_dir/name" 2>/dev/null | grep -oP '(?<=name=)[^ ]+' || echo "")

            if [[ "$irq_name" == *"$iface"* ]] || [[ "$irq_iface" == *"$iface"* ]]; then
                irqs+=("$irq")
            fi
        fi
    done

    echo "${irqs[@]}"
}

# 获取 CPU 核心列表（按 NUMA 节点分组）
get_numa_cpus() {
    local numa_nodes=$(ls -d /sys/devices/system/node/node* 2>/dev/null)

    for node in $numa_nodes; do
        local node_id=$(basename "$node" | sed 's/node//')
        local cpus=$(cat "$node/cpulist" 2>/dev/null)
        echo "NUMA Node $node_id: $cpus"
    done
}

# 配置中断亲和性
configure_irq_affinity() {
    local iface=$1

    echo "Checking NUMA topology..."
    get_numa_cpus

    echo "Finding IRQs for $iface..."
    local irqs=$(get_irqs_for_interface "$iface")

    if [ -z "$irqs" ]; then
        echo "No IRQs found for interface $iface"
        return 1
    fi

    echo "Found IRQs: $irqs"

    # 获取 NUMA Node 0 的 CPU 核心
    local numa0_cpus=$(cat /sys/devices/system/node/node0/cpulist 2>/dev/null)

    if [ -z "$numa0_cpus" ]; then
        echo "Failed to get CPU list, using default affinity"
        return 1
    fi

    # 为每个中断设置 NUMA 节点 0 的 CPU 亲和性
    for irq in $irqs; do
        echo "Setting IRQ $irq affinity to: $numa0_cpus"
        echo "$numa0_cpus" > "/proc/irq/$irq/smp_affinity_list" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  IRQ $irq: configured"
        else
            echo "  IRQ $irq: failed"
        fi
    done

    echo "IRQ affinity configuration complete."
}

# 主函数
main() {
    configure_irq_affinity "$IB_INTERFACE"
}

main "$@"
