'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Camera,
  CheckCircle2,
  XCircle,
  Trophy,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Keyboard,
} from 'lucide-react'

export default function CampaignScannerPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const toolId = params.toolId as string

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  async function startScanning() {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScan,
        undefined
      )

      setScanning(true)
    } catch (error) {
      console.error('Error starting scanner:', error)
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please try manual entry.',
        variant: 'destructive',
      })
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      scannerRef.current = null
    }
    setScanning(false)
  }

  async function handleScan(decodedText: string) {
    if (validating) return // Prevent multiple validations

    await validateCode(decodedText)
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return

    await validateCode(manualCode.trim())
    setManualCode('')
  }

  async function validateCode(code: string) {
    try {
      setValidating(true)

      const res = await fetch('/api/v1/qr/campaigns/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (data.success) {
        setLastResult({
          success: true,
          code,
          ...data.data,
        })

        // Show success toast
        if (data.data.isReward) {
          toast({
            title: '🎉 Reward Earned!',
            description: 'Customer earned a reward!',
          })
        } else {
          toast({
            title: 'Valid Code',
            description: `Progress: ${data.data.progress.currentStreak}/${data.data.progress.currentStreak + (data.data.progress.nextRewardIn || 0)}`,
          })
        }
      } else {
        setLastResult({
          success: false,
          code,
          error: data.error,
        })

        toast({
          title: 'Invalid Code',
          description: data.error || 'This QR code could not be validated',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to validate QR code',
        variant: 'destructive',
      })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/engagement/qr-tools/${toolId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Campaign Scanner</h1>
            <p className="text-sm text-muted-foreground">Validate recurring QR codes</p>
          </div>
        </div>

        {/* Scanner Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Point camera at QR code or enter code manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={!manualMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setManualMode(false)
                  if (scanning) stopScanning()
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
              <Button
                variant={manualMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setManualMode(true)
                  if (scanning) stopScanning()
                }}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Manual
              </Button>
            </div>

            {/* Camera Scanner */}
            {!manualMode && (
              <div className="space-y-4">
                {!scanning ? (
                  <Button onClick={startScanning} className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="destructive" className="w-full">
                    Stop Camera
                  </Button>
                )}

                <div
                  id="qr-reader"
                  className="rounded-lg overflow-hidden border-2 border-gray-200"
                />
              </div>
            )}

            {/* Manual Entry */}
            {manualMode && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-code">Enter QR Code</Label>
                  <Input
                    id="manual-code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="COFFEE-ABC123XYZ"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={validating}>
                  {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Validate Code
                </Button>
              </form>
            )}

            {validating && !manualMode && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Validation Result */}
        {lastResult && (
          <Card className={lastResult.success ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {lastResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <CardTitle className={lastResult.success ? 'text-green-700' : 'text-red-700'}>
                  {lastResult.success ? 'Code Validated' : 'Validation Failed'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Code */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Code:</span>
                <Badge variant="outline">{lastResult.code}</Badge>
              </div>

              {lastResult.success && (
                <>
                  {/* Reward Badge */}
                  {lastResult.isReward && (
                    <div className="rounded-lg bg-yellow-100 border-2 border-yellow-500 p-4">
                      <div className="flex items-center gap-2 text-yellow-900">
                        <Trophy className="h-6 w-6" />
                        <div>
                          <div className="font-bold">🎉 Reward Earned!</div>
                          <div className="text-sm">Customer has earned their reward</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Progress</span>
                      <span className="text-lg font-bold">
                        {lastResult.progress.currentStreak}
                        {lastResult.progress.nextRewardIn !== null &&
                          `/${lastResult.progress.currentStreak + lastResult.progress.nextRewardIn}`}
                      </span>
                    </div>

                    {lastResult.progress.nextRewardIn !== null && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all"
                            style={{
                              width: `${
                                (lastResult.progress.currentStreak /
                                  (lastResult.progress.currentStreak +
                                    lastResult.progress.nextRewardIn)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>
                            {lastResult.progress.nextRewardIn === 0
                              ? 'Reward threshold reached!'
                              : `${lastResult.progress.nextRewardIn} more to reward`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Scans</div>
                      <div className="text-2xl font-bold">{lastResult.progress.totalScans}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Rewards Earned</div>
                      <div className="text-2xl font-bold">
                        {lastResult.progress.rewardsEarned}
                      </div>
                    </div>
                  </div>

                  {/* Next Code */}
                  {lastResult.nextCode && (
                    <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        New Code Generated
                      </div>
                      <Badge variant="outline" className="text-lg py-2 px-4">
                        {lastResult.nextCode.code}
                      </Badge>
                      <p className="text-xs text-blue-700 mt-2">
                        Customer receives this code for their next visit
                      </p>
                    </div>
                  )}
                </>
              )}

              {!lastResult.success && (
                <div className="text-sm text-red-600">
                  {lastResult.error || 'Invalid or expired code'}
                </div>
              )}

              {/* Clear Result */}
              <Button
                variant="outline"
                onClick={() => setLastResult(null)}
                className="w-full"
              >
                Scan Another Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
