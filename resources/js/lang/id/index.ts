import { idAuthCatalog } from './auth';
import { idCustomerCatalog } from './customer';
import { idPlatformCatalog } from './platform';
import { idPublicCatalog } from './public';
import { idSharedCatalog } from './shared';

export const indonesianCatalog: Record<string, string> = {
    ...idAuthCatalog,
    ...idCustomerCatalog,
    ...idPlatformCatalog,
    ...idPublicCatalog,
    ...idSharedCatalog,
};
