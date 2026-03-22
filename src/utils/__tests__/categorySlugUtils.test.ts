import {
  categoryNameToSlug,
  cityNameToSlug,
  findCategoryBySlug,
  findCityBySlug,
  findCitiesBySlug,
  groupCitiesBySlug,
  slugToCategoryPattern,
  slugToCityName,
} from '../categorySlugUtils';

describe('categorySlugUtils', () => {
  describe('categoryNameToSlug', () => {
    it('pluralizes known category words', () => {
      expect(categoryNameToSlug('Conference')).toBe('conferences');
      expect(categoryNameToSlug('Workshop')).toBe('workshops');
      expect(categoryNameToSlug('Product Launch')).toBe('product-launches');
    });

    it('falls back to appending s for unknown words', () => {
      expect(categoryNameToSlug('Roundtable')).toBe('roundtables');
    });
  });

  describe('slugToCategoryPattern', () => {
    it('converts plural category slugs to a singular DB lookup pattern', () => {
      expect(slugToCategoryPattern('conferences')).toBe('conference%');
      expect(slugToCategoryPattern('product-launches')).toBe('product launch%');
    });
  });

  describe('category resolver helpers', () => {
    it('finds category rows using canonical slug rules', () => {
      const categories = [
        { id: '1', name: 'Conference' },
        { id: '2', name: 'Product Launch' },
      ];

      expect(findCategoryBySlug(categories, 'product-launches')).toEqual({
        id: '2',
        name: 'Product Launch',
      });
    });

    it('returns null when category slug does not match', () => {
      const categories = [{ id: '1', name: 'Conference' }];
      expect(findCategoryBySlug(categories, 'meetups')).toBeNull();
    });
  });

  describe('city slugs', () => {
    it('normalizes city names to stable URL slugs', () => {
      expect(cityNameToSlug('San Francisco, CA')).toBe('san-francisco-ca');
      expect(cityNameToSlug("St. John's")).toBe('st-johns');
    });

    it('converts city slug to display name', () => {
      expect(slugToCityName('san-francisco-ca')).toBe('San Francisco Ca');
    });

    it('resolves city slug to exact city label', () => {
      const cities = ['San Francisco, CA', 'Amsterdam, Netherlands'];
      expect(findCityBySlug(cities, 'amsterdam-netherlands')).toBe(
        'Amsterdam, Netherlands'
      );
      expect(findCityBySlug(cities, 'berlin-germany')).toBeNull();
    });

    it('groups punctuation variants under the same slug', () => {
      const cities = ['Washington, D.C.', 'Washington DC', 'Amsterdam'];

      expect(findCitiesBySlug(cities, 'washington-dc')).toEqual([
        'Washington DC',
        'Washington, D.C.',
      ]);

      expect(groupCitiesBySlug(cities)).toEqual([
        {
          citySlug: 'washington-dc',
          cityNames: ['Washington DC', 'Washington, D.C.'],
        },
        {
          citySlug: 'amsterdam',
          cityNames: ['Amsterdam'],
        },
      ]);
    });
  });
});
