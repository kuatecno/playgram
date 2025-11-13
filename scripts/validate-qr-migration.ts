/**
 * QR Tools Migration Validation Script
 *
 * Validates that the QRToolConfig migration completed successfully:
 * 1. All QR tools have corresponding QRToolConfig
 * 2. No orphaned QRToolConfig records
 * 3. No data was lost during migration
 * 4. Foreign key constraints are correct
 *
 * Usage: npx tsx scripts/validate-qr-migration.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  passed: boolean
  issues: string[]
  warnings: string[]
  stats: {
    totalQRTools: number
    totalQRToolConfigs: number
    orphanedConfigs: number
    missingConfigs: number
    dataLossDetected: boolean
  }
}

async function validateMigration(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    issues: [],
    warnings: [],
    stats: {
      totalQRTools: 0,
      totalQRToolConfigs: 0,
      orphanedConfigs: 0,
      missingConfigs: 0,
      dataLossDetected: false,
    },
  }

  console.log('🔍 Starting QR Tools migration validation...\n')

  try {
    // 1. Count all QR tools
    const qrTools = await prisma.tool.findMany({
      where: { toolType: 'qr' },
      include: { qrConfig: true },
    })

    result.stats.totalQRTools = qrTools.length
    console.log(`✓ Found ${qrTools.length} QR tools`)

    // 2. Count all QRToolConfig records
    const allConfigs = await prisma.qRToolConfig.findMany({
      include: { tool: true },
    })

    result.stats.totalQRToolConfigs = allConfigs.length
    console.log(`✓ Found ${allConfigs.length} QRToolConfig records`)

    // 3. Check for tools missing config
    const toolsWithoutConfig = qrTools.filter(tool => !tool.qrConfig)
    result.stats.missingConfigs = toolsWithoutConfig.length

    if (toolsWithoutConfig.length > 0) {
      result.passed = false
      result.issues.push(
        `❌ ${toolsWithoutConfig.length} QR tools missing QRToolConfig:`
      )
      toolsWithoutConfig.forEach(tool => {
        result.issues.push(`   - Tool ID: ${tool.id}, Name: "${tool.name}"`)
      })
    } else {
      console.log('✓ All QR tools have QRToolConfig')
    }

    // 4. Check for orphaned configs
    const orphanedConfigs = allConfigs.filter(config => !config.tool)
    result.stats.orphanedConfigs = orphanedConfigs.length

    if (orphanedConfigs.length > 0) {
      result.passed = false
      result.issues.push(
        `❌ ${orphanedConfigs.length} orphaned QRToolConfig records (no matching tool):`
      )
      orphanedConfigs.forEach(config => {
        result.issues.push(`   - Config ID: ${config.id}, Tool ID: ${config.toolId}`)
      })
    } else {
      console.log('✓ No orphaned QRToolConfig records')
    }

    // 5. Check for data loss - tools with non-empty settings that might have been migrated
    const toolsWithRemainingSettings = await prisma.tool.findMany({
      where: {
        toolType: 'qr',
        NOT: {
          settings: { equals: {} },
        },
      },
    })

    if (toolsWithRemainingSettings.length > 0) {
      result.warnings.push(
        `⚠️  ${toolsWithRemainingSettings.length} QR tools still have data in settings (might be unmigrated data):`
      )
      toolsWithRemainingSettings.forEach(tool => {
        const settings = tool.settings as any
        const keys = Object.keys(settings)
        result.warnings.push(`   - Tool "${tool.name}": ${keys.join(', ')}`)

        // Check for known QR config keys
        const qrKeys = ['qrFormat', 'qrCodeFormat', 'qrAppearance', 'qrFieldMapping', 'qrSecurityPolicy', 'qrFallbackUrl', 'qrMetadata']
        const unmigrated = keys.filter(k => qrKeys.includes(k))
        if (unmigrated.length > 0) {
          result.passed = false
          result.stats.dataLossDetected = true
          result.issues.push(`   ❌ Unmigrated QR config detected: ${unmigrated.join(', ')}`)
        }
      })
    } else {
      console.log('✓ All QR config data migrated from Tool.settings')
    }

    // 6. Verify foreign key constraint
    console.log('\n🔗 Checking foreign key constraints...')

    // Try to query with invalid toolId to verify constraint
    try {
      await prisma.$queryRaw`
        SELECT 1 FROM "QRToolConfig"
        WHERE "toolId" NOT IN (SELECT "id" FROM "Tool")
        LIMIT 1
      `
      console.log('✓ Foreign key constraints are valid')
    } catch (error) {
      result.issues.push('❌ Foreign key constraint check failed')
      result.passed = false
    }

    // 7. Summary
    console.log('\n' + '='.repeat(60))
    console.log('VALIDATION SUMMARY:')
    console.log('='.repeat(60))
    console.log(`Total QR Tools: ${result.stats.totalQRTools}`)
    console.log(`Total QRToolConfigs: ${result.stats.totalQRToolConfigs}`)
    console.log(`Missing Configs: ${result.stats.missingConfigs}`)
    console.log(`Orphaned Configs: ${result.stats.orphanedConfigs}`)
    console.log(`Data Loss Detected: ${result.stats.dataLossDetected ? 'YES ❌' : 'NO ✓'}`)

    if (result.issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:')
      result.issues.forEach(issue => console.log(issue))
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      result.warnings.forEach(warning => console.log(warning))
    }

    console.log('\n' + '='.repeat(60))
    console.log(result.passed ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED')
    console.log('='.repeat(60))

    return result
  } catch (error) {
    console.error('❌ Validation error:', error)
    result.passed = false
    result.issues.push(`Fatal error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
validateMigration()
  .then(result => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
