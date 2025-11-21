import { db } from '@/lib/db'

export interface FilteredUserData {
  ig_username?: string
  instagram_id?: string
  manychat_user_id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  profile_pic?: string
  follower_count?: number
  email?: string
  phone?: string
  custom_fields?: Record<string, any>
}

/**
 * Get user's data sharing preferences (internal helper)
 * Returns default preferences (all false except username) if none exist
 */
async function getPreferencesInternal(userId: string) {
  const preferences = await db.userDataSharingPreferences.findUnique({
    where: { userId },
  })

  // Return defaults if no preferences exist
  if (!preferences) {
    return {
      shareFirstName: false,
      shareLastName: false,
      shareFullName: false,
      shareProfilePic: false,
      shareIgUsername: true, // Username is usually safe to share
      shareFollowerCount: false,
      shareEmail: false,
      sharePhone: false,
      shareCustomFields: null,
    }
  }

  return preferences
}

/**
 * Filter user data based on their sharing preferences
 */
export async function filterUserDataForSharing(
  userId: string,
  userData: {
    firstName?: string | null
    lastName?: string | null
    profilePicUrl?: string | null
    igUsername?: string | null
    followerCount?: number | null
    manychatId?: string | null
    customFieldValues?: Array<{
      field: { name: string }
      value: string
    }>
  },
  additionalData?: {
    instagram_id?: string
    manychat_user_id?: string
    email?: string
    phone?: string
  }
): Promise<FilteredUserData> {
  const preferences = await getPreferencesInternal(userId)

  const filtered: FilteredUserData = {}

  // Always include identifiers (needed for verification)
  if (additionalData?.instagram_id) {
    filtered.instagram_id = additionalData.instagram_id
  }
  if (additionalData?.manychat_user_id || userData.manychatId) {
    filtered.manychat_user_id = additionalData?.manychat_user_id || userData.manychatId || undefined
  }

  // Apply preferences
  if (preferences.shareIgUsername && userData.igUsername) {
    filtered.ig_username = userData.igUsername
  }

  if (preferences.shareFirstName && userData.firstName) {
    filtered.first_name = userData.firstName
  }

  if (preferences.shareLastName && userData.lastName) {
    filtered.last_name = userData.lastName
  }

  if (preferences.shareFullName) {
    const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ')
    if (fullName) {
      filtered.full_name = fullName
    }
  }

  if (preferences.shareProfilePic && userData.profilePicUrl) {
    filtered.profile_pic = userData.profilePicUrl
  }

  if (preferences.shareFollowerCount && userData.followerCount !== null && userData.followerCount !== undefined) {
    filtered.follower_count = userData.followerCount
  }

  if (preferences.shareEmail && additionalData?.email) {
    filtered.email = additionalData.email
  }

  if (preferences.sharePhone && additionalData?.phone) {
    filtered.phone = additionalData.phone
  }

  // Handle custom fields
  if (userData.customFieldValues && userData.customFieldValues.length > 0) {
    const customFieldsPrefs = preferences.shareCustomFields as Record<string, boolean> | null
    const filteredCustomFields: Record<string, any> = {}

    for (const cfv of userData.customFieldValues) {
      const fieldName = cfv.field.name
      
      // If no preferences set, default to false (don't share)
      // If preferences exist, check if this field is allowed
      if (customFieldsPrefs && customFieldsPrefs[fieldName] === true) {
        filteredCustomFields[fieldName] = cfv.value
      }
    }

    if (Object.keys(filteredCustomFields).length > 0) {
      filtered.custom_fields = filteredCustomFields
    }
  }

  return filtered
}

/**
 * Update or create user data sharing preferences
 */
export async function updateUserDataSharingPreferences(
  userId: string,
  preferences: {
    shareFirstName?: boolean
    shareLastName?: boolean
    shareFullName?: boolean
    shareProfilePic?: boolean
    shareIgUsername?: boolean
    shareFollowerCount?: boolean
    shareEmail?: boolean
    sharePhone?: boolean
    shareCustomFields?: Record<string, boolean>
  }
) {
  return await db.userDataSharingPreferences.upsert({
    where: { userId },
    create: {
      userId,
      shareFirstName: preferences.shareFirstName ?? false,
      shareLastName: preferences.shareLastName ?? false,
      shareFullName: preferences.shareFullName ?? false,
      shareProfilePic: preferences.shareProfilePic ?? false,
      shareIgUsername: preferences.shareIgUsername ?? true,
      shareFollowerCount: preferences.shareFollowerCount ?? false,
      shareEmail: preferences.shareEmail ?? false,
      sharePhone: preferences.sharePhone ?? false,
      shareCustomFields: preferences.shareCustomFields ? JSON.stringify(preferences.shareCustomFields) : undefined,
    },
    update: {
      shareFirstName: preferences.shareFirstName,
      shareLastName: preferences.shareLastName,
      shareFullName: preferences.shareFullName,
      shareProfilePic: preferences.shareProfilePic,
      shareIgUsername: preferences.shareIgUsername,
      shareFollowerCount: preferences.shareFollowerCount,
      shareEmail: preferences.shareEmail,
      sharePhone: preferences.sharePhone,
      shareCustomFields: preferences.shareCustomFields ? JSON.stringify(preferences.shareCustomFields) : undefined,
    },
  })
}

/**
 * Get user's current data sharing preferences
 */
export async function getUserDataSharingPreferences(userId: string) {
  const preferences = await db.userDataSharingPreferences.findUnique({
    where: { userId },
  })

  if (!preferences) {
    // Return defaults
    return {
      shareFirstName: false,
      shareLastName: false,
      shareFullName: false,
      shareProfilePic: false,
      shareIgUsername: true,
      shareFollowerCount: false,
      shareEmail: false,
      sharePhone: false,
      shareCustomFields: null,
    }
  }

  return {
    ...preferences,
    shareCustomFields: preferences.shareCustomFields
      ? (typeof preferences.shareCustomFields === 'string'
          ? JSON.parse(preferences.shareCustomFields)
          : preferences.shareCustomFields)
      : null,
  }
}

