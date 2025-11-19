
'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Plus,
  Download,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  Users,
  QrCode as QrCodeIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type QRCode = {
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

type User = {
  id: string
  firstName: string | null
  lastName: string | null
  igUsername: string | null
  manychatId: string | null
}

interface QrCodeManagerProps {
  toolId: string
  users: User[]
  loadingUsers: boolean
  formatPattern: string
}

export function QrCodeManager({ toolId, users, loadingUsers, formatPattern }: QrCodeManagerProps) {
  const { toast } = useToast()
  
  // State
  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  
  // Generated QR states
  const [generatedQR, setGeneratedQR] = useState<{
    qrCodeDataUrl: string
    scanUrl: string
    label: string
  } | null>(null)
  const [bulkGeneratedQRs, setBulkGeneratedQRs] = useState<any[]>([])
  const [bulkGenerating, setBulkGenerating] = useState(false)

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

  // Bulk form state
  const [bulkFormData, setBulkFormData] = useState({
    type: 'promotion' as 'promotion' | 'validation' | 'discount',
    labelTemplate: '',
    campaign: '',
    message: '',
    selectedUserIds: [] as string[],
  })

  // Preview states
  const [formatPreview, setFormatPreview] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    if (toolId) {
      fetchQRCodes()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId])

  const fetchQRCodes = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/qr?toolId=${toolId}&limit=50`)
      const data = await response.json()

      if (data.success) {
        const normalizedQRCodes = (data.data.qrCodes || [])
          .map(normalizeQrCodeResponse)
          .filter((qr: QRCode | null): qr is QRCode => qr !== null)
        setQRCodes(normalizedQRCodes)
      }
    } catch (error) {
      console.error('Failed to fetch QR codes:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch QR codes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const normalizeQrCodeResponse = (qr: any): QRCode | null => {
    try {
      if (!qr || typeof qr !== 'object' || !qr.id || !qr.code) return null

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
        isActive: typeof qr.isActive === 'boolean' ? qr.isActive : true,
        scanCount: typeof qr.scanCount === 'number' ? qr.scanCount : 0,
        maxScans,
        createdAt: qr.createdAt || new Date().toISOString(),
        updatedAt: qr.updatedAt || new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error normalizing QR code:', error)
      return null
    }
  }

  const generateFormatPreview = async (userId: string) => {
    if (!formatPattern || !userId) {
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
          pattern: formatPattern, // Fix: API expects 'pattern' not 'format'
          toolId: toolId,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.userId, formData.campaign, formatPattern])

  const handleCreateQRCode = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const requestBody: any = {
        toolId,
        type: formData.type,
        label: formData.label,
        data: {},
      }

      if (formData.userId && formData.userId !== '__none__') {
        requestBody.userId = formData.userId
      }

      if (formData.type === 'promotion' && formData.message) {
        requestBody.data.message = formData.message
      } else if (formData.type === 'discount' && formData.discountAmount) {
        requestBody.data.discountAmount = parseFloat(formData.discountAmount)
        requestBody.data.discountType = formData.discountType
      }

      if (formData.validUntil) {
        requestBody.data.validUntil = new Date(formData.validUntil).toISOString()
      }
      if (formData.maxScans) {
        requestBody.data.maxScans = parseInt(formData.maxScans)
      }

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
        toast({ title: 'Success', description: 'QR code created successfully' })
        
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
        throw new Error(data.error || 'Failed to create QR code')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create QR code',
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
          toolId,
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
        toast({
          title: 'Success',
          description: `Generated ${data.data.qrCodes.length} QR codes successfully`,
        })
      } else {
        throw new Error(data.error || 'Failed to generate QR codes')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate QR codes',
        variant: 'destructive',
      })
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleDownloadQR = (dataUrl: string, label: string) => {
    const link = document.createElement('a')
    link.download = `qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = dataUrl
    link.click()
  }

  const handleDownloadAllQRs = () => {
    bulkGeneratedQRs.forEach((qr, index) => {
      setTimeout(() => {
        const link = document.createElement('a')
        link.download = `qr-${qr.label.replace(/\s+/g, '-').toLowerCase()}.png`
        link.href = qr.qrCodeDataUrl
        link.click()
      }, index * 100)
    })
  }

  const handleToggleActive = async (qrCodeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/qr/${qrCodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setQRCodes(prev => prev.map(qr => 
          qr.id === qrCodeId ? { ...qr, isActive: !currentStatus } : qr
        ))
        toast({
          title: 'Success',
          description: `QR code ${!currentStatus ? 'activated' : 'deactivated'}`,
        })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update QR code', variant: 'destructive' })
    }
  }

  const handleDeleteQRCode = async (qrCodeId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return

    try {
      const response = await fetch(`/api/v1/qr/${qrCodeId}`, { method: 'DELETE' })

      if (response.ok) {
        setQRCodes(prev => prev.filter(qr => qr.id !== qrCodeId))
        toast({ title: 'Success', description: 'QR code deleted successfully' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete QR code', variant: 'destructive' })
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'promotion': return 'default'
      case 'validation': return 'success' // Assuming custom variant exists or fallback
      case 'discount': return 'warning'   // Assuming custom variant exists or fallback
      default: return 'secondary'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    const parsed = new Date(dateString)
    return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <SelectTrigger asChild>
            <Button variant="outline" onClick={() => setBulkGeneratedQRs([])}>
              <Users className="mr-2 h-4 w-4" />
              Bulk Generate
            </Button>
          </SelectTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            {bulkGeneratedQRs.length > 0 ? (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Bulk QR Codes Generated</DialogTitle>
                  <DialogDescription>{bulkGeneratedQRs.length} QR codes created successfully</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {bulkGeneratedQRs.map((qr, index) => (
                    <div key={index} className="border rounded p-2 space-y-2">
                      <img src={qr.qrCodeDataUrl} alt={qr.label} className="w-full h-auto" />
                      <p className="text-xs text-center truncate">{qr.label}</p>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleDownloadAllQRs}>
                    <Download className="mr-2 h-4 w-4" /> Download All
                  </Button>
                  <Button onClick={() => {
                    setIsBulkDialogOpen(false)
                    setBulkGeneratedQRs([])
                    setBulkFormData(prev => ({ ...prev, selectedUserIds: [] }))
                  }}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleBulkGenerate}>
                <DialogHeader>
                  <DialogTitle>Bulk Generate QR Codes</DialogTitle>
                  <DialogDescription>Generate personalized QR codes for multiple users using this tool&apos;s settings.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-type">Type</Label>
                    <Select
                      value={bulkFormData.type}
                      onValueChange={(value: any) => setBulkFormData({ ...bulkFormData, type: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                      onChange={(e) => setBulkFormData({ ...bulkFormData, labelTemplate: e.target.value })}
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
                      onChange={(e) => setBulkFormData({ ...bulkFormData, campaign: e.target.value })}
                    />
                  </div>

                  {bulkFormData.type === 'promotion' && (
                    <div className="space-y-2">
                      <Label htmlFor="bulk-message">Promotion Message</Label>
                      <Input
                        id="bulk-message"
                        placeholder="Exclusive VIP offer"
                        value={bulkFormData.message}
                        onChange={(e) => setBulkFormData({ ...bulkFormData, message: e.target.value })}
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
                              checked={bulkFormData.selectedUserIds.length === users.length && users.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkFormData({ ...bulkFormData, selectedUserIds: users.map(u => u.id) })
                                } else {
                                  setBulkFormData({ ...bulkFormData, selectedUserIds: [] })
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor="select-all" className="text-sm font-semibold">Select All ({users.length})</Label>
                          </div>
                          {users.map((user) => (
                            <div key={user.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`user-${user.id}`}
                                checked={bulkFormData.selectedUserIds.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkFormData({ ...bulkFormData, selectedUserIds: [...bulkFormData.selectedUserIds, user.id] })
                                  } else {
                                    setBulkFormData({ ...bulkFormData, selectedUserIds: bulkFormData.selectedUserIds.filter(id => id !== user.id) })
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`user-${user.id}`} className="text-sm">
                                {user.firstName || user.igUsername || 'Unknown'} {user.lastName || ''}
                              </Label>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {formatPattern && bulkFormData.selectedUserIds.length > 0 && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Will generate {bulkFormData.selectedUserIds.length} codes using current format pattern: <code>{formatPattern}</code>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={bulkGenerating || bulkFormData.selectedUserIds.length === 0}>
                    {bulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Generate {bulkFormData.selectedUserIds.length} Codes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <SelectTrigger asChild>
            <Button onClick={() => setGeneratedQR(null)}>
              <Plus className="mr-2 h-4 w-4" /> Create QR Code
            </Button>
          </SelectTrigger>
          <DialogContent className="sm:max-w-[525px]">
            {generatedQR ? (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>QR Code Generated</DialogTitle>
                  <DialogDescription>Your QR code has been created successfully</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img src={generatedQR.qrCodeDataUrl} alt={generatedQR.label} className="w-64 h-64 border rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label>Scan URL</Label>
                    <Input value={generatedQR.scanUrl} readOnly className="text-sm" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => handleDownloadQR(generatedQR.qrCodeDataUrl, generatedQR.label)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button onClick={() => { setIsCreateDialogOpen(false); setGeneratedQR(null); }}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreateQRCode}>
                <DialogHeader>
                  <DialogTitle>Create New QR Code</DialogTitle>
                  <DialogDescription>Generate a single QR code using this tool.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      placeholder="Summer Sale 2025"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userId">Generate For (Optional)</Label>
                    <Select
                      value={formData.userId}
                      onValueChange={(value) => setFormData({ ...formData, userId: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="General (no specific user)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">General (no specific user)</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName || user.igUsername || 'Unknown'} {user.lastName || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formatPattern && formData.userId !== '__none__' && formatPreview && (
                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">QR Code Preview</Label>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Will generate:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded block font-semibold">{formatPreview}</code>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="validation">Validation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional fields based on type */}
                  {formData.type === 'discount' && (
                    <div className="space-y-2">
                      <Label htmlFor="discountAmount">Discount Amount</Label>
                      <div className="flex gap-2">
                        <Input
                          id="discountAmount"
                          type="number"
                          placeholder="20"
                          value={formData.discountAmount}
                          onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                          className="flex-1"
                        />
                        <Select
                          value={formData.discountType}
                          onValueChange={(value: any) => setFormData({ ...formData, discountType: value })}
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">$</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="campaign">Campaign (Optional)</Label>
                    <Input
                      id="campaign"
                      placeholder="Summer_2025"
                      value={formData.campaign}
                      onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                    />
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

      {/* QR Codes List */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
      ) : qrCodes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No QR codes generated for this tool yet.</p>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>Create your first code</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <Card key={qr.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 overflow-hidden">
                    <CardTitle className="text-base truncate" title={qr.label}>{qr.label}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={getTypeBadgeVariant(qr.type) as any}>{qr.type}</Badge>
                      <Badge variant={qr.isActive ? 'default' : 'secondary'}>{qr.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggleActive(qr.id, qr.isActive)}>
                      <Power className={`h-4 w-4 ${qr.isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteQRCode(qr.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scans</span>
                    <span className="font-medium">{qr.scanCount} {qr.maxScans ? `/ ${qr.maxScans}` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDistanceToNow(new Date(qr.createdAt), { addSuffix: true })}</span>
                  </div>
                  {qr.data.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires</span>
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

