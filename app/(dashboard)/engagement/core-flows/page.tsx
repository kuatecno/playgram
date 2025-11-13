'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CORE_FLOWS, CoreFlow, getCoreFlowsByCategory, getAllCoreFlowFields } from '@/lib/core-flows';
import { Copy, Check, ChevronRight, Info, Zap, TrendingUp, Gift, Users } from 'lucide-react';

export default function CoreFlowsPage() {
  const [selectedFlow, setSelectedFlow] = useState<CoreFlow | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const trackingFlows = getCoreFlowsByCategory('tracking');
  const marketingFlows = getCoreFlowsByCategory('marketing');
  const allFields = getAllCoreFlowFields();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tracking':
        return <TrendingUp className="h-4 w-4" />;
      case 'marketing':
        return <Gift className="h-4 w-4" />;
      case 'engagement':
        return <Zap className="h-4 w-4" />;
      case 'support':
        return <Users className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Core Engagement Flows</h1>
        <p className="text-muted-foreground mt-2">
          Pre-built engagement tracking templates for Instagram. These are standard Manychat custom fields
          with recommended naming conventions and setup instructions.
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Flows ({CORE_FLOWS.length})</TabsTrigger>
          <TabsTrigger value="tracking">Tracking ({trackingFlows.length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({marketingFlows.length})</TabsTrigger>
          <TabsTrigger value="fields">All Fields ({allFields.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {CORE_FLOWS.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onSelect={setSelectedFlow}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {trackingFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onSelect={setSelectedFlow}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {marketingFlows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onSelect={setSelectedFlow}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Core Custom Fields</CardTitle>
              <CardDescription>
                These fields can be created in your Manychat account and used across multiple flows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allFields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {field.name}
                        </code>
                        <Badge variant="outline">{field.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(field.name)}
                    >
                      {copiedField === field.name ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flow Details Dialog */}
      <Dialog open={!!selectedFlow} onOpenChange={(open) => !open && setSelectedFlow(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          {selectedFlow && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{selectedFlow.name}</span>
                  <Badge variant="outline" className="capitalize">
                    {getCategoryIcon(selectedFlow.category)}
                    <span className="ml-1">{selectedFlow.category}</span>
                  </Badge>
                </DialogTitle>
                <DialogDescription>{selectedFlow.description}</DialogDescription>
              </DialogHeader>

              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-6 pr-4">
                  {/* Trigger */}
                  <div>
                    <h3 className="font-semibold mb-2">Trigger</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium">{selectedFlow.trigger.type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{selectedFlow.trigger.description}</p>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  <div>
                    <h3 className="font-semibold mb-2">Custom Fields Required</h3>
                    <div className="space-y-2">
                      {selectedFlow.customFields.map((field) => (
                        <div key={field.name} className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-sm font-mono">{field.name}</code>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{field.type}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(field.name)}
                              >
                                {copiedField === field.name ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{field.description}</p>
                          {field.defaultValue !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Default: {String(field.defaultValue)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h3 className="font-semibold mb-2">Flow Actions</h3>
                    <div className="space-y-2">
                      {selectedFlow.actions.map((action) => (
                        <div key={action.step} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                            {action.step}
                          </div>
                          <div className="flex-1 bg-muted p-3 rounded-lg">
                            <p className="text-sm font-medium capitalize">{action.type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div>
                    <h3 className="font-semibold mb-2">Setup Instructions</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      {selectedFlow.setupInstructions.map((instruction, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                          <p className="text-sm">{instruction}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Copy Section */}
                  <div>
                    <h3 className="font-semibold mb-2">Quick Copy Field Names</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedFlow.customFields.map((field) => (
                        <Button
                          key={field.name}
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(field.name)}
                        >
                          {field.name}
                          {copiedField === field.name ? (
                            <Check className="h-3 w-3 ml-2 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 ml-2" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowCard({
  flow,
  onSelect,
  getCategoryIcon,
}: {
  flow: CoreFlow;
  onSelect: (flow: CoreFlow) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
}) {
  return (
    <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => onSelect(flow)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{flow.name}</CardTitle>
          <Badge variant="outline" className="capitalize">
            {getCategoryIcon(flow.category)}
            <span className="ml-1">{flow.category}</span>
          </Badge>
        </div>
        <CardDescription>{flow.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="text-xs">
              {flow.trigger.type.replace('_', ' ')}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{flow.customFields.length} field{flow.customFields.length !== 1 ? 's' : ''}</span>
          </div>
          <Button variant="ghost" className="w-full justify-between" onClick={() => onSelect(flow)}>
            View Setup Instructions
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
