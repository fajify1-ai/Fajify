import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['.next/**','node_modules/**','webapp/**']},js.configs.recommended,...ts.configs.recommended,{files:['**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],'@typescript-eslint/no-explicit-any':'error','no-undef':'off'}});
