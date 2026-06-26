function toLocalizedString(value: string, language = 'es'): Record<string, unknown> {
  return { defaultValue: { language, value } }
}

function toLocalizedStringObj(label: string, value: string, language = 'es'): Record<string, unknown> {
  return { defaultValue: { language, value }, header: label }
}

export function mapProgramToGoogleClass(storeName: string, settings: Record<string, unknown>): Record<string, unknown> {
  const design = (settings?.walletPassDesign as Record<string, unknown>) || {}
  const pointsLabel = (design?.pointsLabel as string) || 'Puntos'
  const tierLabel = (design?.tierLabel as string) || 'Nivel'
  const defaultTier = (design?.defaultTier as string) || 'BRONCE'
  const secTierEnabled = !!(design?.secondaryTierEnabled)
  const secTierLabel = (design?.secondaryTierLabel as string) || ''
  const secTierValue = (design?.secondaryTierValue as string) || ''
  const foilShimmer = !!(design?.foilShimmer)
  const promotions = (design?.promotions as string) || ''

  const classData: Record<string, unknown> = {
    issuerName: (design?.issuerName as string) || storeName,
    programName: (design?.programName as string) || storeName,
    reviewStatus: 'UNDER_REVIEW',
  }

  const logoUrl = (design?.logoImageUrl as string) || ''
  if (logoUrl) {
    classData.programLogo = { sourceUri: { uri: logoUrl } }
  }

  const hexColor = (design?.hexColor as string) || ''
  if (hexColor) {
    classData.hexBackgroundColor = hexColor
  }

  const heroUrl = (design?.heroImageUrl as string) || ''
  if (heroUrl) {
    classData.heroImage = {
      sourceUri: { uri: heroUrl },
      contentDescription: { defaultValue: { language: 'es', value: (design?.programName as string) || storeName } },
    }
  }

  classData.accountIdLabel = (design?.memberIdLabel as string) || 'ID MIEMBRO'
  classData.accountNameLabel = (design?.memberNameLabel as string) || 'MIEMBRO'

  classData.localizedRewardsTierLabel = toLocalizedString(tierLabel)
  classData.localizedRewardsTier = toLocalizedString(defaultTier)

  if (secTierEnabled) {
    classData.localizedSecondaryRewardsTierLabel = toLocalizedString(secTierLabel || 'Nivel 2')
    classData.localizedSecondaryRewardsTier = toLocalizedString(secTierValue || 'PLATA')
  }

  if (foilShimmer) {
    classData.securityAnimation = { animationType: 'foilShimmer' }
  }

  const textModules: Record<string, unknown>[] = []
  if (promotions) {
    textModules.push({
      id: 'promotions',
      header: 'Plan de Recompensas',
      body: promotions,
    })
  }

  const homepageUrl = (design?.homepageUrl as string) || ''
  if (homepageUrl) {
    classData.homepageUri = { uri: homepageUrl, description: (design?.issuerName as string) || storeName }
  }

  const linksUris: Record<string, unknown>[] = []
  const contactEmail = (design?.contactEmail as string) || ''
  const contactPhone = (design?.contactPhone as string) || ''
  const contactWebsite = (design?.contactWebsite as string) || ''

  if (contactEmail) linksUris.push({ uri: `mailto:${contactEmail}`, description: 'Email', id: 'CONTACT_EMAIL' })
  if (contactPhone) linksUris.push({ uri: `tel:${contactPhone}`, description: 'Teléfono', id: 'CONTACT_PHONE' })
  if (contactWebsite) linksUris.push({ uri: contactWebsite, description: 'Sitio Web', id: 'CONTACT_WEBSITE' })

  if (textModules.length > 0) classData.textModulesData = textModules
  if (linksUris.length > 0) classData.linksModuleData = { uris: linksUris }

  return classData
}
