import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-headline-lg text-on-surface">Settings</h1>
      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store Settings</CardTitle>
              <CardDescription>Configure your store information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant">Store configuration form will be built here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Program</CardTitle>
              <CardDescription>Configure rewards and points system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant">Loyalty settings will be built here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Digital Wallet</CardTitle>
              <CardDescription>Google Wallet & Apple Wallet integration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant">Wallet integration settings will be built here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
