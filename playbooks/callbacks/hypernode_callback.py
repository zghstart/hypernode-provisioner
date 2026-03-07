#!/usr/bin/env python3
"""
HyperNode Callback Plugin for Ansible

This plugin tracks idempotency and sends events to Redis during Ansible execution.
Usage: Set ANSIBLE_STDOUT_CALLBACK=hypernode in your environment.

Event structure sent to Redis:
{
    "task_id": "task name",
    "host": "hostname",
    "status": "IDEMPOTENT_SKIPPED|CHANGED|SUCCESS",
    "timestamp": "ISO format timestamp"
}
"""

from ansible.plugins.callback import CallbackBase
import json
import os
from datetime import datetime

# Redis configuration from environment
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_CHANNEL = os.environ.get('REDIS_CHANNEL', 'ansible:events')


class CallbackModule(CallbackBase):
    """
    Custom callback plugin for HyperNode-Provisioner
    Tracks task execution status and sends events to Redis
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis_client = None
        self.redis_enabled = False
        self._init_redis()

    def _init_redis(self):
        """Initialize Redis connection if available"""
        try:
            import redis
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True
            )
            # Test connection
            self.redis_client.ping()
            self.redis_enabled = True
            self._log("Redis connected successfully")
        except ImportError:
            self._log("redis package not installed, Redis integration disabled")
        except Exception as e:
            self._log(f"Redis connection failed: {e}")

    def _log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.utcnow().isoformat()
        print(f"[{timestamp}] [HyperNode Callback] {message}")

    def v2_runner_on_ok(self, result, **kwargs):
        """
        Handle successful task execution
        Records CHANGED or SUCCESS status
        """
        host = result._host
        task = result._task

        # Check if task was actually changed or just skipped
        if hasattr(result, '_result') and 'skipped' in result._result:
            status = 'IDEMPOTENT_SKIPPED'
        elif hasattr(result, '_result') and 'changed' in result._result:
            status = 'CHANGED'
        else:
            status = 'SUCCESS'

        event = {
            'task_id': task.name,
            'host': host.name,
            'status': status,
            'timestamp': datetime.utcnow().isoformat(),
            'task_action': task.action
        }

        self._send_event(event)

    def v2_runner_on_skipped(self, result, **kwargs):
        """Handle skipped task"""
        host = result._host
        task = result._task

        event = {
            'task_id': task.name,
            'host': host.name,
            'status': 'SKIPPED',
            'timestamp': datetime.utcnow().isoformat(),
            'reason': result._result.get('skip_reason', 'No reason provided')
        }

        self._send_event(event)

    def v2_runner_on_failed(self, result, ignore_errors=False, **kwargs):
        """Handle failed task execution"""
        host = result._host
        task = result._task

        # Extract error information
        error_message = result._result.get('msg', 'Unknown error')
        if 'exception' in result._result:
            error_message = result._result['exception']

        event = {
            'task_id': task.name,
            'host': host.name,
            'status': 'FAILED',
            'timestamp': datetime.utcnow().isoformat(),
            'error': error_message,
            'ignore_errors': ignore_errors
        }

        self._send_event(event)

        # Log error to stdout
        self._log(f"Task failed on {host.name}: {task.name} - {error_message}")

    def v2_runner_on_unreachable(self, result, **kwargs):
        """Handle unreachable host"""
        host = result._host
        task = result._task

        event = {
            'task_id': task.name,
            'host': host.name,
            'status': 'UNREACHABLE',
            'timestamp': datetime.utcnow().isoformat(),
            'error': result._result.get('msg', 'Host unreachable')
        }

        self._send_event(event)
        self._log(f"Host unreachable: {host.name}")

    def v2_playbook_on_task_start(self, task, is_conditional):
        """Task started event"""
        event = {
            'task_id': task.get_name(),
            'status': 'STARTED',
            'timestamp': datetime.utcnow().isoformat()
        }
        self._send_event(event)

    def v2_playbook_on_stats(self, stats):
        """Playbook completion stats"""
        event = {
            'status': 'PLAYBOOK_COMPLETED',
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'ok': stats.ok,
                'changed': stats.changed,
                'unreachable': stats.unreachable,
                'failed': stats.failed,
                'skipped': stats.skipped
            }
        }
        self._send_event(event)

    def _send_event(self, event):
        """Send event to Redis or stdout"""
        event_json = json.dumps(event, ensure_ascii=False)

        if self.redis_enabled:
            try:
                # Send to specific task channel
                task_id = event.get('task_id', 'unknown')
                self.redis_client.publish(f'ansible:events:{task_id}', event_json)
                self.redis_client.publish(REDIS_CHANNEL, event_json)
            except Exception as e:
                self._log(f"Failed to send event to Redis: {e}")

        # Always output to stdout for debugging
        print(f"[EVENT] {event_json}")
