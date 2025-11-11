'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QRAppearance {
  width: number
  margin: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  darkColor: string
  lightColor: string
}

interface QRFieldMapping {
  qrField: string
  manychatFieldId: string
  manychatFieldName: string
  enabled: boolean
}

interface ManychatField {
  id: string
  name: string
  type: string
}

const QR_AVAILABLE_FIELDS = [
  { key: 'qr_code', label: 'QR Code', description: 'The actual QR code value', dataType: 'text' },
  { key: 'qr_type', label: 'QR Type', description: 'Type of QR code', dataType: 'text' },
  { key: 'qr_scanned_at', label: 'Scan Date/Time', description: 'When scanned', dataType: 'datetime' },
  { key: 'qr_expires_at', label: 'Expiration Date', description: 'When expires', dataType: 'datetime' },
  { key: 'qr_is_valid', label: 'Is Valid', description: 'Whether valid', dataType: 'boolean' },
  { key: 'qr_label', label: 'Label', description: 'QR code label', dataType: 'text' },
  { key: 'qr_campaign', label: 'Campaign Name', description: 'Campaign name', dataType: 'text' },
  { key: 'qr_tool_name', label: 'Tool Name', description: 'Tool name', dataType: 'text' },
  { key: 'qr_created_at', label: 'Creation Date', description: 'When created', dataType: 'datetime' },
  { key: 'qr_scan_count', label: 'Scan Count', description: 'Number of scans', dataType: 'number' },
]

export default function QRSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toolId, setToolId] = useState<string | null>(null)

  // Format state
  const [qrFormat, setQrFormat] = useState('')
  const [formatPreview, setFormatPreview] = useState('')

  // Appearance state
  const [appearance, setAppearance] = useState<QRAppearance>({
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    darkColor: '#000000',
    lightColor: '#FFFFFF',
  })

  // Field mapping state
  const [mappings, setMappings] = useState<QRFieldMapping[]>([])
  const [autoSyncOnScan, setAutoSyncOnScan] = useState(false)
  const [autoSyncOnValidation, setAutoSyncOnValidation] = useState(false)
  const [manychatFields, setManychatFields] = useState<ManychatField[]>([])

  useEffect(() => {
    fetchToolSettings()
    fetchManychatFields()
  }, [])

  const fetchToolSettings = async () => {
    try {
      // First get or create QR tool
      const toolsRes = await fetch('/api/v1/tools?toolType=qr')
      const toolsData = await toolsRes.json()

      const currentToolId = toolsData.data?.tools?.[0]?.id

      if (!currentToolId) {
        toast({
          title: 'Error',
          description: 'No QR tool found. Please generate a QR code first.',
          variant: 'destructive',
        })
        return
      }

      setToolId(currentToolId)

      // Fetch tool settings
      const settingsRes = await fetch(`/api/v1/qr/tool-settings?toolId=${currentToolId}`)
      const settingsData = await settingsRes.json()

      if (settingsData.success) {
        setQrFormat(settingsData.data.qrFormat || '')
        setAppearance(settingsData.data.qrAppearance)
      }

      // Fetch field mappings
      const mappingsRes = await fetch(`/api/v1/qr/field-mapping?toolId=${currentToolId}`)
      const mappingsData = await mappingsRes.json()

      if (mappingsData.success && mappingsData.data.config) {
        setMappings(mappingsData.data.config.mappings || [])
        setAutoSyncOnScan(mappingsData.data.config.autoSyncOnScan || false)
        setAutoSyncOnValidation(mappingsData.data.config.autoSyncOnValidation || false)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load QR settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchManychatFields = async () => {
    try {
      const res = await fetch('/api/v1/manychat/fields')
      const data = await res.json()
      if (data.success) {
        setManychatFields(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch Manychat fields:', error)
    }
  }

  const handlePreviewFormat = async () => {
    if (!qrFormat.trim()) {
      setFormatPreview('')
      return
    }

    try {
      const res = await fetch('/api/v1/qr/format-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: qrFormat }),
      })
      const data = await res.json()
      if (data.success) {
        setFormatPreview(data.data.preview)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to preview format',
        variant: 'destructive',
      })
    }
  }

  const handleSaveFormat = async () => {
    if (!toolId) return

    setSaving(true)
    try {
      const res = await fetch('/api/v1/qr/tool-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          qrFormat,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'QR format saved successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save format',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAppearance = async () => {
    if (!toolId) return

    setSaving(true)
    try {
      const res = await fetch('/api/v1/qr/tool-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          qrAppearance: appearance,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'QR appearance saved successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save appearance',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFieldMappings = async () => {
    if (!toolId) return

    setSaving(true)
    try {
      const res = await fetch('/api/v1/qr/field-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          mappings,
          autoSyncOnScan,
          autoSyncOnValidation,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Field mappings saved successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save field mappings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddMapping = () => {
    setMappings([
      ...mappings,
      {
        qrField: QR_AVAILABLE_FIELDS[0].key,
        manychatFieldId: '',
        manychatFieldName: '',
        enabled: true,
      },
    ])
  }

  const handleUpdateMapping = (index: number, updates: Partial<QRFieldMapping>) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], ...updates }
    setMappings(newMappings)
  }

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index))
  }

  if (loading) {
    return <div className="py-12 text-center">Loading QR settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">QR Code Settings</h1>
          <p className="text-muted-foreground">
            Configure QR code format, appearance, and Manychat field mapping
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="format" className="space-y-6">
        <TabsList>
          <TabsTrigger value="format">Format Builder</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
        </TabsList>

        {/* Format Builder Tab */}
        <TabsContent value="format" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Format Pattern</CardTitle>
              <CardDescription>
                Define a custom format for your QR codes using placeholders like {'{'}{'{'} first_name{'}'}{'}'}, {'{'}{'{'} tag:ID{'}'}{'}'},  {'{'}{'{'} random:6{'}'}{'}'}, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="format">Format Pattern</Label>
                <Textarea
                  id="format"
                  placeholder="PROMO-{{first_name}}-{{random:6}}"
                  value={qrFormat}
                  onChange={(e) => setQrFormat(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {'{'}{'{'} first_name{'}'}{'}'}, {'{'}{'{'} last_name{'}'}{'}'}, {'{'}{'{'} igUsername{'}'}{'}'}, {'{'}{'{'} tag:ID{'}'}{'}'}, {'{'}{'{'} custom_field:ID{'}'}{'}'}, {'{'}{'{'} random{'}'}{'}'}, {'{'}{'{'} timestamp{'}'}{'}'}, {'{'}{'{'} date{'}'}{'}'}, {'{'}{'{'} metadata:KEY{'}'}{'}'}
                </p>
              </div>

              {formatPreview && (
                <div className="space-y-2">
                  <Label>Preview (with sample data)</Label>
                  <div className="p-3 bg-muted rounded-md font-mono text-sm">
                    {formatPreview}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handlePreviewFormat} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={handleSaveFormat} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Format'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Appearance</CardTitle>
              <CardDescription>
                Customize the visual appearance of your QR codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    min="128"
                    max="2048"
                    value={appearance.width}
                    onChange={(e) =>
                      setAppearance({ ...appearance, width: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margin">Margin</Label>
                  <Input
                    id="margin"
                    type="number"
                    min="0"
                    max="10"
                    value={appearance.margin}
                    onChange={(e) =>
                      setAppearance({ ...appearance, margin: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="errorCorrectionLevel">Error Correction</Label>
                  <Select
                    value={appearance.errorCorrectionLevel}
                    onValueChange={(value: 'L' | 'M' | 'Q' | 'H') =>
                      setAppearance({ ...appearance, errorCorrectionLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (7%)</SelectItem>
                      <SelectItem value="M">Medium (15%)</SelectItem>
                      <SelectItem value="Q">Quartile (25%)</SelectItem>
                      <SelectItem value="H">High (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="darkColor">Dark Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="darkColor"
                      type="color"
                      value={appearance.darkColor}
                      onChange={(e) =>
                        setAppearance({ ...appearance, darkColor: e.target.value })
                      }
                      className="w-16"
                    />
                    <Input
                      value={appearance.darkColor}
                      onChange={(e) =>
                        setAppearance({ ...appearance, darkColor: e.target.value })
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lightColor">Light Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="lightColor"
                      type="color"
                      value={appearance.lightColor}
                      onChange={(e) =>
                        setAppearance({ ...appearance, lightColor: e.target.value })
                      }
                      className="w-16"
                    />
                    <Input
                      value={appearance.lightColor}
                      onChange={(e) =>
                        setAppearance({ ...appearance, lightColor: e.target.value })
                      }
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAppearance} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Appearance'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manychat Field Mapping</CardTitle>
              <CardDescription>
                Map QR code data to Manychat custom fields for automatic syncing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {manychatFields.length === 0 && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  Connect your Manychat account first to enable field mapping.
                </div>
              )}

              <div className="space-y-3">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-md">
                    <div className="flex-1 space-y-2">
                      <Select
                        value={mapping.qrField}
                        onValueChange={(value) =>
                          handleUpdateMapping(index, { qrField: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select QR field" />
                        </SelectTrigger>
                        <SelectContent>
                          {QR_AVAILABLE_FIELDS.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={mapping.manychatFieldId}
                        onValueChange={(value) => {
                          const field = manychatFields.find((f) => f.id === value)
                          handleUpdateMapping(index, {
                            manychatFieldId: value,
                            manychatFieldName: field?.name || '',
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Manychat field" />
                        </SelectTrigger>
                        <SelectContent>
                          {manychatFields.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.name} ({field.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 items-center pt-2">
                      <Switch
                        checked={mapping.enabled}
                        onCheckedChange={(checked) =>
                          handleUpdateMapping(index, { enabled: checked })
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMapping(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleAddMapping} variant="outline" disabled={manychatFields.length === 0}>
                Add Mapping
              </Button>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync on scan</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync to Manychat when QR code is scanned
                    </p>
                  </div>
                  <Switch
                    checked={autoSyncOnScan}
                    onCheckedChange={setAutoSyncOnScan}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync on validation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync to Manychat when QR code is validated
                    </p>
                  </div>
                  <Switch
                    checked={autoSyncOnValidation}
                    onCheckedChange={setAutoSyncOnValidation}
                  />
                </div>
              </div>

              <Button onClick={handleSaveFieldMappings} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Field Mappings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
