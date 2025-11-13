import { getCurrentUser } from '@/lib/auth/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Webhook, AlertCircle } from 'lucide-react'
import { redirect } from 'next/navigation'
import CopyButton from './copy-button'

export default async function WebhookHelperPage() {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect('/login')
  }

  const webhookUrl = 'https://playgram.kua.cl/api/manychat/webhook/contact'

  // JSON body with actual admin_id pre-filled
  const jsonBody = `{
  "admin_id": "${user.id}",
  "subscriber_data": {{subscriber_data|to_json:true}}
}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manychat Webhook Setup</h1>
        <p className="text-muted-foreground">
          Configure your Manychat automation to sync contacts automatically
        </p>
      </div>

      {/* Your Admin ID Card */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle>Your Admin ID</CardTitle>
          </div>
          <CardDescription>
            Use this ID in your Manychat automation webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin ID (Copy this)</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-muted p-4 font-mono text-lg font-bold">
                {user.id}
              </div>
              <CopyButton text={user.id} label="admin_id" />
            </div>
            <p className="text-xs text-muted-foreground">
              This is your unique database admin ID. You&apos;ll need this exact value in your Manychat automation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Step 1: Webhook URL</CardTitle>
          </div>
          <CardDescription>Copy this URL for the External Request action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-muted p-3 font-mono text-sm">
                {webhookUrl}
              </div>
              <CopyButton text={webhookUrl} label="url" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Body Card */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Request Body (JSON)</CardTitle>
          <CardDescription>Copy this exact JSON structure with your admin_id pre-filled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">JSON Body</label>
              <CopyButton text={jsonBody} label="json" />
            </div>
            <div className="rounded-lg bg-muted p-3 font-mono text-xs overflow-x-auto">
              <pre>{jsonBody}</pre>
            </div>
          </div>

          <div className="rounded-lg border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 p-3">
            <h5 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
              ✓ Your admin_id is pre-filled above
            </h5>
            <p className="text-xs text-green-800 dark:text-green-200">
              The <code className="bg-green-100 dark:bg-green-900 px-1 rounded">admin_id</code> field already contains your correct database ID: <strong>{user.id}</strong>
            </p>
          </div>

          <div className="rounded-lg border-2 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 p-3">
            <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to enter subscriber_data in Manychat:
            </h5>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• In Manychat&apos;s JSON body editor, click the &quot;+ Add Full Contact Data&quot; button</li>
              <li>• Select &quot;Full Contact Data&quot; from the dropdown</li>
              <li>• Manychat will automatically format it as <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{subscriber_data|to_json:true}}`}</code></li>
              <li>• Do NOT use quotes around it</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Configure Manychat Automation</CardTitle>
          <CardDescription>Follow these steps to set up the External Request action</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm">
            <li className="pl-2">
              <strong>Open your Manychat flow</strong> where you want to sync contacts
            </li>
            <li className="pl-2">
              <strong>Add an &quot;Action&quot; step</strong> and select &quot;External Request&quot;
            </li>
            <li className="pl-2">
              <strong>Set Request Type to &quot;POST&quot;</strong>
            </li>
            <li className="pl-2">
              <strong>Paste the Webhook URL</strong> from Step 1 above
            </li>
            <li className="pl-2">
              <strong>Add a Custom Header:</strong>
              <div className="ml-6 mt-2 space-y-1 font-mono text-xs bg-muted p-2 rounded">
                <div>Header: <strong>Content-Type</strong></div>
                <div>Value: <strong>application/json</strong></div>
              </div>
            </li>
            <li className="pl-2">
              <strong>Switch to JSON mode</strong> for the Request Body
            </li>
            <li className="pl-2">
              <strong>Copy the entire JSON body</strong> from Step 2 above
              <div className="ml-6 mt-2 text-xs text-muted-foreground">
                ⚠️ Make sure your admin_id (<code className="bg-muted px-1 rounded">{user.id}</code>) is included
              </div>
            </li>
            <li className="pl-2">
              <strong>For subscriber_data:</strong> Click &quot;+ Add Full Contact Data&quot; and select &quot;Full Contact Data&quot;
            </li>
            <li className="pl-2">
              <strong>Test the action</strong> to verify the webhook receives data correctly
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* What Gets Synced Card */}
      <Card>
        <CardHeader>
          <CardTitle>What Gets Synced Automatically</CardTitle>
          <CardDescription>Data synchronized from Manychat to Playgram</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Contact Information:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>✓ First Name & Last Name</li>
                <li>✓ Instagram Username</li>
                <li>✓ Profile Picture URL</li>
                <li>✓ Subscriber Status</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Engagement Data:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>✓ Tags assigned to contact</li>
                <li>✓ Custom field values</li>
                <li>✓ Last interaction timestamp</li>
                <li>✓ Subscription date</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Triggers Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Automation Triggers</CardTitle>
          <CardDescription>Best times to trigger the webhook for contact sync</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span><strong>Welcome Flow:</strong> When a user sends their first message or subscribes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span><strong>Profile Update:</strong> After user completes registration or updates their info</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span><strong>Tag Assignment:</strong> When you add important tags to segment users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span><strong>Custom Field Update:</strong> After collecting important user data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              <span><strong>QR Code Scan:</strong> When user scans a QR code to capture engagement</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
