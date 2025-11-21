import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { toolId } = await params

    // Fetch tool with config
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
        toolType: 'qr',
      },
      select: {
        id: true,
        name: true,
        description: true,
        toolType: true,
        qrConfig: {
          select: {
            formatPattern: true,
            scannerInstructions: true,
            displayFields: true,
          },
        },
      },
    })

    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'Tool not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.toolType,
        formatPattern: tool.qrConfig?.formatPattern || null,
        scannerInstructions: tool.qrConfig?.scannerInstructions || null,
        displayFields: tool.qrConfig?.displayFields || null,
      },
    })
  } catch (error) {
    console.error('Error fetching tool:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
