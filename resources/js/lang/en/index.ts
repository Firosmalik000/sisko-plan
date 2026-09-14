import { englishOverrides } from './application';
import { englishOverrides as englishCustomerReferralCatalog } from './customer-referral';
import { englishDynamicCatalog } from './dynamic';
import { englishProductCatalog } from './product';
import { englishOverrides as englishPromotionCatalog } from './promotion';
import { landingEnglishOverrides } from './public';
import { englishOverrides as englishReferralCatalog } from './referral';

export const englishCatalog: Record<string, string> = {
    ...englishOverrides,
    ...landingEnglishOverrides,
    ...englishProductCatalog,
    ...englishDynamicCatalog,
    ...englishCustomerReferralCatalog,
    ...englishReferralCatalog,
    ...englishPromotionCatalog,
};
