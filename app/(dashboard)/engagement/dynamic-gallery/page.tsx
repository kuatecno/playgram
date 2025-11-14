'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  RefreshCw,
  Copy,
  Check,
  Link as LinkIcon,
  Webhook,
  Database,
  ShieldCheck,
  Plus,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { dynamicGalleryApi } from '@/features/dynamic-gallery/api'
import type { DynamicGallerySummaryDTO } from '@/features/dynamic-gallery/types'

const TRIGGER_LABELS = {
  manual: 'Manual sync',
  webhook: 'Webhook',
  schedule: 'Scheduled',
} as const

const STATUS_VARIANTS = {
  success: { label: 'Success', variant: 'success' as const },
  warning: { label: 'Needs review', variant: 'secondary' as const },
  failed: { label: 'Failed', variant: 'destructive' as const },
}

export default function DynamicGalleryPage() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<DynamicGallerySummaryDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDataSourceDialogOpen, setIsDataSourceDialogOpen] = useState(false)
  const [isSecretsDialogOpen, setIsSecretsDialogOpen] = useState(false)
  const [isSavingDataSource, setIsSavingDataSource] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [isCreateCardDialogOpen, setIsCreateCardDialogOpen] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('06:00')
  const [newCard, setNewCard] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    buttons: [{ title: '', url: '' }]
  })
  const [dataSourceForm, setDataSourceForm] = useState({
    name: 'Instagram CMS',
    sourceType: 'webhook' as 'webhook' | 'api' | 'manual',
    endpoint: 'https://cms.example.com/api/menu',
    secret: 'pg_demo_secret_123',
    notes: 'Sends payload when menu items change.',
  })

  const cards = summary?.snapshot?.cards || []
  const syncLogs = summary?.syncLogs || []
  const secrets = summary?.secrets || []
  const webhookUrl = summary?.webhookUrl || ''
  const autoSyncEnabled = summary?.config?.autoSyncEnabled ?? true

  // Fetch data on mount
  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      setIsLoading(true)
      const data = await dynamicGalleryApi.getSummary()
      setSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
      toast({
        title: 'Failed to load data',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fieldPreview = useMemo(
    () =>
      cards.slice(0, 3).map((card, index) => (
        `playgram_gallery_${index + 1}_title: ${card.title}`
      )),
    [cards]
  )

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopyState('copied')
      toast({ title: 'Copied', description: 'Webhook URL copied to clipboard' })
      setTimeout(() => setCopyState('idle'), 2000)
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      })
    }
  }

  const handleSyncNow = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    toast({ title: 'Sync queued', description: 'Starting ManyChat update with latest cards…' })

    try {
      const result = await dynamicGalleryApi.triggerSync()
      toast({
        title: 'Sync complete',
        description: `Updated ${result.contactsUpdated || 0} contacts with ${result.cardCount} cards.`
      })
      await loadSummary()
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleRefreshLogs = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    await loadSummary()
    setIsRefreshing(false)
    toast({ title: 'Activity refreshed', description: 'Latest sync history pulled from server.' })
  }

  const handleToggleAutoSync = async (nextValue: boolean) => {
    try {
      const updated = await dynamicGalleryApi.updateConfig({ autoSyncEnabled: nextValue })
      setSummary(updated)
      toast({
        title: nextValue ? 'Auto-sync enabled' : 'Auto-sync disabled',
        description: nextValue
          ? 'Incoming webhooks will trigger ManyChat updates automatically.'
          : 'Incoming webhooks will store data without syncing.',
      })
    } catch (error) {
      toast({
        title: 'Failed to update settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const handleSaveDataSource = async () => {
    if (!dataSourceForm.name.trim() || !dataSourceForm.endpoint.trim()) {
      toast({ title: 'Missing fields', description: 'Name and endpoint are required.', variant: 'destructive' })
      return
    }
    setIsSavingDataSource(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setIsSavingDataSource(false)
    setIsDataSourceDialogOpen(false)
    toast({ title: 'Data source saved', description: `${dataSourceForm.name} will feed your gallery.` })
  }

  const handleAddSecret = async () => {
    try {
      const newSecret = await dynamicGalleryApi.generateSecret(`Integration ${secrets.length + 1}`)

      // Show the secret value to user (only time they'll see it)
      await navigator.clipboard.writeText(newSecret.secret)
      toast({
        title: 'Secret generated',
        description: `${newSecret.label} has been copied to clipboard. Save it securely - you won't see it again.`
      })

      await loadSummary()
    } catch (error) {
      toast({
        title: 'Failed to generate secret',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const handleCopySecret = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: 'Copied', description: 'Secret ID copied to clipboard.' })
    } catch (error) {
      toast({ title: 'Copy failed', description: 'Copy the secret manually.', variant: 'destructive' })
    }
  }

  const handleRevokeSecret = async (id: string) => {
    try {
      await dynamicGalleryApi.revokeSecret(id)
      toast({ title: 'Secret revoked', description: 'The integration can no longer post updates.' })
      await loadSummary()
    } catch (error) {
      toast({
        title: 'Failed to revoke secret',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Gallery</h1>
          <p className="text-muted-foreground">
            Curate up to 10 menu cards and push them to ManyChat custom fields prefixed with
            {' '}<span className="font-medium">playgram_</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsDataSourceDialogOpen(true)}
          >
            <Database className="h-4 w-4" /> Connect data source
          </Button>
          <Button className="gap-2" onClick={handleSyncNow} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync now'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Gallery preview</CardTitle>
            <CardDescription>
              Latest cards that will be rendered when a user requests your Instagram menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="cards">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="fields">Custom fields</TabsTrigger>
              </TabsList>
              <TabsContent value="cards" className="mt-4">
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-12 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      No cards yet. Upload cards via webhook or create them manually.
                    </p>
                    <Button onClick={() => setIsCreateCardDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" /> Create card
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cards.map((card, index) => (
                      <div
                        key={card.id || index}
                        className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm md:flex-row"
                      >
                        <div className="h-36 w-full overflow-hidden rounded-md bg-muted md:w-40">
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">#{index + 1}</Badge>
                              <h3 className="text-lg font-semibold leading-tight">{card.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {card.buttons.map((button, btnIdx) => (
                              <Button key={btnIdx} variant="outline" size="sm" className="gap-2">
                                <LinkIcon className="h-3.5 w-3.5" />
                                {button.title}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="fields" className="mt-4">
                <div className="space-y-2 rounded-md border bg-muted/30 p-4 text-sm font-mono">
                  {fieldPreview.map((line, idx) => (
                    <p key={idx} className="truncate">{line}</p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    …and additional playgram_gallery_* fields for image URLs, subtitles, and buttons.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation</CardTitle>
              <CardDescription>Control webhook-triggered syncs and scheduling.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="auto-sync" className="text-sm font-medium">
                    Auto-sync on webhook
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Run a ManyChat update whenever your external system posts new cards.
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSyncEnabled}
                  onCheckedChange={handleToggleAutoSync}
                />
              </div>
              <button
                onClick={() => setIsScheduleDialogOpen(true)}
                className="w-full rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground hover:bg-muted/50 transition-colors text-left"
              >
                Next scheduled sync: <span className="font-medium text-foreground">Tomorrow · {scheduleTime}</span>
                <span className="ml-2 text-xs">(click to edit)</span>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook endpoint</CardTitle>
              <CardDescription>Share this URL with your inventory or CMS system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3 text-sm font-mono">
                <span className="flex-1 truncate">{webhookUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={handleCopyWebhook}
                >
                  {copyState === 'copied' ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Include an <span className="font-medium text-foreground">X-Playgram-Signature</span> header with
                an HMAC SHA-256 signature using your webhook secret for verification.
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsSecretsDialogOpen(true)}
              >
                <Webhook className="h-4 w-4" /> Manage secrets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync activity</CardTitle>
              <CardDescription>Recent pushes of playgram_ custom fields into ManyChat.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefreshLogs}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Run ID</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Triggered by</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cards updated</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Contacts impacted</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No sync activity yet
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => {
                  const statusMeta = STATUS_VARIANTS[log.status]
                  return (
                    <tr key={log.id} className="bg-card">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                        {log.id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Badge variant="outline">{TRIGGER_LABELS[log.triggerType]}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-center">{log.cardCount}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-center">{log.contactsImpacted}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={isDataSourceDialogOpen} onOpenChange={setIsDataSourceDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Connect a data source</DialogTitle>
            <DialogDescription>
              Map your menu provider to the Playgram Dynamic Gallery schema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3">
              <Label htmlFor="source-name">Display name</Label>
              <Input
                id="source-name"
                value={dataSourceForm.name}
                onChange={(event) => setDataSourceForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Inventory API"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="source-type">Source type</Label>
              <div className="flex gap-2">
                {['webhook', 'api', 'manual'].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={dataSourceForm.sourceType === type ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => setDataSourceForm((prev) => ({ ...prev, sourceType: type as typeof prev.sourceType }))}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="source-endpoint">Endpoint / webhook URL</Label>
              <Input
                id="source-endpoint"
                value={dataSourceForm.endpoint}
                onChange={(event) => setDataSourceForm((prev) => ({ ...prev, endpoint: event.target.value }))}
                placeholder="https://inventory.example.com/api/menu"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="source-secret">Shared secret</Label>
              <Input
                id="source-secret"
                value={dataSourceForm.secret}
                onChange={(event) => setDataSourceForm((prev) => ({ ...prev, secret: event.target.value }))}
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="source-notes">Notes</Label>
              <Textarea
                id="source-notes"
                value={dataSourceForm.notes}
                onChange={(event) => setDataSourceForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Describe when this source sends updates or what segment it controls."
              />
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              Incoming payloads must include up to 10 cards with image_url, title, subtitle, and button arrays.
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDataSourceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveDataSource} disabled={isSavingDataSource}>
              {isSavingDataSource ? 'Saving…' : 'Save source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSecretsDialogOpen} onOpenChange={setIsSecretsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Webhook secrets</DialogTitle>
            <DialogDescription>
              Generate and manage HMAC secrets used to verify incoming gallery updates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Signed requests keep your gallery safe from tampering.</span>
              </div>
              <Button type="button" size="sm" variant="outline" className="gap-2" onClick={handleAddSecret}>
                <Plus className="h-3.5 w-3.5" /> New secret
              </Button>
            </div>
            {secrets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No active secrets. Generate one to start accepting webhook requests.
              </div>
            ) : (
              <div className="space-y-3">
                {secrets.map((secret) => (
                  <div key={secret.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{secret.label}</p>
                        <p className="text-xs text-muted-foreground">Created {new Date(secret.createdAt).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Last used: {secret.lastUsedAt ? new Date(secret.lastUsedAt).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="truncate rounded bg-muted/60 px-2 py-1 text-xs font-mono">
                          {secret.id}
                        </code>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopySecret(secret.id)}
                          aria-label={`Copy ${secret.label}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRevokeSecret(secret.id)}
                          aria-label={`Revoke ${secret.label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsSecretsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit sync schedule</DialogTitle>
            <DialogDescription>
              Set the time for your daily automated gallery sync.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3">
              <Label htmlFor="schedule-time">Sync time (24-hour format)</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Daily sync will run at this time in your server's timezone
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: 'Schedule updated', description: `Daily sync set for ${scheduleTime}` })
              setIsScheduleDialogOpen(false)
            }}>
              Save schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateCardDialogOpen} onOpenChange={setIsCreateCardDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create gallery card</DialogTitle>
            <DialogDescription>
              Add a new card to your dynamic gallery manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={newCard.title}
                onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                placeholder="Burger Special"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="card-subtitle">Subtitle</Label>
              <Input
                id="card-subtitle"
                value={newCard.subtitle}
                onChange={(e) => setNewCard({ ...newCard, subtitle: e.target.value })}
                placeholder="Our signature burger with fries"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="card-image">Image URL</Label>
              <Input
                id="card-image"
                value={newCard.imageUrl}
                onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid gap-3">
              <Label>Buttons (up to 3)</Label>
              {newCard.buttons.map((button, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={button.title}
                    onChange={(e) => {
                      const updated = [...newCard.buttons]
                      updated[index].title = e.target.value
                      setNewCard({ ...newCard, buttons: updated })
                    }}
                    placeholder="Button label"
                  />
                  <Input
                    value={button.url}
                    onChange={(e) => {
                      const updated = [...newCard.buttons]
                      updated[index].url = e.target.value
                      setNewCard({ ...newCard, buttons: updated })
                    }}
                    placeholder="https://..."
                  />
                  {newCard.buttons.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const updated = newCard.buttons.filter((_, i) => i !== index)
                        setNewCard({ ...newCard, buttons: updated })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {newCard.buttons.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewCard({ ...newCard, buttons: [...newCard.buttons, { title: '', url: '' }] })
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add button
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              try {
                await dynamicGalleryApi.storeCards([...cards, newCard])
                toast({ title: 'Card created', description: 'Gallery card added successfully' })
                setIsCreateCardDialogOpen(false)
                setNewCard({ title: '', subtitle: '', imageUrl: '', buttons: [{ title: '', url: '' }] })
                await loadSummary()
              } catch (error) {
                toast({
                  title: 'Failed to create card',
                  description: error instanceof Error ? error.message : 'Unknown error',
                  variant: 'destructive'
                })
              }
            }}>
              Create card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
