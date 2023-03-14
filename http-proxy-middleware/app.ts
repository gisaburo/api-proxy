import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as OpenApiValidator from 'express-openapi-validator';
import cors from 'cors';
import commander from 'commander';
import fs from 'fs';
import YAML from 'yamljs';

const app = express();

const program = new commander.Command();
program
  .option('-f, --file <file>', 'File name')
  .option('-p, --port <port>', 'Port number')
  .parse(process.argv);

const options = program.opts();
const fileName = options.file;
const apiSpec = fileName;
const port = options.port || process.env.PORT || 3000;

if (!fileName) {
  console.error('File name not specified');
  process.exit(1);
}

fs.readFile(fileName, (err, data) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));

app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateRequests: true,
    validateResponses: true,
  }),
);

const spec = YAML.parse(fs.readFileSync(apiSpec).toString());
const servers = spec.servers;
const paths = spec.paths;

if (servers.length !== Object.keys(paths).length) {
  console.error('Error: the number of servers does not match the number of paths.');
  process.exit(1);
}

const targets: { path: string, url: string }[] = []

for (let i = 0; i < Object.keys(paths).length; i++) {
  targets.push({ path: Object.keys(paths)[i], url: servers[i].url })
}

const setUrlObject = (hostname: string, port: string, pathname: string) => {
  if (pathname === '/') {
    if (port === '') {
      return `http://${hostname}`
    } else {
      return `http://${hostname}:${port}`
    }
  } else {
    if (port === '') {
      return `http://${hostname}${pathname}`
    } else {
      return `http://${hostname}:${port}${pathname}`
    }
  }
}

const circularReplacer = () => {
  const seen = new WeakSet();
  return (key: any, value: object | null) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

const onProxyReq = (proxyReq: any, req: any, res: any) => {
  const cookieHeader = req.headers.cookie;
  const cookieRegex = /CognitoIdentityServiceProvider\.[^.]+\.(LastAuthUser)=([^;]+);?/g;
  const cookies = cookieHeader.match(cookieRegex)?.join("; ");

  const requestBody = {
    headers: {
      Cookie: cookies
    },
    queryStringParameters: req.query
  };
  const bodyData = JSON.stringify(requestBody);
  console.log("bodyData: ", bodyData)
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
  proxyReq.end();
  console.log(`proxy reqest: ${JSON.stringify(proxyReq, circularReplacer())}`);
  console.log(`reqest: ${JSON.stringify(req, circularReplacer())}`);
  console.log(`response: ${JSON.stringify(res, circularReplacer())}`);
};

targets.map((target: { path: string, url: string }) => {
  const { path, url } = target;
  const { hostname, port, pathname } = new URL(url);
  const rewriteOption = {
    [`^${path}`]: '',
  };
  const targetUrlObj = setUrlObject(hostname, port, pathname)
  app.use(
    `${path}`,
    createProxyMiddleware({
      target: targetUrlObj.toString(),
      changeOrigin: true,
      pathRewrite: rewriteOption,
      onProxyReq
    })
  );
})

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});