import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import ts from 'typescript-eslint';

export default ts.config(
 {ignores:['.next/**','node_modules/**']},
 js.configs.recommended,
 ...ts.configs.recommended,
 {
  files:['**/*.{ts,tsx}'],
  plugins:{'@next/next':nextPlugin},
  rules:{
   ...nextPlugin.configs.recommended.rules,
   ...nextPlugin.configs['core-web-vitals'].rules,
   '@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],
   '@typescript-eslint/no-explicit-any':'error',
   'no-undef':'off'
  }
 }
);
