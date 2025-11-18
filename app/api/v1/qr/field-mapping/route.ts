import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getQRFieldMappings, saveQRFieldMappings, QR_AVAILABLE_FIELDS } from '@/features/qr-codes/services/QRFieldMapping'
import { db } from '@/lib/db'

/**
 * GET /api/v1/qr/field-mapping?toolId=xxx
 * Get field mapping configuration for a QR tool
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(req.url)
    const toolId = searchParams.get('toolId')

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
    }

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Get field mappings
    const mappingConfig = await getQRFieldMappings(toolId)

    return NextResponse.json({
      success: true,
      data: {
        availableFields: QR_AVAILABLE_FIELDS,
        config: mappingConfig || {
          toolId,
          mappings: [],
          autoSyncOnScan: false,
          autoSyncOnValidation: false,
        },
      },
    })
  } catch (error: any) {
    console.error('Failed to get QR field mapping:', error)
    return NextResponse.json(
      { error: 'Failed to get field mapping configuration', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/qr/field-mapping
 * Save field mapping configuration for a QR tool
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await req.json()
    const { 
      toolId, 
      mappings, 
      autoSyncOnScan, 
      autoSyncOnValidation,
      outcomeFieldMappings,
      outcomeTagConfigs 
    } = body

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
    }

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Save field mappings
    await saveQRFieldMappings(toolId, {
      mappings: mappings || [],
      autoSyncOnScan: autoSyncOnScan ?? false,
      autoSyncOnValidation: autoSyncOnValidation ?? false,
      outcomeFieldMappings: outcomeFieldMappings || [],
      outcomeTagConfigs: outcomeTagConfigs || [],
    })

    return NextResponse.json({
      success: true,
      message: 'Field mapping configuration saved successfully',
    })
  } catch (error: any) {
    console.error('Failed to save QR field mapping:', error)
    return NextResponse.json(
      { error: 'Failed to save field mapping configuration', details: error.message },
      { status: 500 }
    )
  }
}
