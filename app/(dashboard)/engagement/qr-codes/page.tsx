'use client'

import { useState, useEffect } from 'react'
import { Plus, Download, Eye, Trash2, Power, QrCode as QrCodeIcon } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

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
  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [stats, setStats] = useState<QRCodeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [generatedQR, setGeneratedQR] = useState<{
    qrCodeDataUrl: string
    scanUrl: string
    label: string
  } | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    type: 'promotion' as 'promotion' | 'validation' | 'discount',
    label: '',
    message: '',
    discountAmount: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    validUntil: '',
    maxScans: '',
  })

  useEffect(() => {
    fetchQRCodes()
    fetchStats()
  }, [])

  const fetchQRCodes = async () => {
    try {
      const response = await fetch('/api/v1/qr')
      const data = await response.json()

      if (data.success) {
        setQRCodes(data.data.qrCodes)
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

  const handleCreateQRCode = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const requestBody: {
        type: string
        label: string
        data: {
          message?: string
          discountAmount?: number
          discountType?: string
          validUntil?: string
          maxScans?: number
        }
      } = {
        type: formData.type,
        label: formData.label,
        data: {},
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
          message: '',
          discountAmount: '',
          discountType: 'percentage',
          validUntil: '',
          maxScans: '',
        })
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
                </div>
                <DialogFooter>
                  <Button type="submit">Generate QR Code</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
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
