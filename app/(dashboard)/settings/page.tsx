import Link from 'next/link'
import { MessageSquare, Zap, Key, Webhook, Database, Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const settingsPages = [
  {
    title: 'Manychat Integration',
    description: 'Connect and sync your Manychat contacts, tags, and custom fields',
    icon: MessageSquare,
    href: '/settings/manychat',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Flowkick API',
    description: 'Manage API clients for social media data services',
    icon: Zap,
    href: '/settings/flowkick',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'API Keys',
    description: 'Manage verification API keys for external integrations',
    icon: Key,
    href: '/settings/api-keys',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Webhooks',
    description: 'Configure webhook endpoints and CRM integrations',
    icon: Webhook,
    href: '/settings/webhooks',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    title: 'Data Export',
    description: 'Export your data in various formats',
    icon: Database,
    href: '/settings/data-export',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    title: 'Notifications',
    description: 'Manage email and system notifications',
    icon: Bell,
    href: '/settings/notifications',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and integrations
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsPages.map((setting) => {
          const Icon = setting.icon
          return (
            <Link key={setting.href} href={setting.href}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${setting.bgColor}`}
                    >
                      <Icon className={`h-6 w-6 ${setting.color}`} />
                    </div>
                  </div>
                  <CardTitle className="mt-4">{setting.title}</CardTitle>
                  <CardDescription>{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full">
                    Configure →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Check out our documentation for detailed setup guides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Manychat Integration Guide</li>
            <li>• Flowkick API Documentation</li>
            <li>• Webhook Configuration</li>
            <li>• Data Export Formats</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
