import { malayCore } from './common';
import { malayDynamicCatalog } from './dynamic';
import { malayProductCatalog } from './product';
import { landingMalayOverrides } from './public';
import { malayOverrides as malayReferralCatalog } from './referral';
import { reviewedMalayOverrides } from './reviewed';

export const malayCatalog: Record<string, string> = {
    ...malayCore,
    ...reviewedMalayOverrides,
    ...landingMalayOverrides,
    ...malayProductCatalog,
    ...malayDynamicCatalog,
    ...malayReferralCatalog,
};
