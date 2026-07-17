import { PKPass } from 'passkit-generator'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface ApplePassData {
  id: string
  pass_type: string
  customer_id: string
  barcode_value: string | null
  metadata: Record<string, unknown>
  customers?: { name: string | null }[]
  stores?: { name: string | null }[]
  loyalty_cards?: { points: number; tier: string }[]
  settings?: Record<string, unknown>
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

export class AppleWalletService {
  private certPaths: { wwdr: string; signerCert: string; signerKey: string }
  private modelsPath: string

  constructor() {
    let baseCertsPath: string | null = null

    // 1. Docker: /app/certs
    if (fs.existsSync('/app/certs') && fs.existsSync(path.join('/app/certs', 'wwdr.pem'))) {
      baseCertsPath = '/app/certs'
    }

    // 2. .env paths (relative to apps/backend/)
    if (!baseCertsPath && process.env.APPLE_PASS_CERT_WWDR_PATH) {
      const envWwdr = path.resolve(process.cwd(), process.env.APPLE_PASS_CERT_WWDR_PATH)
      if (fs.existsSync(envWwdr)) {
        baseCertsPath = path.dirname(envWwdr)
      }
    }

    // 3. Fallback: __dirname-relative (apps/backend/src/services/ → ../../../../certs/)
    if (!baseCertsPath) {
      const fallback = path.resolve(__dirname, '../../../../certs')
      if (fs.existsSync(fallback) && fs.existsSync(path.join(fallback, 'wwdr.pem'))) {
        baseCertsPath = fallback
      }
    }

    // 4. Last resort: project root certs/
    if (!baseCertsPath) {
      const rootFallback = path.resolve(__dirname, '../../../../../certs')
      if (fs.existsSync(rootFallback) && fs.existsSync(path.join(rootFallback, 'wwdr.pem'))) {
        baseCertsPath = rootFallback
      }
    }

    if (!baseCertsPath) {
      console.error('❌ Apple Wallet: No certificates found!')
      console.error('   Tried: /app/certs, .env paths, ../../../../certs, ../../../../../certs')
      console.error('   CWD:', process.cwd())
      console.error('   __dirname:', __dirname)
    }

    this.certPaths = {
      wwdr: baseCertsPath ? path.resolve(baseCertsPath, 'wwdr.pem') : '',
      signerCert: baseCertsPath ? path.resolve(baseCertsPath, 'signerCert.pem') : '',
      signerKey: baseCertsPath ? path.resolve(baseCertsPath, 'ovejaPass.key') : '',
    }

    this.modelsPath = path.resolve(__dirname, './apple-models')

    console.log('🍎 Apple Wallet cert paths:', this.certPaths)
    console.log('🍎 Apple Wallet models path:', this.modelsPath)
  }

  async createPass(passData: ApplePassData): Promise<Buffer> {
    // Validate certificates exist before attempting generation
    for (const [name, certPath] of Object.entries(this.certPaths)) {
      if (!certPath || !fs.existsSync(certPath)) {
        throw new Error(
          `Apple Wallet certificate not found: ${name} at ${certPath || '(empty path)'}\n` +
          `CWD: ${process.cwd()}\n` +
          `__dirname: ${__dirname}\n` +
          `Set APPLE_PASS_CERT_* env vars or place certs at project root certs/`
        )
      }
    }

    const props = this.buildPassProperties(passData)

    const modelName = passData.pass_type === 'loyalty' ? 'StoreCard' : 'Generic'
    const modelPath = path.join(this.modelsPath, `${modelName}.pass`)

    if (!fs.existsSync(modelPath)) {
      throw new Error(`Apple Wallet model not found: ${modelPath}`)
    }

    let wwdr: Buffer
    let signerCert: Buffer
    let signerKey: Buffer
    try {
      wwdr = fs.readFileSync(this.certPaths.wwdr)
      signerCert = fs.readFileSync(this.certPaths.signerCert)
      signerKey = fs.readFileSync(this.certPaths.signerKey)
    } catch (err: any) {
      throw new Error(
        `Failed to read Apple Wallet certificates: ${err.message}\n` +
        `WWDR: ${this.certPaths.wwdr}\n` +
        `SignerCert: ${this.certPaths.signerCert}\n` +
        `SignerKey: ${this.certPaths.signerKey}`
      )
    }

    let pass: InstanceType<typeof PKPass>
    try {
      pass = await PKPass.from({
        model: modelPath,
        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined,
        },
      }, props)
    } catch (err: any) {
      throw new Error(
        `Failed to generate Apple Pass with passkit-generator: ${err.message}\n` +
        `passTypeIdentifier: ${props.passTypeIdentifier}\n` +
        `teamIdentifier: ${props.teamIdentifier}\n` +
        `model: ${modelPath}`
      )
    }

    // Ensure runtime barcode always wins over model defaults
    if (Array.isArray(props.barcodes) && props.barcodes.length > 0) {
      pass.setBarcodes(...props.barcodes as any)
    } else if (props.barcode) {
      pass.setBarcodes(props.barcode as any)
    }

    // Ensure mapped fields are materialized in the final pass bundle
    this.applyMappedFields(pass, props)

    // Inject dynamic images from walletPassDesign
    await this.injectImages(pass, passData)

    return pass.getAsBuffer()
  }

  private async injectImages(pass: InstanceType<typeof PKPass>, passData: ApplePassData): Promise<void> {
    const design = ((passData.settings?.walletPassDesign as Record<string, unknown>) || {}) as Record<string, unknown>

    // Logo image → logo.png / logo@2x.png (top-left corner)
    const logoUrl = (design?.logoImageUrl as string) || ''
    if (logoUrl) {
      try {
        const logoBuffer = await this.fetchAndResizeImage(logoUrl, 160, 160)
        pass.addBuffer('logo.png', logoBuffer)
        pass.addBuffer('logo@2x.png', logoBuffer)
      } catch (e) {
        console.error('🍎 Failed to fetch logo for Apple Pass:', (e as Error).message)
      }
    }

    // Hero/strip image → strip.png / strip@2x.png (top banner)
    const heroUrl = (design?.heroImageUrl as string) || ''
    if (heroUrl) {
      try {
        const stripBuffer = await this.fetchAndResizeImage(heroUrl, 375, 125)
        pass.addBuffer('strip.png', stripBuffer)
        const strip2xBuffer = await this.fetchAndResizeImage(heroUrl, 750, 250)
        pass.addBuffer('strip@2x.png', strip2xBuffer)
      } catch (e) {
        console.error('🍎 Failed to fetch hero/strip image for Apple Pass:', (e as Error).message)
      }
    }
  }

  private async fetchAndResizeImage(url: string, width: number, height: number): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status} ${response.statusText} for ${url}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    return sharp(inputBuffer)
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer()
  }

  private applyMappedFields(pass: any, props: any): void {
    const style = (props as any).storeCard || (props as any).coupon || (props as any).generic ||
                  (props as any).eventTicket || (props as any).boardingPass
    if (!style) return

    this.replaceFields(pass.headerFields, style.headerFields || [])
    this.replaceFields(pass.primaryFields, style.primaryFields || [])
    this.replaceFields(pass.secondaryFields, style.secondaryFields || [])
    this.replaceFields(pass.auxiliaryFields, style.auxiliaryFields || [])
    this.replaceFields(pass.backFields, style.backFields || [])
  }

  private replaceFields(target: any[], values: any[]): void {
    while (target.length) target.pop()
    for (const value of values) {
      target.push(value)
    }
  }

  private buildPassProperties(passData: ApplePassData): Record<string, unknown> {
    const customerName = (passData.customers as any)?.name || 'Miembro'
    const storeName = (passData.stores as any)?.name || 'Ultimate POS'
    const points = (passData.loyalty_cards as any)?.points ?? 0
    const tier = (passData.loyalty_cards as any)?.tier ?? ''
    const authToken = (passData.metadata?.apple_auth_token as string) || ''

    const design = ((passData.settings?.walletPassDesign as Record<string, unknown>) || {}) as Record<string, unknown>
    const pointsLabel = (design?.pointsLabel as string) || 'PUNTOS'
    const tierLabel = (design?.tierLabel as string) || 'NIVEL'
    const memberNameLabel = (design?.memberNameLabel as string) || 'MIEMBRO'
    const memberIdLabel = (design?.memberIdLabel as string) || 'ID MIEMBRO'
    const programName = (design?.programName as string) || storeName
    const issuerName = (design?.issuerName as string) || storeName
    const promotions = (design?.promotions as string) || ''

    const bgColor = (design?.hexColor as string) || '#1F1F1F'
    const fgColor = '#FFFFFF'
    const lbColor = '#CCFF00'

    const barcodeType = (design?.barcodeType as string) || 'PKBarcodeFormatQR'
    const barcodeFormatMap: Record<string, string> = {
      QR_CODE: 'PKBarcodeFormatQR',
      CODE_128: 'PKBarcodeFormatCode128',
      AZTEC: 'PKBarcodeFormatAztec',
      PDF_417: 'PKBarcodeFormatPDF417',
    }
    const appleBarcodeFormat = barcodeFormatMap[barcodeType] || 'PKBarcodeFormatQR'

    const barcodes = [{
      format: appleBarcodeFormat,
      message: passData.barcode_value || passData.id,
      messageEncoding: 'iso-8859-1',
      altText: passData.barcode_value || passData.id,
    }]

    const auxiliaryFields: Record<string, unknown>[] = [
      { key: 'points', label: pointsLabel, value: String(points), textAlignment: 'PKTextAlignmentRight' },
    ]
    if (tier) {
      auxiliaryFields.push({ key: 'tier', label: tierLabel, value: tier.toUpperCase(), textAlignment: 'PKTextAlignmentRight' })
    }
    const secTierEnabled = !!(design?.secondaryTierEnabled)
    if (secTierEnabled) {
      const secTierValue = (design?.secondaryTierValue as string) || ''
      const secTierLabel = (design?.secondaryTierLabel as string) || ''
      if (secTierValue) {
        auxiliaryFields.push({ key: 'secTier', label: secTierLabel || 'NIVEL 2', value: secTierValue.toUpperCase(), textAlignment: 'PKTextAlignmentRight' })
      }
    }

    const backFields: Record<string, unknown>[] = [
      {
        key: 'notification',
        label: 'NOTICIAS',
        value: '',
        changeMessage: '%@',
      },
      { key: 'memberNumber', label: memberIdLabel, value: passData.id },
    ]
    if (promotions) {
      backFields.push({ key: 'promotions', label: 'PLAN DE RECOMPENSAS', value: promotions })
    }
    const contactEmail = (design?.contactEmail as string) || ''
    const contactPhone = (design?.contactPhone as string) || ''
    const homepageUrl = (design?.homepageUrl as string) || ''
    if (contactEmail || contactPhone || homepageUrl) {
      backFields.push({ key: 'contact', label: 'CONTACTO', value: [contactEmail, contactPhone, homepageUrl].filter(Boolean).join(' • ') })
    }

    return {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.ultimate.pos',
      teamIdentifier: process.env.APPLE_TEAM_ID || '',
      serialNumber: passData.id,
      description: `${programName} - Loyalty`,
      organizationName: issuerName,
      backgroundColor: `rgb(${hexToRgb(bgColor)})`,
      foregroundColor: `rgb(255, 255, 255)`,
      labelColor: `rgb(204, 255, 0)`,
      logoText: programName,
      barcodes,
      barcode: barcodes[0],
      ...(process.env.APPLE_WALLET_WEB_SERVICE_URL ? {
        webServiceURL: process.env.APPLE_WALLET_WEB_SERVICE_URL,
        authenticationToken: authToken,
      } : {}),
      storeCard: {
        primaryFields: [
          { key: 'programName', label: 'PROGRAMA', value: programName },
        ],
        secondaryFields: [
          { key: 'accountName', label: memberNameLabel, value: customerName },
        ],
        auxiliaryFields,
        backFields,
      },
    }
  }
}
