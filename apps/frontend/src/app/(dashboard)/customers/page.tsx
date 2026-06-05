import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-headline-lg text-on-surface">Customers</h1>
      <Card>
        <CardHeader>
          <CardTitle>Customer Database</CardTitle>
          <CardDescription>View and manage your customers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-on-surface-variant">Customer list with loyalty info will be built here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
