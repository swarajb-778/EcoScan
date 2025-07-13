export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  categories: {
    scanning: boolean;
    achievements: boolean;
    social: boolean;
    environmental: boolean;
    system: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
}

export interface NotificationMessage {
  id: string;
  type: 'push' | 'email' | 'in-app';
  category: keyof NotificationPreferences['categories'];
  title: string;
  message: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  targetUsers?: string[];
  conditions?: NotificationCondition[];
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
  action: string;
  input?: {
    type: 'text' | 'choice';
    placeholder?: string;
    choices?: string[];
  };
}

export interface NotificationCondition {
  type: 'time' | 'location' | 'activity' | 'achievement' | 'social';
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: any;
  target?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: keyof NotificationPreferences['categories'];
  title: string;
  message: string;
  variables: string[];
  localization: Record<string, { title: string; message: string }>;
  scheduling: {
    type: 'immediate' | 'delayed' | 'recurring';
    delay?: number;
    schedule?: string; // cron expression
  };
}

export interface NotificationAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  dismissed: number;
  converted: number;
  unsubscribed: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  template: string;
  targeting: {
    userSegments: string[];
    conditions: NotificationCondition[];
    maxUsers?: number;
  };
  scheduling: {
    startDate: Date;
    endDate?: Date;
    timezone: string;
    frequency: string;
  };
  abTesting?: {
    enabled: boolean;
    variants: Array<{
      id: string;
      name: string;
      weight: number;
      template: string;
    }>;
  };
  analytics: NotificationAnalytics;
  status: 'draft' | 'active' | 'paused' | 'completed';
}

export class NotificationSystem {
  private preferences: NotificationPreferences;
  private templates: Map<string, NotificationTemplate>;
  private campaigns: Map<string, NotificationCampaign>;
  private messageQueue: NotificationMessage[];
  private analytics: NotificationAnalytics;
  private serviceWorker?: ServiceWorkerRegistration;
  private pushSubscription?: PushSubscription;

  constructor() {
    this.preferences = this.loadPreferences();
    this.templates = new Map();
    this.campaigns = new Map();
    this.messageQueue = [];
    this.analytics = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      dismissed: 0,
      converted: 0,
      unsubscribed: 0,
      failed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0
    };
    this.initializeServiceWorker();
    this.loadTemplates();
    this.startNotificationProcessor();
  }

  private loadPreferences(): NotificationPreferences {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : {
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      categories: {
        scanning: true,
        achievements: true,
        social: true,
        environmental: true,
        system: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      frequency: 'instant'
    };
  }

  private async initializeServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        this.serviceWorker = await navigator.serviceWorker.ready;
        await this.setupPushNotifications();
      }
    } catch (error) {
      console.error('Service worker initialization failed:', error);
    }
  }

  private async setupPushNotifications(): Promise<void> {
    try {
      if (!this.serviceWorker) return;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      this.pushSubscription = await this.serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key'
        )
      });

      // Register push subscription with server
      await this.registerPushSubscription();
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async registerPushSubscription(): Promise<void> {
    if (!this.pushSubscription) return;

    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.pushSubscription,
          userId: this.getCurrentUserId()
        })
      });
    } catch (error) {
      console.error('Push subscription registration failed:', error);
    }
  }

  private loadTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'scan_complete',
        name: 'Scan Complete',
        category: 'scanning',
        title: 'Scan Results Ready',
        message: 'Your waste scan has been processed. {{itemCount}} items detected.',
        variables: ['itemCount'],
        localization: {
          'es': {
            title: 'Resultados de Escaneo Listos',
            message: 'Su escaneo de residuos ha sido procesado. {{itemCount}} elementos detectados.'
          }
        },
        scheduling: { type: 'immediate' }
      },
      {
        id: 'achievement_unlocked',
        name: 'Achievement Unlocked',
        category: 'achievements',
        title: 'Achievement Unlocked!',
        message: 'Congratulations! You\'ve unlocked "{{achievementName}}"',
        variables: ['achievementName'],
        localization: {
          'es': {
            title: '¡Logro Desbloqueado!',
            message: '¡Felicidades! Has desbloqueado "{{achievementName}}"'
          }
        },
        scheduling: { type: 'immediate' }
      },
      {
        id: 'daily_reminder',
        name: 'Daily Reminder',
        category: 'environmental',
        title: 'Daily Eco Challenge',
        message: 'Ready for today\'s environmental challenge?',
        variables: [],
        localization: {
          'es': {
            title: 'Desafío Ecológico Diario',
            message: '¿Listo para el desafío ambiental de hoy?'
          }
        },
        scheduling: {
          type: 'recurring',
          schedule: '0 9 * * *' // Daily at 9 AM
        }
      },
      {
        id: 'social_mention',
        name: 'Social Mention',
        category: 'social',
        title: 'You were mentioned!',
        message: '{{userName}} mentioned you in their eco-activity',
        variables: ['userName'],
        localization: {
          'es': {
            title: '¡Te mencionaron!',
            message: '{{userName}} te mencionó en su actividad ecológica'
          }
        },
        scheduling: { type: 'immediate' }
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private startNotificationProcessor(): void {
    setInterval(() => {
      this.processMessageQueue();
    }, 5000); // Process every 5 seconds
  }

  private async processMessageQueue(): Promise<void> {
    const now = new Date();
    const messagesToProcess = this.messageQueue.filter(msg => 
      !msg.expiresAt || msg.expiresAt > now
    );

    for (const message of messagesToProcess) {
      try {
        await this.deliverMessage(message);
        this.messageQueue = this.messageQueue.filter(msg => msg.id !== message.id);
      } catch (error) {
        console.error('Message delivery failed:', error);
        this.analytics.failed++;
      }
    }
  }

  private async deliverMessage(message: NotificationMessage): Promise<void> {
    if (!this.shouldDeliverMessage(message)) return;

    switch (message.type) {
      case 'push':
        await this.sendPushNotification(message);
        break;
      case 'email':
        await this.sendEmailNotification(message);
        break;
      case 'in-app':
        await this.sendInAppNotification(message);
        break;
    }

    this.analytics.sent++;
    this.analytics.delivered++;
  }

  private shouldDeliverMessage(message: NotificationMessage): boolean {
    // Check preferences
    if (!this.preferences.inAppEnabled && message.type === 'in-app') return false;
    if (!this.preferences.pushEnabled && message.type === 'push') return false;
    if (!this.preferences.emailEnabled && message.type === 'email') return false;

    // Check category preferences
    if (!this.preferences.categories[message.category]) return false;

    // Check quiet hours
    if (this.preferences.quietHours.enabled && this.isInQuietHours()) {
      if (message.priority !== 'urgent') return false;
    }

    // Check conditions
    if (message.conditions && !this.evaluateConditions(message.conditions)) {
      return false;
    }

    return true;
  }

  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const { start, end } = this.preferences.quietHours;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }

  private evaluateConditions(conditions: NotificationCondition[]): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'time':
          return this.evaluateTimeCondition(condition);
        case 'location':
          return this.evaluateLocationCondition(condition);
        case 'activity':
          return this.evaluateActivityCondition(condition);
        case 'achievement':
          return this.evaluateAchievementCondition(condition);
        case 'social':
          return this.evaluateSocialCondition(condition);
        default:
          return true;
      }
    });
  }

  private evaluateTimeCondition(condition: NotificationCondition): boolean {
    const now = new Date();
    switch (condition.operator) {
      case 'equals':
        return now.getHours() === condition.value;
      case 'greater':
        return now.getHours() > condition.value;
      case 'less':
        return now.getHours() < condition.value;
      case 'between':
        return now.getHours() >= condition.value[0] && now.getHours() <= condition.value[1];
      default:
        return true;
    }
  }

  private evaluateLocationCondition(condition: NotificationCondition): boolean {
    // Implementation depends on location service
    return true;
  }

  private evaluateActivityCondition(condition: NotificationCondition): boolean {
    // Implementation depends on activity tracking
    return true;
  }

  private evaluateAchievementCondition(condition: NotificationCondition): boolean {
    // Implementation depends on achievement system
    return true;
  }

  private evaluateSocialCondition(condition: NotificationCondition): boolean {
    // Implementation depends on social system
    return true;
  }

  private async sendPushNotification(message: NotificationMessage): Promise<void> {
    if (!this.serviceWorker) return;

    try {
      const notificationOptions: any = {
        body: message.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: message.data,
        tag: message.id,
        requireInteraction: message.priority === 'urgent',
        silent: !this.preferences.soundEnabled,
        actions: message.actions?.map(action => ({
          action: action.id,
          title: action.title,
          icon: action.icon
        }))
      };

      if (this.preferences.vibrationEnabled) {
        notificationOptions.vibrate = [200, 100, 200];
      }

      await this.serviceWorker.showNotification(message.title, notificationOptions);
    } catch (error) {
      console.error('Push notification failed:', error);
      throw error;
    }
  }

  private async sendEmailNotification(message: NotificationMessage): Promise<void> {
    try {
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.getCurrentUserEmail(),
          subject: message.title,
          body: message.message,
          data: message.data,
          priority: message.priority
        })
      });
    } catch (error) {
      console.error('Email notification failed:', error);
      throw error;
    }
  }

  private async sendInAppNotification(message: NotificationMessage): Promise<void> {
    // Dispatch custom event for in-app notifications
    const event = new CustomEvent('notification', {
      detail: message
    });
    window.dispatchEvent(event);
  }

  public async sendNotification(
    templateId: string,
    variables: Record<string, any> = {},
    options: Partial<NotificationMessage> = {}
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const message: NotificationMessage = {
      id: crypto.randomUUID(),
      type: options.type || 'in-app',
      category: template.category,
      title: this.interpolateTemplate(template.title, variables),
      message: this.interpolateTemplate(template.message, variables),
      data: options.data,
      actions: options.actions,
      timestamp: new Date(),
      priority: options.priority || 'normal',
      expiresAt: options.expiresAt,
      targetUsers: options.targetUsers,
      conditions: options.conditions
    };

    if (template.scheduling.type === 'immediate') {
      await this.deliverMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  public async createCampaign(campaign: Omit<NotificationCampaign, 'id' | 'analytics'>): Promise<string> {
    const id = crypto.randomUUID();
    const newCampaign: NotificationCampaign = {
      ...campaign,
      id,
      analytics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        dismissed: 0,
        converted: 0,
        unsubscribed: 0,
        failed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0
      }
    };

    this.campaigns.set(id, newCampaign);
    return id;
  }

  public async launchCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'active';
    
    // Get targeted users
    const targetedUsers = await this.getTargetedUsers(campaign.targeting);
    
    // Send notifications to targeted users
    for (const userId of targetedUsers) {
      await this.sendNotification(campaign.template, {}, {
        targetUsers: [userId],
        priority: 'normal'
      });
    }

    this.campaigns.set(campaignId, campaign);
  }

  private async getTargetedUsers(targeting: NotificationCampaign['targeting']): Promise<string[]> {
    // Implementation depends on user management system
    return ['current-user']; // Placeholder
  }

  public updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  public getCampaign(id: string): NotificationCampaign | undefined {
    return this.campaigns.get(id);
  }

  public getAllCampaigns(): NotificationCampaign[] {
    return Array.from(this.campaigns.values());
  }

  public getAnalytics(): NotificationAnalytics {
    this.updateAnalytics();
    return { ...this.analytics };
  }

  private updateAnalytics(): void {
    if (this.analytics.sent > 0) {
      this.analytics.deliveryRate = (this.analytics.delivered / this.analytics.sent) * 100;
    }
    if (this.analytics.delivered > 0) {
      this.analytics.openRate = (this.analytics.opened / this.analytics.delivered) * 100;
    }
    if (this.analytics.opened > 0) {
      this.analytics.clickRate = (this.analytics.clicked / this.analytics.opened) * 100;
    }
    if (this.analytics.clicked > 0) {
      this.analytics.conversionRate = (this.analytics.converted / this.analytics.clicked) * 100;
    }
  }

  public trackEvent(event: 'opened' | 'clicked' | 'dismissed' | 'converted' | 'unsubscribed'): void {
    this.analytics[event]++;
  }

  private getCurrentUserId(): string {
    return localStorage.getItem('user_id') || 'anonymous';
  }

  private getCurrentUserEmail(): string {
    return localStorage.getItem('user_email') || 'user@example.com';
  }

  public async unsubscribe(category?: keyof NotificationPreferences['categories']): Promise<void> {
    if (category) {
      this.preferences.categories[category] = false;
    } else {
      this.preferences.pushEnabled = false;
      this.preferences.emailEnabled = false;
    }
    
    this.updatePreferences(this.preferences);
    this.trackEvent('unsubscribed');
  }

  public async testNotification(templateId: string): Promise<void> {
    await this.sendNotification(templateId, {
      itemCount: 5,
      achievementName: 'Eco Warrior',
      userName: 'Test User'
    }, {
      type: 'in-app',
      priority: 'normal'
    });
  }

  public exportData(): string {
    return JSON.stringify({
      preferences: this.preferences,
      templates: Array.from(this.templates.entries()),
      campaigns: Array.from(this.campaigns.entries()),
      analytics: this.analytics
    }, null, 2);
  }

  public importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.preferences = parsed.preferences || this.preferences;
      this.templates = new Map(parsed.templates || []);
      this.campaigns = new Map(parsed.campaigns || []);
      this.analytics = parsed.analytics || this.analytics;
    } catch (error) {
      console.error('Import failed:', error);
    }
  }
}

export const notificationSystem = new NotificationSystem(); 