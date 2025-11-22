'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Copy,
  CheckCircle2,
  ExternalLink,
  Settings,
  Zap,
  Code,
} from 'lucide-react'

interface ManyChatIntegrationProps {
  toolId: string
}

export default function ManyChatIntegration({ toolId }: ManyChatIntegrationProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Default campaign metadata
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [defaultQrType, setDefaultQrType] = useState<'promotion' | 'validation' | 'discount'>('promotion')
  const [additionalMetadata, setAdditionalMetadata] = useState('')

  useEffect(() => {
    loadConfig()
  }, [toolId])

  async function loadConfig() {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/qr/tools/${toolId}`)
      const data = await res.json()

      if (data.success) {
        const metadata = data.data.metadata || {}
        setCampaignName(metadata.campaignName || '')
        setCampaignDescription(metadata.campaignDescription || '')
        setDefaultQrType(metadata.defaultQrType || 'promotion')
        setAdditionalMetadata(
          metadata.additionalFields ? JSON.stringify(metadata.additionalFields, null, 2) : ''
        )
      }
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)

      let additionalFields = {}
      if (additionalMetadata.trim()) {
        try {
          additionalFields = JSON.parse(additionalMetadata)
        } catch (e) {
          toast({
            title: 'Invalid JSON',
            description: 'Additional metadata must be valid JSON',
            variant: 'destructive',
          })
          return
        }
      }

      const metadata = {
        campaignName,
        campaignDescription,
        defaultQrType,
        additionalFields,
      }

      const res = await fetch(`/api/v1/qr/tool-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          metadata,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'ManyChat integration settings saved',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save settings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://playgram.kua.cl'}/api/v1/qr/manychat-generate`

  // Generate the JSON payload with ManyChat variables
  const generatePayload = () => {
    const base = {
      toolId,
      qrType: defaultQrType,
      userId: '{{user_id}}',
      metadata: {
        label: "{{first_name}}'s QR",
        ...(campaignName && { campaign: campaignName }),
        ...(campaignDescription && { description: campaignDescription }),
      },
    }

    // Add additional fields if provided
    if (additionalMetadata.trim()) {
      try {
        const additional = JSON.parse(additionalMetadata)
        base.metadata = { ...base.metadata, ...additional }
      } catch (e) {
        // Ignore invalid JSON
      }
    }

    return JSON.stringify(base, null, 2)
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            <CardTitle>Default Campaign Settings</CardTitle>
          </div>
          <CardDescription>
            Configure default metadata for QR codes generated through ManyChat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">
              Campaign Name
              <span className="ml-2 text-xs text-muted-foreground">(e.g., spring_2024)</span>
            </Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="spring_2024"
            />
            <p className="text-sm text-muted-foreground">
              Used to track which campaign this QR belongs to
            </p>
          </div>

          {/* Campaign Description */}
          <div className="space-y-2">
            <Label htmlFor="campaignDescription">Campaign Description (optional)</Label>
            <Input
              id="campaignDescription"
              value={campaignDescription}
              onChange={(e) => setCampaignDescription(e.target.value)}
              placeholder="Spring 2024 Promotion"
            />
          </div>

          {/* QR Type */}
          <div className="space-y-2">
            <Label htmlFor="qrType">Default QR Type</Label>
            <select
              id="qrType"
              value={defaultQrType}
              onChange={(e) => setDefaultQrType(e.target.value as any)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="promotion">Promotion</option>
              <option value="validation">Validation</option>
              <option value="discount">Discount</option>
            </select>
          </div>

          {/* Additional Metadata */}
          <div className="space-y-2">
            <Label htmlFor="additionalMetadata">
              Additional Metadata (optional)
              <span className="ml-2 text-xs text-muted-foreground">JSON format</span>
            </Label>
            <Textarea
              id="additionalMetadata"
              value={additionalMetadata}
              onChange={(e) => setAdditionalMetadata(e.target.value)}
              placeholder={'{\n  "source": "instagram",\n  "promo_code": "SPRING10"\n}'}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Any additional fields to include in QR metadata
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* ManyChat Setup Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <CardTitle>ManyChat Flow Setup</CardTitle>
          </div>
          <CardDescription>Copy these values into your ManyChat flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Webhook URL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                1
              </Badge>
              <h3 className="font-semibold">API Endpoint URL</h3>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <code className="text-sm break-all">{webhookUrl}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                >
                  {copied === 'Webhook URL' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                In ManyChat: Action → External Request → Set this as the URL
              </p>
            </div>
          </div>

          {/* Step 2: Method */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                2
              </Badge>
              <h3 className="font-semibold">Request Method</h3>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <Badge variant="secondary">POST</Badge>
              <p className="text-xs text-muted-foreground mt-2">Set request type to POST</p>
            </div>
          </div>

          {/* Step 3: JSON Body */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                3
              </Badge>
              <h3 className="font-semibold">JSON Body</h3>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Copy this JSON:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatePayload(), 'JSON Payload')}
                >
                  {copied === 'JSON Payload' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                {generatePayload()}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Paste this in the "JSON Body" section of your External Request action
              </p>
            </div>
          </div>

          {/* Step 4: Response */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                4
              </Badge>
              <h3 className="font-semibold">Response Handling</h3>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4">
              <p className="text-sm mb-2">The API will return a Dynamic Block with:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>QR code image (automatically sent to user)</li>
                <li>Version: v2</li>
                <li>Type: instagram</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                ManyChat will automatically display the QR image to the user
              </p>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">Need Help?</h4>
                <p className="text-sm text-purple-700 mb-2">
                  Check ManyChat's documentation on External Request actions
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      'https://manychat.com/blog/external-request-action-api',
                      '_blank'
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View ManyChat Docs
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
