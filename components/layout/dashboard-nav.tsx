'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  Target,
  Smartphone,
  Settings,
  LogOut,
  QrCode,
  Image,
  Calendar,
  MessageSquare,
  Zap,
  Menu,
} from 'lucide-react'

interface DashboardNavProps {
  user: {
    name?: string | null
    email?: string
  }
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  {
    name: 'Engagement',
    icon: Target,
    children: [
      { name: 'Core Flows', href: '/engagement/core-flows', icon: Zap },
      { name: 'QR Tools', href: '/engagement/qr-tools', icon: QrCode },
      { name: 'Dynamic Gallery', href: '/engagement/dynamic-gallery', icon: Image },
      { name: 'Bookings', href: '/engagement/bookings', icon: Calendar },
      { name: 'AI Chat', href: '/engagement/ai-chat', icon: MessageSquare },
    ],
  },
  { name: 'Social', href: '/social', icon: Smartphone },
  { name: 'Settings', href: '/settings', icon: Settings },
]

// Navigation content component - reused for both desktop sidebar and mobile drawer
function NavContent({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string
  user: DashboardNavProps['user']
  onNavigate?: () => void
}) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </div>
                <div className="ml-6 space-y-1">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.name || 'Admin'}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  )
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 lg:hidden dark:bg-gray-800">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-6">
              <SheetTitle>
                <Link href="/dashboard" className="text-xl font-bold">
                  Playgram
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex h-[calc(100vh-5rem)] flex-col">
              <NavContent
                pathname={pathname}
                user={user}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="text-xl font-bold">
          Playgram
        </Link>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-col border-r bg-white dark:bg-gray-800">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-xl font-bold">
            Playgram
          </Link>
        </div>
        <div className="flex flex-col flex-1">
          <NavContent pathname={pathname} user={user} />
        </div>
      </div>
    </>
  )
}
