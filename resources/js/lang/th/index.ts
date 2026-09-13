import { thAuthCatalog } from './auth';
import { thCustomerCatalog } from './customer';
import { thPlatformCatalog } from './platform';
import { thPublicCatalog } from './public';
import { thSharedCatalog } from './shared';

export const thaiCatalog: Record<string, string> = {
    ...thAuthCatalog,
    ...thCustomerCatalog,
    ...thPlatformCatalog,
    ...thPublicCatalog,
    ...thSharedCatalog,
};
