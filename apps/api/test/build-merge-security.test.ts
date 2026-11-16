import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
const requireFrom=createRequire(__filename);
const checker=requireFrom.resolve('fork-ts-checker-webpack-plugin',{paths:[dirname(requireFrom.resolve('@nestjs/cli/package.json'))]});
const merge=requireFrom(requireFrom.resolve('deepmerge',{paths:[dirname(checker)]}));
test('build dependency rejects prototype poisoning from both merge operands',()=>{
 const poison=JSON.parse('{"__proto__":{"privileged":true},"constructor":{"prototype":{"privileged":true}},"nested":{"__proto__":{"privileged":true}}}');
 for(const value of [merge(poison,{}),merge({},poison),merge(poison,poison)]){
  assert.equal(Object.getPrototypeOf(value),Object.prototype);assert.equal(value.privileged,undefined);assert.equal(Object.hasOwn(value,'__proto__'),false);assert.equal(value.nested.privileged,undefined);
 }
 assert.equal(({} as {privileged?:boolean}).privileged,undefined);
 assert.deepEqual(merge({a:[1],nested:{a:1}},{a:[2],nested:{b:2}}),{a:[1,2],nested:{a:1,b:2}});
});
