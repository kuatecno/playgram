'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CORE_FLOWS, CoreFlow, getCoreFlowsByCategory, getAllCoreFlowFields } from '@/lib/core-flows';
import { Copy, Check, ChevronRight, Info, Zap, TrendingUp, Gift, Users, Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CoreFlowsPage() {
  const [selectedFlow, setSelectedFlow] = useState<CoreFlow | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [existingFields, setExistingFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [creatingField, setCreatingField] = useState<string | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const trackingFlows = getCoreFlowsByCategory('tracking');
  const marketingFlows = getCoreFlowsByCategory('marketing');
  const allFields = getAllCoreFlowFields();

  useEffect(() => {
    loadManychatFields();
  }, []);

  const loadManychatFields = async () => {
    setLoadingFields(true);
    setError('');
    try {
      const response = await fetch('/api/v1/manychat/fields');
      if (!response.ok) throw new Error('Failed to load Manychat fields');
      const result = await response.json();
      const fields = result.data || [];
      setExistingFields(fields);

      // Auto-map fields by name
      const mappings: Record<string, string> = {};
      allFields.forEach((field) => {
        const match = fields.find((f: any) => f.name === field.name);
        if (match) {
          mappings[field.name] = field.name;
        }
      });
      setFieldMappings(mappings);
    } catch (err: any) {
      console.error('Failed to load fields:', err);
    } finally {
      setLoadingFields(false);
    }
  };

  const createCustomField = async (fieldName: string, fieldType: string) => {
    setCreatingField(fieldName);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/v1/manychat/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fieldName,
          type: fieldType,
          description: `Playgram tracker: ${fieldName}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create field');
      }

      setSuccess(`Created "${fieldName}" successfully!`);
      setTimeout(() => setSuccess(''), 3000);

      // Reload fields
      await loadManychatFields();

      // Update mapping
      setFieldMappings((prev) => ({
        ...prev,
        [fieldName]: fieldName,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingField(null);
    }
  };

  const getFieldStatus = (fieldName: string): 'matched' | 'remapped' | 'unmapped' => {
    const mapping = fieldMappings[fieldName];
    if (!mapping) return 'unmapped';
    return mapping === fieldName ? 'matched' : 'remapped';
  };

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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Core Custom Fields</CardTitle>
                  <CardDescription>
                    These fields can be created in your Manychat account and used across multiple flows
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadManychatFields}
                  disabled={loadingFields}
                >
                  {loadingFields ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allFields.map((field) => {
                  const existingField = existingFields.find((f) => f.name === field.name);
                  const status = getFieldStatus(field.name);

                  return (
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
                          {status === 'matched' && (
                            <Badge className="text-xs bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                          {status === 'remapped' && (
                            <Badge className="text-xs bg-blue-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Mapped
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!existingField && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createCustomField(field.name, field.type)}
                            disabled={creatingField === field.name}
                          >
                            {creatingField === field.name ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3 mr-1" />
                            )}
                            Create
                          </Button>
                        )}
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
                    </div>
                  );
                })}
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
                  {/* Error/Success Messages */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  {/* Trigger */}
                  <div>
                    <h3 className="font-semibold mb-2">Trigger</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium">{selectedFlow.trigger.type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{selectedFlow.trigger.description}</p>
                    </div>
                  </div>

                  {/* Custom Fields Setup */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Custom Fields Setup</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadManychatFields}
                        disabled={loadingFields}
                      >
                        {loadingFields ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Refresh</span>
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedFlow.customFields.map((field) => {
                        const existingField = existingFields.find((f) => f.name === field.name);
                        const status = getFieldStatus(field.name);

                        return (
                          <div key={field.name} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                    {field.name}
                                  </code>
                                  <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                  {status === 'matched' && (
                                    <Badge className="text-xs bg-green-500">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Ready
                                    </Badge>
                                  )}
                                  {status === 'remapped' && (
                                    <Badge className="text-xs bg-blue-500">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Mapped
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{field.description}</p>
                                {field.defaultValue !== undefined && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Default: {String(field.defaultValue)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {!existingField ? (
                              <div className="space-y-3">
                                <Button
                                  size="sm"
                                  onClick={() => createCustomField(field.name, field.type)}
                                  disabled={creatingField === field.name}
                                >
                                  {creatingField === field.name ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                  )}
                                  Create in Manychat
                                </Button>

                                {existingFields.length > 0 && (
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">
                                      Or map to existing field:
                                    </label>
                                    <Select
                                      value={fieldMappings[field.name] || ''}
                                      onValueChange={(value) => {
                                        setFieldMappings((prev) => ({
                                          ...prev,
                                          [field.name]: value,
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select existing field..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {existingFields
                                          .filter((f) => f.type === field.type)
                                          .map((f) => (
                                            <SelectItem
                                              key={f.id}
                                              value={f.name}
                                              className="text-xs"
                                            >
                                              {f.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-green-700 dark:text-green-400">
                                  Field exists in Manychat
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
