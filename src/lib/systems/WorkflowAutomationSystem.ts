export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  enabled: boolean;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  settings: WorkflowSettings;
  metadata: WorkflowMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  author: string;
  permissions: WorkflowPermissions;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'webhook' | 'manual' | 'file' | 'email' | 'database' | 'api' | 'sensor' | 'form';
  config: TriggerConfig;
  conditions?: TriggerCondition[];
  throttle?: ThrottleConfig;
}

export interface TriggerConfig {
  // Schedule trigger
  schedule?: {
    cron?: string;
    interval?: number;
    timezone?: string;
    startDate?: Date;
    endDate?: Date;
  };
  
  // Event trigger
  event?: {
    source: string;
    eventType: string;
    filters?: Record<string, any>;
  };
  
  // Webhook trigger
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    authentication?: AuthConfig;
  };
  
  // File trigger
  file?: {
    path: string;
    pattern?: string;
    action: 'created' | 'modified' | 'deleted';
    recursive?: boolean;
  };
  
  // Email trigger
  email?: {
    server: string;
    port: number;
    username: string;
    password: string;
    folder?: string;
    filters?: EmailFilter[];
  };
  
  // Database trigger
  database?: {
    connection: string;
    table: string;
    operation: 'insert' | 'update' | 'delete';
    conditions?: Record<string, any>;
  };
  
  // API trigger
  api?: {
    endpoint: string;
    method: string;
    polling?: {
      interval: number;
      timeout: number;
    };
  };
  
  // Sensor trigger
  sensor?: {
    sensorId: string;
    metric: string;
    threshold: number;
    operator: 'greater' | 'less' | 'equal' | 'not_equal';
  };
  
  // Form trigger
  form?: {
    formId: string;
    events: string[];
    fields?: string[];
  };
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'in' | 'not_in' | 'regex' | 'exists' | 'not_exists';
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

export interface ThrottleConfig {
  enabled: boolean;
  maxExecutions: number;
  timeWindow: number; // milliseconds
  strategy: 'sliding' | 'fixed';
}

export interface WorkflowCondition {
  id: string;
  type: 'if' | 'switch' | 'loop' | 'wait' | 'parallel' | 'sequential';
  expression: string;
  conditions: ConditionRule[];
  operator: 'and' | 'or' | 'not';
  actions: WorkflowAction[];
  elseActions?: WorkflowAction[];
  metadata?: Record<string, any>;
}

export interface ConditionRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'in' | 'not_in' | 'regex' | 'exists' | 'not_exists' | 'between' | 'custom';
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  customFunction?: string;
}

export interface WorkflowAction {
  id: string;
  type: 'email' | 'notification' | 'webhook' | 'database' | 'file' | 'api' | 'transform' | 'delay' | 'condition' | 'loop' | 'parallel' | 'script' | 'integration';
  name: string;
  description: string;
  config: ActionConfig;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  onSuccess?: WorkflowAction[];
  onFailure?: WorkflowAction[];
  enabled: boolean;
  order: number;
  metadata?: Record<string, any>;
}

export interface ActionConfig {
  // Email action
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    attachments?: string[];
    template?: string;
    variables?: Record<string, any>;
  };
  
  // Notification action
  notification?: {
    type: 'push' | 'sms' | 'slack' | 'discord' | 'teams';
    message: string;
    title?: string;
    recipients: string[];
    template?: string;
    variables?: Record<string, any>;
  };
  
  // Webhook action
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    authentication?: AuthConfig;
  };
  
  // Database action
  database?: {
    connection: string;
    operation: 'insert' | 'update' | 'delete' | 'select';
    table: string;
    data?: Record<string, any>;
    where?: Record<string, any>;
    query?: string;
  };
  
  // File action
  file?: {
    operation: 'create' | 'read' | 'update' | 'delete' | 'copy' | 'move' | 'compress' | 'decompress';
    path: string;
    content?: string;
    destination?: string;
    format?: 'json' | 'csv' | 'xml' | 'text' | 'binary';
  };
  
  // API action
  api?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    authentication?: AuthConfig;
    responseMapping?: Record<string, string>;
  };
  
  // Transform action
  transform?: {
    input: string;
    output: string;
    transformations: Transformation[];
    format?: 'json' | 'xml' | 'csv' | 'text';
  };
  
  // Delay action
  delay?: {
    duration: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  
  // Script action
  script?: {
    language: 'javascript' | 'python' | 'shell' | 'sql';
    code: string;
    parameters?: Record<string, any>;
    timeout?: number;
    environment?: Record<string, string>;
  };
  
  // Integration action
  integration?: {
    service: string;
    operation: string;
    parameters: Record<string, any>;
    authentication?: AuthConfig;
  };
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'apikey' | 'jwt' | 'custom';
  credentials: Record<string, string>;
  headers?: Record<string, string>;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  baseDelay: number;
  maxDelay: number;
  retryOn: string[];
}

export interface Transformation {
  type: 'map' | 'filter' | 'reduce' | 'sort' | 'group' | 'format' | 'validate' | 'custom';
  field?: string;
  value?: any;
  function?: string;
  parameters?: Record<string, any>;
}

export interface WorkflowSettings {
  maxExecutionTime: number;
  maxConcurrentExecutions: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  errorHandling: 'continue' | 'stop' | 'retry';
  logging: LoggingConfig;
  notifications: NotificationConfig;
  security: SecurityConfig;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  includeSensitiveData: boolean;
  retention: number; // days
  destinations: string[];
}

export interface NotificationConfig {
  onSuccess: boolean;
  onFailure: boolean;
  onTimeout: boolean;
  recipients: string[];
  channels: string[];
}

export interface SecurityConfig {
  encryption: boolean;
  accessControl: boolean;
  auditLog: boolean;
  dataPrivacy: boolean;
  complianceChecks: boolean;
}

export interface WorkflowMetadata {
  description: string;
  documentation: string;
  examples: string[];
  dependencies: string[];
  estimatedDuration: number;
  complexity: 'simple' | 'medium' | 'complex';
  maintenance: MaintenanceInfo;
  performance: PerformanceInfo;
}

export interface MaintenanceInfo {
  lastReviewed: Date;
  nextReview: Date;
  maintainer: string;
  status: 'active' | 'deprecated' | 'experimental';
  changelog: ChangelogEntry[];
}

export interface PerformanceInfo {
  avgExecutionTime: number;
  successRate: number;
  errorRate: number;
  resourceUsage: ResourceUsage;
  optimization: OptimizationInfo;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface OptimizationInfo {
  lastOptimized: Date;
  suggestions: string[];
  bottlenecks: string[];
  improvements: string[];
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  author: string;
  changes: string[];
  breakingChanges: string[];
}

export interface WorkflowPermissions {
  read: string[];
  write: string[];
  execute: string[];
  delete: string[];
  admin: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: string;
  triggerData: any;
  context: ExecutionContext;
  steps: ExecutionStep[];
  results: ExecutionResult[];
  error?: ExecutionError;
  metadata: Record<string, any>;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  sessionId: string;
  environment: string;
  variables: Record<string, any>;
  secrets: Record<string, any>;
  permissions: string[];
  trace: TraceInfo[];
}

export interface TraceInfo {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  source: string;
}

export interface ExecutionStep {
  id: string;
  actionId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: any;
  output: any;
  error?: string;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface ExecutionResult {
  stepId: string;
  success: boolean;
  data: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface ExecutionError {
  code: string;
  message: string;
  details: string;
  stepId?: string;
  timestamp: Date;
  stack?: string;
  context?: Record<string, any>;
}

export interface EmailFilter {
  field: 'from' | 'to' | 'subject' | 'body' | 'date';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  value: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  definition: Partial<WorkflowDefinition>;
  variables: TemplateVariable[];
  instructions: string;
  examples: string[];
  author: string;
  version: string;
  rating: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  options?: any[];
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export class WorkflowAutomationSystem {
  private workflows: Map<string, WorkflowDefinition>;
  private executions: Map<string, WorkflowExecution>;
  private templates: Map<string, WorkflowTemplate>;
  private activeExecutions: Map<string, AbortController>;
  private scheduledTasks: Map<string, NodeJS.Timeout>;
  private config: WorkflowConfig;
  private isRunning: boolean;

  constructor(config?: Partial<WorkflowConfig>) {
    this.workflows = new Map();
    this.executions = new Map();
    this.templates = new Map();
    this.activeExecutions = new Map();
    this.scheduledTasks = new Map();
    this.config = this.mergeConfig(config);
    this.isRunning = false;
    
    this.loadWorkflows();
    this.loadTemplates();
    this.initializeSystem();
  }

  private mergeConfig(config?: Partial<WorkflowConfig>): WorkflowConfig {
    const defaultConfig: WorkflowConfig = {
      maxConcurrentExecutions: 10,
      maxExecutionTime: 300000, // 5 minutes
      defaultRetryAttempts: 3,
      defaultRetryDelay: 1000,
      loggingEnabled: true,
      metricsEnabled: true,
      securityEnabled: true,
      encryptionEnabled: false,
      auditEnabled: true,
      executionHistoryRetention: 30, // days
      autoCleanup: true,
      enableScheduling: true,
      enableWebhooks: true,
      enableIntegrations: true,
      rateLimiting: {
        enabled: true,
        maxRequestsPerMinute: 100,
        maxRequestsPerHour: 1000
      }
    };

    return { ...defaultConfig, ...config };
  }

  private loadWorkflows(): void {
    const workflowsData = localStorage.getItem('workflow_definitions');
    if (workflowsData) {
      try {
        const workflows = JSON.parse(workflowsData);
        this.workflows = new Map(workflows);
      } catch (error) {
        console.error('Failed to load workflows:', error);
      }
    }
  }

  private saveWorkflows(): void {
    const workflowsArray = Array.from(this.workflows.entries());
    localStorage.setItem('workflow_definitions', JSON.stringify(workflowsArray));
  }

  private loadTemplates(): void {
    const templatesData = localStorage.getItem('workflow_templates');
    if (templatesData) {
      try {
        const templates = JSON.parse(templatesData);
        this.templates = new Map(templates);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }

  private saveTemplates(): void {
    const templatesArray = Array.from(this.templates.entries());
    localStorage.setItem('workflow_templates', JSON.stringify(templatesArray));
  }

  private initializeSystem(): void {
    this.isRunning = true;
    this.startScheduledWorkflows();
    this.startExecutionMonitoring();
    this.startCleanupProcess();
  }

  private startScheduledWorkflows(): void {
    if (!this.config.enableScheduling) return;

    this.workflows.forEach((workflow, id) => {
      if (workflow.enabled && workflow.trigger.type === 'schedule') {
        this.scheduleWorkflow(workflow);
      }
    });
  }

  private scheduleWorkflow(workflow: WorkflowDefinition): void {
    const schedule = workflow.trigger.config.schedule;
    if (!schedule) return;

    if (schedule.cron) {
      // Parse cron expression and schedule
      const interval = this.parseCronExpression(schedule.cron);
      if (interval) {
        const taskId = setInterval(() => {
          this.executeWorkflow(workflow.id, 'schedule', {});
        }, interval);
        
        this.scheduledTasks.set(workflow.id, taskId);
      }
    } else if (schedule.interval) {
      const taskId = setInterval(() => {
        this.executeWorkflow(workflow.id, 'schedule', {});
      }, schedule.interval);
      
      this.scheduledTasks.set(workflow.id, taskId);
    }
  }

  private parseCronExpression(cron: string): number | null {
    // Simplified cron parsing - in real implementation, use a proper cron library
    const parts = cron.split(' ');
    if (parts.length !== 5) return null;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // For simplicity, handle basic intervals
    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 60000; // Every minute
    }
    
    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 3600000; // Every hour
    }
    
    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 86400000; // Every day
    }

    return null;
  }

  private startExecutionMonitoring(): void {
    setInterval(() => {
      this.monitorExecutions();
    }, 30000); // Check every 30 seconds
  }

  private monitorExecutions(): void {
    const now = Date.now();
    
    this.executions.forEach((execution, id) => {
      if (execution.status === 'running') {
        const elapsed = now - execution.startTime.getTime();
        
        // Check for timeout
        if (elapsed > this.config.maxExecutionTime) {
          this.cancelExecution(id, 'timeout');
        }
      }
    });
  }

  private startCleanupProcess(): void {
    if (!this.config.autoCleanup) return;

    setInterval(() => {
      this.cleanupOldExecutions();
    }, 86400000); // Daily cleanup
  }

  private cleanupOldExecutions(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.executionHistoryRetention);

    this.executions.forEach((execution, id) => {
      if (execution.startTime < cutoffDate) {
        this.executions.delete(id);
      }
    });

    this.saveExecutions();
  }

  private saveExecutions(): void {
    const executionsArray = Array.from(this.executions.entries());
    localStorage.setItem('workflow_executions', JSON.stringify(executionsArray));
  }

  public async createWorkflow(definition: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const workflow: WorkflowDefinition = {
      id,
      name: definition.name || 'Untitled Workflow',
      description: definition.description || '',
      version: definition.version || '1.0.0',
      category: definition.category || 'general',
      tags: definition.tags || [],
      enabled: definition.enabled ?? true,
      trigger: definition.trigger || {
        type: 'manual',
        config: {}
      },
      conditions: definition.conditions || [],
      actions: definition.actions || [],
      settings: definition.settings || {
        maxExecutionTime: 300000,
        maxConcurrentExecutions: 1,
        priority: 'normal',
        errorHandling: 'stop',
        logging: {
          enabled: true,
          level: 'info',
          includeSensitiveData: false,
          retention: 30,
          destinations: ['console']
        },
        notifications: {
          onSuccess: false,
          onFailure: true,
          onTimeout: true,
          recipients: [],
          channels: []
        },
        security: {
          encryption: false,
          accessControl: true,
          auditLog: true,
          dataPrivacy: true,
          complianceChecks: true
        }
      },
      metadata: definition.metadata || {
        description: '',
        documentation: '',
        examples: [],
        dependencies: [],
        estimatedDuration: 0,
        complexity: 'simple',
        maintenance: {
          lastReviewed: now,
          nextReview: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
          maintainer: 'system',
          status: 'active',
          changelog: []
        },
        performance: {
          avgExecutionTime: 0,
          successRate: 0,
          errorRate: 0,
          resourceUsage: {
            cpu: 0,
            memory: 0,
            network: 0,
            storage: 0
          },
          optimization: {
            lastOptimized: now,
            suggestions: [],
            bottlenecks: [],
            improvements: []
          }
        }
      },
      createdAt: now,
      updatedAt: now,
      executionCount: 0,
      author: definition.author || 'system',
      permissions: definition.permissions || {
        read: ['*'],
        write: ['admin', 'editor'],
        execute: ['*'],
        delete: ['admin'],
        admin: ['admin']
      }
    };

    // Validate workflow
    const validation = await this.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Save workflow
    this.workflows.set(id, workflow);
    this.saveWorkflows();

    // Schedule if needed
    if (workflow.enabled && workflow.trigger.type === 'schedule') {
      this.scheduleWorkflow(workflow);
    }

    return workflow;
  }

  public async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date()
    };

    // Validate workflow
    const validation = await this.validateWorkflow(updatedWorkflow);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Update workflow
    this.workflows.set(id, updatedWorkflow);
    this.saveWorkflows();

    // Update scheduling
    if (workflow.trigger.type === 'schedule') {
      this.unscheduleWorkflow(id);
      if (updatedWorkflow.enabled) {
        this.scheduleWorkflow(updatedWorkflow);
      }
    }

    return updatedWorkflow;
  }

  public async deleteWorkflow(id: string): Promise<void> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    // Cancel any active executions
    this.activeExecutions.forEach((controller, executionId) => {
      const execution = this.executions.get(executionId);
      if (execution && execution.workflowId === id) {
        controller.abort();
      }
    });

    // Unschedule
    this.unscheduleWorkflow(id);

    // Delete workflow
    this.workflows.delete(id);
    this.saveWorkflows();
  }

  private unscheduleWorkflow(id: string): void {
    const taskId = this.scheduledTasks.get(id);
    if (taskId) {
      clearInterval(taskId);
      this.scheduledTasks.delete(id);
    }
  }

  public async executeWorkflow(workflowId: string, triggeredBy: string, triggerData: any): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow is disabled: ${workflowId}`);
    }

    // Check concurrent executions
    const activeCount = Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId && exec.status === 'running').length;
    
    if (activeCount >= workflow.settings.maxConcurrentExecutions) {
      throw new Error(`Maximum concurrent executions reached for workflow: ${workflowId}`);
    }

    // Create execution
    const executionId = crypto.randomUUID();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startTime: new Date(),
      triggeredBy,
      triggerData,
      context: {
        workflowId,
        executionId,
        userId: triggeredBy,
        sessionId: crypto.randomUUID(),
        environment: 'production',
        variables: {},
        secrets: {},
        permissions: workflow.permissions.execute,
        trace: []
      },
      steps: [],
      results: [],
      metadata: {}
    };

    this.executions.set(executionId, execution);
    
    // Create abort controller
    const controller = new AbortController();
    this.activeExecutions.set(executionId, controller);

    try {
      // Execute workflow
      await this.runWorkflow(workflow, execution, controller.signal);
      
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      // Update workflow stats
      workflow.executionCount++;
      workflow.lastExecuted = new Date();
      this.workflows.set(workflowId, workflow);
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = {
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack || '' : '',
        timestamp: new Date()
      };
    } finally {
      this.activeExecutions.delete(executionId);
      this.saveExecutions();
      this.saveWorkflows();
    }

    return execution;
  }

  private async runWorkflow(workflow: WorkflowDefinition, execution: WorkflowExecution, signal: AbortSignal): Promise<void> {
    // Check trigger conditions
    if (workflow.trigger.conditions) {
      const triggerValid = await this.evaluateTriggerConditions(workflow.trigger.conditions, execution.triggerData);
      if (!triggerValid) {
        throw new Error('Trigger conditions not met');
      }
    }

    // Check workflow conditions
    if (workflow.conditions.length > 0) {
      const conditionsValid = await this.evaluateWorkflowConditions(workflow.conditions, execution.context);
      if (!conditionsValid) {
        throw new Error('Workflow conditions not met');
      }
    }

    // Execute actions
    for (const action of workflow.actions.sort((a, b) => a.order - b.order)) {
      if (signal.aborted) {
        throw new Error('Workflow execution cancelled');
      }

      if (action.enabled) {
        await this.executeAction(action, execution, signal);
      }
    }
  }

  private async executeAction(action: WorkflowAction, execution: WorkflowExecution, signal: AbortSignal): Promise<void> {
    const step: ExecutionStep = {
      id: crypto.randomUUID(),
      actionId: action.id,
      name: action.name,
      status: 'running',
      startTime: new Date(),
      input: action.config,
      output: null,
      retryCount: 0,
      metadata: {}
    };

    execution.steps.push(step);

    try {
      let result: any;
      
      switch (action.type) {
        case 'email':
          result = await this.executeEmailAction(action.config.email!, execution.context);
          break;
        case 'notification':
          result = await this.executeNotificationAction(action.config.notification!, execution.context);
          break;
        case 'webhook':
          result = await this.executeWebhookAction(action.config.webhook!, execution.context, signal);
          break;
        case 'database':
          result = await this.executeDatabaseAction(action.config.database!, execution.context);
          break;
        case 'file':
          result = await this.executeFileAction(action.config.file!, execution.context);
          break;
        case 'api':
          result = await this.executeApiAction(action.config.api!, execution.context, signal);
          break;
        case 'transform':
          result = await this.executeTransformAction(action.config.transform!, execution.context);
          break;
        case 'delay':
          result = await this.executeDelayAction(action.config.delay!, signal);
          break;
        case 'script':
          result = await this.executeScriptAction(action.config.script!, execution.context);
          break;
        case 'integration':
          result = await this.executeIntegrationAction(action.config.integration!, execution.context);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      step.status = 'completed';
      step.output = result;
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();

      execution.results.push({
        stepId: step.id,
        success: true,
        data: result,
        duration: step.duration!,
        timestamp: step.endTime
      });

      // Execute success actions
      if (action.onSuccess) {
        for (const successAction of action.onSuccess) {
          await this.executeAction(successAction, execution, signal);
        }
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();

      execution.results.push({
        stepId: step.id,
        success: false,
        error: step.error,
        duration: step.duration!,
        timestamp: step.endTime
      });

      // Execute failure actions
      if (action.onFailure) {
        for (const failureAction of action.onFailure) {
          await this.executeAction(failureAction, execution, signal);
        }
      }

      // Retry if configured
      if (action.retryPolicy && action.retryPolicy.enabled && step.retryCount < action.retryPolicy.maxAttempts) {
        step.retryCount++;
        await this.delay(action.retryPolicy.baseDelay * Math.pow(2, step.retryCount - 1));
        await this.executeAction(action, execution, signal);
      } else {
        throw error;
      }
    }
  }

  private async executeEmailAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate email sending
    console.log('Sending email:', config);
    return { sent: true, messageId: crypto.randomUUID() };
  }

  private async executeNotificationAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate notification sending
    console.log('Sending notification:', config);
    return { sent: true, notificationId: crypto.randomUUID() };
  }

  private async executeWebhookAction(config: any, context: ExecutionContext, signal: AbortSignal): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async executeDatabaseAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate database operation
    console.log('Database operation:', config);
    return { affectedRows: 1 };
  }

  private async executeFileAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate file operation
    console.log('File operation:', config);
    return { success: true };
  }

  private async executeApiAction(config: any, context: ExecutionContext, signal: AbortSignal): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async executeTransformAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate data transformation
    console.log('Data transformation:', config);
    return { transformed: true };
  }

  private async executeDelayAction(config: any, signal: AbortSignal): Promise<any> {
    const duration = config.duration * this.getUnitMultiplier(config.unit);
    await this.delay(duration, signal);
    return { delayed: duration };
  }

  private async executeScriptAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate script execution
    console.log('Script execution:', config);
    return { executed: true, output: 'Script output' };
  }

  private async executeIntegrationAction(config: any, context: ExecutionContext): Promise<any> {
    // Simulate integration call
    console.log('Integration call:', config);
    return { success: true };
  }

  private getUnitMultiplier(unit: string): number {
    switch (unit) {
      case 'seconds': return 1000;
      case 'minutes': return 60 * 1000;
      case 'hours': return 60 * 60 * 1000;
      case 'days': return 24 * 60 * 60 * 1000;
      default: return 1000;
    }
  }

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Delayed cancelled'));
        });
      }
    });
  }

  private async evaluateTriggerConditions(conditions: TriggerCondition[], data: any): Promise<boolean> {
    return conditions.every(condition => this.evaluateCondition(condition, data));
  }

  private async evaluateWorkflowConditions(conditions: WorkflowCondition[], context: ExecutionContext): Promise<boolean> {
    return conditions.every(condition => this.evaluateWorkflowCondition(condition, context));
  }

  private evaluateCondition(condition: TriggerCondition, data: any): boolean {
    const value = this.getNestedValue(data, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'not_contains':
        return !String(value).includes(condition.value);
      case 'greater':
        return value > condition.value;
      case 'less':
        return value < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'regex':
        return new RegExp(condition.value).test(String(value));
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return true;
    }
  }

  private evaluateWorkflowCondition(condition: WorkflowCondition, context: ExecutionContext): boolean {
    return condition.conditions.every(rule => this.evaluateConditionRule(rule, context));
  }

  private evaluateConditionRule(rule: ConditionRule, context: ExecutionContext): boolean {
    const value = this.getNestedValue(context, rule.field);
    
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'contains':
        return String(value).includes(rule.value);
      case 'not_contains':
        return !String(value).includes(rule.value);
      case 'greater':
        return value > rule.value;
      case 'less':
        return value < rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      case 'regex':
        return new RegExp(rule.value).test(String(value));
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      case 'between':
        return Array.isArray(rule.value) && value >= rule.value[0] && value <= rule.value[1];
      case 'custom':
        return rule.customFunction ? this.executeCustomFunction(rule.customFunction, value) : true;
      default:
        return true;
    }
  }

  private executeCustomFunction(functionName: string, value: any): boolean {
    // Implement custom function execution
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async validateWorkflow(workflow: WorkflowDefinition): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    if (!workflow.trigger) {
      errors.push('Workflow trigger is required');
    }

    if (!workflow.actions || workflow.actions.length === 0) {
      errors.push('Workflow must have at least one action');
    }

    // Validate actions
    workflow.actions.forEach((action, index) => {
      if (!action.name || action.name.trim().length === 0) {
        errors.push(`Action ${index + 1} name is required`);
      }

      if (!action.type) {
        errors.push(`Action ${index + 1} type is required`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  public async cancelExecution(executionId: string, reason: string = 'cancelled'): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Execution is not running: ${executionId}`);
    }

    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
    }

    execution.status = reason === 'timeout' ? 'timeout' : 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    execution.error = {
      code: reason.toUpperCase(),
      message: `Execution ${reason}`,
      details: '',
      timestamp: new Date()
    };

    this.activeExecutions.delete(executionId);
    this.saveExecutions();
  }

  public getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  public getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  public getExecutions(workflowId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    return workflowId ? executions.filter(exec => exec.workflowId === workflowId) : executions;
  }

  public getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(exec => exec.status === 'running');
  }

  public getSystemStatus(): {
    isRunning: boolean;
    totalWorkflows: number;
    enabledWorkflows: number;
    totalExecutions: number;
    activeExecutions: number;
    scheduledTasks: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  } {
    const totalWorkflows = this.workflows.size;
    const enabledWorkflows = Array.from(this.workflows.values()).filter(w => w.enabled).length;
    const totalExecutions = this.executions.size;
    const activeExecutions = this.getActiveExecutions().length;
    const scheduledTasks = this.scheduledTasks.size;

    const systemHealth = activeExecutions > this.config.maxConcurrentExecutions ? 'warning' : 'healthy';

    return {
      isRunning: this.isRunning,
      totalWorkflows,
      enabledWorkflows,
      totalExecutions,
      activeExecutions,
      scheduledTasks,
      systemHealth
    };
  }

  public exportWorkflows(): string {
    return JSON.stringify({
      workflows: Array.from(this.workflows.entries()),
      templates: Array.from(this.templates.entries()),
      executions: Array.from(this.executions.entries())
    }, null, 2);
  }

  public importWorkflows(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.workflows) {
        this.workflows = new Map(parsed.workflows);
        this.saveWorkflows();
      }
      
      if (parsed.templates) {
        this.templates = new Map(parsed.templates);
        this.saveTemplates();
      }
      
      if (parsed.executions) {
        this.executions = new Map(parsed.executions);
        this.saveExecutions();
      }

      // Restart scheduled workflows
      this.scheduledTasks.forEach(taskId => clearInterval(taskId));
      this.scheduledTasks.clear();
      this.startScheduledWorkflows();
      
    } catch (error) {
      console.error('Failed to import workflows:', error);
    }
  }

  public destroy(): void {
    this.isRunning = false;
    
    // Cancel all active executions
    this.activeExecutions.forEach(controller => controller.abort());
    this.activeExecutions.clear();
    
    // Clear scheduled tasks
    this.scheduledTasks.forEach(taskId => clearInterval(taskId));
    this.scheduledTasks.clear();
    
    // Clear data
    this.workflows.clear();
    this.executions.clear();
    this.templates.clear();
  }
}

interface WorkflowConfig {
  maxConcurrentExecutions: number;
  maxExecutionTime: number;
  defaultRetryAttempts: number;
  defaultRetryDelay: number;
  loggingEnabled: boolean;
  metricsEnabled: boolean;
  securityEnabled: boolean;
  encryptionEnabled: boolean;
  auditEnabled: boolean;
  executionHistoryRetention: number;
  autoCleanup: boolean;
  enableScheduling: boolean;
  enableWebhooks: boolean;
  enableIntegrations: boolean;
  rateLimiting: {
    enabled: boolean;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
}

export const workflowAutomationSystem = new WorkflowAutomationSystem(); 