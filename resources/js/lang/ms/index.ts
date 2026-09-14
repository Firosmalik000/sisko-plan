import { malayCore } from './common';
import { malayOverrides as malayCustomerReferralCatalog } from './customer-referral';
import { malayDynamicCatalog } from './dynamic';
import { malayProductCatalog } from './product';
import { malayOverrides as malayPromotionCatalog } from './promotion';
import { landingMalayOverrides } from './public';
import { malayOverrides as malayReferralCatalog } from './referral';
import { reviewedMalayOverrides } from './reviewed';

export const malayCatalog: Record<string, string> = {
    ...malayCore,
    ...reviewedMalayOverrides,
    ...landingMalayOverrides,
    ...malayProductCatalog,
    ...malayDynamicCatalog,
    ...malayCustomerReferralCatalog,
    ...malayReferralCatalog,
    ...malayPromotionCatalog,
};
