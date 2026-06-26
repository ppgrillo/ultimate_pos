export function toLocalizedString(value: string, language = 'es') {
  return { defaultValue: { language, value } }
}

export function mapProgramToGoogleClass(storeName: string, settings: Record<string, unknown>) {
  const design = (settings?.walletPassDesign as Record<string, unknown>) || {}
  const tierLabel = (design?.tierLabel as string) || 'Nivel'
  const defaultTier = (design?.defaultTier as string) || 'BRONCE'
  const secTierEnabled = !!(design?.secondaryTierEnabled)
  const secTierLabel = (design?.secondaryTierLabel as string) || ''
  const secTierValue = (design?.secondaryTierValue as string) || ''
  const foilShimmer = !!(design?.foilShimmer)
  const promotions = (design?.promotions as string) || ''

  const logoUrl = (design?.logoImageUrl as string) || ''
  const hexColor = (design?.hexColor as string) || ''
  const heroUrl = (design?.heroImageUrl as string) || ''
  const homepageUrl = (design?.homepageUrl as string) || ''
  const contactEmail = (design?.contactEmail as string) || ''
  const contactPhone = (design?.contactPhone as string) || ''
  const contactWebsite = (design?.contactWebsite as string) || ''

  return {
    issuerName: (design?.issuerName as string) || storeName,
    programName: (design?.programName as string) || storeName,
    reviewStatus: 'UNDER_REVIEW',
    ...(logoUrl ? { programLogo: { sourceUri: { uri: logoUrl } } } : {}),
    ...(hexColor ? { hexBackgroundColor: hexColor } : {}),
    ...(heroUrl ? { heroImage: { sourceUri: { uri: heroUrl }, contentDescription: { defaultValue: { language: 'es', value: (design?.programName as string) || storeName } } } } : {}),
    accountIdLabel: (design?.memberIdLabel as string) || 'ID MIEMBRO',
    accountNameLabel: (design?.memberNameLabel as string) || 'MIEMBRO',
    localizedRewardsTierLabel: toLocalizedString(tierLabel),
    localizedRewardsTier: toLocalizedString(defaultTier),
    ...(secTierEnabled ? {
      localizedSecondaryRewardsTierLabel: toLocalizedString(secTierLabel || 'Nivel 2'),
      localizedSecondaryRewardsTier: toLocalizedString(secTierValue || 'PLATA'),
    } : {}),
    ...(foilShimmer ? { securityAnimation: { animationType: 'foilShimmer' } } : {}),
    ...(promotions ? { textModulesData: [{ id: 'promotions', header: 'Plan de Recompensas', body: promotions }] } : {}),
    ...(homepageUrl ? { homepageUri: { uri: homepageUrl, description: (design?.issuerName as string) || storeName } } : {}),
    ...(contactEmail || contactPhone || contactWebsite ? {
      linksModuleData: {
        uris: [
          ...(contactEmail ? [{ uri: `mailto:${contactEmail}`, description: 'Email', id: 'CONTACT_EMAIL' }] : []),
          ...(contactPhone ? [{ uri: `tel:${contactPhone}`, description: 'Teléfono', id: 'CONTACT_PHONE' }] : []),
          ...(contactWebsite ? [{ uri: contactWebsite, description: 'Sitio Web', id: 'CONTACT_WEBSITE' }] : []),
        ],
      },
    } : {}),
  }
}
