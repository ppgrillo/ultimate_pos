import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-headline-lg text-on-surface">Orders</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>Orders currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant">Order list will be built here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="completed">
          <Card>
            <CardContent className="pt-6">
              <p className="text-on-surface-variant">Completed orders will be shown here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              <p className="text-on-surface-variant">All orders will be shown here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
