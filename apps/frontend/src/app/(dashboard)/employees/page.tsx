import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-headline-lg text-on-surface">Employees</h1>
        <Button>Invite Employee</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>Manage your team members</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-on-surface-variant">Employee list will be built here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
