'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  QrCode,
  Settings,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Tool = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
}

type QrStats = {
  total: number
  totalScans: number
  recentScans: number
}

export default function QrToolsListPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [tools, setTools] = useState<Tool[]>([])
  const [toolStats, setToolStats] = useState<Record<string, QrStats>>({})
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const [newToolName, setNewToolName] = useState('')
  const [newToolDescription, setNewToolDescription] = useState('')

  useEffect(() => {
    loadTools()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadTools() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/tools/qr')
      const data = await res.json()

      if (data.success) {
        const loadedTools = data.data?.tools || []
        setTools(loadedTools)

        // Load stats for each tool
        for (const tool of loadedTools) {
          loadToolStats(tool.id)
        }
      }
    } catch (error) {
      console.error('Failed to load QR tools:', error)
      toast({
        title: 'Failed to load tools',
        description: 'Please refresh the page and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadToolStats(toolId: string) {
    try {
      const res = await fetch(`/api/v1/qr/stats?toolId=${toolId}`)
      const data = await res.json()

      if (data.success) {
        setToolStats(prev => ({
          ...prev,
          [toolId]: data.data,
        }))
      }
    } catch (error) {
      console.error(`Failed to load stats for tool ${toolId}:`, error)
    }
  }

  async function handleCreateTool() {
    if (!newToolName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please provide a name for the QR tool.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/v1/tools/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newToolName.trim(),
          description: newToolDescription.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({
          title: 'Tool created',
          description: 'Your new QR tool has been created.',
        })
        setShowCreateDialog(false)
        setNewToolName('')
        setNewToolDescription('')

        // Redirect to the new tool's configuration page
        router.push(`/engagement/qr-tools/${data.data.tool.id}`)
      } else {
        throw new Error(data.error || 'Failed to create tool')
      }
    } catch (error) {
      toast({
        title: 'Failed to create tool',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="mt-1">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">QR Tools</h1>
            <p className="text-sm text-muted-foreground">
              Manage multiple QR campaigns with independent settings and tracking.
            </p>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New QR Tool
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create QR Tool</DialogTitle>
              <DialogDescription>
                Create a new QR tool to manage a campaign with its own format, appearance, and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Promotion 2024"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this QR campaign"
                  rows={3}
                  value={newToolDescription}
                  onChange={(e) => setNewToolDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTool} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tool
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No QR Tools Yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
              Create your first QR tool to start generating QR codes with custom formats, appearance, and tracking.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Your First QR Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const stats = toolStats[tool.id]
            return (
              <Card key={tool.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {tool.name}
                        {!tool.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </CardTitle>
                      {tool.description && (
                        <CardDescription className="mt-1">{tool.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border p-2">
                      <div className="text-2xl font-bold">{stats?.total ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">Codes</div>
                    </div>
                    <div className="rounded-lg border p-2">
                      <div className="text-2xl font-bold">{stats?.totalScans ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">Scans</div>
                    </div>
                    <div className="rounded-lg border p-2">
                      <div className="text-2xl font-bold">{stats?.recentScans ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">30d</div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(tool.createdAt), { addSuffix: true })}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="default" className="flex-1">
                      <Link href={`/engagement/qr-tools/${tool.id}`}>
                        <Settings className="mr-2 h-4 w-4" /> Configure
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={`/engagement/qr-codes?toolId=${tool.id}`}>
                        <QrCode className="mr-2 h-4 w-4" /> View Codes
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
