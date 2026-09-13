import { filAuthCatalog } from './auth';
import { filCustomerCatalog } from './customer';
import { filPlatformCatalog } from './platform';
import { filPublicCatalog } from './public';
import { filSharedCatalog } from './shared';

export const filipinoCatalog: Record<string, string> = {
    ...filAuthCatalog,
    ...filCustomerCatalog,
    ...filPlatformCatalog,
    ...filPublicCatalog,
    ...filSharedCatalog,
};
