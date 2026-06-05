import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-headline-lg text-on-surface">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Today Sales', value: '$0.00' },
          { label: 'Orders', value: '0' },
          { label: 'Active Tables', value: '0' },
          { label: 'Products', value: '0' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
