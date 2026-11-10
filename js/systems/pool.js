// Fixed-size object pool. All objects are created up front; spawning and
// releasing reuse them, so firing never allocates and the pool never grows.
// When the pool is full, spawn returns null and the caller skips the object.

export function createPool(capacity, factory) {
  const items = Array.from({ length: capacity }, () => ({ ...factory(), active: false }));
  const free = items.slice().reverse();
  return {
    items,
    capacity,
    get activeCount() {
      return capacity - free.length;
    },
    spawn() {
      const item = free.pop();
      if (!item) return null;
      item.active = true;
      return item;
    },
    release(item) {
      if (!item.active) return;
      item.active = false;
      free.push(item);
    },
  };
}
