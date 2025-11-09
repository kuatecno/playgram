import { getCurrentUser } from '@/lib/auth/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, QrCode, Calendar, MessageSquare } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  const stats = [
    {
      title: 'Total Users',
      value: '0',
      description: 'Instagram contacts synced',
      icon: Users,
      change: '+0%',
    },
    {
      title: 'QR Codes',
      value: '0',
      description: 'Generated this month',
      icon: QrCode,
      change: '+0%',
    },
    {
      title: 'Bookings',
      value: '0',
      description: 'Upcoming appointments',
      icon: Calendar,
      change: '+0%',
    },
    {
      title: 'Conversations',
      value: '0',
      description: 'AI chat sessions',
      icon: MessageSquare,
      change: '+0%',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Admin'}! 👋</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your Instagram business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <p className="mt-1 text-xs text-green-600">{stat.change} from last month</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <a
            href="/qr-codes"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <QrCode className="mb-2 h-8 w-8" />
            <h3 className="font-medium">Generate QR Code</h3>
            <p className="text-xs text-muted-foreground">Create a new QR code campaign</p>
          </a>
          <a
            href="/bookings"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Calendar className="mb-2 h-8 w-8" />
            <h3 className="font-medium">Create Booking</h3>
            <p className="text-xs text-muted-foreground">Schedule a new appointment</p>
          </a>
          <a
            href="/contacts"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Users className="mb-2 h-8 w-8" />
            <h3 className="font-medium">Sync Contacts</h3>
            <p className="text-xs text-muted-foreground">Import from Manychat</p>
          </a>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Complete these steps to set up your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </div>
            <div>
              <p className="font-medium">Connect Manychat</p>
              <p className="text-sm text-muted-foreground">Link your Manychat account to sync contacts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs">
              2
            </div>
            <div>
              <p className="font-medium">Create your first tool</p>
              <p className="text-sm text-muted-foreground">Set up QR codes, bookings, or AI chat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs">
              3
            </div>
            <div>
              <p className="font-medium">Configure webhooks</p>
              <p className="text-sm text-muted-foreground">Integrate with your CRM or other tools</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
