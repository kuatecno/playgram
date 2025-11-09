'use client'

import { useState, useEffect } from 'react'
import { Plus, Power, Trash2, Brain, TrendingUp } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface TrainingData {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AIStats {
  totalInteractions: number
  totalTokens: number
  recentInteractions: number
  trainingDataCount: number
  byModel: Array<{
    model: string
    interactions: number
    tokensUsed: number
  }>
}

export default function AITrainingPage() {
  const [trainingData, setTrainingData] = useState<TrainingData[]>([])
  const [stats, setStats] = useState<AIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingData, setEditingData] = useState<TrainingData | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    question: '',
    answer: '',
    keywords: '',
  })

  useEffect(() => {
    fetchTrainingData()
    fetchStats()
  }, [])

  const fetchTrainingData = async () => {
    try {
      const response = await fetch('/api/v1/chat/training')
      const data = await response.json()

      if (data.success) {
        setTrainingData(data.data.trainingData)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch training data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/chat/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleCreateTrainingData = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingData
        ? `/api/v1/chat/training/${editingData.id}`
        : '/api/v1/chat/training'
      const method = editingData ? 'PATCH' : 'POST'

      const keywords = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords,
        }),
      })

      const data = await response.json()

      if (data.success || response.ok) {
        toast({
          title: 'Success',
          description: editingData
            ? 'Training data updated successfully'
            : 'Training data created successfully',
        })
        setIsCreateDialogOpen(false)
        setEditingData(null)
        fetchTrainingData()
        fetchStats()
        // Reset form
        setFormData({
          category: '',
          question: '',
          answer: '',
          keywords: '',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save training data',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save training data',
        variant: 'destructive',
      })
    }
  }

  const handleEditTrainingData = (data: TrainingData) => {
    setEditingData(data)
    setFormData({
      category: data.category,
      question: data.question,
      answer: data.answer,
      keywords: data.keywords.join(', '),
    })
    setIsCreateDialogOpen(true)
  }

  const handleToggleActive = async (dataId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/chat/training/${dataId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setTrainingData(
          trainingData.map((d) =>
            d.id === dataId ? { ...d, isActive: !currentStatus } : d
          )
        )
        fetchStats()
        toast({
          title: 'Success',
          description: `Training data ${!currentStatus ? 'activated' : 'deactivated'}`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update training data',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTrainingData = async (dataId: string) => {
    if (!confirm('Are you sure you want to delete this training data?')) return

    try {
      const response = await fetch(`/api/v1/chat/training/${dataId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTrainingData(trainingData.filter((d) => d.id !== dataId))
        fetchStats()
        toast({
          title: 'Success',
          description: 'Training data deleted successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete training data',
        variant: 'destructive',
      })
    }
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingData(null)
    setFormData({
      category: '',
      question: '',
      answer: '',
      keywords: '',
    })
  }

  // Group training data by category
  const dataByCategory = trainingData.reduce((acc, data) => {
    const category = data.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(data)
    return acc
  }, {} as Record<string, TrainingData[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Training Data</h1>
          <p className="text-muted-foreground">
            Manage knowledge base for AI chat assistant
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Training Data
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreateTrainingData}>
              <DialogHeader>
                <DialogTitle>
                  {editingData ? 'Edit Training Data' : 'Add New Training Data'}
                </DialogTitle>
                <DialogDescription>
                  {editingData
                    ? 'Update training data for the AI assistant'
                    : 'Add new knowledge to help the AI answer user questions'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    placeholder="Product Information"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question">Question *</Label>
                  <Input
                    id="question"
                    placeholder="What are your business hours?"
                    value={formData.question}
                    onChange={(e) =>
                      setFormData({ ...formData, question: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer">Answer *</Label>
                  <textarea
                    id="answer"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="We are open Monday-Friday 9AM-5PM EST"
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData({ ...formData, answer: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    placeholder="hours, schedule, open, closed"
                    value={formData.keywords}
                    onChange={(e) =>
                      setFormData({ ...formData, keywords: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Help the AI match questions to this answer
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingData ? 'Update' : 'Add'} Training Data
                </Button>
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
              <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInteractions}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalTokens / 1000).toFixed(1)}K
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalTokens.toLocaleString()} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentInteractions}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trainingDataCount}</div>
              <p className="text-xs text-muted-foreground">Active knowledge</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training Data List */}
      {loading ? (
        <div className="text-center py-12">Loading training data...</div>
      ) : trainingData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No training data yet. Add your first entry to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Training Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(dataByCategory).map(([category, categoryData]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-3">{category}</h2>
              <div className="space-y-3">
                {categoryData.map((data) => (
                  <Card key={data.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{data.question}</CardTitle>
                            <Badge variant={data.isActive ? 'success' : 'secondary'}>
                              {data.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <CardDescription>{data.answer}</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTrainingData(data)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(data.id, data.isActive)}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTrainingData(data.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {data.keywords.length > 0 && (
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {data.keywords.map((keyword, index) => (
                            <Badge key={index} variant="outline">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
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
