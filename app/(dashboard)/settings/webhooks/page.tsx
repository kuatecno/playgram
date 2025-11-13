'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Webhook, Plus, Trash2, TestTube, Copy, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  isActive: boolean
  stats: {
    totalDeliveries: number
    successCount: number
    failedCount: number
    successRate: number
  }
  lastDelivery: {
    event: string
    status: string
    timestamp: string
  } | null
  createdAt: string
}

const AVAILABLE_EVENTS = [
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'booking.created', label: 'Booking Created' },
  { value: 'booking.updated', label: 'Booking Updated' },
  { value: 'booking.cancelled', label: 'Booking Cancelled' },
  { value: 'qr.created', label: 'QR Created' },
  { value: 'qr.scanned', label: 'QR Scanned' },
  { value: 'qr.validated', label: 'QR Validated' },
  { value: 'tag.added', label: 'Tag Added' },
  { value: 'tag.removed', label: 'Tag Removed' },
  { value: '*', label: 'All Events' },
]

export default function WebhooksPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [secretDialogOpen, setSecretDialogOpen] = useState(false)
  const [newWebhookSecret, setNewWebhookSecret] = useState('')
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
  })

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/webhooks')
      const data = await response.json()

      if (data.success) {
        setWebhooks(data.data.webhooks)
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWebhook = async () => {
    if (!formData.url || formData.events.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // Show secret to user (only shown once!)
        setNewWebhookSecret(data.data.webhook.secret)
        setSecretDialogOpen(true)

        setCreateDialogOpen(false)
        setFormData({ url: '', events: [] })
        fetchWebhooks()
      } else {
        alert(`Error: ${data.error || 'Failed to create webhook'}`)
      }
    } catch (error) {
      console.error('Error creating webhook:', error)
      alert('Failed to create webhook')
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/webhooks/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        fetchWebhooks()
      } else {
        alert(`Error: ${data.error || 'Failed to delete webhook'}`)
      }
    } catch (error) {
      console.error('Error deleting webhook:', error)
      alert('Failed to delete webhook')
    }
  }

  const handleTestWebhook = async (id: string) => {
    setTestingWebhookId(id)

    try {
      const response = await fetch(`/api/v1/webhooks/${id}/test`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        alert(`Test webhook sent successfully! Status: ${data.data.result.statusCode}, Duration: ${data.data.result.durationMs}ms`)
      } else {
        alert(`Test failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error testing webhook:', error)
      alert('Failed to send test webhook')
    } finally {
      setTestingWebhookId(null)
    }
  }

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }))
  }

  const copySecret = () => {
    navigator.clipboard.writeText(newWebhookSecret)
    alert('Secret copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook endpoints and CRM integrations
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading webhooks...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook endpoints and CRM integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/settings/webhooks/deliveries')}>
            <FileText className="mr-2 h-4 w-4" />
            View Delivery Logs
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Webhooks allow you to send real-time data to external systems (CRMs, analytics platforms, etc.)
          when events occur in Playgram. Each webhook receives an HMAC-SHA256 signature for verification.
        </AlertDescription>
      </Alert>

      {webhooks.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <CardTitle>No Webhooks Configured</CardTitle>
            </div>
            <CardDescription>
              Get started by creating your first webhook endpoint
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{webhook.url}</CardTitle>
                      <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {webhook.events.length} event(s) subscribed
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={testingWebhookId === webhook.id}
                    >
                      <TestTube className="mr-2 h-4 w-4" />
                      {testingWebhookId === webhook.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Subscribed Events</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 rounded-lg border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Deliveries</p>
                      <p className="text-2xl font-bold">{webhook.stats.totalDeliveries}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Successful</p>
                      <p className="text-2xl font-bold text-green-600">{webhook.stats.successCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{webhook.stats.failedCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{webhook.stats.successRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  {webhook.lastDelivery && (
                    <div className="rounded-lg border p-3">
                      <Label className="text-sm font-medium">Last Delivery</Label>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm">Event: <Badge variant="outline">{webhook.lastDelivery.event}</Badge></p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(webhook.lastDelivery.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={webhook.lastDelivery.status === 'success' ? 'default' : 'destructive'}>
                          {webhook.lastDelivery.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Webhook Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Add a new webhook endpoint to receive real-time events
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Webhook URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-crm.com/webhooks/playgram"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The endpoint that will receive POST requests with event data
              </p>
            </div>

            <div>
              <Label>Events to Subscribe *</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <div
                    key={event.value}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      formData.events.includes(event.value)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleEvent(event.value)}
                  >
                    <div className={`h-4 w-4 rounded border ${
                      formData.events.includes(event.value)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}>
                      {formData.events.includes(event.value) && (
                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm">{event.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWebhook}>
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret Display Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Created Successfully!</DialogTitle>
            <DialogDescription>
              Save this secret key securely. You will not see it again.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Use this secret to verify webhook signatures using HMAC-SHA256
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Secret Key</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={newWebhookSecret}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copySecret}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setSecretDialogOpen(false)}>
              I have saved the secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
