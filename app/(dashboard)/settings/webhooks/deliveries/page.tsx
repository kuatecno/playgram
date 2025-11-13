'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

interface WebhookDelivery {
  id: string
  subscriptionId: string
  subscriptionUrl: string
  event: string
  status: string
  attempts: number
  responseStatus: number | null
  errorMessage: string | null
  createdAt: string
  lastAttemptAt: string | null
}

export default function WebhookDeliveriesPage() {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [eventFilter, setEventFilter] = useState<string>('all')

  useEffect(() => {
    fetchDeliveries()
  }, [filter, eventFilter])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (eventFilter !== 'all') params.set('event', eventFilter)

      const response = await fetch(`/api/v1/webhooks/deliveries?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDeliveries(data.data.deliveries)
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      )
    } else if (status === 'failed') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    }
  }

  const uniqueEvents = Array.from(new Set(deliveries.map(d => d.event)))

  if (loading && deliveries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Webhook Deliveries</h1>
            <p className="text-muted-foreground">View webhook delivery logs and status</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading deliveries...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Webhook Deliveries</h1>
          <p className="text-muted-foreground">View webhook delivery logs and status</p>
        </div>
        <Button onClick={fetchDeliveries} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEvents.map(event => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      {deliveries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Deliveries Found</CardTitle>
            <CardDescription>
              No webhook deliveries match your current filters
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{delivery.event}</CardTitle>
                      {getStatusBadge(delivery.status)}
                    </div>
                    <CardDescription className="text-xs">
                      {delivery.subscriptionUrl}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDate(delivery.createdAt)}</p>
                    {delivery.responseStatus && (
                      <Badge variant="outline" className="mt-1">
                        HTTP {delivery.responseStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Attempts:</span>
                    <Badge variant="secondary">{delivery.attempts}</Badge>
                  </div>
                  {delivery.lastAttemptAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Attempt:</span>
                      <span>{formatDate(delivery.lastAttemptAt)}</span>
                    </div>
                  )}
                  {delivery.errorMessage && (
                    <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <p className="text-xs font-medium text-destructive">Error:</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {delivery.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
