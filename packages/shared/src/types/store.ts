import type { PaymentMethod, PreferenceField } from './customer'
import type { LoyaltyProgram } from './loyalty'

export interface StoreSettings {
  hasVariants: boolean
  hasLoyalty: boolean
  trackInventory: boolean
  hasKitchen: boolean
  taxEnabled: boolean
  taxLabel: string
  taxInclusive: boolean
  taxExemptEnabled: boolean
  specialInstructionsEnabled: boolean
  checkoutMode: 'order-only' | 'payment-required'
  acceptedPaymentMethods: PaymentMethod[]
  mpPointEnabled: boolean
  mpPointTerminalId: string
  mpPointAccessToken: string
  mpClientSecret?: string
  preferenceFields: PreferenceField[]
  // Loyalty
  pointsPerCurrency?: number
  currencyUnit?: string
  signupBonusPoints?: number
  pointsExpirationDays?: number
  // Business Info
  address?: string
  // Promo
  promoPin?: string
  // Self-Checkout
  selfCheckoutStations?: SelfCheckoutStation[]
  // Wallet
  walletPassDesign?: WalletPassDesign
}

export interface SelfCheckoutStation {
  id: string
  name: string
  terminalId: string
  isActive: boolean
  createdAt: string
  token?: string
}

export interface WalletPassDesign {
  issuerName?: string
  programName?: string
  hexColor?: string
  logoText?: string
  heroImageUrl?: string
  logoImageUrl?: string
  pointsLabel?: string
  tierLabel?: string
  defaultTier?: string
  secondaryTierEnabled?: boolean
  secondaryTierLabel?: string
  secondaryTierValue?: string
  memberIdLabel?: string
  memberNameLabel?: string
  barcodeType?: string
  foilShimmer?: boolean
  promotions?: string
  homepageUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactWebsite?: string
}

export interface Store {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  tax_rate: number
  currency: string
  owner_id: string
  is_active: boolean
  settings: StoreSettings
  created_at: string
  updated_at: string
}

export interface StoreMember {
  id: string
  store_id: string
  user_id: string
  role: 'admin' | 'employee'
  invited_by: string | null
  is_active: boolean
  created_at: string
}
