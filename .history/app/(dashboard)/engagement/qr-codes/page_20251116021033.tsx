'use client'

import { useState, useEffect } from 'react'
import { Plus, Download, Trash2, Power, QrCode as QrCodeIcon, Settings, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Link2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface QRCode {
  id: string
  type: string
  code: string
  label: string
  data: {
    message?: string
    discountAmount?: number
    discountType?: 'percentage' | 'fixed'
    validUntil?: string
    maxScans?: number
    metadata?: Record<string, unknown>
  }
  isActive: boolean
  scanCount: number
  maxScans: number | null
  createdAt: string
  updatedAt: string
}

const normalizeQrCodeResponse = (qr: any): QRCode | null => {
  try {
    // Guard against completely invalid QR objects
    if (!qr || typeof qr !== 'object') {
      console.warn('Invalid QR object received:', qr)
      return null
    }

    // Guard against missing required fields
    if (!qr.id || !qr.code) {
      console.warn('QR missing required fields:', qr)
      return null
    }

    const metadata = ((qr?.metadata as Record<string, unknown>) || {}) as Record<string, any>
    const validUntilSource = metadata.validUntil || qr?.expiresAt || null
    const validUntil = typeof validUntilSource === 'string'
      ? validUntilSource
      : validUntilSource instanceof Date
        ? validUntilSource.toISOString()
        : null
    const maxScans = typeof metadata.maxScans === 'number' ? metadata.maxScans : null

    return {
      id: qr.id,
      type: qr.qrType || qr.type || 'promotion',
      code: qr.code,
      label: metadata.label || qr.label || 'QR Code',
      data: {
        message: metadata.message,
        discountAmount: metadata.discountAmount,
        discountType: metadata.discountType,
        validUntil: validUntil || undefined,
        maxScans: maxScans || undefined,
        metadata,
      },
      isActive:
        typeof qr.isActive === 'boolean'
          ? qr.isActive
          : validUntil
            ? new Date(validUntil).getTime() > Date.now()
            : true,
      scanCount: typeof qr.scanCount === 'number' ? qr.scanCount : 0,
      maxScans,
      createdAt: qr.createdAt || new Date().toISOString(),
      updatedAt: qr.updatedAt || new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error normalizing QR code:', error, qr)
    return null
  }
}

interface QRCodeStats {
  total: number
  active: number
  inactive: number
  totalScans: number
  recentScans: number
  byType: Array<{
    type: string
    count: number
    scans: number
  }>
}

export default function QRCodesPage() {
  const router = useRouter()
  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [stats, setStats] = useState<QRCodeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [generatedQR, setGeneratedQR] = useState<{
    qrCodeDataUrl: string
    scanUrl: string
    label: string
  } | null>(null)
  const [bulkGeneratedQRs, setBulkGeneratedQRs] = useState<any[]>([])
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    type: 'promotion' as 'promotion' | 'validation' | 'discount',
    label: '',
    campaign: '',
    message: '',
    discountAmount: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    validUntil: '',
    maxScans: '',
    metadata: {} as Record<string, string>,
    userId: '__none__',
  })

  // Manychat integration state
  const [manychatConnected, setManychatConnected] = useState(false)
  const [fieldMappings, setFieldMappings] = useState<any[]>([])
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false)
  const [loadingManychatStatus, setLoadingManychatStatus] = useState(true)

  // User selection state
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  // Format pattern state
  const [qrFormat, setQrFormat] = useState<string>('')
  const [formatPreview, setFormatPreview] = useState<string>('')
  const [qrToolId, setQrToolId] = useState<string>('')

  // Bulk generation state
  const [bulkFormData, setBulkFormData] = useState({
    type: 'promotion' as 'promotion' | 'validation' | 'discount',
    labelTemplate: '',
    campaign: '',
    message: '',
    selectedUserIds: [] as string[],
  })

  useEffect(() => {
    fetchQRCodes()
    fetchStats()
    fetchManychatStatus()
    fetchUsers()
    ensureQRToolExists()
  }, [])

  useEffect(() => {
    if (qrToolId) {
      fetchQRFormat()
    }
  }, [qrToolId])

  const ensureQRToolExists = async () => {
    try {
      // Find existing QR tool or create one
      const response = await fetch('/api/v1/tools?toolType=qr')
      const data = await response.json()

      if (data.success && data.data.tools.length > 0) {
        setQrToolId(data.data.tools[0].id)
      } else {
        // Create QR tool
        const createResponse = await fetch('/api/v1/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolType: 'qr',
            name: 'QR Code Generator',
            description: 'Generate and manage QR codes',
            settings: {},
          }),
        })
        const createData = await createResponse.json()
        if (createData.success) {
          setQrToolId(createData.data.id)
        }
      }
    } catch (error) {
      console.error('Failed to ensure QR tool exists:', error)
    }
  }

  const fetchManychatStatus = async () => {
    try {
      setLoadingManychatStatus(true)
      // Fetch Manychat config
      const configResponse = await fetch('/api/v1/manychat/config')
      const configData = await configResponse.json()

      if (configData.success && configData.data?.isConnected) {
        setManychatConnected(true)
      }
    } catch (error) {
      console.error('Failed to fetch Manychat status:', error)
    } finally {
      setLoadingManychatStatus(false)
    }
  }

  const fetchFieldMappings = async (toolId: string) => {
    try {
      const mappingsResponse = await fetch(`/api/v1/qr/field-mapping?toolId=${toolId}`)
      const mappingsData = await mappingsResponse.json()

      if (mappingsData.success && mappingsData.data?.config?.mappings) {
        setFieldMappings(mappingsData.data.config.mappings.filter((m: any) => m.enabled))
      }
    } catch (error) {
      console.error('Failed to fetch field mappings:', error)
    }
  }

  const fetchQRCodes = async () => {
    try {
      const response = await fetch('/api/v1/qr')
      const data = await response.json()

      if (data.success) {
        const normalizedQRCodes = (data.data.qrCodes || [])
          .map(normalizeQrCodeResponse)
          .filter((qr: QRCode | null): qr is QRCode => qr !== null)
        setQRCodes(normalizedQRCodes)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch QR codes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/qr/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch('/api/v1/users/manychat-contacts?limit=100')
      const data = await response.json()

      if (data.success) {
        setUsers(data.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchQRFormat = async () => {
    if (!qrToolId) return

    try {
      const response = await fetch(`/api/v1/qr/tool-settings?toolId=${qrToolId}`)
      const data = await response.json()

      if (data.success && data.data?.qrFormat) {
        setQrFormat(data.data.qrFormat)
      }

      // Also fetch field mappings if Manychat is connected
      if (manychatConnected) {
        fetchFieldMappings(qrToolId)
      }
    } catch (error) {
      console.error('Failed to fetch QR format:', error)
    }
  }

  const generateFormatPreview = async (userId: string) => {
    if (!qrFormat || !userId) {
      setFormatPreview('')
      return
    }

    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      const response = await fetch('/api/v1/qr/format-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: qrFormat,
          userId: userId,
          metadata: formData.campaign ? { campaign: formData.campaign } : {},
        }),
      })

      const data = await response.json()
      if (data.success) {
        setFormatPreview(data.data.preview)
      }
    } catch (error) {
      console.error('Failed to generate format preview:', error)
    }
  }

  // Effect to generate preview when user or campaign changes
  useEffect(() => {
    if (formData.userId && formData.userId !== '__none__') {
      generateFormatPreview(formData.userId)
      const user = users.find(u => u.id === formData.userId)
      setSelectedUser(user || null)
    } else {
      setFormatPreview('')
      setSelectedUser(null)
    }
  }, [formData.userId, formData.campaign])

  const handleCreateQRCode = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const requestBody: {
        type: string
        label: string
        userId?: string
        data: {
          message?: string
          discountAmount?: number
          discountType?: string
          validUntil?: string
          maxScans?: number
          metadata?: Record<string, unknown>
        }
      } = {
        type: formData.type,
        label: formData.label,
        data: {},
      }

      // Add userId if personalized (but not if it's the "none" placeholder)
      if (formData.userId && formData.userId !== '__none__') {
        requestBody.userId = formData.userId
      }

      // Add type-specific data
      if (formData.type === 'promotion' && formData.message) {
        requestBody.data.message = formData.message
      } else if (formData.type === 'discount' && formData.discountAmount) {
        requestBody.data.discountAmount = parseFloat(formData.discountAmount)
        requestBody.data.discountType = formData.discountType
      }

      // Add optional fields
      if (formData.validUntil) {
        requestBody.data.validUntil = new Date(formData.validUntil).toISOString()
      }
      if (formData.maxScans) {
        requestBody.data.maxScans = parseInt(formData.maxScans)
      }

      // Add campaign and metadata
      const metadata: Record<string, unknown> = { ...formData.metadata }
      if (formData.campaign) {
        metadata.campaign = formData.campaign
        metadata.campaign_name = formData.campaign
      }
      if (Object.keys(metadata).length > 0) {
        requestBody.data.metadata = metadata
      }

      const response = await fetch('/api/v1/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedQR({
          qrCodeDataUrl: data.data.qrCodeDataUrl,
          scanUrl: data.data.qrCode.scanUrl,
          label: data.data.qrCode.label,
        })
        fetchQRCodes()
        fetchStats()
        toast({
          title: 'Success',
          description: 'QR code created successfully',
        })
        // Reset form
        setFormData({
          type: 'promotion',
          label: '',
          campaign: '',
          message: '',
          discountAmount: '',
          discountType: 'percentage',
          validUntil: '',
          maxScans: '',
          metadata: {},
          userId: '__none__',
        })
        setSelectedUser(null)
        setFormatPreview('')
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create QR code',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create QR code',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadQR = (dataUrl: string, label: string) => {
    const link = document.createElement('a')
    link.download = `qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = dataUrl
    link.click()
  }

  const handleToggleActive = async (qrCodeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/qr/${qrCodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setQRCodes(
          qrCodes.map((qr) =>
            qr.id === qrCodeId ? { ...qr, isActive: !currentStatus } : qr
          )
        )
        fetchStats()
        toast({
          title: 'Success',
          description: `QR code ${!currentStatus ? 'activated' : 'deactivated'}`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update QR code',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteQRCode = async (qrCodeId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return

    try {
      const response = await fetch(`/api/v1/qr/${qrCodeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setQRCodes(qrCodes.filter((qr) => qr.id !== qrCodeId))
        fetchStats()
        toast({
          title: 'Success',
          description: 'QR code deleted successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete QR code',
        variant: 'destructive',
      })
    }
  }

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (bulkFormData.selectedUserIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one user',
        variant: 'destructive',
      })
      return
    }

    try {
      setBulkGenerating(true)

      const response = await fetch('/api/v1/qr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: bulkFormData.type,
          labelTemplate: bulkFormData.labelTemplate,
          campaign: bulkFormData.campaign,
          message: bulkFormData.message,
          userIds: bulkFormData.selectedUserIds,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setBulkGeneratedQRs(data.data.qrCodes)
        fetchQRCodes()
        fetchStats()
        toast({
          title: 'Success',
          description: `Generated ${data.data.qrCodes.length} QR codes successfully`,
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to generate QR codes',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate QR codes',
        variant: 'destructive',
      })
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleDownloadAllQRs = () => {
    bulkGeneratedQRs.forEach((qr, index) => {
      setTimeout(() => {
        const link = document.createElement('a')
        link.download = `qr-${qr.label.replace(/\s+/g, '-').toLowerCase()}.png`
        link.href = qr.qrCodeDataUrl
        link.click()
      }, index * 100) // Stagger downloads to avoid browser blocking
    })
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'promotion':
        return 'default'
      case 'validation':
        return 'success'
      case 'discount':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    const parsed = new Date(dateString)
    return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Codes</h1>
          <p className="text-muted-foreground">
            Generate and manage QR codes for promotions, discounts, and validation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/engagement/qr-codes/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setBulkGeneratedQRs([])}>
                <Users className="mr-2 h-4 w-4" />
                Bulk Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              {bulkGeneratedQRs.length > 0 ? (
                // Show generated QR codes
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Bulk QR Codes Generated</DialogTitle>
                    <DialogDescription>
                      {bulkGeneratedQRs.length} QR codes created successfully
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {bulkGeneratedQRs.map((qr, index) => (
                        <div key={index} className="border rounded p-2 space-y-2">
                          <img
                            src={qr.qrCodeDataUrl}
                            alt={qr.label}
                            className="w-full h-auto"
                          />
                          <p className="text-xs text-center truncate">{qr.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={handleDownloadAllQRs}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download All ({bulkGeneratedQRs.length})
                    </Button>
                    <Button
                      onClick={() => {
                        setIsBulkDialogOpen(false)
                        setBulkGeneratedQRs([])
                        setBulkFormData({
                          type: 'promotion',
                          labelTemplate: '',
                          campaign: '',
                          message: '',
                          selectedUserIds: [],
                        })
                      }}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                // Bulk generation form
                <form onSubmit={handleBulkGenerate}>
                  <DialogHeader>
                    <DialogTitle>Bulk Generate QR Codes</DialogTitle>
                    <DialogDescription>
                      Generate personalized QR codes for multiple users
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-type">Type</Label>
                      <Select
                        value={bulkFormData.type}
                        onValueChange={(value: 'promotion' | 'validation' | 'discount') =>
                          setBulkFormData({ ...bulkFormData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="validation">Validation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-label">Label Template</Label>
                      <Input
                        id="bulk-label"
                        placeholder="VIP-{{first_name}}"
                        value={bulkFormData.labelTemplate}
                        onChange={(e) =>
                          setBulkFormData({ ...bulkFormData, labelTemplate: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Use placeholders: {'{{'} first_name{'}}'}, {'{{'} last_name{'}}'}, {'{{'} igUsername{'}}'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-campaign">Campaign Name</Label>
                      <Input
                        id="bulk-campaign"
                        placeholder="VIP_Campaign_2025"
                        value={bulkFormData.campaign}
                        onChange={(e) =>
                          setBulkFormData({ ...bulkFormData, campaign: e.target.value })
                        }
                      />
                    </div>

                    {bulkFormData.type === 'promotion' && (
                      <div className="space-y-2">
                        <Label htmlFor="bulk-message">Promotion Message</Label>
                        <Input
                          id="bulk-message"
                          placeholder="Exclusive VIP offer"
                          value={bulkFormData.message}
                          onChange={(e) =>
                            setBulkFormData({ ...bulkFormData, message: e.target.value })
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Select Users ({bulkFormData.selectedUserIds.length} selected)</Label>
                      <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                        {loadingUsers ? (
                          <p className="text-sm text-muted-foreground">Loading users...</p>
                        ) : users.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No users with Manychat ID found</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <input
                                type="checkbox"
                                id="select-all"
                                checked={bulkFormData.selectedUserIds.length === users.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkFormData({
                                      ...bulkFormData,
                                      selectedUserIds: users.map(u => u.id),
                                    })
                                  } else {
                                    setBulkFormData({ ...bulkFormData, selectedUserIds: [] })
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor="select-all" className="text-sm font-semibold">
                                Select All ({users.length})
                              </Label>
                            </div>
                            {users.map((user) => (
                              <div key={user.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`user-${user.id}`}
                                  checked={bulkFormData.selectedUserIds.includes(user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBulkFormData({
                                        ...bulkFormData,
                                        selectedUserIds: [...bulkFormData.selectedUserIds, user.id],
                                      })
                                    } else {
                                      setBulkFormData({
                                        ...bulkFormData,
                                        selectedUserIds: bulkFormData.selectedUserIds.filter(id => id !== user.id),
                                      })
                                    }
                                  }}
                                  className="rounded"
                                />
                                <Label htmlFor={`user-${user.id}`} className="text-sm">
                                  {user.name} {user.username ? `(@${user.username})` : ''}
                                </Label>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    {qrFormat && bulkFormData.selectedUserIds.length > 0 && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          Will generate {bulkFormData.selectedUserIds.length} personalized QR code
                          {bulkFormData.selectedUserIds.length !== 1 ? 's' : ''} using pattern: <code className="text-xs bg-background px-1 py-0.5 rounded">{qrFormat}</code>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={bulkGenerating || bulkFormData.selectedUserIds.length === 0}>
                      {bulkGenerating ? 'Generating...' : `Generate ${bulkFormData.selectedUserIds.length} QR Code${bulkFormData.selectedUserIds.length !== 1 ? 's' : ''}`}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setGeneratedQR(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
            {generatedQR ? (
              // Show generated QR code
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>QR Code Generated</DialogTitle>
                  <DialogDescription>
                    Your QR code has been created successfully
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={generatedQR.qrCodeDataUrl}
                      alt={generatedQR.label}
                      className="w-64 h-64 border rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Scan URL</Label>
                    <Input value={generatedQR.scanUrl} readOnly className="text-sm" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleDownloadQR(generatedQR.qrCodeDataUrl, generatedQR.label)
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      setGeneratedQR(null)
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              // Create QR code form
              <form onSubmit={handleCreateQRCode}>
                <DialogHeader>
                  <DialogTitle>Create New QR Code</DialogTitle>
                  <DialogDescription>
                    Generate a new QR code for your campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      placeholder="Summer Sale 2025"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* User Selection for Personalization */}
                  <div className="space-y-2">
                    <Label htmlFor="userId">Generate For (Optional)</Label>
                    <Select
                      value={formData.userId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, userId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="General (no specific user)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">General (no specific user)</SelectItem>
                        {loadingUsers ? (
                          <SelectItem value="_loading" disabled>
                            Loading users...
                          </SelectItem>
                        ) : users.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            No users with Manychat ID
                          </SelectItem>
                        ) : (
                          users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} {user.username ? `(@${user.username})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formData.userId && formData.userId !== '__none__' && selectedUser && (
                      <p className="text-xs text-muted-foreground">
                        Personalized QR for {selectedUser.name}
                      </p>
                    )}
                  </div>

                  {/* Format Preview */}
                  {qrFormat && formData.userId && formData.userId !== '__none__' && formatPreview && (
                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">QR Code Preview</Label>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Pattern:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded block">
                          {qrFormat}
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Will generate:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded block font-semibold">
                          {formatPreview}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'promotion' | 'validation' | 'discount') =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="validation">Validation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaign">Campaign Name (Optional)</Label>
                    <Input
                      id="campaign"
                      placeholder="Summer_Sale_2025"
                      value={formData.campaign}
                      onChange={(e) =>
                        setFormData({ ...formData, campaign: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for tracking and Manychat field mapping
                    </p>
                  </div>

                  {formData.type === 'promotion' && (
                    <div className="space-y-2">
                      <Label htmlFor="message">Promotion Message</Label>
                      <Input
                        id="message"
                        placeholder="Get 20% off your next purchase!"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {formData.type === 'discount' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="discountAmount">Discount Amount</Label>
                        <div className="flex gap-2">
                          <Input
                            id="discountAmount"
                            type="number"
                            placeholder="20"
                            value={formData.discountAmount}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discountAmount: e.target.value,
                              })
                            }
                            className="flex-1"
                          />
                          <Select
                            value={formData.discountType}
                            onValueChange={(value: 'percentage' | 'fixed') =>
                              setFormData({ ...formData, discountType: value })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="fixed">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until (Optional)</Label>
                    <Input
                      id="validUntil"
                      type="datetime-local"
                      value={formData.validUntil}
                      onChange={(e) =>
                        setFormData({ ...formData, validUntil: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxScans">Max Scans (Optional)</Label>
                    <Input
                      id="maxScans"
                      type="number"
                      placeholder="100"
                      value={formData.maxScans}
                      onChange={(e) =>
                        setFormData({ ...formData, maxScans: e.target.value })
                      }
                    />
                  </div>

                  {/* Manychat Integration Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-base">Manychat Integration</Label>
                      </div>
                      {loadingManychatStatus ? (
                        <Badge variant="outline">Loading...</Badge>
                      ) : manychatConnected ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>

                    {!loadingManychatStatus && (
                      <>
                        {!manychatConnected ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Manychat is not connected. QR data will not be synced.{' '}
                              <Button
                                variant="link"
                                className="h-auto p-0"
                                onClick={() => router.push('/settings/manychat')}
                              >
                                Connect now
                              </Button>
                            </AlertDescription>
                          </Alert>
                        ) : fieldMappings.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No field mappings configured. Configure mappings in{' '}
                              <Button
                                variant="link"
                                className="h-auto p-0"
                                onClick={() => router.push('/engagement/qr-codes/settings')}
                              >
                                QR Settings
                              </Button>
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Collapsible open={syncPreviewOpen} onOpenChange={setSyncPreviewOpen}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {fieldMappings.length} field{fieldMappings.length !== 1 ? 's' : ''} will sync when scanned
                                </span>
                                {syncPreviewOpen ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 pt-2">
                              <div className="text-xs text-muted-foreground mb-2">
                                These fields will be synced to Manychat when the QR code is scanned:
                              </div>
                              {fieldMappings.map((mapping: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 text-xs bg-muted p-2 rounded"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span className="font-medium">{mapping.qrField}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-muted-foreground">
                                    {mapping.manychatFieldName || mapping.manychatFieldId}
                                  </span>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Generate QR Code</Button>
                </DialogFooter>
              </form>
            )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total QR Codes</CardTitle>
              <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active, {stats.inactive} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentScans}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Scans/QR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round(stats.totalScans / stats.total) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Per QR code</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Codes List */}
      {loading ? (
        <div className="text-center py-12">Loading QR codes...</div>
      ) : qrCodes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No QR codes yet. Create your first QR code to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create QR Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <Card key={qr.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{qr.label}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={getTypeBadgeVariant(qr.type)}>
                        {qr.type}
                      </Badge>
                      <Badge variant={qr.isActive ? 'success' : 'secondary'}>
                        {qr.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(qr.id, qr.isActive)}
                    >
                      <Power className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteQRCode(qr.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scans</span>
                    <span className="font-medium">
                      {qr.scanCount}
                      {qr.maxScans ? ` / ${qr.maxScans}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(qr.createdAt)}</span>
                  </div>
                  {qr.type === 'discount' && qr.data.discountAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium">
                        {qr.data.discountType === 'percentage'
                          ? `${qr.data.discountAmount}%`
                          : `$${qr.data.discountAmount}`}
                      </span>
                    </div>
                  )}
                  {qr.data.validUntil && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valid Until</span>
                      <span>{formatDate(qr.data.validUntil)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
