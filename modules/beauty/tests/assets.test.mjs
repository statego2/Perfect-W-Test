import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
test('portraits match SHA-256 of static manifest',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../assets/manifest.json',import.meta.url),'utf8'));
 assert.equal(m.count,12);
 for(const image of m.images){
  const bytes=fs.readFileSync(new URL('../'+image.file,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),image.sha256);
 }
});
