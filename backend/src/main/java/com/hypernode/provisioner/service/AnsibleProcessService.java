package com.hypernode.provisioner.service;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Ansible Process Service
 * Ansible 进程管理服务
 * 负责执行 Ansible Playbook 并收集输出
 */
@Service
@Data
public class AnsibleProcessService {

    private static final String ANSIBLE_PLAYBOOK = "ansible-playbook";
    private static final String ANSIBLE_INVENTORY = "-i";
    private static final String ANSIBLE_VARS = "-e";
    private static final String ANSIBLE_STDOUT_CALLBACK = "-e ANSIBLE_STDOUT_CALLBACK=json";

    /**
     * 执行 Ansible Playbook
     *
     * @param playbookPath playbook 路径
     * @param inventoryPath inventory 路径
     * @param extraVars 额外变量
     * @return Process 进程对象
     */
    public Process executePlaybook(String playbookPath, String inventoryPath, Map<String, String> extraVars) {
        try {
            ProcessBuilder builder = new ProcessBuilder();

            builder.command("bash", "-c", buildCommand(playbookPath, inventoryPath, extraVars));
            builder.redirectErrorStream(true);

            return builder.start();
        } catch (Exception e) {
            throw new RuntimeException("Failed to execute playbook: " + e.getMessage(), e);
        }
    }

    /**
     * 构建 Ansible 命令
     */
    private String buildCommand(String playbookPath, String inventoryPath, Map<String, String> extraVars) {
        StringBuilder cmd = new StringBuilder();
        cmd.append(ANSIBLE_PLAYBOOK).append(" ").append(playbookPath);

        if (inventoryPath != null) {
            cmd.append(" ").append(ANSIBLE_INVENTORY).append(" ").append(inventoryPath);
        }

        if (extraVars != null && !extraVars.isEmpty()) {
            extraVars.forEach((key, value) -> {
                cmd.append(" ").append(ANSIBLE_VARS).append(" \"").append(key).append("=").append(value).append("\"");
            });
        }

        // 设置 stdout callback 为 json
        cmd.append(" ").append(ANSIBLE_STDOUT_CALLBACK);

        return cmd.toString();
    }

    /**
     * 执行 Ansible 命令（异步）
     */
    public Process executeAsync(String[] command) {
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.redirectErrorStream(true);
            return builder.start();
        } catch (Exception e) {
            throw new RuntimeException("Failed to execute command: " + e.getMessage(), e);
        }
    }
}
