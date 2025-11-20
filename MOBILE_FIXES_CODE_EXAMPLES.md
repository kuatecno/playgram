# Mobile Responsiveness - Code Fix Examples

## Issue 1: Fixed Sidebar Navigation (CRITICAL)

### Current Problem
```tsx
// app/(dashboard)/layout.tsx
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardNav user={user} />  {/* w-64 fixed width */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
```

### Recommended Fix
Create a responsive layout with mobile drawer:

```tsx
// app/(dashboard)/layout.tsx
'use client'

import { useState } from 'react'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden md:flex md:w-64 md:flex-col md:border-r">
        <DashboardNav user={user} />
      </div>

      {/* Mobile Navigation - Drawer/Sheet */}
      <MobileNav 
        open={mobileMenuOpen} 
        onOpenChange={setMobileMenuOpen}
        user={user}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header with Menu Button */}
        <div className="flex md:hidden items-center border-b bg-white dark:bg-gray-800 px-4 py-3 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
          <span className="text-lg font-semibold">Playgram</span>
        </div>

        {/* Content Container - Responsive Padding */}
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

### New Mobile Navigation Component
```tsx
// components/layout/mobile-nav.tsx
'use client'

import Link from 'next/link'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { navigation } from './dashboard-nav' // Reuse nav structure

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    name?: string | null
    email?: string
  }
}

export function MobileNav({ open, onOpenChange, user }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-xl font-bold">
            Playgram
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            if (item.children) {
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  <div className="ml-6 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
                      >
                        <child.icon className="h-4 w-4" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user.name || 'Admin'}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Issue 2: Missing Viewport Meta Tag

### Current Problem
```tsx
// app/layout.tsx - Missing viewport config
export const metadata: Metadata = {
  title: 'Playgram - Instagram Business Management',
  description: 'Modern Instagram business management platform...',
}
```

### Fix
```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Playgram - Instagram Business Management',
  description: 'Modern Instagram business management platform with QR codes, bookings, and AI chat',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
}
```

---

## Issue 3: Fixed Dialog Width on Mobile

### Current Problem
```tsx
// Multiple pages use:
<DialogContent className="sm:max-w-[525px]">
  {/* No constraint on mobile < 640px */}
</DialogContent>
```

### Fix
```tsx
// Consistent dialog sizing across all pages
<DialogContent className="max-w-xs sm:max-w-[525px]">
  {/* Mobile: max-w-xs (320px max), Desktop: 525px */}
</DialogContent>

// For larger forms:
<DialogContent className="max-w-sm sm:max-w-[600px]">
</DialogContent>

// For very large content:
<DialogContent className="max-w-lg sm:max-w-3xl max-h-[80vh] overflow-y-auto">
</DialogContent>
```

---

## Issue 4: Fixed Padding Too Large

### Current Problem
```tsx
// app/(dashboard)/layout.tsx
<div className="container mx-auto p-6">
  {children}
</div>
```

### Fix
```tsx
// Responsive padding based on screen size
<div className="container mx-auto p-4 sm:p-6 md:p-8">
  {children}
</div>

// Or more granular:
<div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8">
  {children}
</div>
```

---

## Issue 5: Contact Cards Not Mobile Optimized

### Current Problem
```tsx
// app/(dashboard)/contacts/page.tsx (line 416)
<div className="flex items-start justify-between">
  {/* Left side: avatar + info */}
  <div className="flex items-start gap-4">
    {/* Right side: last seen info - wraps poorly */}
  </div>
  <div className="text-right text-sm text-muted-foreground">
    <p>Last seen: {formatDate(contact.lastInteraction)}</p>
  </div>
</div>
```

### Fix
```tsx
// Responsive layout that stacks on mobile
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  {/* Left side */}
  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
    {contact.profilePic ? (
      <img
        src={contact.profilePic}
        alt={contact.fullName}
        className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-full object-cover"
      />
    ) : (
      <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
        <Users className="h-5 w-5 text-primary" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base sm:text-lg">{contact.fullName}</CardTitle>
          <Badge variant={contact.isSubscribed ? 'default' : 'secondary'}>
            {contact.isSubscribed ? 'Sub' : 'Unsub'}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          {contact.instagramUsername && (
            <div className="flex items-center gap-1">
              <Instagram className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">@{contact.instagramUsername}</span>
            </div>
          )}
          {contact.manychatId && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">MC: {contact.manychatId.substring(0, 6)}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

  {/* Right side */}
  <div className="text-right text-xs sm:text-sm text-muted-foreground flex-shrink-0">
    <p>Last: {formatDate(contact.lastInteraction)}</p>
    <p className="text-xs">Joined: {new Date(contact.createdAt).toLocaleDateString()}</p>
  </div>
</div>
```

---

## Issue 6: Button Groups Not Stacking on Mobile

### Current Problem
```tsx
// QR Tools page (line 215)
<div className="flex gap-2">
  <Button asChild variant="outline">
    <Link href="/engagement/qr-tools/scanner">
      <Camera className="mr-2 h-4 w-4" /> Open Scanner
    </Link>
  </Button>
  <Button>
    <Plus className="mr-2 h-4 w-4" /> New QR Tool
  </Button>
</div>
```

### Fix
```tsx
// Stack on mobile, side by side on desktop
<div className="flex flex-col gap-2 sm:flex-row">
  <Button asChild variant="outline" className="flex-1 sm:flex-none">
    <Link href="/engagement/qr-tools/scanner">
      <Camera className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">Open Scanner</span>
      <span className="inline sm:hidden">Scanner</span>
    </Link>
  </Button>
  <Button className="flex-1 sm:flex-none">
    <Plus className="mr-2 h-4 w-4" />
    <span className="hidden sm:inline">New QR Tool</span>
    <span className="inline sm:hidden">New</span>
  </Button>
</div>
```

---

## Issue 7: QR Scanner Responsive Dimensions

### Current Problem
```tsx
// app/(dashboard)/engagement/qr-tools/scanner/page.tsx (lines 57-62)
const scanner = new Html5QrcodeScanner(
  "reader",
  { 
    fps: 10, 
    qrbox: { width: 250, height: 250 },  // Fixed 250x250 on all screens
    aspectRatio: 1.0,
  },
  false
)
```

### Fix
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query' // Or implement check

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')
  
  useEffect(() => {
    if (scanning && !scannerRef.current && cameraStarted) {
      // Dynamic QR box size based on screen width
      const qrSize = isMobile ? 180 : 250
      
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: qrSize, height: qrSize },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        false
      )
      
      scanner.render(onScanSuccess, onScanFailure)
      scannerRef.current = scanner
    }
  }, [scanning, cameraStarted, isMobile])
}
```

---

## Issue 8: Filter Bar Not Responsive

### Current Problem
```tsx
// app/(dashboard)/contacts/page.tsx (line 358)
<div className="flex gap-4">
  <div className="flex-1">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <Input placeholder="Search..." className="pl-9" />
    </div>
  </div>
  <div className="flex gap-2">
    <Button>All</Button>
    <Button>Subscribed</Button>
    <Button>Unsubscribed</Button>
  </div>
</div>
```

### Fix
```tsx
// Stack on mobile, flex on desktop
<div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
  <div className="flex-1">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by name, username, or ID..."
        className="pl-9 text-sm"
      />
    </div>
  </div>
  <div className="flex gap-1 sm:gap-2">
    <Button
      variant={filter === 'all' ? 'default' : 'outline'}
      onClick={() => setFilter('all')}
      className="text-xs sm:text-sm px-2 sm:px-4"
    >
      <span className="hidden sm:inline">All</span>
      <span className="inline sm:hidden">A</span>
    </Button>
    <Button
      variant={filter === 'subscribed' ? 'default' : 'outline'}
      onClick={() => setFilter('subscribed')}
      className="text-xs sm:text-sm px-2 sm:px-4"
    >
      <UserCheck className="h-3 w-3 sm:hidden mr-0" />
      <span className="hidden sm:inline">
        <UserCheck className="inline h-4 w-4 mr-2" />
        Subscribed
      </span>
      <span className="inline sm:hidden">Y</span>
    </Button>
    <Button
      variant={filter === 'unsubscribed' ? 'default' : 'outline'}
      onClick={() => setFilter('unsubscribed')}
      className="text-xs sm:text-sm px-2 sm:px-4"
    >
      <UserX className="h-3 w-3 sm:hidden mr-0" />
      <span className="hidden sm:inline">
        <UserX className="inline h-4 w-4 mr-2" />
        Unsubscribed
      </span>
      <span className="inline sm:hidden">N</span>
    </Button>
  </div>
</div>
```

---

## Issue 9: Tailwind Config Mobile Padding

### Current Problem
```ts
// tailwind.config.ts
const config: Config = {
  theme: {
    container: {
      center: true,
      padding: '2rem',  // 32px - too large on mobile
      screens: {
        '2xl': '1400px',
      },
    },
  },
}
```

### Fix
```ts
// tailwind.config.ts
const config: Config = {
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',    // 16px on mobile (xs)
        sm: '1.5rem',       // 24px on small devices
        md: '2rem',         // 32px on tablets
        lg: '2.5rem',       // 40px on desktops
        xl: '3rem',         // 48px on large screens
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
  },
}
```

---

## Summary Checklist

- [ ] Create responsive dashboard layout with mobile drawer
- [ ] Add viewport meta tag to root layout
- [ ] Fix all dialog max-widths
- [ ] Update dashboard container padding to be responsive
- [ ] Refactor contact cards for mobile stacking
- [ ] Update button groups to stack on mobile
- [ ] Add dynamic QR scanner sizing
- [ ] Make filter bars responsive
- [ ] Update tailwind config with mobile-first padding
- [ ] Test on multiple devices (320px, 375px, 425px, 768px, 1024px)

