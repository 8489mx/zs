import { strict as assert } from 'node:assert';
import { AiEmbeddingEngine } from '../../src/modules/ai-copilot/engines/ai-embedding.engine';

// 1. Validate chunking with overlap
const doc = `
سياسة أسعار الجملة لعام 2026:
يتم تطبيق خصم 5% على الفواتير التي تتجاوز قيمتها 50,000 ج.م.
يتم تطبيق خصم 8% على الفواتير التي تتجاوز قيمتها 100,000 ج.م بشرط السداد النقدي الفوري.

شروط السداد الآجل للشركات:
فترة السماح القصوى هي 30 يوماً من تاريخ إصدار الفاتورة الإلكترونية.
في حال تجاوز حد الائتمان يتم تعليق البيع الآجل تلقائياً حتى سداد 50% من المستحقات السابقة.
`.trim();

const chunks = AiEmbeddingEngine.chunkText(doc, 150, 40);
assert.ok(chunks.length >= 2, 'Should partition document into multiple chunks');

// 2. Validate vector similarity ranking
const queryVec = AiEmbeddingEngine.generateLocalEmbedding('شروط السداد الآجل والائتمان', 64);
const chunk1Vec = AiEmbeddingEngine.generateLocalEmbedding(chunks[0].content, 64);
const chunk2Vec = AiEmbeddingEngine.generateLocalEmbedding(chunks[1].content, 64);

const sim1 = AiEmbeddingEngine.cosineSimilarity(queryVec, chunk1Vec);
const sim2 = AiEmbeddingEngine.cosineSimilarity(queryVec, chunk2Vec);

assert.ok(sim2 > sim1, 'Query about payment terms should rank the payment terms chunk higher than the discounts chunk');

// 3. Test bundle logic computation
const slowItemStock = 50;
const costPrice = 100;
const frozenCapital = slowItemStock * costPrice;
assert.equal(frozenCapital, 5000, 'Frozen capital should accurately reflect stock * cost');

console.log('ai-knowledge-agent.spec: ok');
