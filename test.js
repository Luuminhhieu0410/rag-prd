import LlamaCloud from "@llamaindex/llama-cloud";

// Initialize client
// See how to get your API key at https://developers.llamaindex.ai/typescript/cloud/general/api_key/
const client = new LlamaCloud({ apiKey: "llx-HlP0owhzWXjF2tpncLOOmx8HsmfTFspGGP0yCuZ8SbFGkSyh" });

// Define categories for splitting
const categories = [
    { name: "default" },
];

async function main() {
    // One-shot: create job, poll until terminal, return final state.
    // Throws on FAILED/CANCELLED.
    const job = await client.beta.split.split({
        document_input: {
            type: "file_id",
            value: "8d8fca6a-23b4-4bb4-85d9-852526408b9d"
        },
        configuration: {
            categories,
            splitting_strategy: { allow_uncategorized: "include" },
        },
    });

    if (!job.result) {
        throw new Error(`Split job ${job.status}: ${job.error_message ?? "no details"}`);
    }

    console.log(`Split completed with ${job.result.segments.length} segments:`);
    for (const segment of job.result.segments) {
        console.log(`  - ${segment.category}: Pages ${segment.pages.join(", ")} (${segment.confidence_category} confidence)`);
    }
}

main().catch(console.error);
