'use client'

import { useState, useEffect } from 'react'
import { Plus, Copy, Check, Trash2, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { FLOWKICK_TIERS, PLATFORMS } from '@/config/constants'

interface FlowkickClient {
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

interface NewClientResponse {
  success: boolean
  data: {
    client: FlowkickClient
    apiKey: string
    message: string
  }
}

export default function FlowkickClientsPage() {
  const [clients, setClients] = useState<FlowkickClient[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tier: 'free',
    webhookUrl: '',
    allowedPlatforms: ['instagram', 'tiktok', 'google'],
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/v1/admin/flowkick-clients')
      const data = await response.json()

      if (data.success) {
        setClients(data.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/v1/admin/flowkick-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data: NewClientResponse = await response.json()

      if (data.success) {
        setNewApiKey(data.data.apiKey)
        setClients([data.data.client, ...clients])
        toast({
          title: 'Success',
          description: 'API client created successfully',
        })
        // Reset form
        setFormData({
          name: '',
          tier: 'free',
          webhookUrl: '',
          allowedPlatforms: ['instagram', 'tiktok', 'google'],
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create client',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      })
    }
  }

  const handleCopyApiKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    })
  }

  const handleToggleActive = async (clientId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/admin/flowkick-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setClients(
          clients.map((c) =>
            c.id === clientId ? { ...c, isActive: !currentStatus } : c
          )
        )
        toast({
          title: 'Success',
          description: `Client ${!currentStatus ? 'activated' : 'deactivated'}`,
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

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const response = await fetch(`/api/v1/admin/flowkick-clients/${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setClients(clients.filter((c) => c.id !== clientId))
        toast({
          title: 'Success',
          description: 'Client deleted successfully',
        })
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

  const getUsagePercentage = (count: number, limit: number) => {
    if (limit === -1) return 0
    return Math.round((count / limit) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Flowkick API Clients</h1>
          <p className="text-muted-foreground">
            Manage your social data API clients and access keys
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setNewApiKey(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            {newApiKey ? (
              // Show API key after creation
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Save this API key securely. It will not be shown again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>Your API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input value={newApiKey} readOnly className="font-mono text-sm" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyApiKey(newApiKey)}
                    >
                      {copiedKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      setNewApiKey(null)
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              // Create client form
              <form onSubmit={handleCreateClient}>
                <DialogHeader>
                  <DialogTitle>Create New API Client</DialogTitle>
                  <DialogDescription>
                    Create a new Flowkick API client to access social data endpoints
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name</Label>
                    <Input
                      id="name"
                      placeholder="My App"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tier">Subscription Tier</Label>
                    <Select
                      value={formData.tier}
                      onValueChange={(value) =>
                        setFormData({ ...formData, tier: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FLOWKICK_TIERS).map(([key, config]) => (
                          <SelectItem key={key} value={config.name}>
                            {key} - {formatLimit(config.requestLimit)}/month - $
                            {config.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Platforms</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(PLATFORMS).map((platform) => (
                        <div key={platform} className="flex items-center space-x-2">
                          <Checkbox
                            id={platform}
                            checked={formData.allowedPlatforms.includes(platform)}
                            onCheckedChange={() => handlePlatformToggle(platform)}
                          />
                          <Label
                            htmlFor={platform}
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
                </div>
                <DialogFooter>
                  <Button type="submit">Create Client</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients List */}
      {loading ? (
        <div className="text-center py-12">Loading clients...</div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No API clients yet. Create your first client to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{client.name}</CardTitle>
                      <Badge variant={getTierBadgeVariant(client.tier)}>
                        {client.tier.toUpperCase()}
                      </Badge>
                      <Badge variant={client.isActive ? 'success' : 'secondary'}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created {new Date(client.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(client.id, client.isActive)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Usage This Month</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${getUsagePercentage(
                              client.requestCount,
                              client.requestLimit
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {client.requestCount.toLocaleString()} /{' '}
                        {formatLimit(client.requestLimit)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Allowed Platforms</p>
                    <div className="flex flex-wrap gap-1">
                      {client.allowedPlatforms.map((platform) => (
                        <Badge key={platform} variant="outline">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {client.webhookUrl && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium mb-1">Webhook URL</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {client.webhookUrl}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>How to use your Flowkick API client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in requests using either header or query parameter:
            </p>
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800 space-y-2">
              <code className="text-sm block">
                Header: X-API-Key: YOUR_API_KEY
              </code>
              <code className="text-sm block">
                Query: ?api_key=YOUR_API_KEY
              </code>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Example Request</h3>
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <code className="text-sm block">
                GET /api/v1/social/instagram?identifier=username&api_key=YOUR_KEY
              </code>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Supported Endpoints</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• /api/v1/social/instagram - Instagram profile data</li>
              <li>• /api/v1/social/tiktok - TikTok profile data</li>
              <li>• /api/v1/social/google - Google Reviews data</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
