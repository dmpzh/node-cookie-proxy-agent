# node-cookie-proxy-agent

## Install

```bash
npm install node-cookie-proxy-agent http-proxy-agent https-proxy-agent tough-cookie
```

## Usage

Pass `http-cookie-agent` to HTTP clients instead of http(s).Agent.

```ts
import axios from 'axios';
import { HttpCookieProxyAgent, HttpsCookieProxyAgent } from 'node-cookie-proxy-agent';
import { CookieJar } from 'tough-cookie';

(async () => {
	// initialise this first
	const jar = new CookieJar();
	const httpAgent = new HttpCookieProxyAgent(jar, 'http://127.0.0.1:8888'); // or http://id:password@127.0.0.1:8888 to use with authentication
	const httpsAgent = new HttpsCookieProxyAgent(jar, 'http://127.0.0.1:8888');

	// add your agents to your http client
	const axiosClient = axios.create({ httpAgent, httpsAgent });
	console.log('result: ', (await axiosClient.get('https://api.ipify.org?format=json')).data);
})().catch(err => console.error(err));

```
