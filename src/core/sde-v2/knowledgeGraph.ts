import type {
  KnowledgeStateAssessment,
  VersionedKnowledgeGraph,
} from "./types";

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  requiredCyclePaths: string[][];
}

function requiredAdjacency(graph: VersionedKnowledgeGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node.nodeId, []);
  for (const edge of graph.edges) {
    if (edge.relation !== "required_prerequisite") continue;
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
  }
  return adjacency;
}

export function validateKnowledgeGraph(
  graph: VersionedKnowledgeGraph,
  validTaxonomyNodeIds?: ReadonlySet<string>,
): GraphValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.nodeId)) errors.push(`Nó duplicado: ${node.nodeId}.`);
    nodeIds.add(node.nodeId);
    if (validTaxonomyNodeIds && !validTaxonomyNodeIds.has(node.taxonomyNodeId)) {
      errors.push(`Nó ${node.nodeId} referencia taxonomia inexistente ${node.taxonomyNodeId}.`);
    }
  }
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      errors.push(`Relação ${edge.fromNodeId} -> ${edge.toNodeId} referencia nó inexistente.`);
    }
    if (!Number.isFinite(edge.strength) || edge.strength < 0 || edge.strength > 1) {
      errors.push(`Força inválida na relação ${edge.fromNodeId} -> ${edge.toNodeId}.`);
    }
    if (!edge.rationale.trim()) errors.push(`Relação ${edge.fromNodeId} -> ${edge.toNodeId} sem justificativa.`);
  }

  const adjacency = requiredAdjacency(graph);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const requiredCyclePaths: string[][] = [];

  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) {
      const start = stack.indexOf(nodeId);
      requiredCyclePaths.push([...stack.slice(start), nodeId]);
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    stack.push(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) visit(next);
    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  for (const nodeId of nodeIds) visit(nodeId);
  if (requiredCyclePaths.length > 0) {
    errors.push("O grafo contém ciclo em pré-requisito obrigatório.");
  }
  return { valid: errors.length === 0, errors, requiredCyclePaths };
}

export function prerequisiteStateForTaxonomyNode(params: {
  graph: VersionedKnowledgeGraph;
  taxonomyNodeId: string;
  knowledgeStates: Record<string, KnowledgeStateAssessment>;
  acceptableRequiredStates: readonly string[];
}): {
  requiredBlocked: boolean;
  blockingNodeIds: string[];
  recommendedNodeIds: string[];
  transferValue: number;
  rationale: string[];
} {
  const byId = new Map(params.graph.nodes.map((node) => [node.nodeId, node] as const));
  const targetNodeIds = params.graph.nodes
    .filter((node) => node.taxonomyNodeId === params.taxonomyNodeId)
    .map((node) => node.nodeId);
  const targetSet = new Set(targetNodeIds);
  const incoming = params.graph.edges.filter((edge) => targetSet.has(edge.toNodeId));
  const blockingNodeIds: string[] = [];
  const recommendedNodeIds: string[] = [];
  const rationale: string[] = [];

  for (const edge of incoming) {
    const source = byId.get(edge.fromNodeId);
    if (!source) continue;
    const state = params.knowledgeStates[source.taxonomyNodeId]?.state ?? "UNSEEN";
    if (source.taxonomyNodeId === params.taxonomyNodeId) {
      rationale.push(`${source.label}: relação conceitual registrada, sem bloqueio porque a taxonomia ativa não separa os dois conceitos em nós distintos.`);
      continue;
    }
    if (edge.relation === "required_prerequisite" && !params.acceptableRequiredStates.includes(state)) {
      blockingNodeIds.push(source.taxonomyNodeId);
      rationale.push(`${source.label}: ${edge.rationale} Estado atual ${state}.`);
    }
    if (edge.relation === "recommended_prerequisite" && state !== "STABLE") {
      recommendedNodeIds.push(source.taxonomyNodeId);
      rationale.push(`${source.label}: pré-requisito recomendado ainda em ${state}.`);
    }
  }

  const outgoingTransfer = params.graph.edges.filter(
    (edge) => edge.relation === "transfer" && byId.get(edge.fromNodeId)?.taxonomyNodeId === params.taxonomyNodeId,
  );
  const transferValue = Math.min(
    1,
    outgoingTransfer.reduce((sum, edge) => sum + edge.strength, 0) / 2,
  );

  return {
    requiredBlocked: blockingNodeIds.length > 0,
    blockingNodeIds: [...new Set(blockingNodeIds)],
    recommendedNodeIds: [...new Set(recommendedNodeIds)],
    transferValue,
    rationale,
  };
}
