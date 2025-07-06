/**
 * Dynamic Waste Database Manager
 * Handles versioning, regional variants, and automatic updates
 */

export interface DatabaseVersion {
  version: string;
  timestamp: number;
  region: string;
  checksum: string;
  url?: string;
  size: number;
}

export interface WasteDataEntry {
  category: string;
  confidence: number;
  instructions: string;
  tips: string;
  regional_variants?: Record<string, Partial<WasteDataEntry>>;
  last_updated?: number;
  user_corrections?: number;
}

export interface WasteDatabase {
  version: string;
  region: string;
  timestamp: number;
  objects: Record<string, WasteDataEntry>;
  keywords: Record<string, string[]>;
  metadata: {
    total_entries: number;
    regions_supported: string[];
    languages: string[];
  };
}

class DatabaseManager {
  private currentDatabase: WasteDatabase | null = null;
  private fallbackDatabase: WasteDatabase | null = null;
  private versionHistory: DatabaseVersion[] = [];
  private region: string = 'US';
  private dbVersion = '1.0.0';
  
  // Regional database URLs (in production, these would be CDN endpoints)
  private readonly regionEndpoints: Record<string, string> = {
    'US': '/data/waste-us.json',
    'EU': '/data/waste-eu.json', 
    'CA': '/data/waste-ca.json',
    'UK': '/data/waste-uk.json',
    'AU': '/data/waste-au.json'
  };

  constructor(initialRegion: string = 'US') {
    this.region = initialRegion;
    this.initializeDatabase();
  }

  /**
   * Initialize database with fallback loading
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Try to load from cache first
      const cachedDb = await this.loadFromCache();
      if (cachedDb && this.isValidDatabase(cachedDb)) {
        this.currentDatabase = cachedDb;
        console.log(`[DatabaseManager] Loaded from cache: v${cachedDb.version}`);
      }

      // Check for updates in background
      this.checkForUpdates();
      
      // Load fallback database
      await this.loadFallbackDatabase();
      
    } catch (error) {
      console.error('[DatabaseManager] Initialization failed:', error);
      await this.loadFallbackDatabase();
    }
  }

  /**
   * Load fallback database from static files
   */
  private async loadFallbackDatabase(): Promise<void> {
    try {
      const response = await fetch('/data/wasteData.json');
      const data = await response.json();
      
      // Convert legacy format to new format
      this.fallbackDatabase = this.convertLegacyFormat(data);
      
      if (!this.currentDatabase) {
        this.currentDatabase = this.fallbackDatabase;
      }
      
    } catch (error) {
      console.error('[DatabaseManager] Failed to load fallback database:', error);
      throw new Error('Critical: No database available');
    }
  }

  /**
   * Convert legacy waste data format to new versioned format
   */
  private convertLegacyFormat(legacyData: any): WasteDatabase {
    return {
      version: '1.0.0-legacy',
      region: this.region,
      timestamp: Date.now(),
      objects: legacyData.objects || {},
      keywords: legacyData.keywords || {},
      metadata: {
        total_entries: Object.keys(legacyData.objects || {}).length,
        regions_supported: [this.region],
        languages: ['en']
      }
    };
  }

  /**
   * Check for database updates
   */
  async checkForUpdates(): Promise<boolean> {
    try {
      const versionEndpoint = `/api/database/version?region=${this.region}`;
      const response = await fetch(versionEndpoint, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        console.log('[DatabaseManager] No update server available');
        return false;
      }

      const remoteVersion: DatabaseVersion = await response.json();
      
      if (this.shouldUpdate(remoteVersion)) {
        return await this.downloadUpdate(remoteVersion);
      }
      
      return false;
      
    } catch (error) {
      console.log('[DatabaseManager] Update check failed (offline mode):', error);
      return false;
    }
  }

  /**
   * Determine if database should be updated
   */
  private shouldUpdate(remoteVersion: DatabaseVersion): boolean {
    if (!this.currentDatabase) return true;
    
    // Version comparison (semantic versioning)
    const currentVer = this.currentDatabase.version;
    const remoteVer = remoteVersion.version;
    
    return this.compareVersions(remoteVer, currentVer) > 0;
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(n => parseInt(n) || 0);
    const parts2 = v2.split('.').map(n => parseInt(n) || 0);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * Download and apply database update
   */
  private async downloadUpdate(version: DatabaseVersion): Promise<boolean> {
    try {
      console.log(`[DatabaseManager] Downloading update v${version.version}`);
      
      const response = await fetch(version.url || this.regionEndpoints[this.region]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const newDatabase: WasteDatabase = await response.json();
      
      // Validate checksum if provided
      if (version.checksum && !await this.validateChecksum(newDatabase, version.checksum)) {
        throw new Error('Checksum validation failed');
      }
      
      // Validate database structure
      if (!this.isValidDatabase(newDatabase)) {
        throw new Error('Invalid database structure');
      }
      
      // Store backup of current database
      if (this.currentDatabase) {
        await this.backupDatabase(this.currentDatabase);
      }
      
      // Apply update
      this.currentDatabase = newDatabase;
      await this.saveToCache(newDatabase);
      
      // Update version history
      this.versionHistory.unshift(version);
      this.pruneVersionHistory();
      
      console.log(`[DatabaseManager] Successfully updated to v${version.version}`);
      return true;
      
    } catch (error) {
      console.error('[DatabaseManager] Update failed:', error);
      return false;
    }
  }

  /**
   * Validate database checksum
   */
  private async validateChecksum(database: WasteDatabase, expectedChecksum: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(database));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return computedChecksum === expectedChecksum;
    } catch (error) {
      console.error('[DatabaseManager] Checksum validation failed:', error);
      return false;
    }
  }

  /**
   * Validate database structure
   */
  private isValidDatabase(database: any): database is WasteDatabase {
    return (
      database &&
      typeof database.version === 'string' &&
      typeof database.region === 'string' &&
      typeof database.timestamp === 'number' &&
      typeof database.objects === 'object' &&
      typeof database.keywords === 'object' &&
      database.metadata &&
      typeof database.metadata.total_entries === 'number'
    );
  }

  /**
   * Get waste data for object
   */
  getWasteData(objectClass: string): WasteDataEntry | null {
    if (!this.currentDatabase) return null;
    
    let data = this.currentDatabase.objects[objectClass];
    
    // Apply regional variant if available
    if (data?.regional_variants?.[this.region]) {
      data = { ...data, ...data.regional_variants[this.region] };
    }
    
    return data || null;
  }

  /**
   * Search by keywords
   */
  searchByKeyword(keyword: string): string[] {
    if (!this.currentDatabase) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    const matches: string[] = [];
    
    // Direct keyword match
    if (this.currentDatabase.keywords[lowerKeyword]) {
      matches.push(...this.currentDatabase.keywords[lowerKeyword]);
    }
    
    // Fuzzy search in object names
    Object.keys(this.currentDatabase.objects).forEach(objectClass => {
      if (objectClass.toLowerCase().includes(lowerKeyword)) {
        matches.push(objectClass);
      }
    });
    
    return [...new Set(matches)];
  }

  /**
   * Switch region and reload database
   */
  async switchRegion(newRegion: string): Promise<boolean> {
    if (this.region === newRegion) return true;
    
    this.region = newRegion;
    
    try {
      // Try to load region-specific database
      const regionDb = await this.loadRegionalDatabase(newRegion);
      if (regionDb) {
        this.currentDatabase = regionDb;
        await this.saveToCache(regionDb);
        return true;
      }
      
      // Fallback to current database with regional variants
      return false;
      
    } catch (error) {
      console.error(`[DatabaseManager] Failed to switch to region ${newRegion}:`, error);
      return false;
    }
  }

  /**
   * Load region-specific database
   */
  private async loadRegionalDatabase(region: string): Promise<WasteDatabase | null> {
    const endpoint = this.regionEndpoints[region];
    if (!endpoint) return null;
    
    try {
      const response = await fetch(endpoint);
      if (!response.ok) return null;
      
      const database = await response.json();
      return this.isValidDatabase(database) ? database : null;
      
    } catch (error) {
      console.error(`[DatabaseManager] Failed to load regional database for ${region}:`, error);
      return null;
    }
  }

  /**
   * Save database to IndexedDB cache
   */
  private async saveToCache(database: WasteDatabase): Promise<void> {
    try {
      const request = indexedDB.open('EcoScanDB', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('wasteDatabase')) {
          db.createObjectStore('wasteDatabase');
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['wasteDatabase'], 'readwrite');
        const store = transaction.objectStore('wasteDatabase');
        store.put(database, 'current');
      };
      
    } catch (error) {
      console.error('[DatabaseManager] Failed to save to cache:', error);
    }
  }

  /**
   * Load database from IndexedDB cache
   */
  private async loadFromCache(): Promise<WasteDatabase | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('EcoScanDB', 1);
        
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('wasteDatabase')) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction(['wasteDatabase'], 'readonly');
          const store = transaction.objectStore('wasteDatabase');
          const getRequest = store.get('current');
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };
          
          getRequest.onerror = () => {
            resolve(null);
          };
        };
        
        request.onerror = () => {
          resolve(null);
        };
        
      } catch (error) {
        console.error('[DatabaseManager] Failed to load from cache:', error);
        resolve(null);
      }
    });
  }

  /**
   * Backup current database
   */
  private async backupDatabase(database: WasteDatabase): Promise<void> {
    try {
      const backupKey = `backup_v${database.version}_${Date.now()}`;
      // Store in localStorage as simplified backup (production would use IndexedDB)
      localStorage.setItem(backupKey, JSON.stringify(database));
      
      // Keep only last 3 backups
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_v'));
      if (backupKeys.length > 3) {
        backupKeys.sort().slice(0, -3).forEach(key => localStorage.removeItem(key));
      }
      
    } catch (error) {
      console.error('[DatabaseManager] Backup failed:', error);
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(): Promise<boolean> {
    try {
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_v'));
      if (backupKeys.length === 0) return false;
      
      const latestBackup = backupKeys.sort().pop();
      if (!latestBackup) return false;
      
      const backupData = localStorage.getItem(latestBackup);
      if (!backupData) return false;
      
      const database = JSON.parse(backupData);
      if (!this.isValidDatabase(database)) return false;
      
      this.currentDatabase = database;
      await this.saveToCache(database);
      
      console.log(`[DatabaseManager] Rolled back to ${database.version}`);
      return true;
      
    } catch (error) {
      console.error('[DatabaseManager] Rollback failed:', error);
      return false;
    }
  }

  /**
   * Prune version history
   */
  private pruneVersionHistory(): void {
    this.versionHistory = this.versionHistory.slice(0, 10); // Keep last 10 versions
  }

  /**
   * Get current database info
   */
  getDatabaseInfo(): { version: string; region: string; timestamp: number; entries: number } | null {
    if (!this.currentDatabase) return null;
    
    return {
      version: this.currentDatabase.version,
      region: this.currentDatabase.region,
      timestamp: this.currentDatabase.timestamp,
      entries: this.currentDatabase.metadata.total_entries
    };
  }

  /**
   * Get version history
   */
  getVersionHistory(): DatabaseVersion[] {
    return [...this.versionHistory];
  }
}

export const databaseManager = new DatabaseManager();
export default DatabaseManager; 