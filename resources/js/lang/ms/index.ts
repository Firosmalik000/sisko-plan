import { msAuthCatalog } from './auth';
import { msCustomerCatalog } from './customer';
import { msPlatformCatalog } from './platform';
import { msPublicCatalog } from './public';
import { msSharedCatalog } from './shared';

export const malayCatalog: Record<string, string> = {
    ...msAuthCatalog,
    ...msCustomerCatalog,
    ...msPlatformCatalog,
    ...msPublicCatalog,
    ...msSharedCatalog,
};
