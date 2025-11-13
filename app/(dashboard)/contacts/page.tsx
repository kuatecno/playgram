'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Search, TrendingUp, UserCheck, UserX, Instagram, MessageCircle, Eye, ChevronLeft, ChevronRight, Download, Webhook } from 'lucide-react'

interface Contact {
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
  }>
  customFields: Record<string, { value: string; type: string }>
  stats: {
    bookings: number
    qrScans: number
    conversations: number
  }
  lastInteraction: string | null
  createdAt: string
}

interface ContactStats {
  total: number
  subscribed: number
  unsubscribed: number
  withManychat: number
  withInstagram: number
  newThisMonth: number
  active: number
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalContacts, setTotalContacts] = useState(0)

  const totalPages = Math.ceil(totalContacts / pageSize)

  useEffect(() => {
    // Reset to page 1 when search or filter changes
    setCurrentPage(1)
  }, [search, filter])

  useEffect(() => {
    fetchContacts()
  }, [search, filter, currentPage])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter !== 'all') {
        params.set('isSubscribed', filter === 'subscribed' ? 'true' : 'false')
      }
      params.set('limit', pageSize.toString())
      params.set('offset', ((currentPage - 1) * pageSize).toString())

      const response = await fetch(`/api/v1/contacts?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setContacts(data.data.contacts)
        setTotalContacts(data.data.total)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/contacts/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const exportToCSV = async () => {
    try {
      setLoading(true)

      // Fetch all contacts with current filters (no pagination)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter !== 'all') {
        params.set('isSubscribed', filter === 'subscribed' ? 'true' : 'false')
      }
      params.set('limit', '10000') // Large limit to get all contacts

      const response = await fetch(`/api/v1/contacts?${params.toString()}`)
      const data = await response.json()

      if (data.success && data.data.contacts.length > 0) {
        const exportContacts = data.data.contacts

        // CSV headers
        const headers = [
          'Full Name',
          'First Name',
          'Last Name',
          'Instagram Username',
          'Manychat ID',
          'Follower Count',
          'Subscription Status',
          'Tags',
          'Total Bookings',
          'Total QR Scans',
          'Total Conversations',
          'Last Interaction',
          'Created At',
        ]

        // CSV rows
        const rows = exportContacts.map((contact: Contact) => [
          contact.fullName,
          contact.firstName || '',
          contact.lastName || '',
          contact.instagramUsername || '',
          contact.manychatId || '',
          contact.followerCount || '',
          contact.isSubscribed ? 'Subscribed' : 'Unsubscribed',
          contact.tags.map(t => t.name).join('; '),
          contact.stats.bookings,
          contact.stats.qrScans,
          contact.stats.conversations,
          contact.lastInteraction ? new Date(contact.lastInteraction).toLocaleString() : 'Never',
          new Date(contact.createdAt).toLocaleString(),
        ])

        // Convert to CSV string
        const csvContent = [
          headers.join(','),
          ...rows.map((row: (string | number)[]) =>
            row.map((cell: string | number) => {
              // Escape cells that contain commas, quotes, or newlines
              const cellStr = String(cell)
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`
              }
              return cellStr
            }).join(',')
          ),
        ].join('\n')

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        alert(`Successfully exported ${exportContacts.length} contacts to CSV`)
      } else {
        alert('No contacts to export')
      }
    } catch (error) {
      console.error('Error exporting contacts:', error)
      alert('Failed to export contacts')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
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

  if (loading && contacts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your Instagram and Manychat contacts
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading contacts...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show only webhook setup if no contacts exist
  if (stats && stats.total === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Get started by syncing your contacts from Manychat
          </p>
        </div>

        {/* Webhook Setup Guide */}
        <Card className="border-2 border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <CardTitle>Automatic Contact Sync</CardTitle>
            </div>
            <CardDescription>
              Set up webhooks to sync contacts automatically from Manychat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
              <p className="text-sm font-medium">
                Get your personalized webhook configuration with step-by-step instructions.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Your unique admin ID (pre-configured)</li>
                <li>✓ Webhook URL ready to copy</li>
                <li>✓ Complete JSON body template</li>
                <li>✓ Detailed Manychat setup guide</li>
              </ul>
            </div>
            <Button asChild className="w-full" size="lg">
              <a href="/settings/manychat/webhook-helper">
                <Webhook className="mr-2 h-5 w-5" />
                Go to Webhook Setup Guide
              </a>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Takes 5 minutes to configure • Syncs contacts in real-time
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your Instagram and Manychat contacts
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={loading || contacts.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newThisMonth} new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.subscribed}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.subscribed / stats.total) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Manychat</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withManychat}</div>
              <p className="text-xs text-muted-foreground">
                Synced from Manychat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                Interacted recently
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or Manychat ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'subscribed' ? 'default' : 'outline'}
                onClick={() => setFilter('subscribed')}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Subscribed
              </Button>
              <Button
                variant={filter === 'unsubscribed' ? 'default' : 'outline'}
                onClick={() => setFilter('unsubscribed')}
              >
                <UserX className="mr-2 h-4 w-4" />
                Unsubscribed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>No Contacts Found</CardTitle>
            </div>
            <CardDescription>
              {search
                ? 'Try adjusting your search criteria'
                : 'Start by syncing contacts from Manychat or creating contacts manually'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {contact.profilePic ? (
                      <img
                        src={contact.profilePic}
                        alt={contact.fullName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{contact.fullName}</CardTitle>
                        <Badge variant={contact.isSubscribed ? 'default' : 'secondary'}>
                          {contact.isSubscribed ? 'Subscribed' : 'Unsubscribed'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {contact.instagramUsername && (
                          <div className="flex items-center gap-1">
                            <Instagram className="h-3 w-3" />
                            @{contact.instagramUsername}
                          </div>
                        )}
                        {contact.manychatId && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            Manychat ID: {contact.manychatId.substring(0, 10)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Last seen: {formatDate(contact.lastInteraction)}</p>
                    <p className="text-xs">Joined: {new Date(contact.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Tags */}
                  {contact.tags.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Fields */}
                  {Object.keys(contact.customFields).length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Custom Fields</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(contact.customFields).map(([name, field]) => (
                          <div key={name} className="rounded-lg border p-2">
                            <p className="text-xs text-muted-foreground">{name}</p>
                            <p className="font-medium">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-6 rounded-lg border p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                      <p className="text-lg font-bold">{contact.stats.bookings}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">QR Scans</p>
                      <p className="text-lg font-bold">{contact.stats.qrScans}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversations</p>
                      <p className="text-lg font-bold">{contact.stats.conversations}</p>
                    </div>
                    {contact.followerCount && (
                      <div>
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="text-lg font-bold">{contact.followerCount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && contacts.length > 0 && totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalContacts)} of {totalContacts} contacts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show first 3 pages, current page with neighbors, and last page
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
