import type {NextConfig} from 'next';
const config:NextConfig={output:'standalone',outputFileTracingRoot:require('node:path').join(__dirname,'../..'),transpilePackages:['@faji/web-auth']};
export default config;
