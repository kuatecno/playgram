import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Webhook } from 'lucide-react'

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground">
          Configure webhook endpoints and CRM integrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Coming Soon</CardTitle>
          </div>
          <CardDescription>
            Webhook configuration is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will allow you to configure webhooks to send real-time data to your CRM
            or other external systems when events occur in Playgram.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
