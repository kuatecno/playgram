'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, MessageSquare, Users, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ManychatConfig {
  id: string
  pageName: string | null
  isConnected: boolean
  createdAt: string
  updatedAt: string
}

export default function ManychatSettingsPage() {
  const [config, setConfig] = useState<ManychatConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState<'contacts' | 'tags' | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    apiToken: '',
    pageToken: '',
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/v1/manychat/config')
      const data = await response.json()

      if (data.success && data.data) {
        setConfig(data.data)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.apiToken) {
      toast({
        title: 'Error',
        description: 'API token is required',
        variant: 'destructive',
      })
      return
    }

    setTesting(true)

    try {
      const response = await fetch('/api/v1/manychat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: formData.apiToken }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Connection successful! You can now save the configuration.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Connection test failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!formData.apiToken) {
      toast({
        title: 'Error',
        description: 'API token is required',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/v1/manychat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setConfig(data.data)
        setFormData({ apiToken: '', pageToken: '' })
        toast({
          title: 'Success',
          description: 'Manychat connected successfully',
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
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/v1/manychat/config', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setConfig(null)
        toast({
          title: 'Success',
          description: 'Manychat disconnected successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect',
        variant: 'destructive',
      })
    }
  }

  const handleSyncContacts = async () => {
    setSyncing('contacts')

    try {
      const response = await fetch('/api/v1/manychat/sync/contacts', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message || 'Contacts synced successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to sync contacts',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync contacts',
        variant: 'destructive',
      })
    } finally {
      setSyncing(null)
    }
  }

  const handleSyncTags = async () => {
    setSyncing('tags')

    try {
      const response = await fetch('/api/v1/manychat/sync/tags', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message || 'Tags synced successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to sync tags',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync tags',
        variant: 'destructive',
      })
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manychat Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manychat Settings</h1>
        <p className="text-muted-foreground">
          Connect and manage your Manychat integration
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                {config?.isConnected
                  ? 'Your Manychat account is connected'
                  : 'Connect your Manychat account to sync contacts and tags'}
              </CardDescription>
            </div>
            {config?.isConnected ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardHeader>
        {config?.isConnected && (
          <CardContent>
            <div className="space-y-4">
              {config.pageName && (
                <div>
                  <Label className="text-sm text-muted-foreground">Page Name</Label>
                  <p className="font-medium">{config.pageName}</p>
                </div>
              )}
              <div>
                <Label className="text-sm text-muted-foreground">Last Updated</Label>
                <p className="text-sm">{new Date(config.updatedAt).toLocaleString()}</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Disconnect Manychat
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disconnect Manychat?</DialogTitle>
                    <DialogDescription>
                      This will disconnect your Manychat account. You can reconnect at any time.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={(e) => {
                      e.preventDefault()
                      const dialog = e.currentTarget.closest('[role="dialog"]')
                      dialog?.querySelector('[data-state]')?.dispatchEvent(new Event('click'))
                    }}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect}>
                      Disconnect
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Configuration Form (if not connected) */}
      {!config?.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Manychat</CardTitle>
            <CardDescription>
              Enter your Manychat API credentials to connect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token *</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Your Manychat API token"
                value={formData.apiToken}
                onChange={(e) =>
                  setFormData({ ...formData, apiToken: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Get your API token from Manychat Settings → API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageToken">Page Token (Optional)</Label>
              <Input
                id="pageToken"
                type="password"
                placeholder="Your Facebook page token"
                value={formData.pageToken}
                onChange={(e) =>
                  setFormData({ ...formData, pageToken: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Optional: Required for advanced features
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testing || !formData.apiToken}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button onClick={handleSaveConfig} disabled={!formData.apiToken}>
                Save & Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Actions (if connected) */}
      {config?.isConnected && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Sync Contacts</CardTitle>
              </div>
              <CardDescription>
                Import contacts from Manychat to your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncContacts}
                disabled={syncing === 'contacts'}
                className="w-full"
              >
                {syncing === 'contacts' ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Contacts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Sync Tags</CardTitle>
              </div>
              <CardDescription>
                Import tags from Manychat to your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncTags}
                disabled={syncing === 'tags'}
                className="w-full"
              >
                {syncing === 'tags' ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Tags
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>How to Get Your API Token</CardTitle>
          </div>
          <CardDescription>Follow these steps to connect Manychat</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm text-muted-foreground">
            <li>Log in to your Manychat account</li>
            <li>Go to Settings → API in the left sidebar</li>
            <li>Click "Generate new token" or copy your existing token</li>
            <li>Paste the token in the field above</li>
            <li>Click "Test Connection" to verify</li>
            <li>Click "Save & Connect" to complete the setup</li>
          </ol>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">What gets synced?</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Subscriber information (name, Instagram username, profile pic)</li>
              <li>• Tags assigned to subscribers</li>
              <li>• Custom field values</li>
              <li>• Interaction history</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
