import { env, pipeline } from "@xenova/transformers";

type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline>>;

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

env.allowLocalModels = false;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
	extractorPromise ??= pipeline("feature-extraction", EMBEDDING_MODEL);
	return extractorPromise;
}

export async function generatePropertyEmbedding(text: string) {
	const extractor = await getExtractor();
	const output = await extractor(text, { pooling: "mean", normalize: true } as never);
	const values = Array.from((output as { data: Float32Array | number[] }).data);

	if (values.length !== 384) {
		throw new Error(`Expected 384-dimensional embedding, received ${values.length}.`);
	}

	return values.map((value) => Number(value.toFixed(8)));
}

export function formatEmbeddingForPostgres(embedding: number[]) {
	return `[${embedding.join(",")}]`;
}
