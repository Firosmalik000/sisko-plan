import { indonesianOverrides } from './application';
import { indonesianCore } from './common';

export const indonesianCatalog: Record<string, string> = {
    ...indonesianCore,
    ...indonesianOverrides,
};
