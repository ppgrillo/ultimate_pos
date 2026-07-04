'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Users, UserPlus } from 'lucide-react'

export default function EmployeesPage() {
  const [showInvite, setShowInvite] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-headline-lg text-on-surface">Employees</h1>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Employee
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>Manage your team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container/50 border border-outline-variant/40 mb-4">
              <Users className="h-6 w-6 text-on-surface-variant/60" />
            </div>
            <p className="font-label font-bold text-sm text-on-surface-variant mb-1">No team members yet</p>
            <p className="text-xs text-on-surface-variant/60 mb-4">
              Invite staff to help manage orders, products, and customers
            </p>
            <Button onClick={() => setShowInvite(true)} variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Send your first invitation
            </Button>
          </div>
        </CardContent>
      </Card>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl bg-surface-container p-6 shadow-xl glass-border w-full max-w-md mx-4">
            <p className="font-headline text-headline-md text-on-surface mb-4">Invite Employee</p>
            <p className="text-sm text-on-surface-variant mb-4">
              Employee invitation will be available once the backend integration is complete.
            </p>
            <Button onClick={() => setShowInvite(false)} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
