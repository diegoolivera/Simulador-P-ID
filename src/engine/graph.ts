import type { PlantEdge, PlantNode } from '../types/plant';

export class PlantGraph {
  readonly nodes = new Map<string, PlantNode>();
  readonly edges: PlantEdge[] = [];
  readonly dirtyEdges = new Set<string>();
  readonly dirtyNodes = new Set<string>();
  private adjacency = new Map<string, string[]>();
  private edgeById = new Map<string, PlantEdge>();
  private topoCache: readonly string[] | null = null;

  addNode(node: PlantNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node ${node.id} already exists`);
    }
    this.nodes.set(node.id, node);
    this.adjacency.set(node.id, []);
    this.topoCache = null;
  }

  addEdge(edge: PlantEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Edge ${edge.id} references unknown nodes`);
    }
    if (this.edgeById.has(edge.id)) {
      throw new Error(`Edge ${edge.id} already exists`);
    }
    this.edges.push(edge);
    this.edgeById.set(edge.id, edge);
    this.adjacency.get(edge.from)!.push(edge.to);
    this.topoCache = null;
  }

  getTopologicalOrder(): readonly string[] {
    if (!this.topoCache) {
      this.topoCache = Object.freeze(this.computeTopologicalOrder());
    }
    return this.topoCache;
  }

  private computeTopologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
    }
    for (const edge of this.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }

    const queue = Array.from(this.nodes.keys())
      .filter((id) => inDegree.get(id) === 0)
      .sort();
    const order: string[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);

      const next = [...(this.adjacency.get(id) ?? [])].sort();
      for (const to of next) {
        inDegree.set(to, (inDegree.get(to) ?? 0) - 1);
        if (inDegree.get(to) === 0) {
          queue.push(to);
          queue.sort();
        }
      }
    }

    if (order.length !== this.nodes.size) {
      throw new Error('Cycle detected in plant graph');
    }
    return order;
  }

  markDirty(edgeIds: string[]): Set<string> {
    const queue = [...edgeIds];
    for (const id of edgeIds) {
      this.dirtyEdges.add(id);
    }

    let head = 0;
    while (head < queue.length) {
      const edgeId = queue[head++];
      const edge = this.edgeById.get(edgeId);
      if (!edge) continue;

      if (!this.dirtyNodes.has(edge.to)) {
        this.dirtyNodes.add(edge.to);
        for (const next of this.edges) {
          if (next.from === edge.to && !this.dirtyEdges.has(next.id)) {
            this.dirtyEdges.add(next.id);
            queue.push(next.id);
          }
        }
      }
    }

    return new Set(this.dirtyNodes);
  }

  outgoingEdges(nodeId: string): PlantEdge[] {
    return this.edges.filter((edge) => edge.from === nodeId);
  }

  clearDirty(): void {
    this.dirtyEdges.clear();
    this.dirtyNodes.clear();
  }
}
