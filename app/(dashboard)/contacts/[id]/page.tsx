'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Instagram,
  MessageCircle,
  Users,
  Calendar,
  QrCode,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Tag,
} from 'lucide-react'

interface ContactDetail {
  id: string
  manychatId: string | null
  instagramUsername: string | null
  firstName: string | null
  lastName: string | null
  fullName: string
  profilePic: string | null
  followerCount: number | null
  isSubscribed: boolean
  tags: Array<{
    id: string
    name: string
    manychatId: string | null
  }>
  customFields: Array<{
    id: string
    name: string
    type: string
    description: string | null
    value: string
    updatedAt: string
  }>
  stats: {
    totalBookings: number
    totalQRScans: number
    totalInteractions: number
  }
  recentBookings: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
    tool: {
      id: string
      name: string
      toolType: string
    }
    createdAt: string
  }>
  recentQRScans: Array<{
    id: string
    code: string
    type: string
    scanCount: number
    scannedAt: string | null
    tool: {
      id: string
      name: string
    }
  }>
  interactionHistory: Array<{
    date: string
    messages: number
    comments: number
    storyReplies: number
    flowCompletions: number
    lastActivity: string | null
  }>
  lastInteraction: string | null
  createdAt: string
  updatedAt: string
}

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContact()
  }, [contactId])

  const fetchContact = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/contacts/${contactId}`)
      const data = await response.json()

      if (data.success) {
        setContact(data.data.contact)
      } else {
        alert('Failed to load contact')
        router.back()
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
      alert('Failed to load contact')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatRelativeDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      confirmed: { variant: 'default', icon: CheckCircle2 },
      pending: { variant: 'secondary', icon: Clock },
      completed: { variant: 'outline', icon: CheckCircle2 },
      cancelled: { variant: 'destructive', icon: XCircle },
    }

    const config = statusConfig[status] || { variant: 'secondary' as const, icon: Clock }
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Loading...</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading contact details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Contact Not Found</h1>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{contact.fullName}</h1>
          <p className="text-muted-foreground">Contact Details</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {contact.profilePic ? (
                <img
                  src={contact.profilePic}
                  alt={contact.fullName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{contact.fullName}</CardTitle>
                  <Badge variant={contact.isSubscribed ? 'default' : 'secondary'}>
                    {contact.isSubscribed ? 'Subscribed' : 'Unsubscribed'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {contact.instagramUsername && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Instagram className="h-4 w-4" />
                      <span>@{contact.instagramUsername}</span>
                      {contact.followerCount && (
                        <Badge variant="outline" className="ml-2">
                          {contact.followerCount.toLocaleString()} followers
                        </Badge>
                      )}
                    </div>
                  )}
                  {contact.manychatId && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span>Manychat ID: {contact.manychatId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Interaction</p>
                <p className="font-semibold">{formatRelativeDate(contact.lastInteraction)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-semibold">{new Date(contact.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Interactions</p>
                <p className="font-semibold">{contact.stats.totalInteractions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contact.stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All time bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Code Scans</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contact.stats.totalQRScans}</div>
            <p className="text-xs text-muted-foreground">
              QR codes scanned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contact.stats.totalInteractions}</div>
            <p className="text-xs text-muted-foreground">
              Total interactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({contact.recentBookings.length})</TabsTrigger>
          <TabsTrigger value="qr">QR Codes ({contact.recentQRScans.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Tags */}
          {contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
                <CardDescription>Contact tags from Manychat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-sm">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Fields */}
          {contact.customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Fields</CardTitle>
                <CardDescription>Custom data from Manychat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {contact.customFields.map((field) => (
                    <div key={field.id} className="rounded-lg border p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium">{field.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                      {field.description && (
                        <p className="mb-2 text-xs text-muted-foreground">{field.description}</p>
                      )}
                      <p className="text-lg font-semibold">{field.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated: {formatRelativeDate(field.updatedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {contact.tags.length === 0 && contact.customFields.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No Additional Data</CardTitle>
                <CardDescription>
                  No tags or custom fields have been set for this contact yet
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          {contact.recentBookings.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Bookings</CardTitle>
                <CardDescription>This contact hasn&apos;t made any bookings yet</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contact.recentBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{booking.tool.name}</CardTitle>
                          {getStatusBadge(booking.status)}
                        </div>
                        <CardDescription>
                          {new Date(booking.date).toLocaleDateString()} at {booking.startTime} - {booking.endTime}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{booking.tool.toolType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created: {formatDate(booking.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* QR Codes Tab */}
        <TabsContent value="qr" className="space-y-4">
          {contact.recentQRScans.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No QR Scans</CardTitle>
                <CardDescription>This contact hasn&apos;t scanned any QR codes yet</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contact.recentQRScans.map((qr) => (
                <Card key={qr.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-mono">{qr.code}</CardTitle>
                          <Badge variant="outline">{qr.type}</Badge>
                        </div>
                        <CardDescription>{qr.tool.name}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{qr.scanCount} scans</p>
                        {qr.scannedAt && (
                          <p className="text-xs text-muted-foreground">
                            Last: {formatRelativeDate(qr.scannedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interaction History</CardTitle>
              <CardDescription>Recent activity from Manychat</CardDescription>
            </CardHeader>
            <CardContent>
              {contact.interactionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interaction history available</p>
              ) : (
                <div className="space-y-3">
                  {contact.interactionHistory.map((interaction, index) => {
                    const totalActivity =
                      interaction.messages +
                      interaction.comments +
                      interaction.storyReplies +
                      interaction.flowCompletions

                    if (totalActivity === 0) return null

                    return (
                      <div key={index} className="flex items-start gap-4 rounded-lg border p-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="font-medium">
                              {new Date(interaction.date).toLocaleDateString()}
                            </p>
                            <Badge variant="secondary">{totalActivity} interactions</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                            {interaction.messages > 0 && (
                              <div>
                                <p className="text-muted-foreground">Messages</p>
                                <p className="font-semibold">{interaction.messages}</p>
                              </div>
                            )}
                            {interaction.comments > 0 && (
                              <div>
                                <p className="text-muted-foreground">Comments</p>
                                <p className="font-semibold">{interaction.comments}</p>
                              </div>
                            )}
                            {interaction.storyReplies > 0 && (
                              <div>
                                <p className="text-muted-foreground">Story Replies</p>
                                <p className="font-semibold">{interaction.storyReplies}</p>
                              </div>
                            )}
                            {interaction.flowCompletions > 0 && (
                              <div>
                                <p className="text-muted-foreground">Flow Completions</p>
                                <p className="font-semibold">{interaction.flowCompletions}</p>
                              </div>
                            )}
                          </div>
                          {interaction.lastActivity && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Last activity: {formatDate(interaction.lastActivity)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
