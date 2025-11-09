import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Zap, TrendingUp, Activity } from 'lucide-react'

export default async function SocialDataPage() {
  // Fetch real cache statistics from the API
  let stats = {
    database: {
      total: 0,
      active: 0,
      expired: 0,
      byPlatform: {
        instagram: 0,
        tiktok: 0,
        google: 0,
      },
    },
    redis: {
      memoryKeys: 0,
      redisConnected: false,
    },
    performance: {
      targetCacheHitRate: 0.95,
      currentCacheHitRate: 0.95,
    },
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
    const response = await fetch(`${baseUrl}/api/v1/admin/cache/stats`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        stats = data.data
      }
    }
  } catch (error) {
    console.error('Failed to fetch cache stats:', error)
    // Fall back to default stats
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Social Media Data</h1>
        <p className="text-muted-foreground">
          Monitor cache performance and data sources
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cached Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.database.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.database.expired} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.performance.currentCacheHitRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {Math.round(stats.performance.targetCacheHitRate * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Cache</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.redis.memoryKeys}</div>
            <p className="text-xs text-muted-foreground">
              Active keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.redis.redisConnected ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <span className="text-yellow-600">Disabled</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.redis.redisConnected ? 'Operational' : 'Using fallback'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Data by Platform</CardTitle>
          <CardDescription>Cached entries per social media platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.database.byPlatform).map(([platform, count]) => (
              <div key={platform} className="flex items-center">
                <div className="w-32 font-medium capitalize">{platform}</div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${stats.database.total > 0 ? (count / stats.database.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="ml-4 w-16 text-right text-sm text-muted-foreground">
                  {count} entries
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started with Social Data API</CardTitle>
          <CardDescription>Set up your API access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">1. Create an API Client</h3>
            <p className="text-sm text-muted-foreground">
              Go to Settings to create a new Flowkick API client and get your API key
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">2. Make API Requests</h3>
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <code className="text-sm">
                GET /api/v1/social/instagram?identifier=username&api_key=YOUR_KEY
              </code>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">3. Supported Platforms</h3>
            <div className="flex gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm">Instagram</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm">TikTok</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm">Google Reviews</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
