import { loAuthCatalog } from './auth';
import { loCustomerCatalog } from './customer';
import { loPlatformCatalog } from './platform';
import { loPublicCatalog } from './public';
import { loSharedCatalog } from './shared';

export const laoCatalog: Record<string, string> = {
    ...loAuthCatalog,
    ...loCustomerCatalog,
    ...loPlatformCatalog,
    ...loPublicCatalog,
    ...loSharedCatalog,
};
