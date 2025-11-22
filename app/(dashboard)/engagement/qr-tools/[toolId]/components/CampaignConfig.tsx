'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trophy, RefreshCw, Users, TrendingUp } from 'lucide-react'

interface CampaignConfigProps {
  toolId: string
}

export default function CampaignConfig({ toolId }: CampaignConfigProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Campaign configuration state
  const [isRecurring, setIsRecurring] = useState(false)
  const [rewardThreshold, setRewardThreshold] = useState('7')
  const [maxCodesPerUser, setMaxCodesPerUser] = useState('')
  const [autoResetOnReward, setAutoResetOnReward] = useState(true)
  const [startingStreak, setStartingStreak] = useState('0')
  const [codePrefix, setCodePrefix] = useState('REWARD')
  const [rewardTags, setRewardTags] = useState('')
  const [rewardMessage, setRewardMessage] = useState('')

  useEffect(() => {
    loadConfig()
  }, [toolId])

  async function loadConfig() {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/qr/campaigns/${toolId}/config`)
      const data = await res.json()

      if (data.success) {
        setIsRecurring(data.data.isRecurring || false)
        setRewardThreshold(data.data.rewardThreshold?.toString() || '7')
        setMaxCodesPerUser(data.data.maxCodesPerUser?.toString() || '')
        setAutoResetOnReward(data.data.autoResetOnReward ?? true)
        setStartingStreak(data.data.startingStreak?.toString() || '0')
        setCodePrefix(data.data.recurringConfig?.codePrefix || 'REWARD')
        setRewardTags(data.data.recurringConfig?.rewardActions?.addTags?.join(', ') || '')
        setRewardMessage(data.data.recurringConfig?.rewardActions?.sendMessage || '')
      }
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      setLoadingStats(true)
      const res = await fetch(`/api/v1/qr/campaigns/${toolId}/stats`)
      const data = await res.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)

      const config = {
        isRecurring,
        rewardThreshold: rewardThreshold ? parseInt(rewardThreshold) : null,
        maxCodesPerUser: maxCodesPerUser ? parseInt(maxCodesPerUser) : null,
        autoResetOnReward,
        startingStreak: startingStreak ? parseInt(startingStreak) : 0,
        recurringConfig: {
          codePrefix: codePrefix || 'REWARD',
          rewardActions: {
            addTags: rewardTags
              ? rewardTags.split(',').map((t) => t.trim()).filter(Boolean)
              : [],
            sendMessage: rewardMessage || undefined,
          },
        },
      }

      const res = await fetch(`/api/v1/qr/campaigns/${toolId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Campaign configuration saved',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save configuration',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Campaign */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recurring Campaign</CardTitle>
              <CardDescription>
                Enable fidelity card mode where each scan generates a new QR code
              </CardDescription>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        </CardHeader>
      </Card>

      {isRecurring && (
        <>
          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>Configure how the recurring campaign works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reward Threshold */}
              <div className="space-y-2">
                <Label htmlFor="rewardThreshold">
                  Scans Required for Reward
                  <span className="ml-2 text-xs text-muted-foreground">(e.g., 7 for coffee card)</span>
                </Label>
                <Input
                  id="rewardThreshold"
                  type="number"
                  min="1"
                  value={rewardThreshold}
                  onChange={(e) => setRewardThreshold(e.target.value)}
                  placeholder="7"
                />
                <p className="text-sm text-muted-foreground">
                  After this many scans, the user earns a reward
                </p>
              </div>

              {/* Starting Progress */}
              <div className="space-y-2">
                <Label htmlFor="startingStreak">
                  Starting Progress
                  <span className="ml-2 text-xs text-muted-foreground">(for users joining from other promos)</span>
                </Label>
                <Input
                  id="startingStreak"
                  type="number"
                  min="0"
                  value={startingStreak}
                  onChange={(e) => setStartingStreak(e.target.value)}
                  placeholder="0"
                />
                <p className="text-sm text-muted-foreground">
                  New users will start with this many scans already counted (e.g., 3 if they earned coffees elsewhere)
                </p>
              </div>

              {/* Max Codes Per User */}
              <div className="space-y-2">
                <Label htmlFor="maxCodes">
                  Max Codes Per User
                  <span className="ml-2 text-xs text-muted-foreground">(leave empty for unlimited)</span>
                </Label>
                <Input
                  id="maxCodes"
                  type="number"
                  min="1"
                  value={maxCodesPerUser}
                  onChange={(e) => setMaxCodesPerUser(e.target.value)}
                  placeholder="Unlimited"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum total scans allowed per user (empty = infinite)
                </p>
              </div>

              {/* Auto Reset */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Reset Progress</Label>
                  <p className="text-sm text-muted-foreground">
                    Reset streak to 0 after earning a reward
                  </p>
                </div>
                <Switch checked={autoResetOnReward} onCheckedChange={setAutoResetOnReward} />
              </div>

              {/* Code Prefix */}
              <div className="space-y-2">
                <Label htmlFor="codePrefix">
                  QR Code Prefix
                  <span className="ml-2 text-xs text-muted-foreground">(e.g., COFFEE, REWARD)</span>
                </Label>
                <Input
                  id="codePrefix"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  placeholder="REWARD"
                />
                <p className="text-sm text-muted-foreground">
                  Codes will be generated as: {codePrefix || 'REWARD'}-ABC123XYZ
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reward Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Reward Actions</CardTitle>
              <CardDescription>
                What happens when a user earns a reward
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ManyChat Tags */}
              <div className="space-y-2">
                <Label htmlFor="rewardTags">
                  Add ManyChat Tags
                  <span className="ml-2 text-xs text-muted-foreground">(comma-separated tag IDs)</span>
                </Label>
                <Input
                  id="rewardTags"
                  value={rewardTags}
                  onChange={(e) => setRewardTags(e.target.value)}
                  placeholder="free_coffee, vip_customer, loyalty_gold"
                />
                <p className="text-sm text-muted-foreground">
                  These ManyChat tags will be added when user earns a reward
                </p>
              </div>

              {/* Reward Message */}
              <div className="space-y-2">
                <Label htmlFor="rewardMessage">
                  Reward Message
                  <span className="ml-2 text-xs text-muted-foreground">(sent to user)</span>
                </Label>
                <Textarea
                  id="rewardMessage"
                  value={rewardMessage}
                  onChange={(e) => setRewardMessage(e.target.value)}
                  placeholder="🎉 Congratulations! You've earned a free coffee!"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Message sent to user when they earn a reward
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Campaign Settings
            </Button>
          </div>

          {/* Campaign Statistics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Statistics</CardTitle>
                  <CardDescription>Real-time campaign performance metrics</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats}>
                  {loadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {stats && (
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Participants</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeUsers} active (30d)
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>Total Scans</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalScans}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.averageScansPerUser} avg/user
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                      <span>Rewards Earned</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalRewards}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalParticipants > 0
                        ? ((stats.totalRewards / stats.totalParticipants) * 100).toFixed(1)
                        : 0}
                      % redemption
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Conversion</div>
                    <div className="text-2xl font-bold">
                      {stats.totalScans > 0
                        ? ((stats.totalRewards / stats.totalScans) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground">Scan to reward ratio</p>
                  </div>
                </div>

                {/* Top Participants */}
                {stats.topParticipants && stats.topParticipants.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Top Participants</h4>
                    <div className="space-y-2">
                      {stats.topParticipants.slice(0, 5).map((participant: any, index: number) => (
                        <div
                          key={participant.userId}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <div>
                              <div className="font-medium">{participant.userName}</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.totalScans} scans · {participant.rewardsEarned} rewards
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Streak: {participant.currentStreak}/{rewardThreshold}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
            {!stats && (
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click refresh to load campaign statistics
                </p>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
