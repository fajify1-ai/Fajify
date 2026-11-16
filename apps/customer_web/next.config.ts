import type {NextConfig} from 'next';
const config:NextConfig={output:'standalone',outputFileTracingRoot:require('node:path').join(__dirname,'../..'),transpilePackages:['@faji/web-auth','@faji/web-ui','@faji/business-web'],devIndicators:false};
export default config;
