/**
 * Advanced Gamification System for EcoScan
 * 
 * Features:
 * - Achievement system with unlockable badges and rewards
 * - Experience points (XP) and leveling progression
 * - Leaderboards with competitive rankings
 * - Daily challenges and streaks tracking
 * - Reward system with virtual and real-world prizes
 * - Social features with sharing and competition
 * - Progress tracking and milestone celebrations
 * - Personalized goals and adaptive challenges
 * - Team competitions and collaborative achievements
 * - Seasonal events and limited-time challenges
 * - Virtual currency and marketplace system
 * - Analytics and engagement optimization
 * - Push notifications for engagement
 * - Customizable avatars and profiles
 * - Multi-tier achievement systems
 * 
 * Achievement Categories:
 * - Scanning Achievements (frequency, accuracy, variety)
 * - Environmental Impact (waste sorted, CO2 saved)
 * - Knowledge Achievements (learning, sharing)
 * - Social Achievements (referrals, collaboration)
 * - Streak Achievements (consistency, dedication)
 * - Milestone Achievements (total usage, time-based)
 */

import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import { advancedAnalytics } from './advanced-analytics';

// Gamification interfaces
export interface GamificationConfig {
  enabled: boolean;
  xpEnabled: boolean;
  achievementsEnabled: boolean;
  leaderboardsEnabled: boolean;
  challengesEnabled: boolean;
  rewardsEnabled: boolean;
  socialEnabled: boolean;
  notificationsEnabled: boolean;
  xpRates: {
    scan: number;
    correctClassification: number;
    dailyGoal: number;
    streak: number;
    sharing: number;
    referral: number;
  };
  levelThresholds: number[];
  streakBonusMultiplier: number;
  maxDailyXP: number;
  challengeResetTime: string; // 24-hour format
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: Avatar;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXP: number;
  rank: number;
  badges: Badge[];
  achievements: Achievement[];
  stats: UserStats;
  preferences: UserPreferences;
  joinDate: Date;
  lastActive: Date;
  streak: Streak;
  challenges: Challenge[];
  rewards: Reward[];
  socialConnections: SocialConnection[];
}

export interface Avatar {
  base: string;
  accessories: Accessory[];
  colors: AvatarColors;
  unlocked: string[];
  equipped: string[];
}

export interface Accessory {
  id: string;
  type: 'hat' | 'glasses' | 'clothing' | 'background' | 'pet';
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition: UnlockCondition;
  cost?: number;
  currency?: 'xp' | 'coins' | 'gems';
}

export interface AvatarColors {
  skin: string;
  hair: string;
  clothing: string;
  background: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'scanning' | 'environmental' | 'knowledge' | 'social' | 'streak' | 'milestone';
  type: 'count' | 'streak' | 'threshold' | 'collection' | 'time' | 'precision';
  criteria: AchievementCriteria;
  reward: AchievementReward;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  completedDate?: Date;
  hidden: boolean;
  seasonal: boolean;
  timeLimit?: Date;
}

export interface AchievementCriteria {
  metric: string;
  target: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'alltime';
  conditions?: Record<string, any>;
  dependencies?: string[];
}

export interface AchievementReward {
  xp: number;
  coins: number;
  gems: number;
  items: string[];
  titles: string[];
  avatarItems: string[];
  special?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedDate: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  displayPriority: number;
}

export interface UserStats {
  totalScans: number;
  correctClassifications: number;
  accuracy: number;
  wasteCategories: Record<string, number>;
  environmentalImpact: EnvironmentalImpact;
  timeSpent: number;
  longestStreak: number;
  currentStreak: number;
  dailyGoalsCompleted: number;
  weeklyGoalsCompleted: number;
  monthlyGoalsCompleted: number;
  referrals: number;
  shareActions: number;
  challengesCompleted: number;
  leaderboardRanks: Record<string, number>;
}

export interface EnvironmentalImpact {
  co2Saved: number; // kg
  wasteRecycled: number; // kg
  landfillDiverted: number; // kg
  waterSaved: number; // liters
  energySaved: number; // kWh
  treesEquivalent: number;
  impactScore: number;
}

export interface Streak {
  current: number;
  longest: number;
  lastActivity: Date;
  type: 'daily' | 'weekly';
  multiplier: number;
  freezes: number;
  maxFreezes: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'special';
  category: 'scanning' | 'accuracy' | 'variety' | 'social' | 'learning';
  objective: ChallengeObjective;
  reward: ChallengeReward;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  startDate: Date;
  endDate: Date;
  progress: number;
  maxProgress: number;
  completed: boolean;
  participants?: number;
  leaderboard?: ChallengeLeaderboard[];
}

export interface ChallengeObjective {
  action: string;
  target: number;
  metric: string;
  conditions?: Record<string, any>;
  bonus?: ChallengeBonus;
}

export interface ChallengeBonus {
  condition: string;
  multiplier: number;
  description: string;
}

export interface ChallengeReward {
  xp: number;
  coins: number;
  gems: number;
  items: string[];
  multiplier: number;
  rare?: boolean;
}

export interface ChallengeLeaderboard {
  userId: string;
  username: string;
  score: number;
  rank: number;
  reward?: string;
}

export interface Reward {
  id: string;
  type: 'virtual' | 'physical' | 'discount' | 'badge' | 'title';
  name: string;
  description: string;
  value: number;
  currency: 'coins' | 'gems' | 'points';
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  available: boolean;
  stock?: number;
  expiryDate?: Date;
  conditions?: RewardCondition[];
  redemptionInfo?: RedemptionInfo;
}

export interface RewardCondition {
  type: 'level' | 'achievement' | 'streak' | 'stat';
  requirement: any;
  description: string;
}

export interface RedemptionInfo {
  instructions: string;
  contactInfo?: string;
  code?: string;
  expiryDays: number;
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'friends' | 'local' | 'team';
  metric: 'xp' | 'scans' | 'accuracy' | 'streak' | 'impact' | 'custom';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime';
  entries: LeaderboardEntry[];
  lastUpdated: Date;
  prizes?: LeaderboardPrize[];
  season?: LeaderboardSeason;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  score: number;
  change: number;
  badge?: string;
  isCurrentUser: boolean;
}

export interface LeaderboardPrize {
  rank: number;
  reward: Reward;
  description: string;
}

export interface LeaderboardSeason {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  theme: string;
  specialRewards: Reward[];
}

export interface SocialConnection {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  relationship: 'friend' | 'following' | 'follower' | 'blocked';
  addedDate: Date;
  mutualFriends: number;
  sharedAchievements: string[];
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  gameplay: GameplayPreferences;
  social: SocialPreferences;
}

export interface NotificationPreferences {
  achievements: boolean;
  levelUp: boolean;
  challenges: boolean;
  streaks: boolean;
  leaderboard: boolean;
  social: boolean;
  marketing: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'friends' | 'private';
  leaderboardParticipation: boolean;
  statsSharing: boolean;
  activitySharing: boolean;
  dataCollection: boolean;
}

export interface GameplayPreferences {
  difficulty: 'easy' | 'normal' | 'hard';
  autoAcceptChallenges: boolean;
  showHints: boolean;
  celebrationAnimations: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
}

export interface SocialPreferences {
  allowFriendRequests: boolean;
  shareAchievements: boolean;
  challengeFriends: boolean;
  showOnlineStatus: boolean;
  allowMessages: boolean;
}

export interface UnlockCondition {
  type: 'level' | 'achievement' | 'xp' | 'stat' | 'time' | 'purchase';
  requirement: any;
  description: string;
}

export interface GamificationEvent {
  type: 'achievement_unlocked' | 'level_up' | 'streak_milestone' | 'challenge_completed' | 'reward_earned';
  data: any;
  timestamp: Date;
  celebrated: boolean;
}

class GamificationSystem {
  private config: GamificationConfig;
  private userProfile: UserProfile | null = null;
  private achievements: Map<string, Achievement> = new Map();
  private challenges: Map<string, Challenge> = new Map();
  private rewards: Map<string, Reward> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();
  private events: GamificationEvent[] = [];
  private dailyGoals: Map<string, any> = new Map();
  private streakTimer: number | null = null;
  private challengeTimer: number | null = null;

  // Reactive stores
  private _profile = writable<UserProfile | null>(null);
  private _achievements = writable<Achievement[]>([]);
  private _challenges = writable<Challenge[]>([]);
  private _leaderboards = writable<Leaderboard[]>([]);
  private _events = writable<GamificationEvent[]>([]);
  private _stats = writable<UserStats | null>(null);
  private _rewards = writable<Reward[]>([]);

  public readonly profile: Readable<UserProfile | null> = this._profile;
  public readonly achievements: Readable<Achievement[]> = this._achievements;
  public readonly challenges: Readable<Challenge[]> = this._challenges;
  public readonly leaderboards: Readable<Leaderboard[]> = this._leaderboards;
  public readonly events: Readable<GamificationEvent[]> = this._events;
  public readonly stats: Readable<UserStats | null> = this._stats;
  public readonly rewards: Readable<Reward[]> = this._rewards;

  constructor() {
    this.config = this.getGamificationConfig();
    this.initializeGamification();
  }

  private getGamificationConfig(): GamificationConfig {
    return {
      enabled: true,
      xpEnabled: true,
      achievementsEnabled: true,
      leaderboardsEnabled: true,
      challengesEnabled: true,
      rewardsEnabled: true,
      socialEnabled: true,
      notificationsEnabled: true,
      xpRates: {
        scan: 10,
        correctClassification: 25,
        dailyGoal: 100,
        streak: 50,
        sharing: 15,
        referral: 200
      },
      levelThresholds: [
        0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000,
        13000, 16500, 20500, 25000, 30000, 35500, 41500, 48000, 55000
      ],
      streakBonusMultiplier: 1.5,
      maxDailyXP: 1000,
      challengeResetTime: '00:00'
    };
  }

  private initializeGamification(): void {
    if (!browser || !this.config.enabled) return;

    try {
      this.setupDefaultAchievements();
      this.setupDefaultChallenges();
      this.setupDefaultRewards();
      this.setupLeaderboards();
      this.startTimers();
      this.loadUserProfile();
      
      console.log('🎮 Gamification system initialized');
    } catch (error) {
      console.error('Failed to initialize gamification system:', error);
    }
  }

  private setupDefaultAchievements(): void {
    // Scanning Achievements
    this.addAchievement({
      id: 'first_scan',
      title: 'First Steps',
      description: 'Complete your first waste scan',
      category: 'scanning',
      type: 'count',
      criteria: { metric: 'scans', target: 1 },
      reward: { xp: 50, coins: 10, gems: 0, items: [], titles: ['Beginner'], avatarItems: [] },
      rarity: 'bronze',
      icon: '🔍',
      progress: 0,
      maxProgress: 1,
      completed: false,
      hidden: false,
      seasonal: false
    });

    this.addAchievement({
      id: 'scan_master',
      title: 'Scan Master',
      description: 'Complete 100 waste scans',
      category: 'scanning',
      type: 'count',
      criteria: { metric: 'scans', target: 100 },
      reward: { xp: 500, coins: 100, gems: 5, items: [], titles: ['Scan Master'], avatarItems: ['golden_badge'] },
      rarity: 'gold',
      icon: '🏆',
      progress: 0,
      maxProgress: 100,
      completed: false,
      hidden: false,
      seasonal: false
    });

    // Accuracy Achievements
    this.addAchievement({
      id: 'accuracy_expert',
      title: 'Accuracy Expert',
      description: 'Achieve 95% accuracy over 50 scans',
      category: 'scanning',
      type: 'precision',
      criteria: { metric: 'accuracy', target: 0.95, conditions: { minScans: 50 } },
      reward: { xp: 300, coins: 50, gems: 3, items: [], titles: ['Expert'], avatarItems: ['precision_badge'] },
      rarity: 'silver',
      icon: '🎯',
      progress: 0,
      maxProgress: 50,
      completed: false,
      hidden: false,
      seasonal: false
    });

    // Environmental Achievements
    this.addAchievement({
      id: 'eco_warrior',
      title: 'Eco Warrior',
      description: 'Save 100kg of CO2 through proper waste sorting',
      category: 'environmental',
      type: 'threshold',
      criteria: { metric: 'co2_saved', target: 100 },
      reward: { xp: 1000, coins: 200, gems: 10, items: [], titles: ['Eco Warrior'], avatarItems: ['eco_cape'] },
      rarity: 'platinum',
      icon: '🌍',
      progress: 0,
      maxProgress: 100,
      completed: false,
      hidden: false,
      seasonal: false
    });

    // Streak Achievements
    this.addAchievement({
      id: 'week_streak',
      title: 'Week Warrior',
      description: 'Maintain a 7-day scanning streak',
      category: 'streak',
      type: 'streak',
      criteria: { metric: 'daily_streak', target: 7 },
      reward: { xp: 350, coins: 70, gems: 2, items: [], titles: ['Consistent'], avatarItems: ['streak_badge'] },
      rarity: 'silver',
      icon: '🔥',
      progress: 0,
      maxProgress: 7,
      completed: false,
      hidden: false,
      seasonal: false
    });

    // Social Achievements
    this.addAchievement({
      id: 'social_sharer',
      title: 'Social Butterfly',
      description: 'Share your achievements 10 times',
      category: 'social',
      type: 'count',
      criteria: { metric: 'shares', target: 10 },
      reward: { xp: 200, coins: 40, gems: 1, items: [], titles: ['Sharer'], avatarItems: ['social_badge'] },
      rarity: 'bronze',
      icon: '📱',
      progress: 0,
      maxProgress: 10,
      completed: false,
      hidden: false,
      seasonal: false
    });

    this.updateAchievements();
  }

  private setupDefaultChallenges(): void {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Daily Challenge
    this.addChallenge({
      id: 'daily_scan_challenge',
      title: 'Daily Scanner',
      description: 'Complete 5 scans today',
      type: 'daily',
      category: 'scanning',
      objective: {
        action: 'scan',
        target: 5,
        metric: 'count'
      },
      reward: {
        xp: 100,
        coins: 20,
        gems: 1,
        items: [],
        multiplier: 1
      },
      difficulty: 'easy',
      startDate: today,
      endDate: tomorrow,
      progress: 0,
      maxProgress: 5,
      completed: false
    });

    // Weekly Challenge
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.addChallenge({
      id: 'weekly_accuracy_challenge',
      title: 'Accuracy Week',
      description: 'Maintain 90% accuracy for a week',
      type: 'weekly',
      category: 'accuracy',
      objective: {
        action: 'maintain_accuracy',
        target: 0.9,
        metric: 'accuracy'
      },
      reward: {
        xp: 500,
        coins: 100,
        gems: 5,
        items: ['accuracy_boost'],
        multiplier: 1.5
      },
      difficulty: 'medium',
      startDate: today,
      endDate: nextWeek,
      progress: 0,
      maxProgress: 7,
      completed: false
    });

    this.updateChallenges();
  }

  private setupDefaultRewards(): void {
    // Virtual Rewards
    this.addReward({
      id: 'xp_boost',
      type: 'virtual',
      name: 'XP Boost',
      description: '2x XP for the next hour',
      value: 100,
      currency: 'coins',
      category: 'boost',
      rarity: 'common',
      available: true,
      stock: 50
    });

    this.addReward({
      id: 'streak_freeze',
      type: 'virtual',
      name: 'Streak Freeze',
      description: 'Protect your streak for one day',
      value: 50,
      currency: 'gems',
      category: 'protection',
      rarity: 'rare',
      available: true,
      stock: 20
    });

    // Physical Rewards
    this.addReward({
      id: 'eco_sticker_pack',
      type: 'physical',
      name: 'Eco Sticker Pack',
      description: 'Set of 10 environmental awareness stickers',
      value: 500,
      currency: 'coins',
      category: 'merchandise',
      rarity: 'common',
      available: true,
      stock: 100,
      redemptionInfo: {
        instructions: 'Provide shipping address in profile',
        expiryDays: 30
      }
    });

    this.addReward({
      id: 'eco_tshirt',
      type: 'physical',
      name: 'EcoScan T-Shirt',
      description: 'Organic cotton t-shirt with EcoScan logo',
      value: 2000,
      currency: 'coins',
      category: 'merchandise',
      rarity: 'epic',
      available: true,
      stock: 25,
      conditions: [
        {
          type: 'level',
          requirement: 10,
          description: 'Reach level 10'
        }
      ],
      redemptionInfo: {
        instructions: 'Select size and provide shipping address',
        expiryDays: 60
      }
    });

    this.updateRewards();
  }

  private setupLeaderboards(): void {
    this.addLeaderboard({
      id: 'global_xp',
      name: 'Global XP Leaders',
      description: 'Top XP earners worldwide',
      type: 'global',
      metric: 'xp',
      timeframe: 'alltime',
      entries: [],
      lastUpdated: new Date()
    });

    this.addLeaderboard({
      id: 'weekly_scans',
      name: 'Weekly Scan Leaders',
      description: 'Most scans this week',
      type: 'global',
      metric: 'scans',
      timeframe: 'weekly',
      entries: [],
      lastUpdated: new Date()
    });

    this.addLeaderboard({
      id: 'environmental_impact',
      name: 'Environmental Champions',
      description: 'Biggest environmental impact',
      type: 'global',
      metric: 'impact',
      timeframe: 'alltime',
      entries: [],
      lastUpdated: new Date()
    });

    this.updateLeaderboards();
  }

  private startTimers(): void {
    // Daily reset timer
    this.challengeTimer = window.setInterval(() => {
      this.checkDailyReset();
    }, 60000); // Check every minute

    // Streak timer
    this.streakTimer = window.setInterval(() => {
      this.updateStreaks();
    }, 3600000); // Check every hour
  }

  private loadUserProfile(): void {
    // Load user profile from storage or create new one
    const storedProfile = localStorage.getItem('ecoscan-user-profile');
    
    if (storedProfile) {
      try {
        this.userProfile = JSON.parse(storedProfile);
        this._profile.set(this.userProfile);
        this._stats.set(this.userProfile?.stats || null);
      } catch (error) {
        console.warn('Failed to load user profile:', error);
        this.createNewProfile();
      }
    } else {
      this.createNewProfile();
    }
  }

  private createNewProfile(): void {
    this.userProfile = {
      id: this.generateUserId(),
      username: `user_${Date.now()}`,
      displayName: 'New User',
      avatar: {
        base: 'default',
        accessories: [],
        colors: {
          skin: '#fdbcb4',
          hair: '#8b4513',
          clothing: '#4169e1',
          background: '#87ceeb'
        },
        unlocked: ['default'],
        equipped: ['default']
      },
      level: 1,
      xp: 0,
      xpToNextLevel: this.config.levelThresholds[1],
      totalXP: 0,
      rank: 0,
      badges: [],
      achievements: [],
      stats: {
        totalScans: 0,
        correctClassifications: 0,
        accuracy: 0,
        wasteCategories: {},
        environmentalImpact: {
          co2Saved: 0,
          wasteRecycled: 0,
          landfillDiverted: 0,
          waterSaved: 0,
          energySaved: 0,
          treesEquivalent: 0,
          impactScore: 0
        },
        timeSpent: 0,
        longestStreak: 0,
        currentStreak: 0,
        dailyGoalsCompleted: 0,
        weeklyGoalsCompleted: 0,
        monthlyGoalsCompleted: 0,
        referrals: 0,
        shareActions: 0,
        challengesCompleted: 0,
        leaderboardRanks: {}
      },
      preferences: {
        notifications: {
          achievements: true,
          levelUp: true,
          challenges: true,
          streaks: true,
          leaderboard: true,
          social: true,
          marketing: false,
          frequency: 'immediate'
        },
        privacy: {
          profileVisibility: 'public',
          leaderboardParticipation: true,
          statsSharing: true,
          activitySharing: true,
          dataCollection: true
        },
        gameplay: {
          difficulty: 'normal',
          autoAcceptChallenges: true,
          showHints: true,
          celebrationAnimations: true,
          soundEffects: true,
          hapticFeedback: true
        },
        social: {
          allowFriendRequests: true,
          shareAchievements: true,
          challengeFriends: true,
          showOnlineStatus: true,
          allowMessages: true
        }
      },
      joinDate: new Date(),
      lastActive: new Date(),
      streak: {
        current: 0,
        longest: 0,
        lastActivity: new Date(),
        type: 'daily',
        multiplier: 1,
        freezes: 0,
        maxFreezes: 3
      },
      challenges: [],
      rewards: [],
      socialConnections: []
    };

    this.saveUserProfile();
    this._profile.set(this.userProfile);
    this._stats.set(this.userProfile.stats);
  }

  // Public API methods
  public addXP(amount: number, source: string): void {
    if (!this.userProfile || !this.config.xpEnabled) return;

    // Apply streak multiplier
    let finalAmount = amount;
    if (this.userProfile.streak.current > 0) {
      finalAmount *= this.config.streakBonusMultiplier;
    }

    // Check daily XP limit
    const dailyXP = this.getDailyXP();
    if (dailyXP + finalAmount > this.config.maxDailyXP) {
      finalAmount = Math.max(0, this.config.maxDailyXP - dailyXP);
    }

    if (finalAmount <= 0) return;

    const oldLevel = this.userProfile.level;
    this.userProfile.xp += finalAmount;
    this.userProfile.totalXP += finalAmount;

    // Check for level up
    this.checkLevelUp();

    // Track XP gain
    this.addEvent({
      type: 'achievement_unlocked',
      data: {
        type: 'xp_gain',
        amount: finalAmount,
        source,
        newXP: this.userProfile.xp,
        newLevel: this.userProfile.level,
        leveledUp: this.userProfile.level > oldLevel
      },
      timestamp: new Date(),
      celebrated: false
    });

    this.saveUserProfile();
    this.updateStores();

    // Track analytics
    advancedAnalytics.trackUserBehavior('xp_gained', 'gamification', {
      amount: finalAmount,
      source,
      totalXP: this.userProfile.totalXP,
      level: this.userProfile.level
    });
  }

  public recordScan(accurate: boolean, category: string): void {
    if (!this.userProfile) return;

    this.userProfile.stats.totalScans++;
    
    if (accurate) {
      this.userProfile.stats.correctClassifications++;
      this.addXP(this.config.xpRates.correctClassification, 'correct_classification');
    }

    // Update category stats
    this.userProfile.stats.wasteCategories[category] = 
      (this.userProfile.stats.wasteCategories[category] || 0) + 1;

    // Update accuracy
    this.userProfile.stats.accuracy = 
      this.userProfile.stats.correctClassifications / this.userProfile.stats.totalScans;

    // Update environmental impact (simplified calculation)
    this.updateEnvironmentalImpact(category);

    // Update streak
    this.updateDailyStreak();

    // Check achievements
    this.checkAchievements();

    // Update challenges
    this.updateChallengeProgress('scan', 1);

    this.saveUserProfile();
    this.updateStores();
  }

  public shareAchievement(achievementId: string): void {
    if (!this.userProfile) return;

    this.userProfile.stats.shareActions++;
    this.addXP(this.config.xpRates.sharing, 'sharing');

    this.updateChallengeProgress('share', 1);
    this.checkAchievements();

    this.saveUserProfile();
    this.updateStores();
  }

  public completeChallenge(challengeId: string): void {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || !this.userProfile) return;

    challenge.completed = true;
    this.userProfile.stats.challengesCompleted++;

    // Award rewards
    this.addXP(challenge.reward.xp, 'challenge_completion');
    this.addCoins(challenge.reward.coins);
    this.addGems(challenge.reward.gems);

    // Add event
    this.addEvent({
      type: 'challenge_completed',
      data: {
        challengeId,
        challenge: challenge.title,
        reward: challenge.reward
      },
      timestamp: new Date(),
      celebrated: false
    });

    this.saveUserProfile();
    this.updateStores();

    // Track analytics
    advancedAnalytics.trackUserBehavior('challenge_completed', 'gamification', {
      challengeId,
      difficulty: challenge.difficulty,
      type: challenge.type
    });
  }

  public redeemReward(rewardId: string): boolean {
    const reward = this.rewards.get(rewardId);
    if (!reward || !this.userProfile || !reward.available) return false;

    // Check conditions
    if (reward.conditions && !this.checkRewardConditions(reward.conditions)) {
      return false;
    }

    // Check currency
    if (!this.hasSufficientCurrency(reward.value, reward.currency)) {
      return false;
    }

    // Deduct currency
    this.deductCurrency(reward.value, reward.currency);

    // Add to user rewards
    this.userProfile.rewards.push(reward);

    // Update stock
    if (reward.stock !== undefined) {
      reward.stock--;
      if (reward.stock <= 0) {
        reward.available = false;
      }
    }

    // Add event
    this.addEvent({
      type: 'reward_earned',
      data: {
        rewardId,
        reward: reward.name,
        type: reward.type
      },
      timestamp: new Date(),
      celebrated: false
    });

    this.saveUserProfile();
    this.updateStores();

    return true;
  }

  // Private implementation methods
  private checkLevelUp(): void {
    if (!this.userProfile) return;

    let newLevel = this.userProfile.level;
    
    while (newLevel < this.config.levelThresholds.length - 1 &&
           this.userProfile.xp >= this.config.levelThresholds[newLevel + 1]) {
      newLevel++;
    }

    if (newLevel > this.userProfile.level) {
      const oldLevel = this.userProfile.level;
      this.userProfile.level = newLevel;

      // Calculate XP to next level
      if (newLevel < this.config.levelThresholds.length - 1) {
        this.userProfile.xpToNextLevel = this.config.levelThresholds[newLevel + 1] - this.userProfile.xp;
      } else {
        this.userProfile.xpToNextLevel = 0; // Max level
      }

      // Add level up event
      this.addEvent({
        type: 'level_up',
        data: {
          oldLevel,
          newLevel,
          xp: this.userProfile.xp
        },
        timestamp: new Date(),
        celebrated: false
      });

      // Award level up bonus
      this.addXP(newLevel * 50, 'level_up_bonus');

      // Check for level-based achievements
      this.checkAchievements();
    }
  }

  private updateEnvironmentalImpact(category: string): void {
    if (!this.userProfile) return;

    const impact = this.userProfile.stats.environmentalImpact;
    
    // Simplified impact calculation based on category
    switch (category) {
      case 'recycle':
        impact.co2Saved += 0.5;
        impact.wasteRecycled += 0.2;
        break;
      case 'compost':
        impact.co2Saved += 0.3;
        impact.wasteRecycled += 0.15;
        break;
      case 'landfill':
        impact.landfillDiverted += 0.1;
        break;
      default:
        impact.co2Saved += 0.1;
    }

    // Calculate derived metrics
    impact.waterSaved = impact.co2Saved * 2.5;
    impact.energySaved = impact.co2Saved * 1.8;
    impact.treesEquivalent = impact.co2Saved / 21.8; // Average tree absorbs 21.8kg CO2/year
    impact.impactScore = impact.co2Saved + impact.wasteRecycled + impact.landfillDiverted;
  }

  private updateDailyStreak(): void {
    if (!this.userProfile) return;

    const now = new Date();
    const lastActivity = new Date(this.userProfile.streak.lastActivity);
    const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change
      return;
    } else if (daysDiff === 1) {
      // Next day, increment streak
      this.userProfile.streak.current++;
      this.userProfile.streak.lastActivity = now;
      
      if (this.userProfile.streak.current > this.userProfile.streak.longest) {
        this.userProfile.streak.longest = this.userProfile.streak.current;
      }

      // Award streak bonus
      if (this.userProfile.streak.current % 7 === 0) {
        this.addXP(this.config.xpRates.streak * (this.userProfile.streak.current / 7), 'streak_milestone');
        
        this.addEvent({
          type: 'streak_milestone',
          data: {
            streak: this.userProfile.streak.current,
            milestone: this.userProfile.streak.current / 7
          },
          timestamp: new Date(),
          celebrated: false
        });
      }
    } else {
      // Streak broken
      if (this.userProfile.streak.freezes > 0) {
        // Use streak freeze
        this.userProfile.streak.freezes--;
        this.userProfile.streak.lastActivity = now;
      } else {
        // Reset streak
        this.userProfile.streak.current = 1;
        this.userProfile.streak.lastActivity = now;
      }
    }

    this.checkAchievements();
  }

  private checkAchievements(): void {
    if (!this.userProfile) return;

    for (const achievement of this.achievements.values()) {
      if (achievement.completed) continue;

      const progress = this.calculateAchievementProgress(achievement);
      achievement.progress = Math.min(progress, achievement.maxProgress);

      if (achievement.progress >= achievement.maxProgress) {
        this.unlockAchievement(achievement);
      }
    }

    this.updateAchievements();
  }

  private calculateAchievementProgress(achievement: Achievement): number {
    if (!this.userProfile) return 0;

    const { metric, target, conditions } = achievement.criteria;
    const stats = this.userProfile.stats;

    switch (metric) {
      case 'scans':
        return stats.totalScans;
      case 'accuracy':
        if (conditions?.minScans && stats.totalScans >= conditions.minScans) {
          return stats.accuracy >= target ? achievement.maxProgress : 0;
        }
        return 0;
      case 'co2_saved':
        return stats.environmentalImpact.co2Saved;
      case 'daily_streak':
        return this.userProfile.streak.current;
      case 'shares':
        return stats.shareActions;
      default:
        return 0;
    }
  }

  private unlockAchievement(achievement: Achievement): void {
    if (!this.userProfile) return;

    achievement.completed = true;
    achievement.completedDate = new Date();

    // Add to user achievements
    this.userProfile.achievements.push(achievement);

    // Award rewards
    this.addXP(achievement.reward.xp, 'achievement');
    this.addCoins(achievement.reward.coins);
    this.addGems(achievement.reward.gems);

    // Add badge if specified
    if (achievement.reward.titles.length > 0) {
      const badge: Badge = {
        id: achievement.id + '_badge',
        name: achievement.reward.titles[0],
        description: `Earned for: ${achievement.description}`,
        icon: achievement.icon,
        color: this.getRarityColor(achievement.rarity),
        earnedDate: new Date(),
        rarity: achievement.rarity === 'bronze' ? 'common' : achievement.rarity === 'silver' ? 'rare' : achievement.rarity === 'gold' ? 'epic' : 'legendary',
        category: achievement.category,
        displayPriority: this.getRarityPriority(achievement.rarity)
      };

      this.userProfile.badges.push(badge);
    }

    // Add event
    this.addEvent({
      type: 'achievement_unlocked',
      data: {
        achievementId: achievement.id,
        achievement: achievement.title,
        rarity: achievement.rarity,
        reward: achievement.reward
      },
      timestamp: new Date(),
      celebrated: false
    });

    // Track analytics
    advancedAnalytics.trackUserBehavior('achievement_unlocked', 'gamification', {
      achievementId: achievement.id,
      category: achievement.category,
      rarity: achievement.rarity
    });
  }

  private updateChallengeProgress(action: string, amount: number): void {
    for (const challenge of this.challenges.values()) {
      if (challenge.completed || challenge.endDate < new Date()) continue;

      if (challenge.objective.action === action) {
        challenge.progress = Math.min(
          challenge.progress + amount,
          challenge.maxProgress
        );

        if (challenge.progress >= challenge.maxProgress) {
          this.completeChallenge(challenge.id);
        }
      }
    }

    this.updateChallenges();
  }

  private checkDailyReset(): void {
    const now = new Date();
    const resetTime = this.config.challengeResetTime;
    const [hours, minutes] = resetTime.split(':').map(Number);
    
    const resetToday = new Date(now);
    resetToday.setHours(hours, minutes, 0, 0);
    
    if (now >= resetToday) {
      this.resetDailyChallenges();
    }
  }

  private resetDailyChallenges(): void {
    // Reset daily challenges
    for (const challenge of this.challenges.values()) {
      if (challenge.type === 'daily') {
        challenge.progress = 0;
        challenge.completed = false;
        challenge.startDate = new Date();
        
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 1);
        challenge.endDate = endDate;
      }
    }

    this.updateChallenges();
  }

  private updateStreaks(): void {
    if (!this.userProfile) return;

    const now = new Date();
    const lastActivity = new Date(this.userProfile.streak.lastActivity);
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    // Check if streak should be broken (after 48 hours without activity)
    if (hoursSinceActivity > 48 && this.userProfile.streak.freezes === 0) {
      this.userProfile.streak.current = 0;
      this.saveUserProfile();
      this.updateStores();
    }
  }

  private getDailyXP(): number {
    // Get XP earned today (simplified implementation)
    return 0; // Would calculate from daily activity log
  }

  private addCoins(amount: number): void {
    // Coins would be stored in user profile currency system
    console.log(`Added ${amount} coins`);
  }

  private addGems(amount: number): void {
    // Gems would be stored in user profile currency system
    console.log(`Added ${amount} gems`);
  }

  private checkRewardConditions(conditions: RewardCondition[]): boolean {
    if (!this.userProfile) return false;

    return conditions.every(condition => {
      switch (condition.type) {
        case 'level':
          return this.userProfile!.level >= condition.requirement;
        case 'achievement':
          return this.userProfile!.achievements.some(a => a.id === condition.requirement);
        case 'streak':
          return this.userProfile!.streak.current >= condition.requirement;
        default:
          return false;
      }
    });
  }

  private hasSufficientCurrency(amount: number, currency: string): boolean {
    // Check if user has enough currency (simplified)
    return true; // Would check actual currency amounts
  }

  private deductCurrency(amount: number, currency: string): void {
    // Deduct currency from user profile
    console.log(`Deducted ${amount} ${currency}`);
  }

  private addEvent(event: GamificationEvent): void {
    this.events.push(event);
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }

    this._events.set([...this.events]);
  }

  private addAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
  }

  private addChallenge(challenge: Challenge): void {
    this.challenges.set(challenge.id, challenge);
  }

  private addReward(reward: Reward): void {
    this.rewards.set(reward.id, reward);
  }

  private addLeaderboard(leaderboard: Leaderboard): void {
    this.leaderboards.set(leaderboard.id, leaderboard);
  }

  private updateAchievements(): void {
    this._achievements.set(Array.from(this.achievements.values()));
  }

  private updateChallenges(): void {
    this._challenges.set(Array.from(this.challenges.values()));
  }

  private updateRewards(): void {
    this._rewards.set(Array.from(this.rewards.values()));
  }

  private updateLeaderboards(): void {
    this._leaderboards.set(Array.from(this.leaderboards.values()));
  }

  private updateStores(): void {
    this._profile.set(this.userProfile);
    this._stats.set(this.userProfile?.stats || null);
  }

  private saveUserProfile(): void {
    if (this.userProfile) {
      localStorage.setItem('ecoscan-user-profile', JSON.stringify(this.userProfile));
    }
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
      case 'diamond': return '#b9f2ff';
      default: return '#666666';
    }
  }

  private getRarityPriority(rarity: string): number {
    switch (rarity) {
      case 'bronze': return 1;
      case 'silver': return 2;
      case 'gold': return 3;
      case 'platinum': return 4;
      case 'diamond': return 5;
      default: return 0;
    }
  }

  // Public API
  public getProfile(): UserProfile | null {
    return this.userProfile;
  }

  public getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  public getChallenges(): Challenge[] {
    return Array.from(this.challenges.values());
  }

  public getLeaderboards(): Leaderboard[] {
    return Array.from(this.leaderboards.values());
  }

  public getEvents(): GamificationEvent[] {
    return [...this.events];
  }

  public updatePreferences(preferences: Partial<UserPreferences>): void {
    if (this.userProfile) {
      this.userProfile.preferences = { ...this.userProfile.preferences, ...preferences };
      this.saveUserProfile();
      this.updateStores();
    }
  }

  public celebrateEvent(eventId: number): void {
    if (this.events[eventId]) {
      this.events[eventId].celebrated = true;
      this._events.set([...this.events]);
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public cleanup(): void {
    if (this.challengeTimer) {
      clearInterval(this.challengeTimer);
    }
    
    if (this.streakTimer) {
      clearInterval(this.streakTimer);
    }

    this.achievements.clear();
    this.challenges.clear();
    this.rewards.clear();
    this.leaderboards.clear();
    this.events = [];
  }
}

// Global instance
export const gamificationSystem = new GamificationSystem();

// Utility functions
export function addXP(amount: number, source: string): void {
  gamificationSystem.addXP(amount, source);
}

export function recordScan(accurate: boolean, category: string): void {
  gamificationSystem.recordScan(accurate, category);
}

export function shareAchievement(achievementId: string): void {
  gamificationSystem.shareAchievement(achievementId);
}

export function completeChallenge(challengeId: string): void {
  gamificationSystem.completeChallenge(challengeId);
}

export function redeemReward(rewardId: string): boolean {
  return gamificationSystem.redeemReward(rewardId);
}

export function getUserProfile(): UserProfile | null {
  return gamificationSystem.getProfile();
}

export function updateUserPreferences(preferences: Partial<UserPreferences>): void {
  gamificationSystem.updatePreferences(preferences);
}

export function celebrateGamificationEvent(eventId: number): void {
  gamificationSystem.celebrateEvent(eventId);
} 