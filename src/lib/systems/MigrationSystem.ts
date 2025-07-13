export interface MigrationConfig {
  version: string;
  backupEnabled: boolean;
  backupRetention: number; // days
  autoMigration: boolean;
  rollbackEnabled: boolean;
  validationEnabled: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  migrationTimeout: number; // milliseconds
  batchSize: number;
}

export interface MigrationStep {
  id: string;
  version: string;
  name: string;
  description: string;
  type: 'schema' | 'data' | 'config' | 'cleanup';
  dependencies: string[];
  rollbackSupported: boolean;
  estimatedTime: number;
  priority: number;
  validate?: (data: any) => boolean;
  migrate: (data: any) => Promise<any>;
  rollback?: (data: any) => Promise<any>;
}

export interface MigrationResult {
  stepId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  recordsProcessed: number;
  recordsSkipped: number;
  recordsFailed: number;
  error?: string;
  warnings: string[];
  metadata: Record<string, any>;
}

export interface BackupMetadata {
  id: string;
  version: string;
  timestamp: Date;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  description: string;
  dataTypes: string[];
  migrationId?: string;
  expiresAt?: Date;
}

export interface MigrationPlan {
  id: string;
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  totalSteps: number;
  estimatedTime: number;
  requiresBackup: boolean;
  canRollback: boolean;
  risks: string[];
  dependencies: string[];
  createdAt: Date;
}

export interface MigrationLog {
  id: string;
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolledback';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  currentStep?: string;
  progress: number;
  results: MigrationResult[];
  backupId?: string;
  error?: string;
  warnings: string[];
  metadata: Record<string, any>;
}

export interface DataSchema {
  version: string;
  tables: Record<string, TableSchema>;
  indexes: Record<string, IndexSchema>;
  constraints: Record<string, ConstraintSchema>;
  triggers: Record<string, TriggerSchema>;
}

export interface TableSchema {
  name: string;
  columns: Record<string, ColumnSchema>;
  primaryKey: string[];
  foreignKeys: Record<string, ForeignKeySchema>;
  indexes: string[];
}

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  nullable: boolean;
  default?: any;
  unique: boolean;
  constraints: string[];
}

export interface ForeignKeySchema {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: 'cascade' | 'set null' | 'restrict';
  onUpdate: 'cascade' | 'set null' | 'restrict';
}

export interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'fulltext';
}

export interface ConstraintSchema {
  name: string;
  type: 'check' | 'unique' | 'foreign' | 'primary';
  table: string;
  columns: string[];
  definition: string;
}

export interface TriggerSchema {
  name: string;
  table: string;
  event: 'insert' | 'update' | 'delete';
  timing: 'before' | 'after';
  definition: string;
}

export class MigrationSystem {
  private config: MigrationConfig;
  private currentVersion: string;
  private migrations: Map<string, MigrationStep[]>;
  private backups: Map<string, BackupMetadata>;
  private logs: MigrationLog[];
  private schemas: Map<string, DataSchema>;
  private isRunning: boolean;
  private currentMigration?: MigrationLog;

  constructor(config?: Partial<MigrationConfig>) {
    this.config = this.mergeConfig(config);
    this.currentVersion = this.getCurrentVersion();
    this.migrations = new Map();
    this.backups = new Map();
    this.logs = [];
    this.schemas = new Map();
    this.isRunning = false;
    
    this.initializeMigrations();
    this.loadBackups();
    this.loadLogs();
  }

  private mergeConfig(config?: Partial<MigrationConfig>): MigrationConfig {
    const defaultConfig: MigrationConfig = {
      version: '1.0.0',
      backupEnabled: true,
      backupRetention: 30,
      autoMigration: false,
      rollbackEnabled: true,
      validationEnabled: true,
      compressionEnabled: true,
      encryptionEnabled: false,
      migrationTimeout: 300000, // 5 minutes
      batchSize: 1000
    };

    return { ...defaultConfig, ...config };
  }

  private getCurrentVersion(): string {
    return localStorage.getItem('app_version') || '1.0.0';
  }

  private setCurrentVersion(version: string): void {
    localStorage.setItem('app_version', version);
    this.currentVersion = version;
  }

  private initializeMigrations(): void {
    // Register default migrations
    this.registerMigration('1.0.0', '1.1.0', [
      {
        id: 'add_user_preferences',
        version: '1.1.0',
        name: 'Add User Preferences',
        description: 'Add user preferences table and migrate existing settings',
        type: 'schema',
        dependencies: [],
        rollbackSupported: true,
        estimatedTime: 30000,
        priority: 1,
        migrate: async (data) => {
          // Add user preferences structure
          const preferences = {
            theme: 'light',
            notifications: true,
            language: 'en',
            privacy: {
              analytics: true,
              cookies: true
            }
          };
          
          localStorage.setItem('user_preferences', JSON.stringify(preferences));
          return { success: true, recordsProcessed: 1 };
        },
        rollback: async (data) => {
          localStorage.removeItem('user_preferences');
          return { success: true, recordsProcessed: 1 };
        }
      }
    ]);

    this.registerMigration('1.1.0', '1.2.0', [
      {
        id: 'migrate_scan_history',
        version: '1.2.0',
        name: 'Migrate Scan History',
        description: 'Update scan history format with new metadata fields',
        type: 'data',
        dependencies: [],
        rollbackSupported: true,
        estimatedTime: 60000,
        priority: 1,
        migrate: async (data) => {
          const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
          const migrated = history.map((scan: any) => ({
            ...scan,
            metadata: {
              confidence: scan.confidence || 0.95,
              processingTime: scan.processingTime || 0,
              modelVersion: '2.0.0'
            },
            version: '1.2.0'
          }));
          
          localStorage.setItem('scan_history', JSON.stringify(migrated));
          return { success: true, recordsProcessed: migrated.length };
        },
        rollback: async (data) => {
          const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
          const rolledBack = history.map((scan: any) => {
            const { metadata, version, ...rest } = scan;
            return rest;
          });
          
          localStorage.setItem('scan_history', JSON.stringify(rolledBack));
          return { success: true, recordsProcessed: rolledBack.length };
        }
      }
    ]);

    this.registerMigration('1.2.0', '1.3.0', [
      {
        id: 'add_analytics_settings',
        version: '1.3.0',
        name: 'Add Analytics Settings',
        description: 'Add analytics and tracking configuration',
        type: 'config',
        dependencies: ['add_user_preferences'],
        rollbackSupported: true,
        estimatedTime: 15000,
        priority: 2,
        migrate: async (data) => {
          const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
          preferences.analytics = {
            enabled: true,
            trackingId: crypto.randomUUID(),
            sessionTracking: true,
            errorTracking: true,
            performanceTracking: true
          };
          
          localStorage.setItem('user_preferences', JSON.stringify(preferences));
          return { success: true, recordsProcessed: 1 };
        },
        rollback: async (data) => {
          const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
          delete preferences.analytics;
          localStorage.setItem('user_preferences', JSON.stringify(preferences));
          return { success: true, recordsProcessed: 1 };
        }
      }
    ]);
  }

  private loadBackups(): void {
    const backupsData = localStorage.getItem('migration_backups');
    if (backupsData) {
      try {
        const backups = JSON.parse(backupsData);
        this.backups = new Map(backups);
      } catch (error) {
        console.error('Failed to load backups:', error);
      }
    }
  }

  private saveBackups(): void {
    localStorage.setItem('migration_backups', JSON.stringify(Array.from(this.backups.entries())));
  }

  private loadLogs(): void {
    const logsData = localStorage.getItem('migration_logs');
    if (logsData) {
      try {
        this.logs = JSON.parse(logsData);
      } catch (error) {
        console.error('Failed to load migration logs:', error);
      }
    }
  }

  private saveLogs(): void {
    localStorage.setItem('migration_logs', JSON.stringify(this.logs));
  }

  public registerMigration(fromVersion: string, toVersion: string, steps: MigrationStep[]): void {
    const key = `${fromVersion}-${toVersion}`;
    this.migrations.set(key, steps);
  }

  public async createMigrationPlan(toVersion: string): Promise<MigrationPlan> {
    const fromVersion = this.currentVersion;
    const steps = this.findMigrationPath(fromVersion, toVersion);
    
    if (steps.length === 0) {
      throw new Error(`No migration path found from ${fromVersion} to ${toVersion}`);
    }

    const plan: MigrationPlan = {
      id: crypto.randomUUID(),
      fromVersion,
      toVersion,
      steps,
      totalSteps: steps.length,
      estimatedTime: steps.reduce((sum, step) => sum + step.estimatedTime, 0),
      requiresBackup: this.config.backupEnabled,
      canRollback: this.config.rollbackEnabled && steps.every(step => step.rollbackSupported),
      risks: this.assessRisks(steps),
      dependencies: this.extractDependencies(steps),
      createdAt: new Date()
    };

    return plan;
  }

  private findMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
    const path: MigrationStep[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const nextMigration = this.findNextMigration(currentVersion);
      if (!nextMigration) {
        break;
      }

      path.push(...nextMigration.steps);
      currentVersion = nextMigration.toVersion;
    }

    return path;
  }

  private findNextMigration(fromVersion: string): { toVersion: string; steps: MigrationStep[] } | null {
    for (const [key, steps] of this.migrations.entries()) {
      const [from, to] = key.split('-');
      if (from === fromVersion) {
        return { toVersion: to, steps };
      }
    }
    return null;
  }

  private assessRisks(steps: MigrationStep[]): string[] {
    const risks: string[] = [];
    
    if (steps.some(step => step.type === 'schema')) {
      risks.push('Schema changes may affect application compatibility');
    }
    
    if (steps.some(step => !step.rollbackSupported)) {
      risks.push('Some steps cannot be rolled back');
    }
    
    if (steps.some(step => step.estimatedTime > 120000)) {
      risks.push('Long-running migrations may cause downtime');
    }

    return risks;
  }

  private extractDependencies(steps: MigrationStep[]): string[] {
    const dependencies = new Set<string>();
    steps.forEach(step => {
      step.dependencies.forEach(dep => dependencies.add(dep));
    });
    return Array.from(dependencies);
  }

  public async executeMigration(plan: MigrationPlan): Promise<MigrationLog> {
    if (this.isRunning) {
      throw new Error('Migration is already running');
    }

    this.isRunning = true;
    
    const log: MigrationLog = {
      id: crypto.randomUUID(),
      planId: plan.id,
      status: 'running',
      startTime: new Date(),
      progress: 0,
      results: [],
      warnings: [],
      metadata: {}
    };

    this.currentMigration = log;
    this.logs.push(log);

    try {
      // Create backup if enabled
      if (plan.requiresBackup) {
        log.backupId = await this.createBackup(`Pre-migration backup for ${plan.toVersion}`);
      }

      // Execute migration steps
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        log.currentStep = step.id;
        log.progress = (i / plan.steps.length) * 100;

        try {
          const result = await this.executeStep(step);
          log.results.push(result);

          if (!result.success) {
            throw new Error(`Migration step ${step.id} failed: ${result.error}`);
          }
        } catch (error) {
          log.status = 'failed';
          log.error = error instanceof Error ? error.message : 'Unknown error';
          log.endTime = new Date();
          log.duration = log.endTime.getTime() - log.startTime.getTime();
          this.saveLogs();
          throw error;
        }
      }

      // Update version
      this.setCurrentVersion(plan.toVersion);
      
      log.status = 'completed';
      log.progress = 100;
      log.endTime = new Date();
      log.duration = log.endTime.getTime() - log.startTime.getTime();
      
    } catch (error) {
      log.status = 'failed';
      log.error = error instanceof Error ? error.message : 'Unknown error';
      log.endTime = new Date();
      log.duration = log.endTime.getTime() - log.startTime.getTime();
      throw error;
    } finally {
      this.isRunning = false;
      this.currentMigration = undefined;
      this.saveLogs();
    }

    return log;
  }

  private async executeStep(step: MigrationStep): Promise<MigrationResult> {
    const result: MigrationResult = {
      stepId: step.id,
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      recordsProcessed: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      warnings: [],
      metadata: {}
    };

    try {
      const startTime = performance.now();
      
      // Validate if enabled
      if (this.config.validationEnabled && step.validate) {
        const isValid = step.validate({});
        if (!isValid) {
          throw new Error(`Validation failed for step ${step.id}`);
        }
      }

      // Execute migration
      const migrationResult = await step.migrate({});
      
      result.success = migrationResult.success;
      result.recordsProcessed = migrationResult.recordsProcessed || 0;
      result.recordsSkipped = migrationResult.recordsSkipped || 0;
      result.recordsFailed = migrationResult.recordsFailed || 0;
      result.metadata = migrationResult.metadata || {};
      
      if (migrationResult.warnings) {
        result.warnings = migrationResult.warnings;
      }

      const endTime = performance.now();
      result.duration = endTime - startTime;
      result.endTime = new Date();

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
    }

    return result;
  }

  public async rollbackMigration(logId: string): Promise<void> {
    if (!this.config.rollbackEnabled) {
      throw new Error('Rollback is disabled');
    }

    const log = this.logs.find(l => l.id === logId);
    if (!log) {
      throw new Error(`Migration log not found: ${logId}`);
    }

    if (log.status !== 'completed') {
      throw new Error('Can only rollback completed migrations');
    }

    // Find the migration plan
    const plan = this.findMigrationPlan(log.planId);
    if (!plan || !plan.canRollback) {
      throw new Error('Migration cannot be rolled back');
    }

    // Execute rollback steps in reverse order
    const rollbackSteps = plan.steps.filter(step => step.rollback).reverse();
    
    for (const step of rollbackSteps) {
      try {
        await step.rollback!({});
      } catch (error) {
        console.error(`Rollback failed for step ${step.id}:`, error);
        throw error;
      }
    }

    // Restore from backup if available
    if (log.backupId) {
      await this.restoreBackup(log.backupId);
    }

    // Update version
    this.setCurrentVersion(plan.fromVersion);
    
    // Update log status
    log.status = 'rolledback';
    this.saveLogs();
  }

  private findMigrationPlan(planId: string): MigrationPlan | undefined {
    // This would typically be stored separately
    return undefined;
  }

  public async createBackup(description: string): Promise<string> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date();
    
    // Collect all data
    const data: Record<string, any> = {};
    
    // Collect localStorage data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }

    // Collect sessionStorage data
    const sessionData: Record<string, any> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionData[key] = sessionStorage.getItem(key);
      }
    }
    data._sessionStorage = sessionData;

    // Serialize and optionally compress
    let serialized = JSON.stringify(data);
    let compressed = false;
    
    if (this.config.compressionEnabled) {
      // Simple compression simulation
      serialized = this.compress(serialized);
      compressed = true;
    }

    // Calculate checksum
    const checksum = await this.calculateChecksum(serialized);
    
    // Create backup metadata
    const metadata: BackupMetadata = {
      id: backupId,
      version: this.currentVersion,
      timestamp,
      size: serialized.length,
      compressed,
      encrypted: false,
      checksum,
      description,
      dataTypes: Object.keys(data),
      expiresAt: new Date(timestamp.getTime() + (this.config.backupRetention * 24 * 60 * 60 * 1000))
    };

    // Store backup
    localStorage.setItem(`backup_${backupId}`, serialized);
    this.backups.set(backupId, metadata);
    this.saveBackups();

    return backupId;
  }

  public async restoreBackup(backupId: string): Promise<void> {
    const metadata = this.backups.get(backupId);
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const backupData = localStorage.getItem(`backup_${backupId}`);
    if (!backupData) {
      throw new Error(`Backup data not found: ${backupId}`);
    }

    // Verify checksum
    const checksum = await this.calculateChecksum(backupData);
    if (checksum !== metadata.checksum) {
      throw new Error('Backup data is corrupted');
    }

    // Decompress if needed
    let data = backupData;
    if (metadata.compressed) {
      data = this.decompress(data);
    }

    // Parse data
    const parsedData = JSON.parse(data);
    
    // Clear current data
    localStorage.clear();
    sessionStorage.clear();

    // Restore data
    Object.entries(parsedData).forEach(([key, value]) => {
      if (key === '_sessionStorage') {
        Object.entries(value as Record<string, any>).forEach(([sessionKey, sessionValue]) => {
          sessionStorage.setItem(sessionKey, sessionValue as string);
        });
      } else {
        localStorage.setItem(key, value as string);
      }
    });

    // Update version
    this.setCurrentVersion(metadata.version);
  }

  private compress(data: string): string {
    // Simple compression simulation (in real implementation, use proper compression)
    return btoa(data);
  }

  private decompress(data: string): string {
    // Simple decompression simulation
    return atob(data);
  }

  private async calculateChecksum(data: string): Promise<string> {
    if ('crypto' in window && 'subtle' in window.crypto) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback checksum
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(16);
    }
  }

  public getBackups(): BackupMetadata[] {
    return Array.from(this.backups.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async deleteBackup(backupId: string): Promise<void> {
    const metadata = this.backups.get(backupId);
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    localStorage.removeItem(`backup_${backupId}`);
    this.backups.delete(backupId);
    this.saveBackups();
  }

  public cleanupExpiredBackups(): void {
    const now = new Date();
    const expiredBackups = Array.from(this.backups.entries())
      .filter(([_, metadata]) => metadata.expiresAt && metadata.expiresAt < now)
      .map(([id, _]) => id);

    expiredBackups.forEach(backupId => {
      this.deleteBackup(backupId);
    });
  }

  public getMigrationLogs(): MigrationLog[] {
    return [...this.logs].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  public getCurrentMigration(): MigrationLog | undefined {
    return this.currentMigration;
  }

  public getAvailableMigrations(): string[] {
    return Array.from(this.migrations.keys());
  }

  public async validateData(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Validate localStorage data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              JSON.parse(value);
            } catch (error) {
              errors.push(`Invalid JSON in localStorage key: ${key}`);
            }
          }
        }
      }

      // Validate version consistency
      const version = this.getCurrentVersion();
      if (!this.isValidVersion(version)) {
        errors.push(`Invalid version format: ${version}`);
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }

  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  public exportData(): string {
    return JSON.stringify({
      config: this.config,
      currentVersion: this.currentVersion,
      migrations: Array.from(this.migrations.entries()),
      backups: Array.from(this.backups.entries()),
      logs: this.logs
    }, null, 2);
  }

  public importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.config) this.config = parsed.config;
      if (parsed.currentVersion) this.currentVersion = parsed.currentVersion;
      if (parsed.migrations) this.migrations = new Map(parsed.migrations);
      if (parsed.backups) this.backups = new Map(parsed.backups);
      if (parsed.logs) this.logs = parsed.logs;
      
      this.saveBackups();
      this.saveLogs();
    } catch (error) {
      console.error('Failed to import migration data:', error);
    }
  }

  public getSystemInfo(): {
    currentVersion: string;
    isRunning: boolean;
    totalMigrations: number;
    totalBackups: number;
    config: MigrationConfig;
  } {
    return {
      currentVersion: this.currentVersion,
      isRunning: this.isRunning,
      totalMigrations: this.migrations.size,
      totalBackups: this.backups.size,
      config: this.config
    };
  }

  public updateConfig(config: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public async checkForUpdates(): Promise<{ hasUpdates: boolean; latestVersion: string; migrations: string[] }> {
    // This would typically check with a server
    const availableVersions = ['1.1.0', '1.2.0', '1.3.0'];
    const latestVersion = availableVersions[availableVersions.length - 1];
    const hasUpdates = this.compareVersions(latestVersion, this.currentVersion) > 0;
    
    const migrations = hasUpdates ? this.findMigrationPath(this.currentVersion, latestVersion).map(step => step.id) : [];
    
    return { hasUpdates, latestVersion, migrations };
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  public destroy(): void {
    this.isRunning = false;
    this.currentMigration = undefined;
    this.migrations.clear();
    this.backups.clear();
    this.logs = [];
    this.schemas.clear();
  }
}

export const migrationSystem = new MigrationSystem(); 