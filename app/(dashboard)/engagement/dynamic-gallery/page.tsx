'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Copy, Check, Link as LinkIcon, Webhook, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface GalleryButton {
  title: string
  type: 'link' | 'flow' | 'call'
  url: string
}

interface GalleryCard {
  id: string
  imageUrl: string
  title: string
  subtitle: string
  buttons: GalleryButton[]
}

interface SyncLog {
  id: string
  triggeredBy: 'manual' | 'webhook' | 'schedule'
  status: 'success' | 'warning' | 'error'
  updatedCards: number
  contactsImpacted: number
  createdAt: string
}

const sampleCards: GalleryCard[] = [
  {
    id: 'card-1',
    imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
    title: 'Truffle Mushroom Pizza',
    subtitle: 'Hand-tossed · 12" · Ready in 15 min',
    buttons: [
      { title: 'Order now', type: 'link', url: 'https://example.com/order' },
      { title: 'View details', type: 'link', url: 'https://example.com/menu/pizza' },
    ],
  },
  {
    id: 'card-2',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    title: 'Fresh Berry Bowl',
    subtitle: 'Seasonal fruit · Vegan',
    buttons: [
      { title: 'See nutrition', type: 'link', url: 'https://example.com/menu/bowl' },
    ],
  },
  {
    id: 'card-3',
    imageUrl: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800',
    title: 'Iced Matcha Latte',
    subtitle: 'Oat milk · Unsweetened option',
    buttons: [
      { title: 'Order pickup', type: 'link', url: 'https://example.com/order/matcha' },
      { title: 'Add to favorites', type: 'link', url: 'https://example.com/favorites' },
    ],
  },
]

const sampleLogs: SyncLog[] = [
  {
    id: 'sync-003',
    triggeredBy: 'webhook',
    status: 'success',
    updatedCards: 6,
    contactsImpacted: 142,
    createdAt: '2025-11-12T22:15:00Z',
  },
  {
    id: 'sync-002',
    triggeredBy: 'manual',
    status: 'warning',
    updatedCards: 4,
    contactsImpacted: 98,
    createdAt: '2025-11-10T18:42:00Z',
  },
  {
    id: 'sync-001',
    triggeredBy: 'schedule',
    status: 'success',
    updatedCards: 5,
    contactsImpacted: 135,
    createdAt: '2025-11-09T09:00:00Z',
  },
]

const TRIGGER_LABELS: Record<SyncLog['triggeredBy'], string> = {
  manual: 'Manual sync',
  webhook: 'Webhook',
  schedule: 'Scheduled',
}

const STATUS_VARIANTS: Record<SyncLog['status'], { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  success: { label: 'Success', variant: 'success' },
  warning: { label: 'Needs review', variant: 'secondary' },
  error: { label: 'Failed', variant: 'destructive' },
}

export default function DynamicGalleryPage() {
  const { toast } = useToast()
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const webhookUrl = 'https://playgram.app/api/webhooks/dynamic-gallery/your-tool-token'

  const fieldPreview = useMemo(
    () =>
      sampleCards.slice(0, 3).map((card, index) => (
        `playgram_gallery_${index + 1}_title: ${card.title}`
      )),
    []
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
          <Button variant="outline" className="gap-2">
            <Database className="h-4 w-4" /> Connect data source
          </Button>
          <Button className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sync now
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
                <div className="space-y-3">
                  {sampleCards.map((card, index) => (
                    <div
                      key={card.id}
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
                          {card.buttons.map((button) => (
                            <Button key={button.title} variant="outline" size="sm" className="gap-2">
                              <LinkIcon className="h-3.5 w-3.5" />
                              {button.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  onCheckedChange={setAutoSyncEnabled}
                />
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Next scheduled sync: <span className="font-medium text-foreground">Tomorrow · 6:00am</span>
              </div>
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
              <Button variant="outline" size="sm" className="gap-2">
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
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
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
              {sampleLogs.map((log) => {
                const statusMeta = STATUS_VARIANTS[log.status]
                return (
                  <tr key={log.id} className="bg-card">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                      {log.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Badge variant="outline">{TRIGGER_LABELS[log.triggeredBy]}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">{log.updatedCards}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">{log.contactsImpacted}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
