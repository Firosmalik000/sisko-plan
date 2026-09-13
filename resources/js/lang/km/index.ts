import { kmAuthCatalog } from './auth';
import { kmCustomerCatalog } from './customer';
import { kmPlatformCatalog } from './platform';
import { kmPublicCatalog } from './public';
import { kmSharedCatalog } from './shared';

export const khmerCatalog: Record<string, string> = {
    ...kmAuthCatalog,
    ...kmCustomerCatalog,
    ...kmPlatformCatalog,
    ...kmPublicCatalog,
    ...kmSharedCatalog,
};
