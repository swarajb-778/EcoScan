export interface ContentItem {
  id: string;
  type: 'page' | 'post' | 'widget' | 'template' | 'asset' | 'config';
  title: string;
  slug: string;
  content: ContentData;
  metadata: ContentMetadata;
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  version: number;
  parentId?: string;
  children: string[];
  tags: string[];
  categories: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  permissions: ContentPermissions;
  translations: Record<string, ContentTranslation>;
  seo: SEOMetadata;
  analytics: ContentAnalytics;
}

export interface ContentData {
  body: string;
  summary?: string;
  fields: Record<string, any>;
  assets: string[];
  references: string[];
  schema: ContentSchema;
  layout?: string;
  template?: string;
}

export interface ContentMetadata {
  featured: boolean;
  priority: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTime: number;
  wordCount: number;
  lastModifiedBy: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  comments: ContentComment[];
  attachments: string[];
  customFields: Record<string, any>;
}

export interface ContentPermissions {
  read: string[];
  write: string[];
  delete: string[];
  publish: string[];
  inherit: boolean;
}

export interface ContentTranslation {
  language: string;
  title: string;
  content: string;
  summary?: string;
  status: 'draft' | 'published' | 'outdated';
  translatedBy: string;
  translatedAt: Date;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface SEOMetadata {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  canonicalUrl?: string;
  noIndex: boolean;
  noFollow: boolean;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
}

export interface ContentAnalytics {
  views: number;
  uniqueViews: number;
  likes: number;
  shares: number;
  comments: number;
  avgRating: number;
  totalRatings: number;
  engagement: number;
  bounceRate: number;
  timeOnPage: number;
  conversionRate: number;
  lastViewed: Date;
}

export interface ContentComment {
  id: string;
  author: string;
  content: string;
  parentId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  dislikes: number;
  replies: ContentComment[];
}

export interface ContentSchema {
  type: string;
  fields: Record<string, FieldSchema>;
  validation: ValidationRule[];
  layout: LayoutConfig;
}

export interface FieldSchema {
  type: 'text' | 'textarea' | 'rich-text' | 'number' | 'boolean' | 'date' | 'select' | 'multi-select' | 'file' | 'image' | 'reference';
  label: string;
  required: boolean;
  default?: any;
  options?: string[];
  validation?: ValidationRule[];
  helpText?: string;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface LayoutConfig {
  template: string;
  sections: LayoutSection[];
  responsive: boolean;
  customCSS?: string;
}

export interface LayoutSection {
  id: string;
  name: string;
  type: 'header' | 'content' | 'sidebar' | 'footer' | 'custom';
  fields: string[];
  width?: string;
  order: number;
  visible: boolean;
  conditions?: VisibilityCondition[];
}

export interface VisibilityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less';
  value: any;
}

export interface ContentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  permissions: Record<string, string[]>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automatic';
  assignees: string[];
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
  timeLimit?: number;
  required: boolean;
  order: number;
}

export interface WorkflowAction {
  type: 'notify' | 'assign' | 'publish' | 'archive' | 'duplicate' | 'transform' | 'integrate';
  config: Record<string, any>;
  delay?: number;
  conditions?: WorkflowCondition[];
}

export interface WorkflowTrigger {
  type: 'status_change' | 'time_based' | 'user_action' | 'webhook' | 'api_call';
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less' | 'in' | 'not_in';
  value: any;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'page' | 'post' | 'widget' | 'email' | 'component';
  content: string;
  fields: Record<string, FieldSchema>;
  preview?: string;
  category: string;
  tags: string[];
  author: string;
  version: number;
  downloads: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentRevision {
  id: string;
  contentId: string;
  version: number;
  title: string;
  content: ContentData;
  metadata: ContentMetadata;
  author: string;
  message: string;
  createdAt: Date;
  parentRevision?: string;
  diff?: ContentDiff;
}

export interface ContentDiff {
  additions: DiffItem[];
  deletions: DiffItem[];
  modifications: DiffItem[];
}

export interface DiffItem {
  path: string;
  oldValue?: any;
  newValue?: any;
  type: 'added' | 'removed' | 'modified';
}

export interface ContentQuery {
  type?: string[];
  status?: string[];
  author?: string[];
  tags?: string[];
  categories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
    field: 'createdAt' | 'updatedAt' | 'publishedAt';
  };
  search?: {
    query: string;
    fields: string[];
    operator: 'and' | 'or';
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
  includeTranslations?: boolean;
  includeRevisions?: boolean;
}

export interface ContentIndex {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  tags: string[];
  categories: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  searchTerms: string[];
  language: string;
  score?: number;
}

export class ContentManagementSystem {
  private content: Map<string, ContentItem>;
  private templates: Map<string, ContentTemplate>;
  private workflows: Map<string, ContentWorkflow>;
  private revisions: Map<string, ContentRevision[]>;
  private searchIndex: Map<string, ContentIndex>;
  private currentLocale: string;
  private config: CMSConfig;

  constructor(config?: Partial<CMSConfig>) {
    this.content = new Map();
    this.templates = new Map();
    this.workflows = new Map();
    this.revisions = new Map();
    this.searchIndex = new Map();
    this.currentLocale = 'en';
    this.config = this.mergeConfig(config);
    
    this.loadContent();
    this.loadTemplates();
    this.loadWorkflows();
    this.initializeSearchIndex();
  }

  private mergeConfig(config?: Partial<CMSConfig>): CMSConfig {
    const defaultConfig: CMSConfig = {
      defaultLocale: 'en',
      supportedLocales: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'ar'],
      autoSave: true,
      autoSaveInterval: 30000,
      versioning: true,
      maxRevisions: 50,
      workflow: true,
      moderation: true,
      searchEnabled: true,
      caching: true,
      compression: true,
      validation: true,
      permissions: true,
      analytics: true,
      seo: true,
      imageOptimization: true,
      contentDelivery: true
    };

    return { ...defaultConfig, ...config };
  }

  private loadContent(): void {
    const contentData = localStorage.getItem('cms_content');
    if (contentData) {
      try {
        const parsed = JSON.parse(contentData);
        this.content = new Map(parsed);
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    }
  }

  private saveContent(): void {
    const contentArray = Array.from(this.content.entries());
    localStorage.setItem('cms_content', JSON.stringify(contentArray));
  }

  private loadTemplates(): void {
    const templatesData = localStorage.getItem('cms_templates');
    if (templatesData) {
      try {
        const parsed = JSON.parse(templatesData);
        this.templates = new Map(parsed);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }

  private saveTemplates(): void {
    const templatesArray = Array.from(this.templates.entries());
    localStorage.setItem('cms_templates', JSON.stringify(templatesArray));
  }

  private loadWorkflows(): void {
    const workflowsData = localStorage.getItem('cms_workflows');
    if (workflowsData) {
      try {
        const parsed = JSON.parse(workflowsData);
        this.workflows = new Map(parsed);
      } catch (error) {
        console.error('Failed to load workflows:', error);
      }
    }
  }

  private saveWorkflows(): void {
    const workflowsArray = Array.from(this.workflows.entries());
    localStorage.setItem('cms_workflows', JSON.stringify(workflowsArray));
  }

  private initializeSearchIndex(): void {
    if (!this.config.searchEnabled) return;

    // Build search index from existing content
    this.content.forEach((item, id) => {
      this.updateSearchIndex(item);
    });
  }

  private updateSearchIndex(item: ContentItem): void {
    if (!this.config.searchEnabled) return;

    const searchTerms = this.extractSearchTerms(item);
    
    const indexEntry: ContentIndex = {
      id: item.id,
      title: item.title,
      content: item.content.body,
      type: item.type,
      status: item.status,
      tags: item.tags,
      categories: item.categories,
      author: item.author,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      searchTerms,
      language: this.currentLocale
    };

    this.searchIndex.set(item.id, indexEntry);
  }

  private extractSearchTerms(item: ContentItem): string[] {
    const text = [
      item.title,
      item.content.body,
      item.content.summary || '',
      item.tags.join(' '),
      item.categories.join(' ')
    ].join(' ').toLowerCase();

    return text.split(/\s+/)
      .filter(term => term.length > 2)
      .filter((term, index, array) => array.indexOf(term) === index);
  }

  public async createContent(data: Partial<ContentItem>): Promise<ContentItem> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const item: ContentItem = {
      id,
      type: data.type || 'page',
      title: data.title || 'Untitled',
      slug: data.slug || this.generateSlug(data.title || 'untitled'),
      content: data.content || {
        body: '',
        fields: {},
        assets: [],
        references: [],
        schema: { type: 'default', fields: {}, validation: [], layout: { template: 'default', sections: [], responsive: true } }
      },
      metadata: data.metadata || {
        featured: false,
        priority: 0,
        difficulty: 'beginner',
        readingTime: 0,
        wordCount: 0,
        lastModifiedBy: 'system',
        reviewStatus: 'pending',
        comments: [],
        attachments: [],
        customFields: {}
      },
      status: data.status || 'draft',
      version: 1,
      parentId: data.parentId,
      children: [],
      tags: data.tags || [],
      categories: data.categories || [],
      author: data.author || 'system',
      createdAt: now,
      updatedAt: now,
      publishedAt: data.publishedAt,
      expiresAt: data.expiresAt,
      permissions: data.permissions || {
        read: ['*'],
        write: ['admin', 'editor'],
        delete: ['admin'],
        publish: ['admin', 'editor'],
        inherit: true
      },
      translations: {},
      seo: data.seo || {
        keywords: [],
        noIndex: false,
        noFollow: false,
        openGraph: {},
        twitter: {}
      },
      analytics: {
        views: 0,
        uniqueViews: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        avgRating: 0,
        totalRatings: 0,
        engagement: 0,
        bounceRate: 0,
        timeOnPage: 0,
        conversionRate: 0,
        lastViewed: now
      }
    };

    // Validate content
    if (this.config.validation) {
      const validation = await this.validateContent(item);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Save content
    this.content.set(id, item);
    this.saveContent();

    // Update search index
    this.updateSearchIndex(item);

    // Create initial revision
    if (this.config.versioning) {
      await this.createRevision(item, 'Initial version');
    }

    // Trigger workflow
    if (this.config.workflow) {
      await this.triggerWorkflow(item, 'content_created');
    }

    return item;
  }

  public async updateContent(id: string, updates: Partial<ContentItem>): Promise<ContentItem> {
    const item = this.content.get(id);
    if (!item) {
      throw new Error(`Content not found: ${id}`);
    }

    const now = new Date();
    const previousVersion = { ...item };
    
    // Apply updates
    Object.assign(item, updates);
    item.updatedAt = now;
    item.version++;

    // Update word count and reading time
    if (updates.content) {
      item.metadata.wordCount = this.calculateWordCount(item.content.body);
      item.metadata.readingTime = this.calculateReadingTime(item.metadata.wordCount);
    }

    // Validate content
    if (this.config.validation) {
      const validation = await this.validateContent(item);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Save content
    this.content.set(id, item);
    this.saveContent();

    // Update search index
    this.updateSearchIndex(item);

    // Create revision
    if (this.config.versioning) {
      await this.createRevision(item, updates.metadata?.lastModifiedBy || 'Auto-save');
    }

    // Trigger workflow
    if (this.config.workflow) {
      await this.triggerWorkflow(item, 'content_updated');
    }

    return item;
  }

  public async deleteContent(id: string): Promise<void> {
    const item = this.content.get(id);
    if (!item) {
      throw new Error(`Content not found: ${id}`);
    }

    // Remove from content
    this.content.delete(id);
    this.saveContent();

    // Remove from search index
    this.searchIndex.delete(id);

    // Remove revisions
    this.revisions.delete(id);

    // Trigger workflow
    if (this.config.workflow) {
      await this.triggerWorkflow(item, 'content_deleted');
    }
  }

  public async publishContent(id: string): Promise<ContentItem> {
    const item = this.content.get(id);
    if (!item) {
      throw new Error(`Content not found: ${id}`);
    }

    if (item.status === 'published') {
      throw new Error('Content is already published');
    }

    item.status = 'published';
    item.publishedAt = new Date();
    item.updatedAt = new Date();

    // Save content
    this.content.set(id, item);
    this.saveContent();

    // Update search index
    this.updateSearchIndex(item);

    // Trigger workflow
    if (this.config.workflow) {
      await this.triggerWorkflow(item, 'content_published');
    }

    return item;
  }

  public async archiveContent(id: string): Promise<ContentItem> {
    const item = this.content.get(id);
    if (!item) {
      throw new Error(`Content not found: ${id}`);
    }

    item.status = 'archived';
    item.updatedAt = new Date();

    // Save content
    this.content.set(id, item);
    this.saveContent();

    // Update search index
    this.updateSearchIndex(item);

    // Trigger workflow
    if (this.config.workflow) {
      await this.triggerWorkflow(item, 'content_archived');
    }

    return item;
  }

  public getContent(id: string): ContentItem | undefined {
    return this.content.get(id);
  }

  public queryContent(query: ContentQuery): ContentItem[] {
    let results = Array.from(this.content.values());

    // Filter by type
    if (query.type && query.type.length > 0) {
      results = results.filter(item => query.type!.includes(item.type));
    }

    // Filter by status
    if (query.status && query.status.length > 0) {
      results = results.filter(item => query.status!.includes(item.status));
    }

    // Filter by author
    if (query.author && query.author.length > 0) {
      results = results.filter(item => query.author!.includes(item.author));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(item => 
        query.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Filter by categories
    if (query.categories && query.categories.length > 0) {
      results = results.filter(item => 
        query.categories!.some(category => item.categories.includes(category))
      );
    }

    // Filter by date range
    if (query.dateRange) {
      const { start, end, field } = query.dateRange;
      results = results.filter(item => {
        const date = item[field];
        return date >= start && date <= end;
      });
    }

    // Search
    if (query.search) {
      results = this.searchContent(query.search.query, results);
    }

    // Sort
    if (query.sort) {
      const { field, order } = query.sort;
      results.sort((a, b) => {
        const aValue = this.getNestedValue(a, field);
        const bValue = this.getNestedValue(b, field);
        
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Limit and offset
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  public searchContent(searchQuery: string, items?: ContentItem[]): ContentItem[] {
    if (!this.config.searchEnabled) return [];

    const searchTerms = searchQuery.toLowerCase().split(/\s+/);
    const candidates = items || Array.from(this.content.values());

    return candidates.filter(item => {
      const indexEntry = this.searchIndex.get(item.id);
      if (!indexEntry) return false;

      return searchTerms.every(term => 
        indexEntry.searchTerms.some(indexTerm => 
          indexTerm.includes(term)
        )
      );
    }).sort((a, b) => {
      // Simple scoring based on title matches
      const aScore = searchTerms.reduce((score, term) => 
        a.title.toLowerCase().includes(term) ? score + 10 : score, 0
      );
      const bScore = searchTerms.reduce((score, term) => 
        b.title.toLowerCase().includes(term) ? score + 10 : score, 0
      );
      return bScore - aScore;
    });
  }

  public async createTranslation(contentId: string, language: string, translation: Partial<ContentTranslation>): Promise<ContentTranslation> {
    const item = this.content.get(contentId);
    if (!item) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const now = new Date();
    const contentTranslation: ContentTranslation = {
      language,
      title: translation.title || item.title,
      content: translation.content || item.content.body,
      summary: translation.summary || item.content.summary,
      status: translation.status || 'draft',
      translatedBy: translation.translatedBy || 'system',
      translatedAt: now,
      approved: false
    };

    item.translations[language] = contentTranslation;
    item.updatedAt = now;

    // Save content
    this.content.set(contentId, item);
    this.saveContent();

    return contentTranslation;
  }

  public async createRevision(item: ContentItem, message: string): Promise<ContentRevision> {
    const revisionId = crypto.randomUUID();
    const now = new Date();

    const revision: ContentRevision = {
      id: revisionId,
      contentId: item.id,
      version: item.version,
      title: item.title,
      content: { ...item.content },
      metadata: { ...item.metadata },
      author: item.metadata.lastModifiedBy || 'system',
      message,
      createdAt: now
    };

    // Get existing revisions
    const existingRevisions = this.revisions.get(item.id) || [];
    
    // Add new revision
    existingRevisions.push(revision);

    // Limit revisions
    if (existingRevisions.length > this.config.maxRevisions) {
      existingRevisions.shift();
    }

    this.revisions.set(item.id, existingRevisions);
    this.saveRevisions();

    return revision;
  }

  private saveRevisions(): void {
    const revisionsArray = Array.from(this.revisions.entries());
    localStorage.setItem('cms_revisions', JSON.stringify(revisionsArray));
  }

  private async triggerWorkflow(item: ContentItem, event: string): Promise<void> {
    const workflows = Array.from(this.workflows.values()).filter(w => w.active);
    
    for (const workflow of workflows) {
      const triggers = workflow.triggers.filter(t => t.type === event);
      
      for (const trigger of triggers) {
        if (this.evaluateConditions(trigger.conditions || [], item)) {
          await this.executeWorkflow(workflow, item);
        }
      }
    }
  }

  private async executeWorkflow(workflow: ContentWorkflow, item: ContentItem): Promise<void> {
    for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
      if (this.evaluateConditions(step.conditions, item)) {
        await this.executeWorkflowStep(step, item);
      }
    }
  }

  private async executeWorkflowStep(step: WorkflowStep, item: ContentItem): Promise<void> {
    for (const action of step.actions) {
      if (this.evaluateConditions(action.conditions || [], item)) {
        await this.executeWorkflowAction(action, item);
      }
    }
  }

  private async executeWorkflowAction(action: WorkflowAction, item: ContentItem): Promise<void> {
    switch (action.type) {
      case 'notify':
        // Send notification
        break;
      case 'assign':
        // Assign to user
        break;
      case 'publish':
        await this.publishContent(item.id);
        break;
      case 'archive':
        await this.archiveContent(item.id);
        break;
      default:
        console.log(`Unknown workflow action: ${action.type}`);
    }
  }

  private evaluateConditions(conditions: WorkflowCondition[], item: ContentItem): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(item, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return Array.isArray(value) ? value.includes(condition.value) : 
                 String(value).includes(condition.value);
        case 'greater':
          return value > condition.value;
        case 'less':
          return value < condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(value);
        default:
          return true;
      }
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(wordCount: number): number {
    const averageWordsPerMinute = 200;
    return Math.ceil(wordCount / averageWordsPerMinute);
  }

  private async validateContent(item: ContentItem): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!item.title || item.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!item.content.body || item.content.body.trim().length === 0) {
      errors.push('Content body is required');
    }

    // Schema validation
    if (item.content.schema) {
      const schemaErrors = await this.validateSchema(item.content, item.content.schema);
      errors.push(...schemaErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  private async validateSchema(content: ContentData, schema: ContentSchema): Promise<string[]> {
    const errors: string[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      const value = content.fields[fieldName];

      if (fieldSchema.required && (!value || value === '')) {
        errors.push(`${fieldSchema.label} is required`);
      }

      if (value && fieldSchema.validation) {
        for (const rule of fieldSchema.validation) {
          const validationResult = await this.validateField(value, rule);
          if (!validationResult.valid) {
            errors.push(validationResult.message);
          }
        }
      }
    }

    return errors;
  }

  private async validateField(value: any, rule: ValidationRule): Promise<{ valid: boolean; message: string }> {
    switch (rule.type) {
      case 'required':
        return { valid: value !== null && value !== undefined && value !== '', message: rule.message };
      case 'minLength':
        return { valid: String(value).length >= rule.value, message: rule.message };
      case 'maxLength':
        return { valid: String(value).length <= rule.value, message: rule.message };
      case 'pattern':
        return { valid: new RegExp(rule.value).test(String(value)), message: rule.message };
      case 'custom':
        return { valid: rule.validator ? rule.validator(value) : true, message: rule.message };
      default:
        return { valid: true, message: '' };
    }
  }

  public setLocale(locale: string): void {
    if (this.config.supportedLocales.includes(locale)) {
      this.currentLocale = locale;
    }
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public getSupportedLocales(): string[] {
    return this.config.supportedLocales;
  }

  public exportContent(): string {
    return JSON.stringify({
      content: Array.from(this.content.entries()),
      templates: Array.from(this.templates.entries()),
      workflows: Array.from(this.workflows.entries()),
      revisions: Array.from(this.revisions.entries())
    }, null, 2);
  }

  public importContent(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.content) this.content = new Map(parsed.content);
      if (parsed.templates) this.templates = new Map(parsed.templates);
      if (parsed.workflows) this.workflows = new Map(parsed.workflows);
      if (parsed.revisions) this.revisions = new Map(parsed.revisions);
      
      this.saveContent();
      this.saveTemplates();
      this.saveWorkflows();
      this.saveRevisions();
      this.initializeSearchIndex();
    } catch (error) {
      console.error('Failed to import content:', error);
    }
  }

  public getAnalytics(): {
    totalContent: number;
    contentByType: Record<string, number>;
    contentByStatus: Record<string, number>;
    topAuthors: { author: string; count: number }[];
    recentActivity: { date: string; count: number }[];
  } {
    const items = Array.from(this.content.values());
    
    const contentByType = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const contentByStatus = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const authorCounts = items.reduce((acc, item) => {
      acc[item.author] = (acc[item.author] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAuthors = Object.entries(authorCounts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentItems = items.filter(item => item.updatedAt >= thirtyDaysAgo);
    const recentActivity = recentItems.reduce((acc, item) => {
      const date = item.updatedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentActivityArray = Object.entries(recentActivity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalContent: items.length,
      contentByType,
      contentByStatus,
      topAuthors,
      recentActivity: recentActivityArray
    };
  }

  public destroy(): void {
    this.content.clear();
    this.templates.clear();
    this.workflows.clear();
    this.revisions.clear();
    this.searchIndex.clear();
  }
}

interface CMSConfig {
  defaultLocale: string;
  supportedLocales: string[];
  autoSave: boolean;
  autoSaveInterval: number;
  versioning: boolean;
  maxRevisions: number;
  workflow: boolean;
  moderation: boolean;
  searchEnabled: boolean;
  caching: boolean;
  compression: boolean;
  validation: boolean;
  permissions: boolean;
  analytics: boolean;
  seo: boolean;
  imageOptimization: boolean;
  contentDelivery: boolean;
}

export const contentManagementSystem = new ContentManagementSystem(); 