import {
  buildKlingElementParametersFromSelection,
  normalizeElementLibrarySelection,
  removeElementLibrarySelectionItem
} from '../../../../web/src/components/canvas/element-library-selection';

describe('element library selection helpers', () => {
  it('normalizes selections and keeps only valid unique items', () => {
    expect(
      normalizeElementLibrarySelection([
        {
          id: ' hero ',
          name: ' Hero Character ',
          description: ' Lead subject ',
          imageUrls: [' one.png ', 'two.png', 'two.png', ''],
          tags: ['character', '', 'hero']
        },
        {
          id: 'hero',
          name: 'Duplicate',
          description: 'Duplicate',
          imageUrls: ['one.png', 'two.png']
        },
        {
          id: 'invalid',
          name: 'Not enough refs',
          description: 'bad',
          imageUrls: ['only-one.png']
        }
      ])
    ).toEqual([
      {
        id: 'hero',
        name: 'Hero Character',
        description: 'Lead subject',
        imageUrls: ['one.png', 'two.png'],
        tags: ['character', 'hero']
      }
    ]);
  });

  it('builds kling element parameters from the stored selections', () => {
    expect(
      buildKlingElementParametersFromSelection([
        {
          id: 'hero',
          name: 'Hero Character',
          description: 'Lead subject',
          imageUrls: ['one.png', 'two.png', 'three.png']
        }
      ])
    ).toEqual([
      {
        name: 'Hero Character',
        description: 'Lead subject',
        elementInputUrls: ['one.png', 'two.png', 'three.png']
      }
    ]);
  });

  it('removes a selected item by id', () => {
    expect(
      removeElementLibrarySelectionItem(
        [
          {
            id: 'hero',
            name: 'Hero Character',
            description: 'Lead subject',
            imageUrls: ['one.png', 'two.png']
          },
          {
            id: 'prop',
            name: 'Signature Prop',
            description: 'Important object',
            imageUrls: ['three.png', 'four.png']
          }
        ],
        'hero'
      )
    ).toEqual([
      {
        id: 'prop',
        name: 'Signature Prop',
        description: 'Important object',
        imageUrls: ['three.png', 'four.png']
      }
    ]);
  });
});
