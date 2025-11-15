'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const DEFAULT_APPEARANCE = {
  width: 512,
  margin: 2,
  errorCorrectionLevel: 'H' as 'L' | 'M' | 'Q' | 'H',
  darkColor: '#000000',
  lightColor: '#FFFFFF',
}

const PATTERN_TEMPLATES = [
  { name: 'Simple Promotion', pattern: 'PROMO-{{random:8}}', description: 'Random promotional code' },
  { name: 'Personalized Discount', pattern: 'DISC-{{first_name}}-{{random:6}}', description: 'User-specific discount' },
  { name: 'Event Check-in', pattern: 'EVENT-{{igUsername}}-{{timestamp}}', description: 'Time-stamped event entry' },
  { name: 'VIP Access', pattern: 'VIP-{{manychat_id}}-{{date}}', description: 'Date-based VIP code' },
]

const TOKEN_CATEGORIES = {
  'User Info': [
    { token: '{{first_name}}', description: 'Contact first name', example: 'John' },
    { token: '{{last_name}}', description: 'Contact last name', example: 'Doe' },
    { token: '{{full_name}}', description: 'Contact full name', example: 'John Doe' },
    { token: '{{igUsername}}', description: 'Instagram username', example: '@johndoe' },
    { token: '{{email}}', description: 'Email address (if synced)', example: 'john@example.com' },
    { token: '{{manychat_id}}', description: 'ManyChat subscriber ID', example: '123456789' },
  ],
  'System Values': [
    { token: '{{random}}', description: 'Random 6-char string', example: 'aB3x9Z' },
    { token: '{{random:10}}', description: 'Random 10-char string', example: 'aB3x9ZpQm2' },
    { token: '{{timestamp}}', description: 'Unix timestamp (seconds)', example: '1699564800' },
    { token: '{{date}}', description: 'Current date YYYYMMDD', example: '20241113' },
  ],
}

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

type ExtendedQrFieldKey = QrFieldKey | 'validation_status'

type SyncTimingOption = 'none' | 'sent' | 'validated_success' | 'validated_failed' | 'validation_all'

const CORE_VALIDATION_FIELD: {
  key: ExtendedQrFieldKey
  label: string
  description: string
  dataType: string
} = {
  key: 'validation_status',
  label: 'Validation status (core)',
  description: 'Status or failure reason resolved after validation events',
  dataType: 'text',
}

const FIELD_MAPPING_ROWS = [CORE_VALIDATION_FIELD, ...AVAILABLE_QR_FIELDS]

const SYNC_TIMING_OPTIONS: { value: SyncTimingOption; label: string }[] = [
  { value: 'none', label: 'Do not sync' },
  { value: 'sent', label: 'On send' },
  { value: 'validated_success', label: 'On validation — success' },
  { value: 'validated_failed', label: 'On validation — failed' },
  { value: 'validation_all', label: 'On both validations' },
]

const CREATE_FIELD_OPTION = '__create_field__'

type ManychatFieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean'

type ManychatField = {
  id: string
  name: string
  type: string
  description?: string
}

type FieldMappingRow = {
  qrField: ExtendedQrFieldKey
  manychatFieldId: string
  manychatFieldName: string
  enabled: boolean
  syncTiming: SyncTimingOption
}

function normalizeFieldMappings(rawMappings: any[]): FieldMappingRow[] {
  if (!Array.isArray(rawMappings)) {
    return []
  }

  const deduped = new Map<ExtendedQrFieldKey, FieldMappingRow>()

  rawMappings.forEach((mapping: any) => {
    const qrField = (mapping?.qrField as ExtendedQrFieldKey) || 'qr_code'
    const manychatFieldId = mapping?.manychatFieldId || ''
    const syncTiming =
      (mapping?.syncTiming as SyncTimingOption) || (mapping?.enabled ? 'validation_all' : 'none') || 'none'

    deduped.set(qrField, {
      qrField,
      manychatFieldId,
      manychatFieldName: mapping?.manychatFieldName || '',
      syncTiming,
      enabled: Boolean(manychatFieldId && syncTiming !== 'none'),
    })
  })

  return Array.from(deduped.values())
}

type Tool = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
}

type User = {
  id: string
  firstName: string | null
  lastName: string | null
  igUsername: string | null
  manychatId: string | null
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

type QRValidationOutcome = 'sent' | 'validated_success' | 'validated_failed'
type QRFailureReason = 'wrong_person' | 'expired' | 'already_used' | 'other'

type OutcomeFieldMapping = {
  id: string
  outcome: QRValidationOutcome
  failureReason?: QRFailureReason
  manychatFieldId: string
  manychatFieldName: string
  value: string
  enabled: boolean
}

type OutcomeTagConfig = {
  id: string
  outcome: QRValidationOutcome
  failureReason?: QRFailureReason
  tagIds: string[]
  tagNames: string[]
  action: 'add' | 'remove'
  enabled: boolean
}

type ManychatTag = {
  id: string
  name: string
}

export default function QrToolConfigPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const toolId = params.toolId as string

  const [webhookUrl, setWebhookUrl] = useState('')

  const [loading, setLoading] = useState(true)
  const [tool, setTool] = useState<Tool | null>(null)
  const [stats, setStats] = useState<QrStats | null>(null)
  const [recentCodes, setRecentCodes] = useState<QrCodeListItem[]>([])

  const [formatPattern, setFormatPattern] = useState('')
  const [formatPreview, setFormatPreview] = useState('')
  const [previewingFormat, setPreviewingFormat] = useState(false)
  const [formatSaving, setFormatSaving] = useState(false)
  const formatTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [customFields, setCustomFields] = useState<ManychatField[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [appearance, setAppearance] = useState<typeof DEFAULT_APPEARANCE>(DEFAULT_APPEARANCE)
  const [appearanceSaving, setAppearanceSaving] = useState(false)

  const [fallbackUrl, setFallbackUrl] = useState<string>('')
  const [securityPolicyInput, setSecurityPolicyInput] = useState<string>('{}')
  const [configSaving, setConfigSaving] = useState(false)

  const [manychatConnected, setManychatConnected] = useState(false)
  const [manychatFields, setManychatFields] = useState<ManychatField[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMappingRow[]>(() => normalizeFieldMappings([]))
  const [fieldMappingsSaving, setFieldMappingsSaving] = useState(false)
  const [loadingManychat, setLoadingManychat] = useState(false)

  const [_manychatTags, setManychatTags] = useState<ManychatTag[]>([]) // Reserved for future tag UI
  const [outcomeFieldMappings, setOutcomeFieldMappings] = useState<OutcomeFieldMapping[]>([])
  const [outcomeTagConfigs, setOutcomeTagConfigs] = useState<OutcomeTagConfig[]>([])
  const [outcomeConfigSaving, setOutcomeConfigSaving] = useState(false)

  const [pendingFieldRow, setPendingFieldRow] = useState<ExtendedQrFieldKey | null>(null)

  const [activityLoading, setActivityLoading] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Create custom field dialog
  const [showCreateFieldDialog, setShowCreateFieldDialog] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<ManychatFieldType>('text')
  const [newFieldDescription, setNewFieldDescription] = useState('')
  const [creatingField, setCreatingField] = useState(false)

  // Create tag dialog
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)

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

  useEffect(() => {
    loadUsersAndFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadUsersAndFields() {
    setLoadingUsers(true)
    try {
      // Load users for preview
      const usersRes = await fetch('/api/v1/users/manychat-contacts?limit=20')
      const usersData = await usersRes.json()
      if (usersData.success) {
        const loadedUsers = (usersData.data?.contacts || []).map((c: any) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          igUsername: c.igUsername,
          manychatId: c.manychatId,
        }))
        setUsers(loadedUsers)
        if (loadedUsers.length > 0) {
          setSelectedUserId(loadedUsers[0].id)
        }
      }

      // Tags API not available yet - would load tags here
      // const tagsRes = await fetch('/api/v1/tags')
      // const tagsData = await tagsRes.json()
      // if (tagsData.success) {
      //   setTags(tagsData.data || [])
      // }

      // Load custom fields for field selector
      const fieldsRes = await fetch('/api/v1/manychat/fields')
      const fieldsData = await fieldsRes.json()
      if (fieldsData.success) {
        setCustomFields(fieldsData.data || [])
      }
    } catch (error) {
      console.error('Failed to load users/fields:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

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

      // Set webhook URL
      const baseUrl = window.location.origin
      setWebhookUrl(`${baseUrl}/api/v1/webhooks/qr-validate`)

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
        await Promise.all([
          loadManychatFields(),
          loadManychatTags(),
          loadFieldMappings(),
          loadOutcomeMappings(),
        ])
      } else {
        setManychatFields([])
        setManychatTags([])
        setFieldMappings([])
        setOutcomeFieldMappings([])
        setOutcomeTagConfigs([])
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

  async function loadManychatTags() {
    try {
      const res = await fetch('/api/v1/manychat/tags')
      const data = await res.json()
      if (data.success) {
        setManychatTags(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load ManyChat tags:', error)
    }
  }

  async function loadOutcomeMappings() {
    try {
      const res = await fetch(`/api/v1/qr/field-mapping?toolId=${toolId}`)
      const data = await res.json()
      if (data.success) {
        const config = data.data?.config
        if (config) {
          // Load outcome field mappings
          const outcomeFields = (config.outcomeFieldMappings || []).map((m: any, idx: number) => ({
            id: `${idx}`,
            ...m,
          }))
          setOutcomeFieldMappings(outcomeFields)

          // Load outcome tag configs
          const outcomeTags = (config.outcomeTagConfigs || []).map((t: any, idx: number) => ({
            id: `${idx}`,
            ...t,
          }))
          setOutcomeTagConfigs(outcomeTags)
        }
      }
    } catch (error) {
      console.error('Failed to load outcome mappings:', error)
    }
  }

  function insertToken(token: string) {
    const textarea = formatTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formatPattern

    const before = text.substring(0, start)
    const after = text.substring(end)
    const newText = before + token + after

    setFormatPattern(newText)

    // Set cursor position after inserted token
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + token.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  async function handlePreviewFormat() {
    if (!formatPattern.trim()) {
      setFormatPreview('')
      return
    }

    setPreviewingFormat(true)
    try {
      const res = await fetch('/api/v1/qr/format-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          pattern: formatPattern,
          userId: selectedUserId || undefined,
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

  async function handleSaveOutcomeConfig() {
    setOutcomeConfigSaving(true)
    try {
      // Get existing config first
      const existingRes = await fetch(`/api/v1/qr/field-mapping?toolId=${toolId}`)
      const existingData = await existingRes.json()
      const existingConfig = existingData.success ? existingData.data?.config : {}

      const res = await fetch('/api/v1/qr/field-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          mappings: existingConfig?.mappings || [],
          autoSyncOnScan: existingConfig?.autoSyncOnScan || false,
          autoSyncOnValidation: existingConfig?.autoSyncOnValidation || false,
          outcomeFieldMappings: outcomeFieldMappings.map(({ id, ...rest }) => rest),
          outcomeTagConfigs: outcomeTagConfigs.map(({ id, ...rest }) => rest),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Outcome configuration saved', description: 'Conditional mappings and tags updated.' })
      } else {
        throw new Error(data.error || 'Failed to save outcome configuration')
      }
    } catch (error) {
      toast({
        title: 'Failed to save outcome configuration',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setOutcomeConfigSaving(false)
    }
  }

  function updateFieldMapping(qrField: ExtendedQrFieldKey, partial: Partial<FieldMappingRow>) {
    setFieldMappings((prev) => {
      const next = [...prev]
      const index = next.findIndex((item) => item.qrField === qrField)
      if (index === -1) {
        next.push({
          qrField,
          manychatFieldId: '',
          manychatFieldName: '',
          enabled: false,
          syncTiming: 'none',
          ...partial,
        })
      } else {
        next[index] = { ...next[index], ...partial }
      }
      return next
    })
  }

  function addOutcomeFieldMapping() {
    const newMapping: OutcomeFieldMapping = {
      id: Date.now().toString(),
      outcome: 'validated_success',
      manychatFieldId: '',
      manychatFieldName: '',
      value: '',
      enabled: true,
    }
    setOutcomeFieldMappings((prev) => [...prev, newMapping])
  }

  function updateOutcomeFieldMapping(id: string, partial: Partial<OutcomeFieldMapping>) {
    setOutcomeFieldMappings((prev) =>
      prev.map((mapping) => (mapping.id === id ? { ...mapping, ...partial } : mapping))
    )
  }

  function removeOutcomeFieldMapping(id: string) {
    setOutcomeFieldMappings((prev) => prev.filter((mapping) => mapping.id !== id))
  }

  function addValidationStatusTemplate() {
    // Find validation_status field in ManyChat fields
    const validationField = manychatFields.find((f) =>
      f.name.toLowerCase().includes('validation') ||
      f.name.toLowerCase().includes('status')
    )

    if (!validationField) {
      toast({
        title: 'No validation field found',
        description: 'Create a "validation_status" custom field in ManyChat first.',
        variant: 'destructive',
      })
      return
    }

    const templates: OutcomeFieldMapping[] = [
      {
        id: `${Date.now()}-1`,
        outcome: 'sent',
        manychatFieldId: validationField.id,
        manychatFieldName: validationField.name,
        value: 'SENT',
        enabled: true,
      },
      {
        id: `${Date.now()}-2`,
        outcome: 'validated_success',
        manychatFieldId: validationField.id,
        manychatFieldName: validationField.name,
        value: 'SUCCESS',
        enabled: true,
      },
      {
        id: `${Date.now()}-3`,
        outcome: 'validated_failed',
        failureReason: 'expired',
        manychatFieldId: validationField.id,
        manychatFieldName: validationField.name,
        value: 'EXPIRED',
        enabled: true,
      },
      {
        id: `${Date.now()}-4`,
        outcome: 'validated_failed',
        failureReason: 'wrong_person',
        manychatFieldId: validationField.id,
        manychatFieldName: validationField.name,
        value: 'WRONG_PERSON',
        enabled: true,
      },
      {
        id: `${Date.now()}-5`,
        outcome: 'validated_failed',
        failureReason: 'already_used',
        manychatFieldId: validationField.id,
        manychatFieldName: validationField.name,
        value: 'ALREADY_USED',
        enabled: true,
      },
    ]

    setOutcomeFieldMappings((prev) => [...prev, ...templates])

    toast({
      title: 'Template added',
      description: `Added 5 validation status mappings for "${validationField.name}".`,
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

  async function handleCreateCustomField() {
    if (!newFieldName.trim()) {
      toast({
        title: 'Field name required',
        description: 'Please enter a name for the custom field.',
        variant: 'destructive',
      })
      return
    }

    setCreatingField(true)
    try {
      const res = await fetch('/api/v1/manychat/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFieldName.trim(),
          type: newFieldType,
          description: newFieldDescription.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: 'Custom field created',
          description: `Field "${newFieldName}" has been created in ManyChat.`,
        })

        // Reload fields
        await loadManychatFields()

        // Reset form and close dialog
        setNewFieldName('')
        setNewFieldType('text')
        setNewFieldDescription('')
        setShowCreateFieldDialog(false)
      } else {
        throw new Error(data.error || 'Failed to create custom field')
      }
    } catch (error) {
      toast({
        title: 'Failed to create custom field',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCreatingField(false)
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) {
      toast({
        title: 'Tag name required',
        description: 'Please enter a name for the tag.',
        variant: 'destructive',
      })
      return
    }

    setCreatingTag(true)
    try {
      const res = await fetch('/api/v1/manychat/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: 'Tag created',
          description: `Tag "${newTagName}" has been created in ManyChat.`,
        })

        // Reload tags
        await loadManychatTags()

        // Reset form and close dialog
        setNewTagName('')
        setShowCreateTagDialog(false)
      } else {
        throw new Error(data.error || 'Failed to create tag')
      }
    } catch (error) {
      toast({
        title: 'Failed to create tag',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCreatingTag(false)
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
        <p className="text-muted-foreground">This QR tool doesn't exist or you don't have access to it.</p>
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

      <Dialog open={showCreateFieldDialog} onOpenChange={setShowCreateFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Field</DialogTitle>
            <DialogDescription>
              Create a new custom field in ManyChat to store QR data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name</Label>
              <Input
                id="fieldName"
                placeholder="e.g., playgram_qr_code"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                disabled={creatingField}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type</Label>
              <select
                id="fieldType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as any)}
                disabled={creatingField}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="datetime">Date & Time</option>
                <option value="boolean">Boolean (Yes/No)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldDescription">Description (Optional)</Label>
              <Input
                id="fieldDescription"
                placeholder="e.g., Stores validated QR code value"
                value={newFieldDescription}
                onChange={(e) => setNewFieldDescription(e.target.value)}
                disabled={creatingField}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFieldDialog(false)} disabled={creatingField}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomField} disabled={creatingField}>
              {creatingField && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>
              Create a new tag in ManyChat for conditional QR outcomes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                placeholder="e.g., QR_Validated"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={creatingTag}
              />
              <p className="text-xs text-muted-foreground">
                This tag will be created in ManyChat and can be used for automation flows.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTagDialog(false)} disabled={creatingTag}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={creatingTag}>
              {creatingTag && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tag
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
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-normal">Quick start templates</Label>
                  <div className="grid gap-2 md:grid-cols-2 mt-2">
                    {PATTERN_TEMPLATES.map((template) => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => setFormatPattern(template.pattern)}
                        className="flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20"
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        <code className="font-mono text-xs text-primary">{template.pattern}</code>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formatPattern">Format pattern</Label>
                <Textarea
                  ref={formatTextareaRef}
                  id="formatPattern"
                  rows={4}
                  placeholder="PROMO-{{first_name}}-{{random:6}}"
                  value={formatPattern}
                  onChange={(event) => setFormatPattern(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Click tokens below to insert them, or type manually. Tokens are replaced at generation time.
                </p>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available tokens</CardTitle>
              <CardDescription>Click any token to insert it at your cursor position.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(TOKEN_CATEGORIES).map(([category, tokens]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">{category}</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {tokens.map((token) => (
                      <button
                        key={token.token}
                        type="button"
                        onClick={() => insertToken(token.token)}
                        className="group flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <code className="font-mono text-xs font-semibold text-primary group-hover:text-accent-foreground">
                            {token.token}
                          </code>
                        </div>
                        <p className="text-xs text-muted-foreground">{token.description}</p>
                        <p className="text-xs font-mono text-muted-foreground/70">
                          e.g., {token.example}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {customFields.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Dynamic Fields</h4>
                  <div className="grid gap-3">
                    <div className="space-y-2 rounded-lg border p-3">
                      <Label className="text-xs font-medium">Insert Custom Field</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            insertToken(`{{custom_field:${e.target.value}}}`)
                            e.target.value = ''
                          }
                        }}
                      >
                        <option value="">Select a ManyChat custom field...</option>
                        {customFields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">Inserts custom field value from ManyChat</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview & save</CardTitle>
              <CardDescription>Choose a sample user, preview the output, then store the pattern.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="previewUser">Preview with user</Label>
                  <select
                    id="previewUser"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={loadingUsers || users.length === 0}
                  >
                    {users.length === 0 ? (
                      <option value="">No users found</option>
                    ) : (
                      users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName || user.igUsername || user.manychatId || 'Unknown'}
                          {user.lastName && ` ${user.lastName}`}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-muted-foreground">Select a user to see real data in the preview.</p>
                </div>
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="rounded-md border bg-muted p-3 font-mono text-sm min-h-[40px] flex items-center">
                    {formatPreview ? formatPreview : 'Click preview to see the result'}
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
            <CardHeader>
              <CardTitle>ManyChat External Request Setup</CardTitle>
              <CardDescription>
                Configure a ManyChat External Request to validate QR codes and trigger conditional actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl)
                        toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' })
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Use this URL in your ManyChat External Request action
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Setup Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>In ManyChat, create a new Flow or edit an existing one</li>
                    <li>Add an &quot;External Request&quot; action</li>
                    <li>Set Request Type to <code className="px-1 py-0.5 bg-background rounded">POST</code></li>
                    <li>Paste the webhook URL above</li>
                    <li>In the request body, send:
                      <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
{`{
  "qr_code": "{{user_input}}",
  "subscriber_id": "{{subscriber_id}}"
}`}
                      </pre>
                    </li>
                    <li>
                      Configure conditional responses based on the outcome:
                      <ul className="mt-1 ml-6 space-y-1 list-disc">
                        <li><code className="text-xs">outcome</code> = &quot;validated_success&quot; → Success flow</li>
                        <li><code className="text-xs">outcome</code> = &quot;validated_failed&quot; → Failure flow</li>
                        <li><code className="text-xs">failure_reason</code> = &quot;expired&quot;, &quot;wrong_person&quot;, etc.</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <p className="text-xs text-blue-900">
                    <strong>Tip:</strong> Configure conditional field mappings and tags below to automatically update custom fields and apply tags based on validation outcomes (QR sent, validated successfully, or validation failed).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowCreateFieldDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Field
                      </Button>
                      <Button size="sm" variant="outline" onClick={loadManychatStatus}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">QR field</th>
                          <th className="px-4 py-3 font-medium">ManyChat field</th>
                          <th className="px-4 py-3 font-medium">When to sync</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FIELD_MAPPING_ROWS.map((field) => {
                          const mapping = fieldMappings.find((item) => item.qrField === field.key)
                          const isCreatingField = pendingFieldRow === field.key

                          return (
                            <tr key={field.key} className="border-t">
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium">{field.label}</div>
                                <div className="text-xs text-muted-foreground">{field.description}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                {isCreatingField ? (
                                  <div className="space-y-2">
                                    <Input
                                      placeholder="Field name..."
                                      value={newFieldName}
                                      onChange={(e) => setNewFieldName(e.target.value)}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={async () => {
                                          await handleCreateCustomField()
                                          updateFieldMapping(field.key, {
                                            manychatFieldId: manychatFields.find((f) => f.name === newFieldName)?.id || '',
                                            manychatFieldName: newFieldName,
                                          })
                                          setPendingFieldRow(null)
                                        }}
                                        disabled={!newFieldName.trim()}
                                      >
                                        Create
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setPendingFieldRow(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                    value={mapping?.manychatFieldId || ''}
                                    onChange={(event) => {
                                      const value = event.target.value
                                      if (value === CREATE_FIELD_OPTION) {
                                        setPendingFieldRow(field.key)
                                        setNewFieldName('')
                                      } else {
                                        updateFieldMapping(field.key, {
                                          manychatFieldId: value,
                                          manychatFieldName:
                                            manychatFields.find((f) => f.id === value)?.name || '',
                                        })
                                      }
                                    }}
                                  >
                                    <option value="">— Select field —</option>
                                    {manychatFields.map((manychatField) => (
                                      <option key={manychatField.id} value={manychatField.id}>
                                        {manychatField.name}
                                      </option>
                                    ))}
                                    <option value={CREATE_FIELD_OPTION}>+ Create new field</option>
                                  </select>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <select
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                  value={mapping?.syncTiming || 'none'}
                                  onChange={(event) =>
                                    updateFieldMapping(field.key, {
                                      syncTiming: event.target.value as SyncTimingOption,
                                    })
                                  }
                                  disabled={!mapping?.manychatFieldId}
                                >
                                  {SYNC_TIMING_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
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

          <Card>
            <CardHeader>
              <CardTitle>Outcome-Based Field Values (Advanced)</CardTitle>
              <CardDescription>
                Configure different values for ManyChat fields based on QR validation outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <h4 className="text-sm font-semibold">Available Outcomes:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">sent</Badge>
                    <span className="text-muted-foreground">QR code generated and sent to user</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">validated_success</Badge>
                    <span className="text-muted-foreground">QR code successfully validated</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">validated_failed</Badge>
                    <span className="text-muted-foreground">Validation failed (wrong_person, expired, already_used, other)</span>
                  </div>
                </div>
              </div>

              {!manychatConnected ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs text-amber-900">
                    <strong>Note:</strong> Connect ManyChat to configure outcome-based field mappings.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-semibold">Field Value Mappings</h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={addValidationStatusTemplate}>
                        <Sparkles className="mr-2 h-4 w-4" /> Quick Template
                      </Button>
                      <Button size="sm" variant="outline" onClick={addOutcomeFieldMapping}>
                        <Plus className="mr-2 h-4 w-4" /> Add Mapping
                      </Button>
                    </div>
                  </div>

                  {outcomeFieldMappings.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No outcome-based mappings configured. Click &quot;Add Mapping&quot; to set field values based on validation outcomes.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {outcomeFieldMappings.map((mapping) => (
                        <div key={mapping.id} className="rounded-lg border p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={mapping.enabled}
                                onChange={(e) =>
                                  updateOutcomeFieldMapping(mapping.id, { enabled: e.target.checked })
                                }
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <Label className="text-sm font-medium">
                                {mapping.enabled ? 'Enabled' : 'Disabled'}
                              </Label>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeOutcomeFieldMapping(mapping.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs">ManyChat Field</Label>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={mapping.manychatFieldId}
                                onChange={(e) => {
                                  const fieldId = e.target.value
                                  const fieldName = manychatFields.find((f) => f.id === fieldId)?.name || ''
                                  updateOutcomeFieldMapping(mapping.id, {
                                    manychatFieldId: fieldId,
                                    manychatFieldName: fieldName,
                                  })
                                }}
                              >
                                <option value="">— Select field —</option>
                                {manychatFields.map((field) => (
                                  <option key={field.id} value={field.id}>
                                    {field.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Outcome</Label>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={mapping.outcome}
                                onChange={(e) =>
                                  updateOutcomeFieldMapping(mapping.id, {
                                    outcome: e.target.value as QRValidationOutcome,
                                  })
                                }
                              >
                                <option value="sent">Sent</option>
                                <option value="validated_success">Validated Success</option>
                                <option value="validated_failed">Validated Failed</option>
                              </select>
                            </div>

                            {mapping.outcome === 'validated_failed' && (
                              <div className="space-y-2">
                                <Label className="text-xs">Failure Reason (Optional)</Label>
                                <select
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                  value={mapping.failureReason || ''}
                                  onChange={(e) =>
                                    updateOutcomeFieldMapping(mapping.id, {
                                      failureReason: e.target.value ? (e.target.value as QRFailureReason) : undefined,
                                    })
                                  }
                                >
                                  <option value="">— Any failure —</option>
                                  <option value="wrong_person">Wrong Person</option>
                                  <option value="expired">Expired</option>
                                  <option value="already_used">Already Used</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                            )}

                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs">Value to Set</Label>
                              <Input
                                placeholder="e.g., 'success', 'failed', 'expired'"
                                value={mapping.value}
                                onChange={(e) =>
                                  updateOutcomeFieldMapping(mapping.id, { value: e.target.value })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                The value that will be written to the ManyChat field when this outcome occurs
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <p className="text-xs text-blue-900">
                      <strong>Example:</strong> Set the &quot;validation_status&quot; field to &quot;SUCCESS&quot; for validated_success, &quot;EXPIRED&quot; for validated_failed with reason expired, and &quot;WRONG_PERSON&quot; for validated_failed with reason wrong_person.
                    </p>
                  </div>

                  <Button onClick={handleSaveOutcomeConfig} disabled={outcomeConfigSaving}>
                    {outcomeConfigSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Outcome Configuration
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
