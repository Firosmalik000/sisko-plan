import { tetAuthCatalog } from './auth';
import { tetCustomerCatalog } from './customer';
import { tetPlatformCatalog } from './platform';
import { tetPublicCatalog } from './public';
import { tetSharedCatalog } from './shared';

export const tetumCatalog: Record<string, string> = {
    ...tetAuthCatalog,
    ...tetCustomerCatalog,
    ...tetPlatformCatalog,
    ...tetPublicCatalog,
    ...tetSharedCatalog,
};
