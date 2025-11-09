import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { QrCode, Calendar, MessageSquare, Users, Target, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: QrCode,
      title: 'QR Codes',
      description: 'Generate and track dynamic QR codes for promotions and events',
    },
    {
      icon: Calendar,
      title: 'Bookings',
      description: 'Manage appointments with calendar integration',
    },
    {
      icon: MessageSquare,
      title: 'AI Chat',
      description: 'OpenAI-powered conversations with your customers',
    },
    {
      icon: Users,
      title: 'Contact Management',
      description: 'Sync and manage your Instagram audience from Manychat',
    },
    {
      icon: Target,
      title: 'Social Data',
      description: 'Access Instagram, TikTok, and Google Reviews data',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Comprehensive reporting and insights',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Playgram</span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Modern Instagram Business Management Platform
          </p>
          <p className="mx-auto mb-12 max-w-2xl text-muted-foreground">
            Manage your Instagram business with powerful tools including QR codes, booking systems,
            AI chat, and comprehensive social media analytics.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-base">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white px-4 py-24 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Everything you need to manage your Instagram business</h2>
            <p className="mt-4 text-muted-foreground">
              Powerful features to engage your audience and grow your business
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-lg"
                >
                  <Icon className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary px-4 py-16 text-center text-primary-foreground">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-3xl font-bold">Ready to get started?</h2>
          <p className="mb-8 text-lg opacity-90">
            Join businesses already using Playgram to manage their Instagram presence
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-base">
              Create Your Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
