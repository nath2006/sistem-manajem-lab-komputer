import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const spec=JSON.parse(readFileSync(new URL('../../openapi.json',import.meta.url),'utf8'));
test('presence SSE and heartbeat contract forbids caller identity and query credentials',()=>{
 const stream=spec.paths['/api/presence/stream'].get;
 const ack=spec.paths['/api/presence/heartbeat'].post;
 assert.deepEqual(stream.security,[{bearerAuth:[]}]);
 assert.ok(stream.responses['200'].content['text/event-stream']);
 for(const field of ['connection_id','heartbeat_interval_ms:15000','lease_timeout_ms:45000','online_user_ids','revision'])assert.ok(stream.description.includes(field));
 const schema=ack.requestBody.content['application/json'].schema;
 assert.equal(schema.additionalProperties,false);
 assert.deepEqual(Object.keys(schema.properties),['connection_id']);
 assert.ok(ack.responses['204']);assert.ok(ack.responses['403']);
 assert.match(stream.description,/single-process/);
});
