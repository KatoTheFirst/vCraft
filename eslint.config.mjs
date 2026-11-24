import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
const config = [{ ignores: [".qa/**"] }, ...next, ...ts];
export default config;

