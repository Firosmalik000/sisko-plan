import { indonesianOverrides } from './application';
import { indonesianCore } from './common';
import { indonesianOverrides as indonesianCustomerReferralCatalog } from './customer-referral';
import { indonesianOverrides as indonesianPromotionCatalog } from './promotion';
import { indonesianOverrides as indonesianReferralCatalog } from './referral';

export const indonesianCatalog: Record<string, string> = {
    ...indonesianCore,
    ...indonesianOverrides,
    ...indonesianCustomerReferralCatalog,
    ...indonesianReferralCatalog,
    ...indonesianPromotionCatalog,
};
