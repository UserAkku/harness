// Min-heap priority queue for discrete event simulation
export class PriorityQueue<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  get size(): number {
    return this.heap.length;
  }

  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  enqueue(item: T): void {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  clear(): void {
    this.heap = [];
  }

  toArray(): T[] {
    return [...this.heap];
  }

  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.comparator(this.heap[idx], this.heap[parentIdx]) < 0) {
        [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private _sinkDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}
