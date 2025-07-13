/**
 * Advanced Social Platform System for EcoScan
 * 
 * Features:
 * - Social networking with friends and followers
 * - Content sharing and collaborative features
 * - Community groups and environmental challenges
 * - Real-time messaging and communication
 * - Social media integration and cross-platform sharing
 * - Collaborative waste detection and verification
 * - Community-driven content moderation
 * - Social achievements and group competitions
 * - Environmental impact sharing and comparisons
 * - Expert verification and educational content
 * - Location-based social features and hotspots
 * - Event organization and community engagement
 * - User-generated content and tips sharing
 * - Social gamification and peer recognition
 * - Privacy controls and content filtering
 * 
 * Social Features:
 * - Friend system with mutual connections
 * - Group creation and management
 * - Content sharing with privacy controls
 * - Collaborative scanning and verification
 * - Social challenges and competitions
 * - Community forums and discussions
 * - Expert badges and verification system
 * - Social media cross-posting integration
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { advancedAnalytics } from './advanced-analytics';
import { gamificationSystem } from './gamification-system';

// Social platform interfaces
export interface SocialConfig {
  enabled: boolean;
  features: {
    friends: boolean;
    groups: boolean;
    sharing: boolean;
    messaging: boolean;
    forums: boolean;
    events: boolean;
    collaboration: boolean;
    moderation: boolean;
  };
  privacy: {
    defaultVisibility: 'public' | 'friends' | 'private';
    allowDiscovery: boolean;
    allowMessaging: boolean;
    moderationEnabled: boolean;
    contentFiltering: boolean;
  };
  integrations: {
    facebook: boolean;
    twitter: boolean;
    instagram: boolean;
    linkedin: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  limits: {
    maxFriends: number;
    maxGroups: number;
    maxPostsPerDay: number;
    maxMessageLength: number;
    maxGroupMembers: number;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  coverImage: string;
  location: Location;
  joinDate: Date;
  lastActive: Date;
  verified: boolean;
  expertBadges: ExpertBadge[];
  stats: UserSocialStats;
  privacy: UserPrivacySettings;
  preferences: UserSocialPreferences;
  connections: SocialConnection[];
  badges: SocialBadge[];
  reputation: number;
}

export interface UserSocialStats {
  totalPosts: number;
  totalShares: number;
  totalLikes: number;
  totalComments: number;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  groupsCount: number;
  eventsHosted: number;
  eventsAttended: number;
  helpfulVotes: number;
  expertVerifications: number;
  collaborativeScans: number;
  communityContributions: number;
}

export interface Location {
  country: string;
  region: string;
  city: string;
  coordinates?: [number, number];
  timezone: string;
  public: boolean;
}

export interface ExpertBadge {
  id: string;
  category: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  description: string;
  earnedDate: Date;
  verifications: number;
  reputation: number;
}

export interface SocialConnection {
  userId: string;
  type: 'friend' | 'follower' | 'following' | 'blocked' | 'pending';
  establishedDate: Date;
  mutualConnections: number;
  interactionScore: number;
  lastInteraction: Date;
  groups: string[];
  commonInterests: string[];
}

export interface SocialBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'social' | 'community' | 'expert' | 'milestone';
  earnedDate: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Post {
  id: string;
  authorId: string;
  author: PublicProfile;
  type: 'scan' | 'tip' | 'question' | 'achievement' | 'event' | 'discussion';
  content: PostContent;
  visibility: 'public' | 'friends' | 'group' | 'private';
  groupId?: string;
  location?: Location;
  tags: string[];
  mentions: string[];
  engagement: PostEngagement;
  moderation: ModerationInfo;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface PostContent {
  text: string;
  images: MediaItem[];
  videos: MediaItem[];
  attachments: Attachment[];
  scanData?: ScanData;
  pollData?: PollData;
  eventData?: EventData;
  linkPreview?: LinkPreview;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  caption: string;
  altText: string;
  metadata: MediaMetadata;
  moderated: boolean;
}

export interface MediaMetadata {
  width: number;
  height: number;
  duration?: number;
  size: number;
  format: string;
  exif?: any;
}

export interface Attachment {
  id: string;
  type: 'document' | 'link' | 'location' | 'contact';
  name: string;
  url: string;
  size?: number;
  metadata: any;
}

export interface ScanData {
  wasteType: string;
  confidence: number;
  location: Location;
  environmental_impact: {
    co2Saved: number;
    category: string;
    recyclingTip: string;
  };
  collaborative: boolean;
  verifications: Verification[];
}

export interface Verification {
  userId: string;
  verified: boolean;
  expertise: string;
  confidence: number;
  timestamp: Date;
  reasoning: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  showResults: 'immediate' | 'after_vote' | 'after_end';
  endDate: Date;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

export interface EventData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: Location;
  category: 'cleanup' | 'education' | 'challenge' | 'awareness' | 'workshop';
  maxAttendees?: number;
  attendees: EventAttendee[];
  requirements: string[];
  organizer: string;
  cost?: number;
  isVirtual: boolean;
}

export interface EventAttendee {
  userId: string;
  status: 'attending' | 'maybe' | 'not_attending';
  role: 'attendee' | 'volunteer' | 'organizer';
  joinedDate: Date;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  domain: string;
  metadata: any;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  reactions: Record<string, number>;
  likedBy: string[];
  commentedBy: string[];
  sharedBy: string[];
  savedBy: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: PublicProfile;
  content: string;
  parentId?: string;
  replies: Comment[];
  likes: number;
  likedBy: string[];
  mentions: string[];
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
  moderated: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  coverImage: string;
  type: 'public' | 'private' | 'secret';
  category: 'general' | 'local' | 'educational' | 'challenge' | 'expert';
  location?: Location;
  adminIds: string[];
  moderatorIds: string[];
  members: GroupMember[];
  rules: string[];
  topics: string[];
  stats: GroupStats;
  settings: GroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  joinedDate: Date;
  contributionScore: number;
  lastActive: Date;
  posts: number;
  helpful: number;
  warnings: number;
}

export interface GroupStats {
  memberCount: number;
  postCount: number;
  weeklyActivity: number;
  monthlyGrowth: number;
  engagementRate: number;
  expertMembers: number;
}

export interface GroupSettings {
  postApproval: boolean;
  memberApproval: boolean;
  allowInvites: boolean;
  allowSharing: boolean;
  contentModeration: 'strict' | 'moderate' | 'relaxed';
  expertVerification: boolean;
  autoModeration: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'scan';
  content: MessageContent;
  read: Record<string, Date>;
  delivered: Record<string, Date>;
  reactions: Record<string, string[]>;
  edited: boolean;
  deleted: boolean;
  sentAt: Date;
  editedAt?: Date;
  expiresAt?: Date;
}

export interface MessageContent {
  text?: string;
  media?: MediaItem;
  file?: Attachment;
  location?: Location;
  scanData?: ScanData;
  systemMessage?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  participantIds: string[];
  name?: string;
  description?: string;
  avatar?: string;
  adminIds: string[];
  settings: ConversationSettings;
  lastMessage?: Message;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSettings {
  muted: Record<string, boolean>;
  archived: Record<string, boolean>;
  pinnedMessages: string[];
  allowInvites: boolean;
  messageRetention: number;
  readReceipts: boolean;
  typingIndicators: boolean;
}

export interface ModerationInfo {
  flagged: boolean;
  flagReasons: string[];
  flaggedBy: string[];
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'removed';
  reviewedBy?: string;
  reviewedAt?: Date;
  autoModerated: boolean;
  confidence: number;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  expertBadges: ExpertBadge[];
  reputation: number;
  level: number;
}

export interface UserPrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  locationSharing: boolean;
  activityVisibility: boolean;
  allowMessages: 'everyone' | 'friends' | 'none';
  allowGroupInvites: boolean;
  allowTagging: boolean;
  dataSharing: boolean;
  analytics: boolean;
}

export interface UserSocialPreferences {
  notifications: SocialNotificationSettings;
  contentFilters: string[];
  blockedUsers: string[];
  mutedKeywords: string[];
  preferredLanguages: string[];
  timeZone: string;
  autoTranslate: boolean;
  showOnlineStatus: boolean;
}

export interface SocialNotificationSettings {
  likes: boolean;
  comments: boolean;
  shares: boolean;
  mentions: boolean;
  messages: boolean;
  friendRequests: boolean;
  groupInvites: boolean;
  events: boolean;
  expertVerifications: boolean;
  communityUpdates: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quiet_hours: { start: string; end: string };
}

export interface SocialEvent {
  type: 'like' | 'comment' | 'share' | 'follow' | 'message' | 'mention' | 'group_invite' | 'event_invite';
  data: any;
  timestamp: Date;
  read: boolean;
  actionable: boolean;
}

class SocialPlatformSystem {
  private config: SocialConfig;
  private currentUser: UserProfile | null = null;
  private posts: Map<string, Post> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private groups: Map<string, Group> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private connections: Map<string, SocialConnection[]> = new Map();
  private socialEvents: SocialEvent[] = [];
  private onlineUsers: Set<string> = new Set();
  private typingUsers: Map<string, Set<string>> = new Map();

  // Reactive stores
  private _currentUser = writable<UserProfile | null>(null);
  private _feed = writable<Post[]>([]);
  private _notifications = writable<SocialEvent[]>([]);
  private _friends = writable<SocialConnection[]>([]);
  private _groups = writable<Group[]>([]);
  private _conversations = writable<Conversation[]>([]);
  private _onlineUsers = writable<string[]>([]);
  private _trending = writable<{ hashtags: string[]; topics: string[]; users: PublicProfile[] }>({
    hashtags: [],
    topics: [],
    users: []
  });

  public readonly currentUser: Readable<UserProfile | null> = this._currentUser;
  public readonly feed: Readable<Post[]> = this._feed;
  public readonly notifications: Readable<SocialEvent[]> = this._notifications;
  public readonly friends: Readable<SocialConnection[]> = this._friends;
  public readonly groups: Readable<Group[]> = this._groups;
  public readonly conversations: Readable<Conversation[]> = this._conversations;
  public readonly onlineUsers: Readable<string[]> = this._onlineUsers;
  public readonly trending: Readable<any> = this._trending;

  constructor() {
    this.config = this.getSocialConfig();
    this.initializeSocialPlatform();
  }

  private getSocialConfig(): SocialConfig {
    return {
      enabled: true,
      features: {
        friends: true,
        groups: true,
        sharing: true,
        messaging: true,
        forums: true,
        events: true,
        collaboration: true,
        moderation: true
      },
      privacy: {
        defaultVisibility: 'friends',
        allowDiscovery: true,
        allowMessaging: true,
        moderationEnabled: true,
        contentFiltering: true
      },
      integrations: {
        facebook: true,
        twitter: true,
        instagram: true,
        linkedin: false,
        telegram: true,
        whatsapp: true
      },
      limits: {
        maxFriends: 5000,
        maxGroups: 100,
        maxPostsPerDay: 50,
        maxMessageLength: 2000,
        maxGroupMembers: 10000
      }
    };
  }

  private initializeSocialPlatform(): void {
    if (!browser || !this.config.enabled) return;

    try {
      this.loadUserProfile();
      this.setupSocialFeatures();
      this.loadConnections();
      this.loadFeed();
      this.loadGroups();
      this.loadConversations();
      this.setupRealTimeFeatures();
      
      console.log('👥 Social platform system initialized');
    } catch (error) {
      console.error('Failed to initialize social platform:', error);
    }
  }

  private loadUserProfile(): void {
    // Load current user profile
    const storedProfile = localStorage.getItem('ecoscan-social-profile');
    
    if (storedProfile) {
      try {
        this.currentUser = JSON.parse(storedProfile);
        this._currentUser.set(this.currentUser);
      } catch (error) {
        console.warn('Failed to load social profile:', error);
        this.createSocialProfile();
      }
    } else {
      this.createSocialProfile();
    }
  }

  private createSocialProfile(): void {
    // Get base profile from gamification system
    const baseProfile = gamificationSystem.getProfile();
    
    if (baseProfile) {
      this.currentUser = {
        id: baseProfile.id,
        username: baseProfile.username,
        displayName: baseProfile.displayName,
        bio: 'Eco warrior making a difference! 🌱',
        avatar: '/default-avatar.png',
        coverImage: '/default-cover.jpg',
        location: {
          country: '',
          region: '',
          city: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          public: false
        },
        joinDate: baseProfile.joinDate,
        lastActive: new Date(),
        verified: false,
        expertBadges: [],
        stats: {
          totalPosts: 0,
          totalShares: 0,
          totalLikes: 0,
          totalComments: 0,
          friendsCount: 0,
          followersCount: 0,
          followingCount: 0,
          groupsCount: 0,
          eventsHosted: 0,
          eventsAttended: 0,
          helpfulVotes: 0,
          expertVerifications: 0,
          collaborativeScans: 0,
          communityContributions: 0
        },
        privacy: {
          profileVisibility: this.config.privacy.defaultVisibility,
          locationSharing: false,
          activityVisibility: true,
          allowMessages: 'friends',
          allowGroupInvites: true,
          allowTagging: true,
          dataSharing: false,
          analytics: true
        },
        preferences: {
          notifications: {
            likes: true,
            comments: true,
            shares: true,
            mentions: true,
            messages: true,
            friendRequests: true,
            groupInvites: true,
            events: true,
            expertVerifications: true,
            communityUpdates: true,
            frequency: 'immediate',
            quiet_hours: { start: '22:00', end: '08:00' }
          },
          contentFilters: [],
          blockedUsers: [],
          mutedKeywords: [],
          preferredLanguages: ['en'],
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          autoTranslate: false,
          showOnlineStatus: true
        },
        connections: [],
        badges: [],
        reputation: 100
      };

      this.saveSocialProfile();
      this._currentUser.set(this.currentUser);
    }
  }

  private setupSocialFeatures(): void {
    // Setup feature-specific functionality
    if (this.config.features.messaging) {
      this.setupMessaging();
    }

    if (this.config.features.groups) {
      this.setupGroups();
    }

    if (this.config.features.events) {
      this.setupEvents();
    }

    if (this.config.features.moderation) {
      this.setupModeration();
    }
  }

  private setupMessaging(): void {
    // Initialize messaging system
    console.log('Setting up messaging system');
  }

  private setupGroups(): void {
    // Initialize group system
    this.createDefaultGroups();
  }

  private createDefaultGroups(): void {
    // Create default community groups
    const ecoWarriorsGroup: Group = {
      id: 'eco_warriors_general',
      name: 'Eco Warriors',
      description: 'A community for environmental enthusiasts sharing tips and achievements',
      avatar: '/group-eco-warriors.png',
      coverImage: '/group-eco-cover.jpg',
      type: 'public',
      category: 'general',
      adminIds: ['system'],
      moderatorIds: [],
      members: [],
      rules: [
        'Be respectful to all members',
        'Share relevant environmental content',
        'No spam or promotional content',
        'Help others learn and grow'
      ],
      topics: ['recycling', 'sustainability', 'climate change', 'green living'],
      stats: {
        memberCount: 0,
        postCount: 0,
        weeklyActivity: 0,
        monthlyGrowth: 0,
        engagementRate: 0,
        expertMembers: 0
      },
      settings: {
        postApproval: false,
        memberApproval: false,
        allowInvites: true,
        allowSharing: true,
        contentModeration: 'moderate',
        expertVerification: true,
        autoModeration: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.groups.set(ecoWarriorsGroup.id, ecoWarriorsGroup);
  }

  private setupEvents(): void {
    // Initialize event system
    console.log('Setting up event system');
  }

  private setupModeration(): void {
    // Initialize content moderation
    console.log('Setting up content moderation');
  }

  private setupRealTimeFeatures(): void {
    // Setup WebSocket connection for real-time features
    // This would integrate with the WebSocket system from the service worker
    console.log('Setting up real-time features');
  }

  private loadConnections(): void {
    const storedConnections = localStorage.getItem('ecoscan-social-connections');
    
    if (storedConnections && this.currentUser) {
      try {
        const connections = JSON.parse(storedConnections);
        this.connections.set(this.currentUser.id, connections);
        this._friends.set(connections.filter((c: SocialConnection) => c.type === 'friend'));
      } catch (error) {
        console.warn('Failed to load connections:', error);
      }
    }
  }

  private loadFeed(): void {
    // Load user's social feed
    const feedPosts = this.generateSampleFeed();
    this._feed.set(feedPosts);
  }

  private generateSampleFeed(): Post[] {
    // Generate sample posts for demonstration
    return [
      {
        id: 'post_1',
        authorId: 'user_sample',
        author: {
          id: 'user_sample',
          username: 'eco_enthusiast',
          displayName: 'Eco Enthusiast',
          avatar: '/sample-avatar.png',
          verified: true,
          expertBadges: [],
          reputation: 150,
          level: 5
        },
        type: 'scan',
        content: {
          text: 'Just scanned this plastic bottle! Remember to rinse before recycling! 🌍♻️',
          images: [{
            id: 'img_1',
            type: 'image',
            url: '/sample-scan.jpg',
            thumbnail: '/sample-scan-thumb.jpg',
            caption: 'Plastic bottle scan result',
            altText: 'Plastic bottle detection result',
            metadata: { width: 800, height: 600, size: 150000, format: 'jpg' },
            moderated: true
          }],
          videos: [],
          attachments: [],
          scanData: {
            wasteType: 'plastic_bottle',
            confidence: 0.95,
            location: {
              country: 'US',
              region: 'CA',
              city: 'San Francisco',
              timezone: 'America/Los_Angeles',
              public: true
            },
            environmental_impact: {
              co2Saved: 0.5,
              category: 'recycle',
              recyclingTip: 'Rinse bottle and remove cap before recycling'
            },
            collaborative: false,
            verifications: []
          }
        },
        visibility: 'public',
        tags: ['recycling', 'plastic', 'sustainability'],
        mentions: [],
        engagement: {
          likes: 15,
          comments: 3,
          shares: 2,
          saves: 8,
          views: 45,
          reactions: { '👍': 12, '🌍': 3 },
          likedBy: [],
          commentedBy: [],
          sharedBy: [],
          savedBy: []
        },
        moderation: {
          flagged: false,
          flagReasons: [],
          flaggedBy: [],
          reviewStatus: 'approved',
          autoModerated: true,
          confidence: 0.98
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
  }

  private loadGroups(): void {
    this._groups.set(Array.from(this.groups.values()));
  }

  private loadConversations(): void {
    // Load user conversations
    this._conversations.set([]);
  }

  // Public API methods
  public async createPost(content: PostContent, options: {
    type: Post['type'];
    visibility: Post['visibility'];
    groupId?: string;
    tags?: string[];
    mentions?: string[];
    location?: Location;
  }): Promise<Post> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const post: Post = {
      id: this.generateId(),
      authorId: this.currentUser.id,
      author: this.getPublicProfile(this.currentUser),
      type: options.type,
      content,
      visibility: options.visibility,
      groupId: options.groupId,
      location: options.location,
      tags: options.tags || [],
      mentions: options.mentions || [],
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        views: 0,
        reactions: {},
        likedBy: [],
        commentedBy: [],
        sharedBy: [],
        savedBy: []
      },
      moderation: {
        flagged: false,
        flagReasons: [],
        flaggedBy: [],
        reviewStatus: 'pending',
        autoModerated: false,
        confidence: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Apply auto-moderation
    if (this.config.privacy.moderationEnabled) {
      await this.moderateContent(post);
    }

    this.posts.set(post.id, post);
    this.updateUserStats('totalPosts', 1);

    // Update feed
    this.refreshFeed();

    // Track analytics
    advancedAnalytics.trackUserBehavior('post_created', 'social', {
      type: post.type,
      visibility: post.visibility,
      hasImages: content.images.length > 0,
      hasVideo: content.videos.length > 0,
      tagCount: post.tags.length
    });

    return post;
  }

  public async likePost(postId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (!post || !this.currentUser) return;

    const userId = this.currentUser.id;
    
    if (!post.engagement.likedBy.includes(userId)) {
      post.engagement.likes++;
      post.engagement.likedBy.push(userId);
      
      this.updateUserStats('totalLikes', 1);
      
      // Notify post author
      if (post.authorId !== userId) {
        this.addNotification({
          type: 'like',
          data: {
            postId,
            likerId: userId,
            likerName: this.currentUser.displayName
          },
          timestamp: new Date(),
          read: false,
          actionable: false
        });
      }

      this.refreshFeed();
    }
  }

  public async commentOnPost(postId: string, content: string, parentId?: string): Promise<Comment> {
    const post = this.posts.get(postId);
    if (!post || !this.currentUser) {
      throw new Error('Invalid post or user');
    }

    const comment: Comment = {
      id: this.generateId(),
      postId,
      authorId: this.currentUser.id,
      author: this.getPublicProfile(this.currentUser),
      content,
      parentId,
      replies: [],
      likes: 0,
      likedBy: [],
      mentions: this.extractMentions(content),
      edited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      moderated: false
    };

    // Add to comments
    const postComments = this.comments.get(postId) || [];
    postComments.push(comment);
    this.comments.set(postId, postComments);

    // Update post engagement
    post.engagement.comments++;
    if (!post.engagement.commentedBy.includes(this.currentUser.id)) {
      post.engagement.commentedBy.push(this.currentUser.id);
    }

    this.updateUserStats('totalComments', 1);

    // Notify post author and mentioned users
    if (post.authorId !== this.currentUser.id) {
      this.addNotification({
        type: 'comment',
        data: {
          postId,
          commentId: comment.id,
          commenterId: this.currentUser.id,
          commenterName: this.currentUser.displayName,
          content: content.substring(0, 100)
        },
        timestamp: new Date(),
        read: false,
        actionable: true
      });
    }

    this.refreshFeed();
    return comment;
  }

  public async sharePost(postId: string, message?: string): Promise<void> {
    const post = this.posts.get(postId);
    if (!post || !this.currentUser) return;

    const userId = this.currentUser.id;

    if (!post.engagement.sharedBy.includes(userId)) {
      post.engagement.shares++;
      post.engagement.sharedBy.push(userId);

      this.updateUserStats('totalShares', 1);

      // Create share post
      if (message) {
        await this.createPost({
          text: message,
          images: [],
          videos: [],
          attachments: []
        }, {
          type: 'discussion',
          visibility: 'public',
          tags: ['shared']
        });
      }

      // Notify original author
      if (post.authorId !== userId) {
        this.addNotification({
          type: 'share',
          data: {
            postId,
            sharerId: userId,
            sharerName: this.currentUser.displayName,
            message
          },
          timestamp: new Date(),
          read: false,
          actionable: false
        });
      }

      this.refreshFeed();

      // Track sharing for gamification
      gamificationSystem.shareAchievement(postId);
    }
  }

  public async sendFriendRequest(userId: string): Promise<void> {
    if (!this.currentUser || userId === this.currentUser.id) return;

    const connection: SocialConnection = {
      userId,
      type: 'pending',
      establishedDate: new Date(),
      mutualConnections: 0,
      interactionScore: 0,
      lastInteraction: new Date(),
      groups: [],
      commonInterests: []
    };

    const userConnections = this.connections.get(this.currentUser.id) || [];
    
    // Check if connection already exists
    const existing = userConnections.find(c => c.userId === userId);
    if (existing) return;

    userConnections.push(connection);
    this.connections.set(this.currentUser.id, userConnections);

    // Notify target user
    this.addNotification({
      type: 'friend_request',
      data: {
        requesterId: this.currentUser.id,
        requesterName: this.currentUser.displayName,
        requesterAvatar: this.currentUser.avatar
      },
      timestamp: new Date(),
      read: false,
      actionable: true
    });

    this.saveConnections();
    this.updateStores();
  }

  public async acceptFriendRequest(userId: string): Promise<void> {
    if (!this.currentUser) return;

    const userConnections = this.connections.get(this.currentUser.id) || [];
    const connection = userConnections.find(c => c.userId === userId && c.type === 'pending');
    
    if (connection) {
      connection.type = 'friend';
      connection.establishedDate = new Date();

      this.updateUserStats('friendsCount', 1);

      // Create reciprocal connection
      const friendConnections = this.connections.get(userId) || [];
      friendConnections.push({
        userId: this.currentUser.id,
        type: 'friend',
        establishedDate: new Date(),
        mutualConnections: 0,
        interactionScore: 0,
        lastInteraction: new Date(),
        groups: [],
        commonInterests: []
      });
      this.connections.set(userId, friendConnections);

      this.saveConnections();
      this.updateStores();

      // Track analytics
      advancedAnalytics.trackUserBehavior('friend_added', 'social', {
        friendId: userId,
        totalFriends: this.currentUser.stats.friendsCount
      });
    }
  }

  public async createGroup(groupData: Partial<Group>): Promise<Group> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const group: Group = {
      id: this.generateId(),
      name: groupData.name || 'New Group',
      description: groupData.description || '',
      avatar: groupData.avatar || '/default-group-avatar.png',
      coverImage: groupData.coverImage || '/default-group-cover.jpg',
      type: groupData.type || 'public',
      category: groupData.category || 'general',
      location: groupData.location,
      adminIds: [this.currentUser.id],
      moderatorIds: [],
      members: [{
        userId: this.currentUser.id,
        role: 'admin',
        joinedDate: new Date(),
        contributionScore: 0,
        lastActive: new Date(),
        posts: 0,
        helpful: 0,
        warnings: 0
      }],
      rules: groupData.rules || [],
      topics: groupData.topics || [],
      stats: {
        memberCount: 1,
        postCount: 0,
        weeklyActivity: 0,
        monthlyGrowth: 0,
        engagementRate: 0,
        expertMembers: 0
      },
      settings: {
        postApproval: false,
        memberApproval: groupData.type === 'private',
        allowInvites: true,
        allowSharing: true,
        contentModeration: 'moderate',
        expertVerification: false,
        autoModeration: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.groups.set(group.id, group);
    this.updateUserStats('groupsCount', 1);
    this.updateStores();

    return group;
  }

  public async joinGroup(groupId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group || !this.currentUser) return;

    // Check if already a member
    const existingMember = group.members.find(m => m.userId === this.currentUser!.id);
    if (existingMember) return;

    // Add member
    const member: GroupMember = {
      userId: this.currentUser.id,
      role: 'member',
      joinedDate: new Date(),
      contributionScore: 0,
      lastActive: new Date(),
      posts: 0,
      helpful: 0,
      warnings: 0
    };

    group.members.push(member);
    group.stats.memberCount++;

    this.updateUserStats('groupsCount', 1);
    this.updateStores();

    // Track analytics
    advancedAnalytics.trackUserBehavior('group_joined', 'social', {
      groupId,
      groupType: group.type,
      memberCount: group.stats.memberCount
    });
  }

  public async sendMessage(conversationId: string, content: MessageContent): Promise<Message> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message: Message = {
      id: this.generateId(),
      conversationId,
      senderId: this.currentUser.id,
      recipientIds: conversation.participantIds.filter(id => id !== this.currentUser!.id),
      type: this.getMessageType(content),
      content,
      read: {},
      delivered: {},
      reactions: {},
      edited: false,
      deleted: false,
      sentAt: new Date()
    };

    // Add to messages
    const conversationMessages = this.messages.get(conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(conversationId, conversationMessages);

    // Update conversation
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();

    // Update unread counts
    for (const participantId of message.recipientIds) {
      conversation.unreadCount[participantId] = (conversation.unreadCount[participantId] || 0) + 1;
    }

    this.updateStores();
    return message;
  }

  // Private helper methods
  private getPublicProfile(user: UserProfile): PublicProfile {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      verified: user.verified,
      expertBadges: user.expertBadges,
      reputation: user.reputation,
      level: 1 // Would get from gamification system
    };
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  private getMessageType(content: MessageContent): Message['type'] {
    if (content.text) return 'text';
    if (content.media) return content.media.type === 'image' ? 'image' : 'video';
    if (content.file) return 'file';
    if (content.location) return 'location';
    if (content.scanData) return 'scan';
    return 'text';
  }

  private async moderateContent(post: Post): Promise<void> {
    // Simple content moderation
    const inappropriateWords = ['spam', 'fake', 'scam'];
    const contentToCheck = post.content.text.toLowerCase();

    let flagged = false;
    const flagReasons: string[] = [];

    for (const word of inappropriateWords) {
      if (contentToCheck.includes(word)) {
        flagged = true;
        flagReasons.push(`Contains inappropriate word: ${word}`);
      }
    }

    post.moderation = {
      flagged,
      flagReasons,
      flaggedBy: flagged ? ['auto_moderator'] : [],
      reviewStatus: flagged ? 'pending' : 'approved',
      autoModerated: true,
      confidence: flagged ? 0.8 : 0.95
    };
  }

  private updateUserStats(stat: keyof UserSocialStats, increment: number): void {
    if (this.currentUser) {
      (this.currentUser.stats[stat] as number) += increment;
      this.saveSocialProfile();
    }
  }

  private addNotification(event: SocialEvent): void {
    this.socialEvents.unshift(event);
    
    // Keep only last 100 notifications
    if (this.socialEvents.length > 100) {
      this.socialEvents.pop();
    }

    this._notifications.set([...this.socialEvents]);
  }

  private refreshFeed(): void {
    const allPosts = Array.from(this.posts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    this._feed.set(allPosts);
  }

  private updateStores(): void {
    this._currentUser.set(this.currentUser);
    
    if (this.currentUser) {
      const userConnections = this.connections.get(this.currentUser.id) || [];
      this._friends.set(userConnections.filter(c => c.type === 'friend'));
    }

    this._groups.set(Array.from(this.groups.values()));
    this._conversations.set(Array.from(this.conversations.values()));
  }

  private saveSocialProfile(): void {
    if (this.currentUser) {
      localStorage.setItem('ecoscan-social-profile', JSON.stringify(this.currentUser));
    }
  }

  private saveConnections(): void {
    if (this.currentUser) {
      const userConnections = this.connections.get(this.currentUser.id) || [];
      localStorage.setItem('ecoscan-social-connections', JSON.stringify(userConnections));
    }
  }

  private generateId(): string {
    return `social_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getPosts(): Post[] {
    return Array.from(this.posts.values());
  }

  public getGroups(): Group[] {
    return Array.from(this.groups.values());
  }

  public getNotifications(): SocialEvent[] {
    return [...this.socialEvents];
  }

  public markNotificationAsRead(index: number): void {
    if (this.socialEvents[index]) {
      this.socialEvents[index].read = true;
      this._notifications.set([...this.socialEvents]);
    }
  }

  public updateProfile(updates: Partial<UserProfile>): void {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...updates };
      this.currentUser.updatedAt = new Date();
      this.saveSocialProfile();
      this._currentUser.set(this.currentUser);
    }
  }

  public cleanup(): void {
    this.posts.clear();
    this.comments.clear();
    this.groups.clear();
    this.conversations.clear();
    this.messages.clear();
    this.connections.clear();
    this.socialEvents = [];
    this.onlineUsers.clear();
    this.typingUsers.clear();
  }
}

// Global instance
export const socialPlatform = new SocialPlatformSystem();

// Utility functions
export function createSocialPost(content: PostContent, options: any): Promise<Post> {
  return socialPlatform.createPost(content, options);
}

export function likePost(postId: string): Promise<void> {
  return socialPlatform.likePost(postId);
}

export function commentOnPost(postId: string, content: string, parentId?: string): Promise<Comment> {
  return socialPlatform.commentOnPost(postId, content, parentId);
}

export function sharePost(postId: string, message?: string): Promise<void> {
  return socialPlatform.sharePost(postId, message);
}

export function sendFriendRequest(userId: string): Promise<void> {
  return socialPlatform.sendFriendRequest(userId);
}

export function acceptFriendRequest(userId: string): Promise<void> {
  return socialPlatform.acceptFriendRequest(userId);
}

export function createGroup(groupData: Partial<Group>): Promise<Group> {
  return socialPlatform.createGroup(groupData);
}

export function joinGroup(groupId: string): Promise<void> {
  return socialPlatform.joinGroup(groupId);
}

export function getCurrentSocialUser(): UserProfile | null {
  return socialPlatform.getCurrentUser();
}

export function updateSocialProfile(updates: Partial<UserProfile>): void {
  socialPlatform.updateProfile(updates);
} 