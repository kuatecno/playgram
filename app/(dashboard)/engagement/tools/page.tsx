'use client'

import { useState, useEffect } from 'react'
import { Plus, ExternalLink, Power, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface Tool {
  id: string
  name: string
  description: string | null
  category: string
  icon: string | null
  url: string | null
  apiEndpoint: string | null
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

interface ToolStats {
  total: number
  active: number
  inactive: number
  totalUsage: number
  byCategory: Array<{
    category: string
    count: number
    usage: number
  }>
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [stats, setStats] = useState<ToolStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    icon: '',
    url: '',
    apiEndpoint: '',
  })

  useEffect(() => {
    fetchTools()
    fetchStats()
  }, [])

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/v1/tools')
      const data = await response.json()

      if (data.success) {
        setTools(data.data.tools)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch tools',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/tools/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingTool ? `/api/v1/tools/${editingTool.id}` : '/api/v1/tools'
      const method = editingTool ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success || response.ok) {
        toast({
          title: 'Success',
          description: editingTool ? 'Tool updated successfully' : 'Tool created successfully',
        })
        setIsCreateDialogOpen(false)
        setEditingTool(null)
        fetchTools()
        fetchStats()
        // Reset form
        setFormData({
          name: '',
          description: '',
          category: '',
          icon: '',
          url: '',
          apiEndpoint: '',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save tool',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save tool',
        variant: 'destructive',
      })
    }
  }

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool)
    setFormData({
      name: tool.name,
      description: tool.description || '',
      category: tool.category,
      icon: tool.icon || '',
      url: tool.url || '',
      apiEndpoint: tool.apiEndpoint || '',
    })
    setIsCreateDialogOpen(true)
  }

  const handleToggleActive = async (toolId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setTools(
          tools.map((t) => (t.id === toolId ? { ...t, isActive: !currentStatus } : t))
        )
        fetchStats()
        toast({
          title: 'Success',
          description: `Tool ${!currentStatus ? 'activated' : 'deactivated'}`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tool',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return

    try {
      const response = await fetch(`/api/v1/tools/${toolId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTools(tools.filter((t) => t.id !== toolId))
        fetchStats()
        toast({
          title: 'Success',
          description: 'Tool deleted successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tool',
        variant: 'destructive',
      })
    }
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingTool(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      icon: '',
      url: '',
      apiEndpoint: '',
    })
  }

  // Group tools by category
  const toolsByCategory = tools.reduce((acc, tool) => {
    const category = tool.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(tool)
    return acc
  }, {} as Record<string, Tool[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tools</h1>
          <p className="text-muted-foreground">
            Manage custom tools and resources for your users
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <form onSubmit={handleCreateTool}>
              <DialogHeader>
                <DialogTitle>{editingTool ? 'Edit Tool' : 'Create New Tool'}</DialogTitle>
                <DialogDescription>
                  {editingTool
                    ? 'Update tool details'
                    : 'Add a new tool or resource for your users'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tool Name *</Label>
                  <Input
                    id="name"
                    placeholder="ROI Calculator"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Calculate your return on investment"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      placeholder="Finance"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                      id="icon"
                      placeholder="calculator"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/tool"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint (Optional)</Label>
                  <Input
                    id="apiEndpoint"
                    type="url"
                    placeholder="https://api.example.com/calculate"
                    value={formData.apiEndpoint}
                    onChange={(e) =>
                      setFormData({ ...formData, apiEndpoint: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingTool ? 'Update Tool' : 'Create Tool'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsage}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byCategory.length}</div>
              <p className="text-xs text-muted-foreground">Different categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Usage/Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round(stats.totalUsage / stats.total) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Per tool</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tools List */}
      {loading ? (
        <div className="text-center py-12">Loading tools...</div>
      ) : tools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No tools yet. Create your first tool to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-3">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTools.map((tool) => (
                  <Card key={tool.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {tool.icon && (
                              <span className="text-lg">{tool.icon}</span>
                            )}
                            <CardTitle className="text-base">{tool.name}</CardTitle>
                          </div>
                          <Badge variant={tool.isActive ? 'success' : 'secondary'}>
                            {tool.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTool(tool)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(tool.id, tool.isActive)}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTool(tool.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {tool.description}
                        </p>
                      )}
                      <div className="space-y-2">
                        {tool.url && (
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open Tool</span>
                          </a>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Usage Count</span>
                          <span className="font-medium">{tool.usageCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
