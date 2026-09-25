import type { PlantEdge, PlantNode } from '../types/plant';

export class PlantGraph {
  readonly nodes = new Map<string, PlantNode>();
  readonly edges: PlantEdge[] = [];
  private adjacency = new Map<string, string[]>();

  addNode(node: PlantNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node ${node.id} already exists`);
    }
    this.nodes.set(node.id, node);
    this.adjacency.set(node.id, []);
  }

  addEdge(edge: PlantEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Edge ${edge.id} references unknown nodes`);
    }
    this.edges.push(edge);
    this.adjacency.get(edge.from)!.push(edge.to);
  }

  getTopologicalOrder(): string[] {
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
}
