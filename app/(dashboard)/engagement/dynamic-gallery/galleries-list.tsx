'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  MoreVertical,
  Tags,
  Calendar,
  Image,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Gallery {
  id: string
  toolId: string
  name: string
  displayOrder: number | null
  autoSyncEnabled: boolean
  ingestMode: string
  lastSyncedAt: string | null
  lastSyncStatus: string | null
  cardCount: number
  version: number
  triggers: Array<{
    id: string
    triggerType: string
    triggerKey: string
  }>
  stats: {
    snapshotCount: number
    sourceCount: number
    syncLogCount: number
  }
  createdAt: string
  updatedAt: string
}

export default function GalleriesList() {
  const router = useRouter()
  const { toast } = useToast()
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', displayOrder: '' })

  useEffect(() => {
    fetchGalleries()
  }, [])

  async function fetchGalleries() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/v1/dynamic-gallery/galleries')
      const data = await res.json()

      if (data.success) {
        setGalleries(data.data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load galleries',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load galleries',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateGallery() {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Gallery name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      const res = await fetch('/api/v1/dynamic-gallery/galleries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Gallery created successfully',
        })
        setIsCreateDialogOpen(false)
        setFormData({ name: '', displayOrder: '' })
        fetchGalleries()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create gallery',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create gallery',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateGallery() {
    if (!selectedGallery || !formData.name.trim()) return

    try {
      setIsSaving(true)
      const res = await fetch(`/api/v1/dynamic-gallery/galleries/${selectedGallery.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Gallery updated successfully',
        })
        setIsEditDialogOpen(false)
        setSelectedGallery(null)
        setFormData({ name: '', displayOrder: '' })
        fetchGalleries()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update gallery',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update gallery',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteGallery() {
    if (!selectedGallery) return

    try {
      setIsSaving(true)
      const res = await fetch(`/api/v1/dynamic-gallery/galleries/${selectedGallery.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Gallery deleted successfully',
        })
        setIsDeleteDialogOpen(false)
        setSelectedGallery(null)
        fetchGalleries()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete gallery',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete gallery',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function openEditDialog(gallery: Gallery) {
    setSelectedGallery(gallery)
    setFormData({
      name: gallery.name,
      displayOrder: gallery.displayOrder?.toString() || '',
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(gallery: Gallery) {
    setSelectedGallery(gallery)
    setIsDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dynamic Galleries</h1>
          <p className="text-muted-foreground">
            Manage multiple galleries with different triggers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchGalleries}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Gallery
          </Button>
        </div>
      </div>

      {galleries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Image className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No galleries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first gallery to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Gallery
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <Card key={gallery.id} className="relative hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{gallery.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {gallery.cardCount} cards · v{gallery.version}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/engagement/dynamic-gallery/${gallery.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(gallery)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(gallery)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {gallery.lastSyncStatus && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        gallery.lastSyncStatus === 'success'
                          ? 'success'
                          : gallery.lastSyncStatus === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {gallery.lastSyncStatus}
                    </Badge>
                    {gallery.lastSyncedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(gallery.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                {gallery.triggers.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tags className="h-3 w-3" />
                      <span>Triggers:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {gallery.triggers.slice(0, 3).map((trigger) => (
                        <Badge key={trigger.id} variant="outline" className="text-xs">
                          {trigger.triggerKey}
                        </Badge>
                      ))}
                      {gallery.triggers.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{gallery.triggers.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div>
                    <div className="text-lg font-semibold">{gallery.stats.snapshotCount}</div>
                    <div className="text-xs text-muted-foreground">Versions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{gallery.stats.sourceCount}</div>
                    <div className="text-xs text-muted-foreground">Sources</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{gallery.stats.syncLogCount}</div>
                    <div className="text-xs text-muted-foreground">Syncs</div>
                  </div>
                </div>

                <Button
                  className="w-full mt-2"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/engagement/dynamic-gallery/${gallery.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Manage Gallery
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Gallery Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Gallery</DialogTitle>
            <DialogDescription>
              Create a new gallery to organize your ManyChat cards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Gallery Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Menu, Events, Products"
              />
            </div>
            <div>
              <Label htmlFor="displayOrder">Display Order (optional)</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                placeholder="1, 2, 3..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGallery} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Gallery Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gallery</DialogTitle>
            <DialogDescription>Update gallery name and display order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Gallery Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-displayOrder">Display Order</Label>
              <Input
                id="edit-displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGallery} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Gallery Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gallery</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedGallery?.name}"? This action cannot be
              undone and will delete all snapshots, sources, and sync logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGallery} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
