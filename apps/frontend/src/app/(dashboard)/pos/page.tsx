import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export default function PosPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-headline-lg text-on-surface">Point of Sale</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Order</CardTitle>
          <CardDescription>Select products to add to the order</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-on-surface-variant">Menu and cart interface will be built here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
