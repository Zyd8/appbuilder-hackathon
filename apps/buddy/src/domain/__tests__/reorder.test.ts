/// <reference types="jest" />
import { applyOrder, moveItem } from '../reorder';

describe('moveItem', () => {
  it('moves an item down and up', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns an unchanged copy for out-of-range moves', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 5)).toEqual(['a', 'b']);
    expect(moveItem(list, -1, 0)).not.toBe(list);
  });
});

describe('applyOrder', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('orders items by id', () => {
    expect(applyOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('ignores unknown ids and keeps missing items at the end', () => {
    expect(applyOrder(items, ['zzz', 'b']).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('never duplicates items when ids repeat', () => {
    expect(applyOrder(items, ['a', 'a', 'c']).map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });
});
