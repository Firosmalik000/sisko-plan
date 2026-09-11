import { malayCore } from './common';
import { malayDynamicCatalog } from './dynamic';
import { malayProductCatalog } from './product';
import { landingMalayOverrides } from './public';
import { reviewedMalayOverrides } from './reviewed';

export const malayCatalog: Record<string, string> = {
    'Preferensi aplikasi': 'Pilihan aplikasi',
    ...malayCore,
    ...reviewedMalayOverrides,
    ...landingMalayOverrides,
    ...malayProductCatalog,
    ...malayDynamicCatalog,
    Tampilan: 'Paparan',
    Terang: 'Terang',
    Gelap: 'Gelap',
    'Ikuti perangkat': 'Ikut peranti',
};
