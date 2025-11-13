/**
 * Hidden Tags Configuration
 *
 * These tags are used internally for core flows and system functionality
 * but should not be displayed prominently in the UI (like in the contacts table).
 *
 * They represent system states and automation markers that are automatically
 * managed by Manychat flows.
 */

export const HIDDEN_TAGS = [
  // System registration
  'playgram_api_registered',

  // Core flow trackers (using tags as alternative to custom fields)
  'playgram_shares_tracker',
  'playgram_replies_tracker',
  'playgram_comments_tracker',
  'playgram_keywords_tracker',

  // Milestone markers
  'playgram_milestone_5',
  'playgram_milestone_10',
  'playgram_milestone_25',
  'playgram_milestone_50',

  // VIP tiers
  'playgram_vip_bronze',
  'playgram_vip_silver',
  'playgram_vip_gold',
  'playgram_vip_platinum',

  // First-time engagement markers
  'playgram_first_share',
  'playgram_first_reply',
  'playgram_first_comment',
] as const;

export type HiddenTag = typeof HIDDEN_TAGS[number];

/**
 * Check if a tag should be hidden from prominent UI displays
 */
export function isHiddenTag(tagName: string): boolean {
  return HIDDEN_TAGS.includes(tagName.toLowerCase() as any);
}

/**
 * Filter out hidden tags from a list of tags
 */
export function filterVisibleTags<T extends { name: string }>(tags: T[]): T[] {
  return tags.filter(tag => !isHiddenTag(tag.name));
}

/**
 * Get hidden tags from a list of tags
 */
export function getHiddenTags<T extends { name: string }>(tags: T[]): T[] {
  return tags.filter(tag => isHiddenTag(tag.name));
}

/**
 * Get information about why a tag is hidden
 */
export function getHiddenTagInfo(tagName: string): { reason: string; flow?: string } | null {
  const tag = tagName.toLowerCase();

  // System tags
  if (tag === 'playgram_api_registered') {
    return {
      reason: 'API registration marker',
      flow: 'Contact API Registration',
    };
  }

  // Core flow trackers
  if (tag === 'playgram_shares_tracker') {
    return {
      reason: 'Story share tracking enabled',
      flow: 'Story Share Tracker',
    };
  }
  if (tag === 'playgram_replies_tracker') {
    return {
      reason: 'Story reply tracking enabled',
      flow: 'Story Reply Tracker',
    };
  }
  if (tag === 'playgram_comments_tracker') {
    return {
      reason: 'Comment tracking enabled',
      flow: 'Comment Tracker',
    };
  }
  if (tag === 'playgram_keywords_tracker') {
    return {
      reason: 'Keyword engagement tracking enabled',
      flow: 'Keyword Engagement Tracker',
    };
  }

  // Milestone markers
  if (tag.startsWith('playgram_milestone_')) {
    const level = tag.replace('playgram_milestone_', '');
    return {
      reason: `Reached ${level}-engagement milestone`,
      flow: 'Engagement Milestone Rewards',
    };
  }

  // VIP tiers
  if (tag.startsWith('playgram_vip_')) {
    const tier = tag.replace('playgram_vip_', '');
    return {
      reason: `VIP tier: ${tier}`,
      flow: 'VIP Tier System',
    };
  }

  // First-time engagement
  if (tag.startsWith('playgram_first_')) {
    const type = tag.replace('playgram_first_', '');
    return {
      reason: `First-time ${type} reward given`,
      flow: 'First Time Engagement Rewards',
    };
  }

  return null;
}

/**
 * Check if a tag name follows Playgram system conventions
 */
export function isPlaygramSystemTag(tagName: string): boolean {
  return tagName.toLowerCase().startsWith('playgram_');
}

/**
 * Get the category of a system tag
 */
export function getSystemTagCategory(tagName: string): 'tracker' | 'milestone' | 'vip' | 'first-time' | 'system' | null {
  const tag = tagName.toLowerCase();

  if (tag === 'playgram_api_registered') return 'system';
  if (tag.endsWith('_tracker')) return 'tracker';
  if (tag.includes('_milestone_')) return 'milestone';
  if (tag.includes('_vip_')) return 'vip';
  if (tag.startsWith('playgram_first_')) return 'first-time';

  return null;
}
