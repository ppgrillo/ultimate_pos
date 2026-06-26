import { PKPass } from 'passkit-generator'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

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
    let baseCertsPath = '/app/certs'
    if (!fs.existsSync(baseCertsPath)) {
      baseCertsPath = path.resolve(process.cwd(), './certs')
    }

    this.certPaths = {
      wwdr: path.resolve(baseCertsPath, 'wwdr.pem'),
      signerCert: path.resolve(baseCertsPath, 'signerCert.pem'),
      signerKey: path.resolve(baseCertsPath, 'ovejaPass.key'),
    }

    this.modelsPath = path.resolve(__dirname, './apple-models')
  }

  async createPass(passData: ApplePassData): Promise<Buffer> {
    const props = this.buildPassProperties(passData)

    const modelName = passData.pass_type === 'loyalty' ? 'StoreCard' : 'Generic'
    const modelPath = path.join(this.modelsPath, `${modelName}.pass`)

    const pass = await PKPass.from({
      model: modelPath,
      certificates: {
        wwdr: fs.readFileSync(this.certPaths.wwdr),
        signerCert: fs.readFileSync(this.certPaths.signerCert),
        signerKey: fs.readFileSync(this.certPaths.signerKey),
        signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined,
      },
    }, props)

    if (Array.isArray(props.barcodes) && props.barcodes.length > 0) {
      pass.setBarcodes(...props.barcodes as any)
    } else if (props.barcode) {
      pass.setBarcodes(props.barcode as any)
    }

    return pass.getAsBuffer()
  }

  private buildPassProperties(passData: ApplePassData): Record<string, unknown> {
    const customerName = passData.customers?.[0]?.name || 'Miembro'
    const storeName = passData.stores?.[0]?.name || 'Ultimate POS'
    const points = passData.loyalty_cards?.[0]?.points ?? 0
    const tier = passData.loyalty_cards?.[0]?.tier ?? ''
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
