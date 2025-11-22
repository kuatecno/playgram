'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  TrendingUp,
  CheckCircle2,
  Gift,
  Loader2,
  Coffee,
  Star,
  Zap,
} from 'lucide-react'

interface ProgressData {
  currentStreak: number
  totalScans: number
  rewardsEarned: number
  nextRewardIn: number | null
  lastScanAt: string | null
  isActive: boolean
  campaignName?: string
  rewardThreshold?: number
  codePrefix?: string
}

export default function CustomerProgressPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const toolId = params.toolId as string
  const userId = searchParams.get('userId')
  const manychatId = searchParams.get('manychatId')

  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (toolId && (userId || manychatId)) {
      loadProgress()
    } else {
      setError('Missing required parameters')
      setLoading(false)
    }
  }, [toolId, userId, manychatId])

  async function loadProgress() {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      if (userId) queryParams.set('userId', userId)
      if (manychatId) queryParams.set('manychatId', manychatId)

      const res = await fetch(`/api/v1/qr/campaigns/${toolId}/progress?${queryParams}`)
      const data = await res.json()

      if (data.success) {
        setProgress(data.data)
      } else {
        setError(data.error || 'Failed to load progress')
      }
    } catch (err) {
      console.error('Error loading progress:', err)
      setError('Failed to load your progress')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <p className="text-muted-foreground">Loading your progress...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-red-100 p-4 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Progress</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={loadProgress} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progressPercentage = progress.rewardThreshold && progress.nextRewardIn !== null
    ? (progress.currentStreak / (progress.currentStreak + progress.nextRewardIn)) * 100
    : 0

  const isRewardReady = progress.nextRewardIn === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-md mx-auto space-y-4 py-8">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coffee className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              {progress.campaignName || 'Fidelity Card'}
            </h1>
          </div>
          <p className="text-muted-foreground">Track your rewards progress</p>
        </div>

        {/* Main Progress Card */}
        <Card className="border-2 border-purple-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <CardTitle className="text-2xl">Your Progress</CardTitle>
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </div>
            <CardDescription>
              {isRewardReady
                ? 'Reward ready to claim!'
                : progress.nextRewardIn !== null
                ? `${progress.nextRewardIn} more to your next reward`
                : 'Keep collecting to earn rewards'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Streak Display */}
            <div className="text-center">
              <div className="inline-flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-bold text-purple-600">
                  {progress.currentStreak}
                </span>
                {progress.rewardThreshold && progress.nextRewardIn !== null && (
                  <span className="text-3xl font-semibold text-gray-400">
                    /{progress.currentStreak + progress.nextRewardIn}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>

            {/* Progress Bar */}
            {progress.nextRewardIn !== null && (
              <div className="space-y-2">
                <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-6 rounded-full transition-all duration-500 ${
                      isRewardReady
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse'
                        : 'bg-gradient-to-r from-purple-500 to-blue-500'
                    }`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-md">
                      {isRewardReady ? 'REWARD READY!' : `${Math.round(progressPercentage)}%`}
                    </span>
                  </div>
                </div>

                {isRewardReady && (
                  <div className="rounded-lg bg-yellow-50 border-2 border-yellow-400 p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <Gift className="h-8 w-8 text-yellow-600" />
                      <div>
                        <div className="font-bold text-yellow-900">Reward Available!</div>
                        <div className="text-sm text-yellow-700">
                          Show this to claim your reward
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isRewardReady && progress.nextRewardIn !== null && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{progress.nextRewardIn} more scans to reward</span>
                  </div>
                )}
              </div>
            )}

            {/* Stamp-style Progress Indicators */}
            {progress.rewardThreshold && (
              <div className="grid grid-cols-7 gap-2 pt-4">
                {Array.from({ length: progress.rewardThreshold }).map((_, index) => {
                  const isStamped = index < progress.currentStreak
                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${
                        isStamped
                          ? 'border-purple-500 bg-purple-100'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {isStamped ? (
                        <CheckCircle2 className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Coffee className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-blue-100 p-3 mb-3">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-600">{progress.totalScans}</div>
                <p className="text-sm text-muted-foreground mt-1">Total Scans</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-yellow-100 p-3 mb-3">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-600">{progress.rewardsEarned}</div>
                <p className="text-sm text-muted-foreground mt-1">Rewards Earned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Activity */}
        {progress.lastScanAt && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Activity</span>
                <Badge variant="outline">
                  {new Date(progress.lastScanAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refresh Button */}
        <Button onClick={loadProgress} variant="outline" className="w-full">
          Refresh Progress
        </Button>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Powered by Playgram
          </p>
        </div>
      </div>
    </div>
  )
}
