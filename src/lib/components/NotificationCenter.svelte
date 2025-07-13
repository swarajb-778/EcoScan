<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { notificationSystem, type NotificationMessage } from '../systems/NotificationSystem';

  interface NotificationWithRead extends NotificationMessage {
    read?: boolean;
  }

  let notifications: NotificationWithRead[] = [];
  let isExpanded = false;
  let unreadCount = 0;

  const maxNotifications = 5;
  const autoHideDelay = 5000;

  onMount(() => {
    // Load existing notifications
    loadNotifications();
    
    // Listen for new notifications
    window.addEventListener('notification', handleNewNotification as EventListener);
    
    // Check for permission
    requestNotificationPermission();
  });

  onDestroy(() => {
    window.removeEventListener('notification', handleNewNotification as EventListener);
  });

  function loadNotifications() {
    // Load from localStorage or API
    const stored = localStorage.getItem('app_notifications');
    if (stored) {
      notifications = JSON.parse(stored).slice(0, maxNotifications);
      unreadCount = notifications.filter(n => !n.read).length;
    }
  }

  function handleNewNotification(event: Event) {
    const customEvent = event as CustomEvent<NotificationMessage>;
    const notification: NotificationWithRead = { ...customEvent.detail, read: false };
    
    // Add to notifications array
    notifications = [notification, ...notifications.slice(0, maxNotifications - 1)];
    unreadCount++;
    
    // Save to localStorage
    saveNotifications();
    
    // Track analytics
    analyticsSystem.trackEvent('notification_received', {
      category: notification.category,
      type: notification.type,
      priority: notification.priority
    });
    
    // Auto-hide after delay
    setTimeout(() => {
      hideNotification(notification.id);
    }, autoHideDelay);
  }

  function saveNotifications() {
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }

  async function requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        analyticsSystem.trackEvent('notification_permission_granted');
      }
    }
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
    if (isExpanded) {
      markAllAsRead();
    }
  }

  function markAllAsRead() {
    notifications = notifications.map(n => ({ ...n, read: true }));
    unreadCount = 0;
    saveNotifications();
  }

  function markAsRead(id: string) {
    notifications = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    unreadCount = Math.max(0, unreadCount - 1);
    saveNotifications();
    
    notificationSystem.trackEvent('opened');
  }

  function hideNotification(id: string) {
    notifications = notifications.filter(n => n.id !== id);
    saveNotifications();
  }

  function dismissNotification(id: string) {
    hideNotification(id);
    notificationSystem.trackEvent('dismissed');
  }

  function handleAction(notificationId: string, action: string) {
    analyticsSystem.trackEvent('notification_action', {
      notificationId,
      action
    });
    
    notificationSystem.trackEvent('clicked');
    
    // Handle specific actions
    switch (action) {
      case 'view':
        // Navigate to relevant page
        break;
      case 'dismiss':
        dismissNotification(notificationId);
        break;
      case 'snooze':
        // Re-schedule notification
        break;
      default:
        console.log(`Action ${action} for notification ${notificationId}`);
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'scanning': return 'scan';
      case 'achievements': return 'trophy';
      case 'social': return 'users';
      case 'environmental': return 'leaf';
      case 'system': return 'settings';
      default: return 'bell';
    }
  }

  function formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  function clearAll() {
    notifications = [];
    unreadCount = 0;
    saveNotifications();
  }
</script>

<div class="notification-center fixed top-4 right-4 z-50">
  <!-- Notification Bell -->
  <button
    on:click={toggleExpanded}
    class="relative p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 border border-gray-200"
    title="Notifications"
  >
    <Icon name="bell" class="w-6 h-6 text-gray-600" />
    {#if unreadCount > 0}
      <span
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
        transition:fly={{ y: -10, duration: 200 }}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    {/if}
  </button>

  <!-- Notification Panel -->
  {#if isExpanded}
    <div
      class="absolute top-16 right-0 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden"
      transition:fly={{ y: -20, duration: 200 }}
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Notifications</h3>
          <div class="flex items-center space-x-2">
            {#if notifications.length > 0}
              <button
                on:click={markAllAsRead}
                class="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
              <button
                on:click={clearAll}
                class="text-sm text-red-600 hover:text-red-800"
              >
                Clear all
              </button>
            {/if}
            <button
              on:click={toggleExpanded}
              class="text-gray-400 hover:text-gray-600"
            >
              <Icon name="x" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="max-h-80 overflow-y-auto">
        {#if notifications.length === 0}
          <div class="p-8 text-center text-gray-500">
            <Icon name="bell" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        {:else}
          {#each notifications as notification (notification.id)}
            <div
              class="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 {notification.read ? 'opacity-60' : ''}"
              transition:fly={{ x: 20, duration: 200 }}
            >
              <div class="flex items-start space-x-3">
                <!-- Category Icon -->
                <div class="flex-shrink-0 mt-1">
                  <div class="w-8 h-8 rounded-full {getPriorityColor(notification.priority)} flex items-center justify-center">
                    <Icon name={getCategoryIcon(notification.category)} class="w-4 h-4" />
                  </div>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-medium text-gray-900 truncate">
                      {notification.title}
                    </h4>
                    <span class="text-xs text-gray-500">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1 break-words">
                    {notification.message}
                  </p>

                  <!-- Actions -->
                  {#if notification.actions && notification.actions.length > 0}
                    <div class="flex items-center space-x-2 mt-3">
                      {#each notification.actions as action}
                        <button
                          on:click={() => handleAction(notification.id, action.action)}
                          class="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors duration-150"
                        >
                          {action.title}
                        </button>
                      {/each}
                    </div>
                  {/if}

                  <!-- Quick Actions -->
                  <div class="flex items-center justify-between mt-3">
                    <button
                      on:click={() => markAsRead(notification.id)}
                      class="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {notification.read ? 'Mark unread' : 'Mark read'}
                    </button>
                    <button
                      on:click={() => dismissNotification(notification.id)}
                      class="text-xs text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Toast Notifications -->
<div class="toast-container fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
  {#each notifications.slice(0, 3) as notification (notification.id)}
    {#if !notification.read}
      <div
        class="toast bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md"
        transition:fly={{ y: -20, duration: 300 }}
      >
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-full {getPriorityColor(notification.priority)} flex items-center justify-center">
              <Icon name={getCategoryIcon(notification.category)} class="w-4 h-4" />
            </div>
          </div>
          <div class="flex-1">
            <h4 class="text-sm font-medium text-gray-900">
              {notification.title}
            </h4>
            <p class="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
            {#if notification.actions && notification.actions.length > 0}
              <div class="flex items-center space-x-2 mt-3">
                {#each notification.actions.slice(0, 2) as action}
                  <button
                    on:click={() => handleAction(notification.id, action.action)}
                    class="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors duration-150"
                  >
                    {action.title}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <button
            on:click={() => dismissNotification(notification.id)}
            class="text-gray-400 hover:text-gray-600"
          >
            <Icon name="x" class="w-4 h-4" />
          </button>
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .toast {
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .notification-center {
    user-select: none;
  }

  .toast-container {
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
  }
</style> 