import { idAuthCatalog } from './auth';
import { idCustomerCatalog } from './customer';
import { indonesianOverrides as idCustomerReferralCatalog } from './customer-referral';
import { idPlatformCatalog } from './platform';
import { indonesianOverrides as idPromotionCatalog } from './promotion';
import { idPublicCatalog } from './public';
import { indonesianOverrides as idReferralCatalog } from './referral';
import { idSharedCatalog } from './shared';

export const indonesianCatalog: Record<string, string> = {
    ...idAuthCatalog,
    ...idCustomerCatalog,
    ...idPlatformCatalog,
    ...idPublicCatalog,
    ...idSharedCatalog,
    ...idCustomerReferralCatalog,
    ...idReferralCatalog,
    ...idPromotionCatalog,
};
