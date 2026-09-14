import { myAuthCatalog } from './auth';
import { burmeseCommerceFeatureCatalog } from './commerce-features';
import { myCustomerCatalog } from './customer';
import { myPlatformCatalog } from './platform';
import { myPublicCatalog } from './public';
import { mySharedCatalog } from './shared';

export const burmeseCatalog: Record<string, string> = {
    ...myAuthCatalog,
    ...myCustomerCatalog,
    ...myPlatformCatalog,
    ...myPublicCatalog,
    ...mySharedCatalog,
    ...burmeseCommerceFeatureCatalog,
};
