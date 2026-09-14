import { msAuthCatalog } from './auth';
import { msCustomerCatalog } from './customer';
import { malayOverrides as msCustomerReferralCatalog } from './customer-referral';
import { msPlatformCatalog } from './platform';
import { malayOverrides as msPromotionCatalog } from './promotion';
import { msPublicCatalog } from './public';
import { malayOverrides as msReferralCatalog } from './referral';
import { msSharedCatalog } from './shared';

export const malayCatalog: Record<string, string> = {
    ...msAuthCatalog,
    ...msCustomerCatalog,
    ...msPlatformCatalog,
    ...msPublicCatalog,
    ...msSharedCatalog,
    ...msCustomerReferralCatalog,
    ...msReferralCatalog,
    ...msPromotionCatalog,
};
