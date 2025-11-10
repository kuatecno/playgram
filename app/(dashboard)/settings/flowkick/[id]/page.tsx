'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Power, Trash2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { PLATFORMS } from '@/config/constants'

interface ClientStats {
  client: {
    id: string
    name: string
    tier: string
    requestLimit: number
    requestCount: number
    allowedPlatforms: string[]
    isActive: boolean
    webhookUrl: string | null
    createdAt: string
    updatedAt: string
  }
  stats: {
    usageByPlatform: Array<{
      platform: string
      requests: number
      avgResponseTime: number
    }>
    totalRequests: number
    cacheHitRate: number
    requestsThisMonth: number
    limitUtilization: number
    recentActivity: number
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [clientStats, setClientStats] = useState<ClientStats | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    webhookUrl: '',
    allowedPlatforms: [] as string[],
  })

  useEffect(() => {
    fetchClientStats()
  }, [params.id])

  const fetchClientStats = async () => {
    try {
      const response = await fetch(`/api/v1/admin/flowkick-clients/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setClientStats(data.data)
        setFormData({
          name: data.data.client.name,
          isActive: data.data.client.isActive,
          webhookUrl: data.data.client.webhookUrl || '',
          allowedPlatforms: data.data.client.allowedPlatforms,
        })
      } else if (response.status === 404) {
        toast({
          title: 'Not Found',
          description: 'Client not found',
          variant: 'destructive',
        })
        router.push('/settings/flowkick')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch client details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`/api/v1/admin/flowkick-clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Client updated successfully',
        })
        setIsEditDialogOpen(false)
        fetchClientStats()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update client',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async () => {
    if (!clientStats) return

    try {
      const response = await fetch(`/api/v1/admin/flowkick-clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !clientStats.client.isActive }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Client ${!clientStats.client.isActive ? 'activated' : 'deactivated'}`,
        })
        fetchClientStats()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.'))
      return

    try {
      const response = await fetch(`/api/v1/admin/flowkick-clients/${params.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Client deleted successfully',
        })
        router.push('/settings/flowkick')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      })
    }
  }

  const handlePlatformToggle = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedPlatforms: prev.allowedPlatforms.includes(platform)
        ? prev.allowedPlatforms.filter((p) => p !== platform)
        : [...prev.allowedPlatforms, platform],
    }))
  }

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'secondary'
      case 'starter':
        return 'default'
      case 'pro':
        return 'success'
      case 'enterprise':
        return 'warning'
      default:
        return 'default'
    }
  }

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Unlimited'
    return limit.toLocaleString()
  }

  if (loading) {
    return <div className="py-12 text-center">Loading client details...</div>
  }

  if (!clientStats) {
    return <div className="py-12 text-center">Client not found</div>
  }

  const { client, stats } = clientStats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <Badge variant={getTierBadgeVariant(client.tier)}>
                {client.tier.toUpperCase()}
              </Badge>
              <Badge variant={client.isActive ? 'success' : 'secondary'}>
                {client.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <form onSubmit={handleUpdateClient}>
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                  <DialogDescription>
                    Update client settings and configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Platforms</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(PLATFORMS).map((platform) => (
                        <div key={platform} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${platform}`}
                            checked={formData.allowedPlatforms.includes(platform)}
                            onCheckedChange={() => handlePlatformToggle(platform)}
                          />
                          <Label
                            htmlFor={`edit-${platform}`}
                            className="text-sm font-normal capitalize cursor-pointer"
                          >
                            {platform}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder="https://example.com/webhook"
                      value={formData.webhookUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, webhookUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked as boolean })
                      }
                    />
                    <Label
                      htmlFor="isActive"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Active
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleToggleActive}>
            <Power className="h-4 w-4 mr-2" />
            {client.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="outline" onClick={handleDeleteClient}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.requestsThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.limitUtilization}% of limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cacheHitRate}%</div>
            <p className="text-xs text-muted-foreground">Cost savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Platform */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Platform</CardTitle>
          <CardDescription>Requests and performance per platform</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.usageByPlatform.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No usage data yet
            </p>
          ) : (
            <div className="space-y-4">
              {stats.usageByPlatform.map((usage) => (
                <div key={usage.platform} className="flex items-center">
                  <div className="w-32 font-medium capitalize">{usage.platform}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{
                              width: `${stats.totalRequests > 0 ? (usage.requests / stats.totalRequests) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right text-sm text-muted-foreground">
                        {usage.requests.toLocaleString()} requests
                      </div>
                      <div className="w-24 text-right text-sm text-muted-foreground">
                        {usage.avgResponseTime}ms avg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Limit */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage Limit</CardTitle>
          <CardDescription>
            Current usage: {client.requestCount.toLocaleString()} /{' '}
            {formatLimit(client.requestLimit)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{stats.limitUtilization}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${stats.limitUtilization > 90 ? 'bg-red-500' : stats.limitUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(stats.limitUtilization, 100)}%` }}
              />
            </div>
            {stats.limitUtilization > 80 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {stats.limitUtilization > 90
                  ? 'Warning: Approaching monthly limit'
                  : 'Notice: Over 80% of monthly limit used'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Client Configuration</CardTitle>
          <CardDescription>Current settings and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Subscription Tier</Label>
            <p className="text-sm text-muted-foreground capitalize">{client.tier}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Allowed Platforms</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {client.allowedPlatforms.map((platform) => (
                <Badge key={platform} variant="outline" className="capitalize">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
          {client.webhookUrl && (
            <div>
              <Label className="text-sm font-medium">Webhook URL</Label>
              <p className="text-sm text-muted-foreground truncate">
                {client.webhookUrl}
              </p>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">Last Updated</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(client.updatedAt).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
