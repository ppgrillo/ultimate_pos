export interface ApplePassConfig {
  passTypeIdentifier: string
  teamIdentifier: string
  serialNumber: string
  barcodeValue: string
  webServiceURL?: string
  authenticationToken?: string
}

export interface AppleLoyaltyData {
  memberName: string
  pointsBalance: number
  tier?: string
  memberId: string
  notificationMsg?: string
}

function normalizeHex(hex: string): string {
  if (!hex || hex.length < 7) return '#1F1F1F'
  return hex.toUpperCase()
}

function hexToRgb(hex: string): string {
  const n = normalizeHex(hex)
  const r = parseInt(n.slice(1, 3), 16)
  const g = parseInt(n.slice(3, 5), 16)
  const b = parseInt(n.slice(5, 7), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgb(31, 31, 31)'
  return `rgb(${r}, ${g}, ${b})`
}

function truncate(value: string, max: number): string {
  const t = String(value ?? '').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

export function buildApplePassJson(
  storeName: string,
  config: ApplePassConfig,
  loyaltyData: AppleLoyaltyData = { memberName: 'Miembro', pointsBalance: 0, memberId: config.serialNumber },
): Record<string, unknown> {
  const bgHex = '#1F1F1F'
  const fgHex = '#FFFFFF'
  const labelHex = '#CCFF00'

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    serialNumber: config.serialNumber,
    description: `${storeName} - Loyalty`,
    organizationName: storeName,
    backgroundColor: hexToRgb(bgHex),
    foregroundColor: hexToRgb(fgHex),
    labelColor: hexToRgb(labelHex),
    logoText: storeName,
    barcodes: [{
      format: 'PKBarcodeFormatQR',
      message: config.barcodeValue,
      messageEncoding: 'iso-8859-1',
      altText: config.barcodeValue,
    }],
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: config.barcodeValue,
      messageEncoding: 'iso-8859-1',
      altText: config.barcodeValue,
    },
    storeCard: {
      primaryFields: [
        { key: 'programName', label: 'PROGRAMA', value: truncate(storeName, 24) },
      ],
      secondaryFields: [
        { key: 'accountName', label: 'MIEMBRO', value: truncate(loyaltyData.memberName, 22) },
      ],
      auxiliaryFields: [
        {
          key: 'points',
          label: 'PUNTOS',
          value: truncate(String(loyaltyData.pointsBalance ?? 0), 10),
          textAlignment: 'PKTextAlignmentRight',
        },
        ...(loyaltyData.tier ? [{
          key: 'tier',
          label: 'NIVEL',
          value: truncate(loyaltyData.tier.toUpperCase(), 14),
          textAlignment: 'PKTextAlignmentRight',
        }] : []),
      ],
      backFields: [
        {
          key: 'notification',
          label: 'NOTICIAS',
          value: loyaltyData.notificationMsg?.trim() || '',
          changeMessage: '%@',
        },
        {
          key: 'memberNumber',
          label: 'ID MIEMBRO',
          value: loyaltyData.memberId,
        },
      ],
    },
  }

  if (config.webServiceURL) {
    pass.webServiceURL = config.webServiceURL
    if (config.authenticationToken) {
      pass.authenticationToken = config.authenticationToken
    }
  }

  return pass
}
