import { viAuthCatalog } from './auth';
import { viCustomerCatalog } from './customer';
import { vietnameseCustomerReferralCatalog } from './customer-referral';
import { viPlatformCatalog } from './platform';
import { vietnamesePromotionCatalog } from './promotion';
import { viPublicCatalog } from './public';
import { vietnameseReferralCatalog } from './referral';
import { viSharedCatalog } from './shared';

export const vietnameseCatalog: Record<string, string> = {
    ...viAuthCatalog,
    ...viCustomerCatalog,
    ...viPlatformCatalog,
    ...viPublicCatalog,
    ...viSharedCatalog,
    ...vietnameseCustomerReferralCatalog,
    ...vietnameseReferralCatalog,
    ...vietnamesePromotionCatalog,
};
