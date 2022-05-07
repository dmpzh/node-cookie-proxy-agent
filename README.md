# node-cookie-proxy-agent

[![npm](https://img.shields.io/npm/v/node-cookie-proxy-agent)](https://www.npmjs.com/package/node-cookie-proxy-agent)

HTTP & HTTPS agents with cookie and proxy support

## Install

```bash
npm install node-cookie-proxy-agent http-proxy-agent https-proxy-agent tough-cookie
```

## Usage

Pass `node-cookie-proxy-agent` to HTTP clients instead of http(s).Agent.

For exemple with `axios`:

```ts
import axios from 'axios';
import { HttpCookieProxyAgent, HttpsCookieProxyAgent } from 'node-cookie-proxy-agent';
import { CookieJar } from 'tough-cookie';

(async () => {
	// initialise this first
	const jar = new CookieJar();
	const proxy = 'http://127.0.0.1:8888'; // or http://id:password@127.0.0.1:8888 to use with authentication
	const httpAgent = new HttpCookieProxyAgent(jar, proxy);
	const httpsAgent = new HttpsCookieProxyAgent(jar, proxy);

	// add your agents to your http client
	const axiosClient = axios.create({ httpAgent, httpsAgent });
	console.log('result: ', (await axiosClient.get('https://api.ipify.org?format=json')).data);
})().catch(err => console.error(err));
```
