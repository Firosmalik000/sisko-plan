import { enAuthCatalog } from './auth';
import { enCustomerCatalog } from './customer';
import { enPlatformCatalog } from './platform';
import { enPublicCatalog } from './public';
import { enSharedCatalog } from './shared';

export const englishCatalog: Record<string, string> = {
    ...enAuthCatalog,
    ...enCustomerCatalog,
    ...enPlatformCatalog,
    ...enPublicCatalog,
    ...enSharedCatalog,
};
