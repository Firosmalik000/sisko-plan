import { enAuthCatalog } from './auth';
import { enCustomerCatalog } from './customer';
import { englishOverrides as enCustomerReferralCatalog } from './customer-referral';
import { enPlatformCatalog } from './platform';
import { englishOverrides as enPromotionCatalog } from './promotion';
import { enPublicCatalog } from './public';
import { englishOverrides as enReferralCatalog } from './referral';
import { enSharedCatalog } from './shared';

export const englishCatalog: Record<string, string> = {
    ...enAuthCatalog,
    ...enCustomerCatalog,
    ...enPlatformCatalog,
    ...enPublicCatalog,
    ...enSharedCatalog,
    ...enCustomerReferralCatalog,
    ...enReferralCatalog,
    ...enPromotionCatalog,
};
