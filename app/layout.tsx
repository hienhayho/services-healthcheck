import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { AppSidebar } from '@/components/sidebar'
import { ProgressBar } from '@/components/progress-bar'
import { WebhookChatTester } from '@/components/webhook-chat-tester'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Services Healthcheck',
  description: 'Monitor your AI services',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const user = token ? await verifyToken(token) : null

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased">
        <Suspense>
          <ProgressBar />
        </Suspense>
        <TooltipProvider>
          {user ? (
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-13 items-center gap-3 border-b border-border/60 px-5 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                  <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
                  <div className="h-4 w-px bg-border/60" />
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase select-none">
                    Healthcheck
                  </span>
                </header>
                <main className="flex-1 p-6 main-grid-bg min-h-[calc(100vh-3.25rem)]">
                  {children}
                </main>
                <WebhookChatTester />
              </SidebarInset>
            </SidebarProvider>
          ) : (
            <div className="min-h-full">{children}</div>
          )}
        </TooltipProvider>
      </body>
    </html>
  )
}
