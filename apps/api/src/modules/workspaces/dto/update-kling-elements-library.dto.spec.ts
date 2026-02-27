import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateKlingElementsLibraryDto } from './update-kling-elements-library.dto';

const collectErrors = (value: unknown) =>
  validate(plainToInstance(UpdateKlingElementsLibraryDto, value), { whitelist: true }).then((errors) => {
    const messages: string[] = [];

    const walk = (items: typeof errors) => {
      for (const item of items) {
        if (item.constraints) {
          messages.push(...Object.values(item.constraints));
        }

        if (item.children?.length) {
          walk(item.children);
        }
      }
    };

    walk(errors);
    return messages;
  });

describe('UpdateKlingElementsLibraryDto', () => {
  it('accepts valid image-only element items', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          description: 'A loyal cinematic dog element',
          imageUrls: ['https://example.com/dog-1.png', 'https://example.com/dog-2.png'],
          tags: ['character', 'style']
        }
      ]
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects missing description', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          imageUrls: ['https://example.com/dog-1.png', 'https://example.com/dog-2.png']
        }
      ]
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects fewer than 2 image URLs', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          description: 'Description',
          imageUrls: ['https://example.com/dog-1.png']
        }
      ]
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects more than 4 image URLs', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          description: 'Description',
          imageUrls: [
            'https://example.com/dog-1.png',
            'https://example.com/dog-2.png',
            'https://example.com/dog-3.png',
            'https://example.com/dog-4.png',
            'https://example.com/dog-5.png'
          ]
        }
      ]
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects more than 8 tags', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          description: 'Description',
          imageUrls: ['https://example.com/dog-1.png', 'https://example.com/dog-2.png'],
          tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
        }
      ]
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects duplicate tags', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          description: 'Description',
          imageUrls: ['https://example.com/dog-1.png', 'https://example.com/dog-2.png'],
          tags: ['style', 'style']
        }
      ]
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects tags longer than 24 chars', async () => {
    const errors = await collectErrors({
      items: [
        {
          id: 'element_dog_1',
          name: 'Element Dog',
          description: 'Description',
          imageUrls: ['https://example.com/dog-1.png', 'https://example.com/dog-2.png'],
          tags: ['this-tag-name-is-definitely-longer-than-24']
        }
      ]
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
