import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(
  req: NextRequest,
  { params }: { params: { toolId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { toolId } = params

    // Fetch tool with config
    const tool = await db.qRTool.findUnique({
      where: {
        id: toolId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        config: {
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
        type: tool.type,
        formatPattern: tool.config?.formatPattern || null,
        scannerInstructions: tool.config?.scannerInstructions || null,
        displayFields: tool.config?.displayFields || null,
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
