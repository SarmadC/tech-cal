import { describe, expect, it } from 'vitest';

import { generateAvatarUrl } from '../avatarService';

describe('avatarService', () => {
    it('generates png avatar urls for unicode names', () => {
        expect(generateAvatarUrl('Łukasz Langa', { size: 40 })).toBe(
            'https://ui-avatars.com/api/?name=%C5%81ukasz+Langa&size=40&background=4f46e5&color=ffffff&bold=true&rounded=true&format=png'
        );
    });
});
