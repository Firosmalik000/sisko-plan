import { indonesianOverrides } from './application';
import { indonesianCore } from './common';
import { indonesianOverrides as indonesianReferralCatalog } from './referral';

export const indonesianCatalog: Record<string, string> = {
    ...indonesianCore,
    ...indonesianOverrides,
    ...indonesianReferralCatalog,
};
