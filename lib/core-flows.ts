/**
 * Core Playgram Flows
 * Pre-built engagement tracking templates for common Instagram use cases
 *
 * These are standard Manychat custom fields with recommended naming conventions
 * and setup instructions. They work just like any other custom field.
 *
 * TRACKING METHODS:
 * - Custom Fields: Best for numeric counters and data you want to display (e.g., playgram_shares_count)
 * - Tags: Best for binary states and segmentation (e.g., playgram_milestone_10, playgram_vip_gold)
 *
 * Some flows use both methods - custom fields for data, tags for segmentation.
 */

export interface CoreFlow {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'tracking' | 'marketing' | 'support';
  trigger: {
    type: 'story_share' | 'story_reply' | 'comment' | 'message' | 'keyword';
    description: string;
  };
  customFields: {
    name: string; // Standard playgram naming convention
    type: 'number' | 'text' | 'date' | 'boolean';
    description: string;
    defaultValue?: any;
    manychatFieldId?: string; // Will be populated when created
  }[];
  recommendedTags?: {
    name: string;
    description: string;
    when: string; // When to apply this tag
  }[];
  actions: {
    step: number;
    type: 'increment' | 'set_field' | 'send_message' | 'tag' | 'external_request';
    description: string;
    config: any;
  }[];
  setupInstructions: string[];
}

export const CORE_FLOWS: CoreFlow[] = [
  {
    id: 'story-share-tracker',
    name: '📊 Story Share Tracker',
    description: 'Track how many times users share your posts/reels as Instagram stories',
    category: 'tracking',
    trigger: {
      type: 'story_share',
      description: 'When user shares your Post or Reel as a Story',
    },
    customFields: [
      {
        name: 'playgram_shares_count_insta',
        type: 'number',
        description: 'Total number of Instagram story shares by this user',
        defaultValue: 0,
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase share count by 1',
        config: {
          field: 'playgram_shares_count_insta',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'send_message',
        description: 'Thank user for sharing',
        config: {
          message: '🎉 Thanks for sharing! You\'ve shared {{playgram_shares_count_insta}} times.',
        },
      },
    ],
    setupInstructions: [
      '1. Go to Automation → Instagram → Post or Reel Share',
      '2. Create trigger: "User shares your Post or Reel as a Story"',
      '3. Add Action: "Set User Field"',
      '4. Select field: playgram_shares_count_insta',
      '5. Operation: "Increase by 1"',
      '6. Add Action: "Send Message" (optional thank you message)',
    ],
  },
  {
    id: 'story-reply-tracker',
    name: '💬 Story Reply Tracker',
    description: 'Track how many times users reply to your Instagram stories',
    category: 'tracking',
    trigger: {
      type: 'story_reply',
      description: 'When user replies to your Instagram Story',
    },
    customFields: [
      {
        name: 'playgram_story_replies_count_insta',
        type: 'number',
        description: 'Total number of Instagram story replies by this user',
        defaultValue: 0,
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase story reply count by 1',
        config: {
          field: 'playgram_story_replies_count_insta',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'send_message',
        description: 'Respond to user',
        config: {
          message: '👋 Thanks for your reply! Total replies: {{playgram_story_replies_count_insta}}',
        },
      },
    ],
    setupInstructions: [
      '1. Go to Automation → Instagram → Story Reply',
      '2. Create trigger: "User replies to your Story"',
      '3. Add Action: "Set User Field"',
      '4. Select field: playgram_story_replies_count_insta',
      '5. Operation: "Increase by 1"',
      '6. Add Action: "Send Message" (optional response)',
    ],
  },
  {
    id: 'comment-tracker',
    name: '💭 Comment Tracker',
    description: 'Track how many times users comment on your Instagram posts',
    category: 'tracking',
    trigger: {
      type: 'comment',
      description: 'When user comments on your Instagram post',
    },
    customFields: [
      {
        name: 'playgram_comments_count_insta',
        type: 'number',
        description: 'Total number of Instagram comments by this user',
        defaultValue: 0,
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase comment count by 1',
        config: {
          field: 'playgram_comments_count_insta',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'send_message',
        description: 'Thank user for commenting',
        config: {
          message: '💬 Thanks for commenting! Total comments: {{playgram_comments_count_insta}}',
        },
      },
    ],
    setupInstructions: [
      '1. Go to Automation → Instagram → Comment',
      '2. Create trigger: "User comments on your post"',
      '3. Add Action: "Set User Field"',
      '4. Select field: playgram_comments_count_insta',
      '5. Operation: "Increase by 1"',
      '6. Add Action: "Send Message" (optional thank you)',
    ],
  },
  {
    id: 'keyword-engagement-tracker',
    name: '🔑 Keyword Engagement Tracker',
    description: 'Track engagement from specific keyword triggers in DMs',
    category: 'tracking',
    trigger: {
      type: 'keyword',
      description: 'When user sends a specific keyword (e.g., "PROMO", "INFO")',
    },
    customFields: [
      {
        name: 'playgram_keyword_count_insta',
        type: 'number',
        description: 'Total number of times user triggered Instagram keyword flows',
        defaultValue: 0,
      },
      {
        name: 'playgram_last_keyword_insta',
        type: 'text',
        description: 'Last Instagram keyword triggered by user',
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase keyword engagement count by 1',
        config: {
          field: 'playgram_keyword_count_insta',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'set_field',
        description: 'Record which keyword was triggered',
        config: {
          field: 'playgram_last_keyword_insta',
          value: '{{keyword}}',
        },
      },
    ],
    setupInstructions: [
      '1. Go to Automation → Instagram → Keywords',
      '2. Create keyword triggers (e.g., "PROMO", "INFO", "HELP")',
      '3. Add Action: "Set User Field"',
      '4. Select field: playgram_keyword_count_insta',
      '5. Operation: "Increase by 1"',
      '6. Add Action: "Set User Field"',
      '7. Select field: playgram_last_keyword_insta',
      '8. Value: [keyword text]',
    ],
  },
  {
    id: 'total-engagement-tracker',
    name: '📈 Total Engagement Tracker',
    description: 'Track total engagement across all Instagram interactions',
    category: 'tracking',
    trigger: {
      type: 'story_share',
      description: 'Any engagement trigger (shares, replies, comments, keywords)',
    },
    customFields: [
      {
        name: 'playgram_total_engagement',
        type: 'number',
        description: 'Total engagement count (shares + replies + comments + keywords)',
        defaultValue: 0,
      },
      {
        name: 'playgram_last_interaction',
        type: 'date',
        description: 'Timestamp of last interaction',
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase total engagement by 1',
        config: {
          field: 'playgram_total_engagement',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'set_field',
        description: 'Update last interaction timestamp',
        config: {
          field: 'playgram_last_interaction',
          value: '{{current_datetime}}',
        },
      },
    ],
    setupInstructions: [
      '1. Add this action to ALL engagement triggers (shares, replies, comments, keywords)',
      '2. Add Action: "Set User Field"',
      '3. Select field: playgram_total_engagement',
      '4. Operation: "Increase by 1"',
      '5. Add Action: "Set User Field"',
      '6. Select field: playgram_last_interaction',
      '7. Value: {{current_datetime}}',
    ],
  },
  {
    id: 'engagement-milestone',
    name: '🏆 Engagement Milestone Rewards',
    description: 'Reward users when they hit engagement milestones (5, 10, 25, 50 interactions)',
    category: 'marketing',
    trigger: {
      type: 'story_share',
      description: 'Any engagement trigger',
    },
    customFields: [
      {
        name: 'playgram_total_engagement',
        type: 'number',
        description: 'Total engagement count',
        defaultValue: 0,
      },
      {
        name: 'playgram_milestone_5',
        type: 'boolean',
        description: 'Whether 5-engagement milestone was reached',
        defaultValue: false,
      },
      {
        name: 'playgram_milestone_10',
        type: 'boolean',
        description: 'Whether 10-engagement milestone was reached',
        defaultValue: false,
      },
      {
        name: 'playgram_milestone_25',
        type: 'boolean',
        description: 'Whether 25-engagement milestone was reached',
        defaultValue: false,
      },
      {
        name: 'playgram_milestone_50',
        type: 'boolean',
        description: 'Whether 50-engagement milestone was reached',
        defaultValue: false,
      },
    ],
    recommendedTags: [
      {
        name: 'playgram_milestone_5',
        description: 'User reached 5 engagements',
        when: 'When playgram_total_engagement reaches 5',
      },
      {
        name: 'playgram_milestone_10',
        description: 'User reached 10 engagements',
        when: 'When playgram_total_engagement reaches 10',
      },
      {
        name: 'playgram_milestone_25',
        description: 'User reached 25 engagements',
        when: 'When playgram_total_engagement reaches 25',
      },
      {
        name: 'playgram_milestone_50',
        description: 'User reached 50 engagements',
        when: 'When playgram_total_engagement reaches 50',
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase total engagement',
        config: {
          field: 'playgram_total_engagement',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'send_message',
        description: 'Send milestone reward (with conditions)',
        config: {
          conditions: [
            'playgram_total_engagement == 5 AND playgram_milestone_5 == false',
            'playgram_total_engagement == 10 AND playgram_milestone_10 == false',
            'playgram_total_engagement == 25 AND playgram_milestone_25 == false',
            'playgram_total_engagement == 50 AND playgram_milestone_50 == false',
          ],
        },
      },
    ],
    setupInstructions: [
      '1. Create playgram_total_engagement custom field (number)',
      '2. On each engagement trigger, increase playgram_total_engagement by 1',
      '3. Add conditions to check milestones:',
      '   - IF playgram_total_engagement == 5 AND user does NOT have tag playgram_milestone_5',
      '   - THEN send reward message and ADD TAG playgram_milestone_5',
      '4. Repeat for 10, 25, 50 milestones',
      '5. Consider connecting to Dynamic Gallery for visual rewards',
      'NOTE: Use tags (playgram_milestone_X) for segmentation instead of boolean fields',
    ],
  },
  {
    id: 'first-time-engagement-reward',
    name: '🎁 First Time Engagement Rewards',
    description: 'Send special rewards when users engage for the first time',
    category: 'marketing',
    trigger: {
      type: 'story_share',
      description: 'First story share, reply, or comment',
    },
    customFields: [
      {
        name: 'playgram_first_share_rewarded',
        type: 'boolean',
        description: 'Whether user received first share reward',
        defaultValue: false,
      },
      {
        name: 'playgram_first_reply_rewarded',
        type: 'boolean',
        description: 'Whether user received first reply reward',
        defaultValue: false,
      },
      {
        name: 'playgram_first_comment_rewarded',
        type: 'boolean',
        description: 'Whether user received first comment reward',
        defaultValue: false,
      },
    ],
    recommendedTags: [
      {
        name: 'playgram_first_share',
        description: 'User shared to story for the first time',
        when: 'After sending first-share reward',
      },
      {
        name: 'playgram_first_reply',
        description: 'User replied to story for the first time',
        when: 'After sending first-reply reward',
      },
      {
        name: 'playgram_first_comment',
        description: 'User commented for the first time',
        when: 'After sending first-comment reward',
      },
    ],
    actions: [
      {
        step: 1,
        type: 'send_message',
        description: 'Send first-time reward with Dynamic Gallery',
        config: {
          message: '🎉 First time sharing! Here\'s something special for you!',
          condition: 'playgram_first_share_rewarded == false',
        },
      },
      {
        step: 2,
        type: 'set_field',
        description: 'Mark as rewarded',
        config: {
          field: 'playgram_first_share_rewarded',
          value: true,
        },
      },
    ],
    setupInstructions: [
      '1. Go to each engagement trigger (share, reply, comment)',
      '2. Add Condition: IF user does NOT have tag playgram_first_X',
      '3. Add Action: Send reward message (or Dynamic Gallery content)',
      '4. Add Action: ADD TAG playgram_first_X',
      '5. This ensures reward is only sent once',
      'NOTE: Use tags instead of boolean fields for better segmentation',
    ],
  },
  {
    id: 'vip-tier-system',
    name: '👑 VIP Tier System',
    description: 'Automatically assign VIP tiers based on engagement levels',
    category: 'marketing',
    trigger: {
      type: 'story_share',
      description: 'Any engagement trigger',
    },
    customFields: [
      {
        name: 'playgram_total_engagement',
        type: 'number',
        description: 'Total engagement count',
        defaultValue: 0,
      },
      {
        name: 'playgram_vip_tier',
        type: 'text',
        description: 'Current VIP tier (bronze/silver/gold/platinum)',
      },
    ],
    recommendedTags: [
      {
        name: 'playgram_vip_bronze',
        description: 'Bronze tier VIP (5-9 engagements)',
        when: 'When playgram_total_engagement reaches 5',
      },
      {
        name: 'playgram_vip_silver',
        description: 'Silver tier VIP (10-24 engagements)',
        when: 'When playgram_total_engagement reaches 10',
      },
      {
        name: 'playgram_vip_gold',
        description: 'Gold tier VIP (25-49 engagements)',
        when: 'When playgram_total_engagement reaches 25',
      },
      {
        name: 'playgram_vip_platinum',
        description: 'Platinum tier VIP (50+ engagements)',
        when: 'When playgram_total_engagement reaches 50',
      },
    ],
    actions: [
      {
        step: 1,
        type: 'increment',
        description: 'Increase engagement',
        config: {
          field: 'playgram_total_engagement',
          operation: 'add',
          value: 1,
        },
      },
      {
        step: 2,
        type: 'set_field',
        description: 'Update VIP tier based on engagement',
        config: {
          conditions: [
            'IF playgram_total_engagement >= 50 THEN set playgram_vip_tier = platinum',
            'IF playgram_total_engagement >= 25 THEN set playgram_vip_tier = gold',
            'IF playgram_total_engagement >= 10 THEN set playgram_vip_tier = silver',
            'IF playgram_total_engagement >= 5 THEN set playgram_vip_tier = bronze',
          ],
        },
      },
    ],
    setupInstructions: [
      '1. Create playgram_vip_tier text field',
      '2. On each engagement trigger:',
      '3. Increase playgram_total_engagement',
      '4. Add conditions to update tier:',
      '   - IF >= 50: Set to "platinum"',
      '   - ELSE IF >= 25: Set to "gold"',
      '   - ELSE IF >= 10: Set to "silver"',
      '   - ELSE IF >= 5: Set to "bronze"',
      '5. Use {{playgram_vip_tier}} in messages for personalization',
    ],
  },
];

export function getCoreFlowById(id: string): CoreFlow | undefined {
  return CORE_FLOWS.find((flow) => flow.id === id);
}

export function getCoreFlowsByCategory(category: CoreFlow['category']): CoreFlow[] {
  return CORE_FLOWS.filter((flow) => flow.category === category);
}

export function getAllCustomFieldNames(): string[] {
  const fields = new Set<string>();
  CORE_FLOWS.forEach((flow) => {
    flow.customFields.forEach((field) => {
      fields.add(field.name);
    });
  });
  return Array.from(fields);
}

/**
 * Check if a custom field name is a Core Flow tracker field
 */
export function isCoreFlowField(fieldName: string): boolean {
  return fieldName.startsWith('playgram_');
}

/**
 * Get the Core Flow associated with a field name
 */
export function getCoreFlowByFieldName(fieldName: string): CoreFlow | undefined {
  return CORE_FLOWS.find((flow) =>
    flow.customFields.some((field) => field.name === fieldName)
  );
}

/**
 * Get tracker field details
 */
export function getTrackerFieldInfo(fieldName: string) {
  const flow = getCoreFlowByFieldName(fieldName);
  if (!flow) return null;

  const field = flow.customFields.find((f) => f.name === fieldName);
  return {
    flow,
    field,
    icon: flow.name.split(' ')[0], // Get emoji from flow name
  };
}

/**
 * Get all unique custom fields across all flows
 */
export function getAllCoreFlowFields() {
  const fieldsMap = new Map<string, CoreFlow['customFields'][0]>();

  CORE_FLOWS.forEach((flow) => {
    flow.customFields.forEach((field) => {
      if (!fieldsMap.has(field.name)) {
        fieldsMap.set(field.name, field);
      }
    });
  });

  return Array.from(fieldsMap.values());
}
