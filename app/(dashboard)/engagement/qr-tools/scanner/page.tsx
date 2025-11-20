'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, XCircle, Camera, ArrowLeft } from 'lucide-react'
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

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<QRDetails | null>(null)
  const [validationResult, setValidationResult] = useState<any | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const { toast } = useToast()

  const stopCamera = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const processCode = useCallback(async (decodedText: string) => {
    if (loading) return // Prevent double scans

    setLoading(true)
    setScanning(false) // Pause scanning

    // Extract code if it's a URL
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

    try {
      const res = await fetch(`/api/v1/qr/lookup/${code}`)
      const data = await res.json()

      if (data.success) {
        setScanResult(data.data)
        stopCamera()
      } else {
        toast({
          title: 'QR Code Not Found',
          description: 'The scanned code does not exist in the system.',
          variant: 'destructive',
        })
        // Resume scanning
        setScanning(true)
      }
    } catch (error) {
      toast({
        title: 'Lookup Failed',
        description: 'Could not verify QR code details.',
        variant: 'destructive',
      })
      setScanning(true)
    } finally {
      setLoading(false)
    }
  }, [loading, toast, stopCamera])

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanning) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Only scan if video is ready
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })

      if (code && code.data) {
        processCode(code.data)
        return // Stop scanning after successful read
      }
    }

    // Continue scanning
    if (scanning) {
      animationFrameRef.current = requestAnimationFrame(scanFrame)
    }
  }, [scanning, processCode])

  useEffect(() => {
    if (scanning && cameraStarted && !scanResult) {
      // Start camera
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        })
        .then((stream) => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
          }
          setCameraError(null)
          // Start scanning loop
          animationFrameRef.current = requestAnimationFrame(scanFrame)
        })
        .catch((err) => {
          console.error('Camera access error:', err)
          setCameraError(err.message || 'Could not access camera')
          toast({
            title: 'Camera Error',
            description: 'Could not access camera. Please check permissions.',
            variant: 'destructive',
          })
          setScanning(false)
          setCameraStarted(false)
        })
    }

    // Cleanup
    return () => {
      stopCamera()
    }
  }, [scanning, cameraStarted, scanResult, scanFrame, toast, stopCamera])

  const handleStartCamera = () => {
    setScanning(true)
    setCameraStarted(true)
  }

  async function handleValidate() {
    if (!scanResult) return

    setProcessing(true)
    try {
      const res = await fetch('/api/v1/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: scanResult.code }),
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
    setShowManualEntry(false)
    setScanning(false)
    setCameraStarted(false)
    setCameraError(null)
    stopCamera()
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
    try {
      const res = await fetch(`/api/v1/qr/lookup/${manualCode.trim()}`)
      const data = await res.json()

      if (data.success) {
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

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/engagement/qr-tools">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Link>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 sm:h-6 sm:w-6" /> QR Scanner
            </h1>
        </div>
      </div>

      {!cameraStarted && !showManualEntry && !scanResult && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Ready to Scan</h3>
              <p className="text-sm text-muted-foreground">Choose how you want to validate a QR code</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0">
              <Button onClick={handleStartCamera} className="w-full sm:w-auto">
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualEntry(true)}
                className="w-full sm:w-auto"
              >
                Enter Code Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scanning && cameraStarted && !showManualEntry && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="relative w-full aspect-square max-w-md mx-auto rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-primary/50">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
                </div>
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Position the QR code within the frame to scan.
            </p>
            {cameraError && (
              <p className="text-center text-sm text-destructive mt-2">
                Error: {cameraError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  stopCamera()
                  setScanning(false)
                  setCameraStarted(false)
                  setShowManualEntry(true)
                }}
                className="w-full sm:w-auto"
              >
                Enter Code Manually
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                placeholder="e.g., RNNIMYKGQ1"
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
            <Button
              onClick={handleManualLookup}
              disabled={loading}
              className="flex-1"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lookup Code
            </Button>
          </CardFooter>
        </Card>
      )}

      {scanResult && (
        <Card className="animate-in fade-in zoom-in duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>Scan Result</CardTitle>
                <Badge variant={scanResult.status === 'valid' ? 'default' : 'destructive'}>
                    {scanResult.status === 'valid' ? 'Ready to Validate' : 'Invalid / Expired'}
                </Badge>
            </div>
            <CardDescription>
                Review details before confirming validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                                {scanResult.user.username && <span className="text-muted-foreground text-xs">({scanResult.user.username})</span>}
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
                        {scanResult.maxScans && <span className="text-muted-foreground"> / {scanResult.maxScans}</span>}
                    </p>
                </div>
                 {scanResult.failureReason && (
                    <div className="col-span-2 bg-destructive/10 p-3 rounded-md text-destructive text-sm font-medium">
                        ⚠️ Issue: {scanResult.failureReason.replace('_', ' ')}
                    </div>
                )}
            </div>

            {validationResult && (
                 <div className={`p-4 rounded-md border ${validationResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                        {validationResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        {validationResult.success ? 'Validated Successfully' : 'Validation Failed'}
                    </div>
                    <p className="text-sm">{validationResult.data?.message || 'Operation completed.'}</p>

                    {validationResult.data?.fieldsUpdated > 0 && (
                        <p className="text-xs mt-2 opacity-80">Updated {validationResult.data.fieldsUpdated} fields in ManyChat.</p>
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
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {scanResult.status === 'valid' ? 'Confirm Validation' : 'Force Validate'}
                </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
