'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  UnifiedFieldMapping,
  SyncCondition,
  TargetType,
  ValueType,
  TagAction,
  SyncTrigger,
  ValidationOutcome,
  FailureReason,
  formatSyncConditions,
  createSyncCondition,
  VALUE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  TAG_ACTION_OPTIONS,
  SYNC_TRIGGER_OPTIONS,
  VALIDATION_OUTCOME_OPTIONS,
  FAILURE_REASON_OPTIONS,
} from '@/features/qr-codes/types/unified-field-mapping'
import {  QRFieldKey, AVAILABLE_QR_FIELDS } from '@/features/qr-codes/services/QRFieldMapping'

interface UnifiedFieldMappingProps {
  toolId: string
  toolName: string
}

export default function UnifiedFieldMappingComponent({ toolId, toolName }: UnifiedFieldMappingProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mappings, setMappings] = useState<UnifiedFieldMapping[]>([])
  const [manychatFields, setManychatFields] = useState<any[]>([])
  const [manychatTags, setManychatTags] = useState<any[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMappings()
    loadManychatData()
  }, [toolId])

  async function loadMappings() {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/qr/unified-field-mapping?toolId=${toolId}`)
      const data = await res.json()

      if (data.success) {
        setMappings(data.data.mappings || [])
      }
    } catch (error) {
      console.error('Error loading mappings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadManychatData() {
    try {
      const [fieldsRes, tagsRes] = await Promise.all([
        fetch('/api/v1/manychat/custom-fields'),
        fetch('/api/v1/manychat/tags'),
      ])

      const fieldsData = await fieldsRes.json()
      const tagsData = await tagsRes.json()

      if (fieldsData.success) {
        setManychatFields(fieldsData.data || [])
      }
      if (tagsData.success) {
        setManychatTags(tagsData.data || [])
      }
    } catch (error) {
      console.error('Error loading ManyChat data:', error)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)

      const res = await fetch('/api/v1/qr/unified-field-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          mappings,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Field mappings saved',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save mappings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save mappings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function addMapping() {
    const newMapping: UnifiedFieldMapping = {
      id: `temp_${Date.now()}`,
      enabled: true,
      targetType: 'field',
      targetId: '',
      targetName: '',
      valueType: 'qr_field',
      valueSource: 'qr_code',
      syncConditions: [createSyncCondition('scan')],
    }
    setMappings([...mappings, newMapping])
    setExpandedRows(new Set([...expandedRows, newMapping.id]))
  }

  function removeMapping(id: string) {
    setMappings(mappings.filter(m => m.id !== id))
    const newExpanded = new Set(expandedRows)
    newExpanded.delete(id)
    setExpandedRows(newExpanded)
  }

  function updateMapping(id: string, updates: Partial<UnifiedFieldMapping>) {
    setMappings(mappings.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  function toggleExpanded(id: string) {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  function addQuickTemplates() {
    const templates: UnifiedFieldMapping[] = [
      // Validation status on success
      {
        id: `template_success_${Date.now()}`,
        enabled: true,
        targetType: 'field',
        targetId: '',
        targetName: 'validation_status',
        valueType: 'custom',
        customValue: 'SUCCESS',
        syncConditions: [createSyncCondition('validation', 'success')],
      },
      // Validation status on failure
      {
        id: `template_failed_${Date.now() + 1}`,
        enabled: true,
        targetType: 'field',
        targetId: '',
        targetName: 'validation_status',
        valueType: 'custom',
        customValue: 'FAILED',
        syncConditions: [createSyncCondition('validation', 'failed')],
      },
      // Current QR code on generation
      {
        id: `template_qr_code_${Date.now() + 2}`,
        enabled: true,
        targetType: 'field',
        targetId: '',
        targetName: 'current_qr_code',
        valueType: 'qr_field',
        valueSource: 'qr_code',
        syncConditions: [createSyncCondition('generation')],
      },
      // QR type on generation
      {
        id: `template_qr_type_${Date.now() + 3}`,
        enabled: true,
        targetType: 'field',
        targetId: '',
        targetName: 'qr_type',
        valueType: 'qr_field',
        valueSource: 'qr_type',
        syncConditions: [createSyncCondition('generation')],
      },
      // Add "validated" tag on success
      {
        id: `template_tag_success_${Date.now() + 4}`,
        enabled: true,
        targetType: 'tag',
        targetId: '',
        targetName: 'qr_validated',
        valueType: 'custom',
        tagAction: 'add',
        syncConditions: [createSyncCondition('validation', 'success')],
      },
    ]

    setMappings([...mappings, ...templates])
    toast({
      title: 'Templates Added',
      description: 'Added 5 common field mappings',
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Unified Field Mapping</CardTitle>
              <CardDescription>
                Configure all ManyChat custom fields and tags in one place
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addQuickTemplates}>
                <Sparkles className="h-4 w-4 mr-2" />
                Quick Templates
              </Button>
              <Button size="sm" onClick={addMapping}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-blue-50 p-3 mb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <strong>How it works:</strong> Each mapping updates a ManyChat field or tag based on conditions.
                Use <strong>QR Field</strong> to copy data, or <strong>Custom Value</strong> to set specific values.
                Supports tokens like <code className="bg-blue-100 px-1 rounded">{'{{qr_code}}'}</code>,{' '}
                <code className="bg-blue-100 px-1 rounded">{'{{timestamp}}'}</code>.
              </div>
            </div>
          </div>

          {mappings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">No field mappings configured</p>
              <Button onClick={addMapping} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Mapping
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {mappings.map(mapping => (
                <MappingRow
                  key={mapping.id}
                  mapping={mapping}
                  expanded={expandedRows.has(mapping.id)}
                  manychatFields={manychatFields}
                  manychatTags={manychatTags}
                  onToggleExpanded={() => toggleExpanded(mapping.id)}
                  onUpdate={(updates) => updateMapping(mapping.id, updates)}
                  onRemove={() => removeMapping(mapping.id)}
                />
              ))}
            </div>
          )}

          {mappings.length > 0 && (
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={() => loadMappings()}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Mappings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface MappingRowProps {
  mapping: UnifiedFieldMapping
  expanded: boolean
  manychatFields: any[]
  manychatTags: any[]
  onToggleExpanded: () => void
  onUpdate: (updates: Partial<UnifiedFieldMapping>) => void
  onRemove: () => void
}

function MappingRow({
  mapping,
  expanded,
  manychatFields,
  manychatTags,
  onToggleExpanded,
  onUpdate,
  onRemove,
}: MappingRowProps) {
  const targetOptions = mapping.targetType === 'field' ? manychatFields : manychatTags

  return (
    <div className={`rounded-lg border ${mapping.enabled ? 'bg-white' : 'bg-gray-50'}`}>
      {/* Collapsed View */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          <Switch
            checked={mapping.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
          />

          <div className="flex-1 grid grid-cols-5 gap-4 items-center">
            <div>
              <Badge variant={mapping.targetType === 'field' ? 'default' : 'secondary'}>
                {mapping.targetType === 'field' ? 'Field' : 'Tag'}
              </Badge>
            </div>
            <div className="col-span-2">
              <span className="font-medium">{mapping.targetName || 'Not set'}</span>
            </div>
            <div>
              <Badge variant="outline">
                {mapping.valueType === 'qr_field' ? 'QR Field' : 'Custom'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {formatSyncConditions(mapping.syncConditions)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleExpanded}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="border-t p-4 space-y-4 bg-gray-50">
          {/* Row 1: Target Type and Target */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select
                value={mapping.targetType}
                onValueChange={(value: TargetType) => onUpdate({
                  targetType: value,
                  targetId: '',
                  targetName: '',
                  ...(value === 'tag' && { tagAction: 'add' }),
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{mapping.targetType === 'field' ? 'ManyChat Field' : 'ManyChat Tag'}</Label>
              <Select
                value={mapping.targetId}
                onValueChange={(value) => {
                  const target = targetOptions.find(t => t.id === value)
                  onUpdate({
                    targetId: value,
                    targetName: target?.name || value,
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${mapping.targetType}...`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Create new —</SelectItem>
                  {targetOptions.map(target => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!mapping.targetId && (
                <Input
                  placeholder="Enter new field/tag name"
                  value={mapping.targetName}
                  onChange={(e) => onUpdate({ targetName: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Row 2: Value Type and Value Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Value Type</Label>
              <Select
                value={mapping.valueType}
                onValueChange={(value: ValueType) => onUpdate({
                  valueType: value,
                  ...(value === 'qr_field' && { valueSource: 'qr_code', customValue: undefined }),
                  ...(value === 'custom' && { valueSource: undefined, customValue: '' }),
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {mapping.valueType === 'qr_field' ? 'QR Field' : 'Custom Value'}
              </Label>
              {mapping.valueType === 'qr_field' ? (
                <Select
                  value={mapping.valueSource}
                  onValueChange={(value: QRFieldKey) => onUpdate({ valueSource: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_QR_FIELDS.map(field => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label} - {field.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="e.g., 'SUCCESS' or {{qr_code}}"
                  value={mapping.customValue || ''}
                  onChange={(e) => onUpdate({ customValue: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Row 3: Tag Action (if tag type) */}
          {mapping.targetType === 'tag' && (
            <div className="space-y-2">
              <Label>Tag Action</Label>
              <Select
                value={mapping.tagAction}
                onValueChange={(value: TagAction) => onUpdate({ tagAction: value })}
              >
                <SelectTrigger className="w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_ACTION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Row 4: Sync Conditions */}
          <div className="space-y-2">
            <Label>Sync When (Conditions)</Label>
            <SyncConditionsEditor
              conditions={mapping.syncConditions}
              onChange={(conditions) => onUpdate({ syncConditions: conditions })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface SyncConditionsEditorProps {
  conditions: SyncCondition[]
  onChange: (conditions: SyncCondition[]) => void
}

function SyncConditionsEditor({ conditions, onChange }: SyncConditionsEditorProps) {
  function addCondition() {
    onChange([...conditions, createSyncCondition('scan')])
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, i) => i !== index))
  }

  function updateCondition(index: number, updates: Partial<SyncCondition>) {
    onChange(conditions.map((c, i) => i === index ? { ...c, ...updates } : c))
  }

  return (
    <div className="space-y-2">
      {conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={condition.trigger}
            onValueChange={(value: SyncTrigger) => updateCondition(index, {
              trigger: value,
              ...(value !== 'validation' && { outcome: undefined, failureReasons: undefined }),
            })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYNC_TRIGGER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {condition.trigger === 'validation' && (
            <>
              <Select
                value={condition.outcome || ''}
                onValueChange={(value: ValidationOutcome) => updateCondition(index, {
                  outcome: value,
                  ...(value !== 'failed' && { failureReasons: undefined }),
                })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {VALIDATION_OUTCOME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {condition.outcome === 'failed' && (
                <Select
                  value={condition.failureReasons?.[0] || ''}
                  onValueChange={(value: FailureReason) => updateCondition(index, {
                    failureReasons: value ? [value] : undefined,
                  })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any reason</SelectItem>
                    {FAILURE_REASON_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addCondition}>
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  )
}
