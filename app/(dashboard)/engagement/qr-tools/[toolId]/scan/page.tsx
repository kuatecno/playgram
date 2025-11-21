'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, XCircle, Camera, ArrowLeft, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

type QRDetails = {
  id: string
  code: string
  type: string
  status: 'valid' | 'invalid'
  failureReason?: string
  scannedAt: string | null
  expiresAt: string | null
  scanCount: number
  maxScans: number | null
  tool: {
    id: string
    name: string
  }
  user: {
    id: string
    name: string
    username: string | null
    manychatId: string | null
  } | null
  metadata: any
}

type ToolInfo = {
  id: string
  name: string
  description: string | null
  type: string
  formatPattern: string | null
  scannerInstructions: string | null
  displayFields: string[] | null
}

export default function ToolScannerPage() {
  const params = useParams()
  const toolId = params.toolId as string

  const [toolInfo, setToolInfo] = useState<ToolInfo | null>(null)
  const [loadingTool, setLoadingTool] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<QRDetails | null>(null)
  const [validationResult, setValidationResult] = useState<any | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [rawScannedData, setRawScannedData] = useState<string | null>(null)
  const [parsedFields, setParsedFields] = useState<Record<string, string> | null>(null)

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const { toast } = useToast()

  // Fetch tool information
  useEffect(() => {
    async function fetchToolInfo() {
      try {
        const res = await fetch(`/api/v1/qr/tools/${toolId}`)
        const data = await res.json()

        if (data.success) {
          setToolInfo(data.data)
        } else {
          toast({
            title: 'Tool Not Found',
            description: 'Could not load QR tool information.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load tool information.',
          variant: 'destructive',
        })
      } finally {
        setLoadingTool(false)
      }
    }

    fetchToolInfo()
  }, [toolId, toast])

  useEffect(() => {
    // Initialize scanner only if we are in scanning mode and haven't initialized yet
    if (scanning && !scannerRef.current && cameraStarted) {
      const screenWidth = window.innerWidth
      const qrboxSize = Math.min(250, screenWidth * 0.7)

      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        false
      )

      scanner.render(onScanSuccess, onScanFailure)
      scannerRef.current = scanner
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          console.error("Failed to clear scanner", e)
        }
        scannerRef.current = null
      }
    }
  }, [scanning, cameraStarted])

  const parseQRCode = (code: string, pattern: string | null): Record<string, string> | null => {
    if (!pattern) return null

    // Convert pattern to regex
    // Replace {{variable}} with capture groups
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\\\{\\\{([^}]+)\\\}\\\}/g, (_, varName) => {
        // Match the variable type
        if (varName.startsWith('random:')) {
          const length = parseInt(varName.split(':')[1])
          return `([A-Z0-9]{${length}})`
        } else if (varName === 'timestamp') {
          return '(\\d+)'
        } else if (varName === 'date') {
          return '(\\d{4}-\\d{2}-\\d{2})'
        } else {
          return '([^-]+)'
        }
      })

    const regex = new RegExp(`^${regexPattern}$`)
    const match = code.match(regex)

    if (!match) return null

    // Extract variable names and values
    const variables: Record<string, string> = {}
    const varNames = (pattern.match(/\{\{([^}]+)\}\}/g) || []).map(v =>
      v.replace('{{', '').replace('}}', '')
    )

    varNames.forEach((varName, index) => {
      const value = match[index + 1]
      if (value) {
        // Clean up variable name for display
        const displayName = varName
          .replace(/^random:\d+$/, 'code')
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        variables[displayName] = value
      }
    })

    return variables
  }

  const handleStartCamera = () => {
    setScanning(true)
    setCameraStarted(true)
  }

  async function onScanSuccess(decodedText: string, _decodedResult: any) {
    if (loading) return

    if (scannerRef.current) {
      scannerRef.current.pause(true)
    }

    setLoading(true)

    let code = decodedText
    try {
      if (decodedText.includes('/scan/') || decodedText.includes('?code=')) {
        const url = new URL(decodedText)
        if (decodedText.includes('?code=')) {
          code = url.searchParams.get('code') || code
        } else {
          const parts = url.pathname.split('/')
          code = parts[parts.length - 1] || code
        }
      }
    } catch (e) {
      // Not a URL, use raw text
    }

    console.log(`Scanned code: ${code}`)
    setRawScannedData(code)

    // Parse the code if we have a format pattern
    if (toolInfo?.formatPattern) {
      const parsed = parseQRCode(code, toolInfo.formatPattern)
      setParsedFields(parsed)
    }

    try {
      const res = await fetch(`/api/v1/qr/lookup/${code}?toolId=${toolId}`)
      const data = await res.json()

      if (data.success) {
        // Verify it belongs to this tool
        if (data.data.tool.id !== toolId) {
          toast({
            title: 'Wrong Tool',
            description: `This QR code belongs to "${data.data.tool.name}", not "${toolInfo?.name}".`,
            variant: 'destructive',
          })
          if (scannerRef.current) {
            scannerRef.current.resume()
          }
          return
        }

        setScanResult(data.data)
        setScanning(false)
      } else {
        toast({
          title: 'QR Code Not Found',
          description: 'The scanned code does not exist in the system.',
          variant: 'destructive',
        })
        if (scannerRef.current) {
          scannerRef.current.resume()
        }
      }
    } catch (error) {
      toast({
        title: 'Lookup Failed',
        description: 'Could not verify QR code details.',
        variant: 'destructive',
      })
      if (scannerRef.current) {
        scannerRef.current.resume()
      }
    } finally {
      setLoading(false)
    }
  }

  function onScanFailure(_error: any) {
    // Ignore scan failures
  }

  async function handleValidate() {
    if (!scanResult) return

    setProcessing(true)
    try {
      const res = await fetch('/api/v1/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: scanResult.code, toolId }),
      })

      const data = await res.json()
      setValidationResult(data)

      if (data.success) {
        toast({
          title: 'Validation Successful',
          description: 'QR code has been validated.',
        })
      } else {
        toast({
          title: 'Validation Failed',
          description: data.data?.message || 'Could not validate QR code.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  function handleReset() {
    setScanResult(null)
    setValidationResult(null)
    setManualCode('')
    setRawScannedData(null)
    setParsedFields(null)
    setShowManualEntry(false)
    setScanning(false)
    setCameraStarted(false)
  }

  async function handleManualLookup() {
    if (!manualCode.trim()) {
      toast({
        title: 'Code Required',
        description: 'Please enter a QR code.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setRawScannedData(manualCode.trim())

    // Parse the code
    if (toolInfo?.formatPattern) {
      const parsed = parseQRCode(manualCode.trim(), toolInfo.formatPattern)
      setParsedFields(parsed)
    }

    try {
      const res = await fetch(`/api/v1/qr/lookup/${manualCode.trim()}?toolId=${toolId}`)
      const data = await res.json()

      if (data.success) {
        if (data.data.tool.id !== toolId) {
          toast({
            title: 'Wrong Tool',
            description: `This QR code belongs to "${data.data.tool.name}", not "${toolInfo?.name}".`,
            variant: 'destructive',
          })
          return
        }

        setScanResult(data.data)
        setScanning(false)
        setShowManualEntry(false)
      } else {
        toast({
          title: 'QR Code Not Found',
          description: 'The code does not exist in the system.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Lookup Failed',
        description: 'Could not verify QR code details.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingTool) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!toolInfo) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Tool Not Found</CardTitle>
            <CardDescription>The requested QR tool could not be loaded.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/engagement/qr-tools">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to QR Tools
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/engagement/qr-tools/${toolId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 sm:h-6 sm:w-6" /> {toolInfo.name}
            </h1>
            {toolInfo.description && (
              <p className="text-sm text-muted-foreground mt-1">{toolInfo.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tool Info Card */}
      {!cameraStarted && !showManualEntry && !scanResult && (
        <>
          {(toolInfo.formatPattern || toolInfo.scannerInstructions) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Scanner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {toolInfo.formatPattern && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Expected Format</span>
                    <p className="font-mono text-sm mt-1 p-2 bg-background rounded border">
                      {toolInfo.formatPattern}
                    </p>
                  </div>
                )}
                {toolInfo.scannerInstructions && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Instructions</span>
                    <p className="text-sm mt-1">{toolInfo.scannerInstructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <Camera className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Ready to Scan</h3>
                <p className="text-sm text-muted-foreground">
                  Scan a QR code for {toolInfo.name}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleStartCamera}>
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
                <Button variant="outline" onClick={() => setShowManualEntry(true)}>
                  Enter Code Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Scanner */}
      {scanning && cameraStarted && !showManualEntry && (
        <Card>
          <CardContent className="p-6">
            <div id="reader" className="w-full rounded-lg overflow-hidden bg-black"></div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Position the QR code within the frame to scan.
            </p>
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setScanning(false)
                  setCameraStarted(false)
                  setShowManualEntry(true)
                }}
              >
                Enter Code Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry */}
      {showManualEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Code Entry</CardTitle>
            <CardDescription>
              Enter the QR code manually if camera is not available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manualCode">QR Code</Label>
              <Input
                id="manualCode"
                placeholder={toolInfo.formatPattern || "Enter code..."}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualLookup()
                  }
                }}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowManualEntry(false)
                setCameraStarted(false)
              }}
              className="flex-1"
            >
              Back
            </Button>
            <Button onClick={handleManualLookup} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lookup Code
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Scan Result */}
      {scanResult && (
        <Card className="animate-in fade-in zoom-in duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scan Result</CardTitle>
              <Badge variant={scanResult.status === 'valid' ? 'default' : 'destructive'}>
                {scanResult.status === 'valid' ? 'Ready to Validate' : 'Invalid / Expired'}
              </Badge>
            </div>
            <CardDescription>Review details before confirming validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parsed Fields */}
            {parsedFields && Object.keys(parsedFields).length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(parsedFields).map(([field, value]) => (
                  <div key={field} className="p-3 bg-primary/5 rounded-md border border-primary/20">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                      {field}
                    </span>
                    <p className="font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Raw Code */}
            {rawScannedData && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Raw Code Data
                </summary>
                <p className="font-mono text-xs mt-2 p-2 bg-muted rounded border break-all">
                  {rawScannedData}
                </p>
              </details>
            )}

            {/* Standard Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Campaign / Tool</span>
                <p className="font-medium">{scanResult.tool.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">QR Type</span>
                <p className="font-medium capitalize">{scanResult.type}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Assigned User</span>
                <p className="font-medium">
                  {scanResult.user ? (
                    <span className="flex items-center gap-2">
                      {scanResult.user.name}
                      {scanResult.user.username && (
                        <span className="text-muted-foreground text-xs">
                          ({scanResult.user.username})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">Unassigned</span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Scan Count</span>
                <p className="font-medium">
                  {scanResult.scanCount}
                  {scanResult.maxScans && (
                    <span className="text-muted-foreground"> / {scanResult.maxScans}</span>
                  )}
                </p>
              </div>
              {scanResult.failureReason && (
                <div className="col-span-2 bg-destructive/10 p-3 rounded-md text-destructive text-sm font-medium">
                  ⚠️ Issue: {scanResult.failureReason.replace('_', ' ')}
                </div>
              )}
            </div>

            {/* Validation Result */}
            {validationResult && (
              <div
                className={`p-4 rounded-md border ${
                  validationResult.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {validationResult.success ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  {validationResult.success ? 'Validated Successfully' : 'Validation Failed'}
                </div>
                <p className="text-sm">{validationResult.data?.message || 'Operation completed.'}</p>
                {validationResult.data?.fieldsUpdated > 0 && (
                  <p className="text-xs mt-2 opacity-80">
                    Updated {validationResult.data.fieldsUpdated} fields in ManyChat.
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button variant="outline" onClick={handleReset} className="w-full">
              {validationResult ? 'Scan Another' : 'Cancel / Rescan'}
            </Button>
            {!validationResult && (
              <Button
                onClick={handleValidate}
                disabled={processing || scanResult.status !== 'valid'}
                className="w-full"
                variant={scanResult.status === 'valid' ? 'default' : 'secondary'}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {scanResult.status === 'valid' ? 'Confirm Validation' : 'Force Validate'}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
