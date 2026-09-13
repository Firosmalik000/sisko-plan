import { viAuthCatalog } from './auth';
import { viCustomerCatalog } from './customer';
import { viPlatformCatalog } from './platform';
import { viPublicCatalog } from './public';
import { viSharedCatalog } from './shared';

export const vietnameseCatalog: Record<string, string> = {
    ...viAuthCatalog,
    ...viCustomerCatalog,
    ...viPlatformCatalog,
    ...viPublicCatalog,
    ...viSharedCatalog,
};
