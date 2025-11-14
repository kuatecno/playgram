'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const DEFAULT_APPEARANCE = {
  width: 512,
  margin: 2,
  errorCorrectionLevel: 'H' as 'L' | 'M' | 'Q' | 'H',
  darkColor: '#000000',
  lightColor: '#FFFFFF',
}

const TOKEN_REFERENCE = [
  { token: '{{first_name}}', description: 'Contact first name' },
  { token: '{{last_name}}', description: 'Contact last name' },
  { token: '{{full_name}}', description: 'Contact full name' },
  { token: '{{igUsername}} / {{ig_username}}', description: 'Instagram username' },
  { token: '{{email}}', description: 'Email address (if synced)' },
  { token: '{{manychat_id}}', description: 'ManyChat subscriber ID' },
  { token: '{{tag:TAG_ID}}', description: 'Tag name by tag ID or ManyChat ID' },
  { token: '{{custom_field:FIELD_ID}}', description: 'Custom field value by ID' },
  { token: '{{metadata:KEY}}', description: 'Metadata key provided at generation time' },
  { token: '{{random}} / {{random:10}}', description: 'Random alphanumeric string (default length 6)' },
  { token: '{{timestamp}}', description: 'Unix timestamp (seconds)' },
  { token: '{{date}}', description: 'Current date formatted as YYYYMMDD' },
]

const AVAILABLE_QR_FIELDS = [
  { key: 'qr_code', label: 'QR Code', description: 'Resolved QR value sent to the scanner', dataType: 'text' },
  { key: 'qr_type', label: 'QR Type', description: 'promotion / validation / discount', dataType: 'text' },
  { key: 'qr_scanned_at', label: 'Scan Date/Time', description: 'ISO timestamp of the latest scan', dataType: 'datetime' },
  { key: 'qr_expires_at', label: 'Expiration Date', description: 'QR expiration timestamp', dataType: 'datetime' },
  { key: 'qr_is_valid', label: 'Is Valid', description: 'Boolean flag after scan', dataType: 'boolean' },
  { key: 'qr_label', label: 'Label', description: 'Configured label for the QR code', dataType: 'text' },
  { key: 'qr_campaign', label: 'Campaign', description: 'Campaign metadata if provided', dataType: 'text' },
  { key: 'qr_tool_name', label: 'Tool Name', description: 'Name of the QR tool', dataType: 'text' },
  { key: 'qr_created_at', label: 'Created At', description: 'Generation timestamp', dataType: 'datetime' },
  { key: 'qr_scan_count', label: 'Scan Count', description: 'Total scans recorded', dataType: 'number' },
] as const

const ERROR_CORRECTION_LEVELS = [
  { value: 'L', label: 'L (7% recovery)' },
  { value: 'M', label: 'M (15% recovery)' },
  { value: 'Q', label: 'Q (25% recovery)' },
  { value: 'H', label: 'H (30% recovery)' },
]

type QrFieldKey = (typeof AVAILABLE_QR_FIELDS)[number]['key']

type ManychatField = {
  id: string
  name: string
  type: string
}

type FieldMappingRow = {
  qrField: QrFieldKey
  manychatFieldId: string
  manychatFieldName: string
  enabled: boolean
}

type Tool = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
}

type QrToolSettings = {
  qrFormat: string
  qrAppearance: typeof DEFAULT_APPEARANCE
  fallbackUrl: string | null
  securityPolicy: Record<string, unknown>
}

type QrStats = {
  total: number
  totalScans: number
  recentScans: number
  byType: Array<{ type: string; count: number; scans: number }>
}

type QrCodeListItem = {
  id: string
  qrType: string
  metadata: Record<string, any>
  createdAt: string
  scanCount: number
  expiresAt: string | null
}

export default function QrToolConfigPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const toolId = params.toolId as string

  const [loading, setLoading] = useState(true)
  const [tool, setTool] = useState<Tool | null>(null)
  const [stats, setStats] = useState<QrStats | null>(null)
  const [recentCodes, setRecentCodes] = useState<QrCodeListItem[]>([])

  const [formatPattern, setFormatPattern] = useState('')
  const [formatPreview, setFormatPreview] = useState('')
  const [previewingFormat, setPreviewingFormat] = useState(false)
  const [metadataDraft, setMetadataDraft] = useState<string>('{}')
  const [formatSaving, setFormatSaving] = useState(false)

  const [appearance, setAppearance] = useState<typeof DEFAULT_APPEARANCE>(DEFAULT_APPEARANCE)
  const [appearanceSaving, setAppearanceSaving] = useState(false)

  const [fallbackUrl, setFallbackUrl] = useState<string>('')
  const [securityPolicyInput, setSecurityPolicyInput] = useState<string>('{}')
  const [configSaving, setConfigSaving] = useState(false)

  const [manychatConnected, setManychatConnected] = useState(false)
  const [manychatFields, setManychatFields] = useState<ManychatField[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMappingRow[]>([])
  const [fieldMappingsSaving, setFieldMappingsSaving] = useState(false)
  const [loadingManychat, setLoadingManychat] = useState(false)

  const [activityLoading, setActivityLoading] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const appearancePreviewStyle = useMemo(
    () => ({
      background: appearance.lightColor,
      color: appearance.darkColor,
    }),
    [appearance.lightColor, appearance.darkColor]
  )

  useEffect(() => {
    if (toolId) {
      initializePage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId])

  async function initializePage() {
    setLoading(true)
    try {
      // Load tool data
      const toolRes = await fetch(`/api/v1/tools/qr/${toolId}`)
      const toolData = await toolRes.json()

      if (!toolRes.ok || !toolData.success) {
        throw new Error('Tool not found')
      }

      setTool(toolData.data.tool)

      await Promise.all([
        loadStats(),
        loadRecentCodes(),
        loadToolSettings(),
        loadManychatStatus(),
      ])
    } catch (error) {
      console.error('Failed to load QR tool:', error)
      toast({
        title: 'Failed to load tool',
        description: 'Tool not found or access denied.',
        variant: 'destructive',
      })
      router.push('/engagement/qr-tools')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    const res = await fetch(`/api/v1/qr/stats?toolId=${toolId}`)
    const data = await res.json()
    if (data.success) {
      setStats(data.data)
    }
  }

  async function loadRecentCodes() {
    setActivityLoading(true)
    try {
      const res = await fetch(`/api/v1/qr?toolId=${toolId}&limit=10`)
      const data = await res.json()
      if (data.success) {
        setRecentCodes(
          (data.data?.qrCodes || []).map((item: any) => ({
            id: item.id,
            qrType: item.qrType,
            metadata: item.metadata || {},
            createdAt: item.createdAt,
            scanCount: item.scanCount,
            expiresAt: item.expiresAt,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load recent QR codes:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  async function loadToolSettings() {
    const res = await fetch(`/api/v1/qr/tool-settings?toolId=${toolId}`)
    const data = await res.json()
    if (data.success) {
      const settings: QrToolSettings = {
        qrFormat: data.data.qrFormat || '',
        qrAppearance: data.data.qrAppearance || DEFAULT_APPEARANCE,
        fallbackUrl: data.data.fallbackUrl || '',
        securityPolicy: data.data.securityPolicy || {},
      }

      setFormatPattern(settings.qrFormat)
      setAppearance({ ...DEFAULT_APPEARANCE, ...settings.qrAppearance })
      setFallbackUrl(settings.fallbackUrl || '')
      setSecurityPolicyInput(JSON.stringify(settings.securityPolicy || {}, null, 2))
    }
  }

  async function loadManychatStatus() {
    try {
      setLoadingManychat(true)
      const configRes = await fetch('/api/v1/manychat/config')
      const configData = await configRes.json()
      const connected = !!(configData.success && configData.data?.isConnected)
      setManychatConnected(connected)

      if (connected) {
        await Promise.all([loadManychatFields(), loadFieldMappings()])
      } else {
        setManychatFields([])
        setFieldMappings([])
      }
    } catch (error) {
      console.error('Failed to load ManyChat status:', error)
    } finally {
      setLoadingManychat(false)
    }
  }

  async function loadManychatFields() {
    try {
      const res = await fetch('/api/v1/manychat/fields')
      const data = await res.json()
      if (data.success) {
        setManychatFields(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load ManyChat fields:', error)
    }
  }

  async function loadFieldMappings() {
    try {
      const res = await fetch(`/api/v1/qr/field-mapping?toolId=${toolId}`)
      const data = await res.json()
      if (data.success) {
        const config = data.data?.config
        if (config) {
          setFieldMappings(config.mappings || [])
        }
      }
    } catch (error) {
      console.error('Failed to load field mappings:', error)
    }
  }

  async function handlePreviewFormat() {
    if (!formatPattern.trim()) {
      setFormatPreview('')
      return
    }

    setPreviewingFormat(true)
    try {
      let metadataPayload: Record<string, unknown> | undefined
      if (metadataDraft.trim()) {
        try {
          metadataPayload = JSON.parse(metadataDraft)
        } catch (error) {
          toast({
            title: 'Invalid metadata JSON',
            description: 'Please provide valid JSON before previewing.',
            variant: 'destructive',
          })
          return
        }
      }

      const res = await fetch('/api/v1/qr/format-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          pattern: formatPattern,
          metadata: metadataPayload,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFormatPreview(data.data.preview)
      } else {
        toast({
          title: 'Preview failed',
          description: data.error || 'Could not generate preview',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Preview failed',
        description: 'An unexpected error occurred while generating a preview.',
        variant: 'destructive',
      })
    } finally {
      setPreviewingFormat(false)
    }
  }

  async function handleSaveFormat() {
    setFormatSaving(true)
    try {
      const res = await fetch('/api/v1/qr/tool-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          qrFormat: formatPattern.trim() || null,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Format saved', description: 'QR format pattern updated.' })
      } else {
        throw new Error(data.error || 'Failed to save format')
      }
    } catch (error) {
      toast({
        title: 'Failed to save format',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setFormatSaving(false)
    }
  }

  async function handleSaveAppearance() {
    setAppearanceSaving(true)
    try {
      const res = await fetch('/api/v1/qr/tool-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          qrAppearance: appearance,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Appearance saved', description: 'Default QR appearance updated.' })
      } else {
        throw new Error(data.error || 'Failed to save appearance')
      }
    } catch (error) {
      toast({
        title: 'Failed to save appearance',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAppearanceSaving(false)
    }
  }

  async function handleSaveConfig() {
    setConfigSaving(true)
    try {
      let parsedPolicy: Record<string, unknown> = {}
      if (securityPolicyInput.trim()) {
        try {
          parsedPolicy = JSON.parse(securityPolicyInput)
        } catch (error) {
          toast({
            title: 'Invalid security policy JSON',
            description: 'Please provide valid JSON before saving.',
            variant: 'destructive',
          })
          return
        }
      }

      const res = await fetch('/api/v1/qr/tool-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          fallbackUrl: fallbackUrl.trim() || null,
          securityPolicy: parsedPolicy,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Configuration saved', description: 'Fallback URL & security updated.' })
      } else {
        throw new Error(data.error || 'Failed to save configuration')
      }
    } catch (error) {
      toast({
        title: 'Failed to save configuration',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleSaveFieldMappings() {
    setFieldMappingsSaving(true)
    try {
      const res = await fetch('/api/v1/qr/field-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          mappings: fieldMappings,
          autoSyncOnScan: fieldMappings.some((mapping) => mapping.enabled),
          autoSyncOnValidation: false,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Field mappings saved', description: 'ManyChat sync settings updated.' })
      } else {
        throw new Error(data.error || 'Failed to save field mappings')
      }
    } catch (error) {
      toast({
        title: 'Failed to save field mappings',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setFieldMappingsSaving(false)
    }
  }

  function updateFieldMapping(qrField: QrFieldKey, partial: Partial<FieldMappingRow>) {
    setFieldMappings((prev) => {
      const next = [...prev]
      const index = next.findIndex((item) => item.qrField === qrField)
      if (index === -1) {
        next.push({ qrField, manychatFieldId: '', manychatFieldName: '', enabled: false, ...partial })
      } else {
        next[index] = { ...next[index], ...partial }
      }
      return next
    })
  }

  async function handleDeleteTool() {
    if (!tool) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/tools/qr/${toolId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: 'Tool deleted',
          description: 'The QR tool has been permanently deleted.',
        })
        router.push('/engagement/qr-tools')
      } else {
        throw new Error(data.error || 'Failed to delete tool')
      }
    } catch (error) {
      toast({
        title: 'Failed to delete tool',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const connectedLabel = manychatConnected ? (
    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Connected
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
      <Sparkles className="mr-1 h-3.5 w-3.5" /> Not connected
    </Badge>
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Tool not found</h1>
        <p className="text-muted-foreground">This QR tool doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Button asChild>
          <Link href="/engagement/qr-tools">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="mt-1">
            <Link href="/engagement/qr-tools">
              <ArrowLeft className="mr-2 h-4 w-4" /> All Tools
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold leading-none tracking-tight">{tool.name}</h1>
              {!tool.isActive && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {tool.description && (
              <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete QR Tool</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{tool.name}&quot;? This will permanently delete all QR codes and configuration associated with this tool. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTool} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total QR Codes</CardTitle>
            <CardDescription>Generated for this tool</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Scans</CardTitle>
            <CardDescription>Lifetime scans</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.totalScans ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scans (30d)</CardTitle>
            <CardDescription>Recent engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.recentScans ?? 0}</p>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="format" className="space-y-6">
        <TabsList>
          <TabsTrigger value="format">Format & Tokens</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security & Routing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="format" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Format pattern</CardTitle>
              <CardDescription>
                Compose deterministic QR values using contact fields, tags, metadata, random strings, and timestamps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="formatPattern">Format pattern</Label>
                <Textarea
                  id="formatPattern"
                  rows={4}
                  placeholder="PROMO-{{first_name}}-{{random:6}}"
                  value={formatPattern}
                  onChange={(event) => setFormatPattern(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tokens are replaced at generation time. Leave blank to automatically generate random values.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="metadataDraft">Optional metadata (JSON)</Label>
                  <Textarea
                    id="metadataDraft"
                    rows={4}
                    value={metadataDraft}
                    onChange={(event) => setMetadataDraft(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide sample metadata keys for previewing {'{{metadata:key}}'} tokens.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="rounded-md border bg-muted p-3 font-mono text-sm">
                    {formatPreview ? formatPreview : 'Run a preview to visualize the resolved value.'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handlePreviewFormat} disabled={previewingFormat}>
                  {previewingFormat ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Preview pattern
                </Button>
                <Button onClick={handleSaveFormat} disabled={formatSaving}>
                  {formatSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save format
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token reference</CardTitle>
              <CardDescription>Supported tokens for composing QR values.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {TOKEN_REFERENCE.map((token) => (
                  <div key={token.token} className="rounded-lg border p-3">
                    <p className="font-mono text-sm font-medium">{token.token}</p>
                    <p className="text-xs text-muted-foreground">{token.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QR appearance</CardTitle>
              <CardDescription>
                Configure the default rendering options for generated QR image data URLs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qrWidth">Width (px)</Label>
                  <Input
                    id="qrWidth"
                    type="number"
                    min={128}
                    max={1024}
                    value={appearance.width}
                    onChange={(event) =>
                      setAppearance((prev) => ({ ...prev, width: Number(event.target.value) || prev.width }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qrMargin">Margin (modules)</Label>
                  <Input
                    id="qrMargin"
                    type="number"
                    min={0}
                    max={10}
                    value={appearance.margin}
                    onChange={(event) =>
                      setAppearance((prev) => ({ ...prev, margin: Number(event.target.value) || prev.margin }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="darkColor">Dark color</Label>
                  <Input
                    id="darkColor"
                    type="color"
                    value={appearance.darkColor}
                    onChange={(event) => setAppearance((prev) => ({ ...prev, darkColor: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lightColor">Light color</Label>
                  <Input
                    id="lightColor"
                    type="color"
                    value={appearance.lightColor}
                    onChange={(event) => setAppearance((prev) => ({ ...prev, lightColor: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="errorCorrection">Error correction</Label>
                  <select
                    id="errorCorrection"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={appearance.errorCorrectionLevel}
                    onChange={(event) =>
                      setAppearance((prev) => ({
                        ...prev,
                        errorCorrectionLevel: event.target.value as typeof prev.errorCorrectionLevel,
                      }))
                    }
                  >
                    {ERROR_CORRECTION_LEVELS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>Preview swatch</Label>
                <div
                  className="mt-2 flex h-24 w-full items-center justify-center rounded border text-sm font-medium"
                  style={appearancePreviewStyle}
                >
                  QR colors preview
                </div>
              </div>

              <Button onClick={handleSaveAppearance} disabled={appearanceSaving}>
                {appearanceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save appearance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>ManyChat integration</CardTitle>
                <CardDescription>Sync dynamic QR data back into ManyChat custom fields.</CardDescription>
              </div>
              {connectedLabel}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  Manage your ManyChat tokens under{' '}
                  <Link href="/settings/manychat" className="font-medium underline">
                    Settings → ManyChat
                  </Link>
                  . Once connected, you can map QR data to existing custom fields here.
                </p>
              </div>

              {loadingManychat ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading ManyChat data...
                </div>
              ) : manychatConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Field mapping</h3>
                    <Button size="sm" variant="outline" onClick={loadManychatStatus}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Refresh fields
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">QR field</th>
                          <th className="px-4 py-3 font-medium">ManyChat field</th>
                          <th className="px-4 py-3 font-medium">Sync</th>
                        </tr>
                      </thead>
                      <tbody>
                        {AVAILABLE_QR_FIELDS.map((field) => {
                          const mapping = fieldMappings.find((item) => item.qrField === field.key)
                          return (
                            <tr key={field.key} className="border-t">
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium">{field.label}</div>
                                <div className="text-xs text-muted-foreground">{field.description}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <select
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                  value={mapping?.manychatFieldId || ''}
                                  onChange={(event) =>
                                    updateFieldMapping(field.key, {
                                      manychatFieldId: event.target.value,
                                      manychatFieldName:
                                        manychatFields.find((f) => f.id === event.target.value)?.name || '',
                                    })
                                  }
                                >
                                  <option value="">Do not sync</option>
                                  {manychatFields.map((manychatField) => (
                                    <option key={manychatField.id} value={manychatField.id}>
                                      {manychatField.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={mapping?.enabled || false}
                                    onCheckedChange={(checked) =>
                                      updateFieldMapping(field.key, { enabled: checked })
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">Enable sync</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Button onClick={handleSaveFieldMappings} disabled={fieldMappingsSaving}>
                    {fieldMappingsSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save mappings
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Connect ManyChat to enable automated QR sync to subscriber fields.</p>
                  <Button asChild size="sm">
                    <Link href="/settings/manychat">
                      <Upload className="mr-2 h-4 w-4" /> Connect ManyChat
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fallback & security</CardTitle>
              <CardDescription>
                Control where scans are routed and enforce issuance rules before a QR is generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fallbackUrl">Fallback URL</Label>
                <Input
                  id="fallbackUrl"
                  placeholder="https://example.com/qr-landing"
                  value={fallbackUrl}
                  onChange={(event) => setFallbackUrl(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  When provided, Playgram will redirect scans to this URL with <code>?code=...</code> appended.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityPolicy">Security policy (JSON)</Label>
                <Textarea
                  id="securityPolicy"
                  rows={8}
                  value={securityPolicyInput}
                  onChange={(event) => setSecurityPolicyInput(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Define tag requirements, throttling windows, or any custom policy flags consumed by downstream services.
                </p>
              </div>

              <Button onClick={handleSaveConfig} disabled={configSaving}>
                {configSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent QR codes</CardTitle>
              <CardDescription>Latest codes generated with this tool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
                </div>
              ) : recentCodes.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Generate a QR code to see activity populate here.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCodes.map((code) => (
                    <div key={code.id} className="flex flex-col gap-1 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase">{code.qrType}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(code.createdAt), { addSuffix: true })}
                          {code.expiresAt ? ` • expires ${formatDistanceToNow(new Date(code.expiresAt), { addSuffix: true })}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                        <div>Scans: {code.scanCount}</div>
                        {code.metadata?.label && <div>Label: {code.metadata.label}</div>}
                        {code.metadata?.campaign && <div>Campaign: {code.metadata.campaign}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadRecentCodes}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
