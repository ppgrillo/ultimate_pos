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

function truncate(value: string, max: number): string {
  const t = String(value ?? '').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

export function buildApplePassJson(
  storeName: string,
  config: ApplePassConfig,
  loyaltyData: AppleLoyaltyData = { memberName: 'Miembro', pointsBalance: 0, memberId: config.serialNumber },
  settings?: Record<string, unknown>,
) {
  const design = ((settings?.walletPassDesign as Record<string, unknown>) || {}) as Record<string, unknown>
  const pointsLabel = (design?.pointsLabel as string) || 'PUNTOS'
  const tierLabel = (design?.tierLabel as string) || 'NIVEL'
  const memberNameLabel = (design?.memberNameLabel as string) || 'MIEMBRO'
  const memberIdLabel = (design?.memberIdLabel as string) || 'ID MIEMBRO'
  const programName = (design?.programName as string) || storeName
  const issuerName = (design?.issuerName as string) || storeName
  const promotions = (design?.promotions as string) || ''
  const bgColor = (design?.hexColor as string) || '#1F1F1F'
  const secTierEnabled = !!(design?.secondaryTierEnabled)
  const secTierLabel = (design?.secondaryTierLabel as string) || ''
  const secTierValue = (design?.secondaryTierValue as string) || ''
  const contactEmail = (design?.contactEmail as string) || ''
  const contactPhone = (design?.contactPhone as string) || ''
  const homepageUrl = (design?.homepageUrl as string) || ''

  const auxiliaryFields: Record<string, unknown>[] = [
    { key: 'points', label: pointsLabel, value: truncate(String(loyaltyData.pointsBalance ?? 0), 10), textAlignment: 'PKTextAlignmentRight' },
  ]
  if (loyaltyData.tier) {
    auxiliaryFields.push({ key: 'tier', label: tierLabel, value: truncate(loyaltyData.tier.toUpperCase(), 14), textAlignment: 'PKTextAlignmentRight' })
  }
  if (secTierEnabled && secTierValue) {
    auxiliaryFields.push({ key: 'secTier', label: secTierLabel || 'NIVEL 2', value: truncate(secTierValue.toUpperCase(), 14), textAlignment: 'PKTextAlignmentRight' })
  }

  const backFields: Record<string, unknown>[] = [
    { key: 'notification', label: 'NOTICIAS', value: loyaltyData.notificationMsg?.trim() || '', changeMessage: '%@' },
    { key: 'memberNumber', label: memberIdLabel, value: loyaltyData.memberId },
  ]
  if (promotions) {
    backFields.push({ key: 'promotions', label: 'PLAN DE RECOMPENSAS', value: promotions })
  }
  if (contactEmail || contactPhone || homepageUrl) {
    backFields.push({ key: 'contact', label: 'CONTACTO', value: [contactEmail, contactPhone, homepageUrl].filter(Boolean).join(' • ') })
  }

  const barcodeFormatMap: Record<string, string> = {
    QR_CODE: 'PKBarcodeFormatQR',
    CODE_128: 'PKBarcodeFormatCode128',
    AZTEC: 'PKBarcodeFormatAztec',
    PDF_417: 'PKBarcodeFormatPDF417',
  }
  const barcodeType = (design?.barcodeType as string) || 'QR_CODE'
  const appleBarcodeFormat = barcodeFormatMap[barcodeType] || 'PKBarcodeFormatQR'

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    serialNumber: config.serialNumber,
    description: `${programName} - Loyalty`,
    organizationName: issuerName,
    backgroundColor: `rgb(${hexToRgb(bgColor)})`,
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(204, 255, 0)',
    logoText: programName,
    barcodes: [{
      format: appleBarcodeFormat,
      message: config.barcodeValue,
      messageEncoding: 'iso-8859-1',
      altText: config.barcodeValue,
    }],
    barcode: {
      format: appleBarcodeFormat,
      message: config.barcodeValue,
      messageEncoding: 'iso-8859-1',
      altText: config.barcodeValue,
    },
    storeCard: {
      primaryFields: [
        { key: 'programName', label: 'PROGRAMA', value: truncate(programName, 24) },
      ],
      secondaryFields: [
        { key: 'accountName', label: memberNameLabel, value: truncate(loyaltyData.memberName, 22) },
      ],
      auxiliaryFields,
      backFields,
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