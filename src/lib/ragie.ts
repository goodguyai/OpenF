const RAGIE_API_URL = "https://api.ragie.ai";

interface InitConnectionResponse {
  url: string;
}

interface RagieConnectionOptions {
  orgId: string;
  redirectUri: string;
}

interface RagieChunk {
  text: string;
  score: number;
  document_name: string;
  document_metadata: Record<string, unknown>;
}

interface RetrievalResponse {
  scored_chunks: RagieChunk[];
}

export interface RetrievedContext {
  text: string;
  source: string;
}

export interface RagieRetrievalResult {
  chunks: RetrievedContext[];
  error?: string;
}

export async function retrieveFromRagie(
  query: string,
  orgId?: string
): Promise<RagieRetrievalResult> {
  // Build request body
  const body: Record<string, unknown> = {
    query,
    top_k: 5,
    rerank: true,
  };

  // If orgId provided, filter by the org's partition
  if (orgId) {
    const partition = orgId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    body.partition = partition;
  }

  const response = await fetch(`${RAGIE_API_URL}/retrievals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RAGIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ragie retrieval error:", errorText);
    return { chunks: [], error: `Ragie API error: ${response.status}` };
  }

  const data: RetrievalResponse = await response.json();

  return {
    chunks: data.scored_chunks.map((chunk) => ({
      text: chunk.text,
      source: chunk.document_name || "Unknown source",
    })),
  };
}

export async function initGoogleDriveConnection({
  orgId,
  redirectUri,
}: RagieConnectionOptions): Promise<InitConnectionResponse> {
  // Ragie partition only allows lowercase letters, numbers, underscores, and hyphens
  const partition = orgId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  const response = await fetch(`${RAGIE_API_URL}/connections/oauth`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RAGIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_type: "google_drive",
      redirect_uri: redirectUri,
      partition, // Isolate data per org (lowercase only)
      metadata: { org_id: orgId }, // Keep original orgId in metadata
      mode: "hi_res",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initialize Ragie connection: ${error}`);
  }

  return response.json();
}
