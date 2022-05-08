import { Agent, ClientRequest, RequestOptions } from 'agent-base';
import { IncomingMessage } from 'http';
import createHttpProxyAgent, { HttpProxyAgent } from 'http-proxy-agent';
import createHttpsProxyAgent, { HttpsProxyAgent } from 'https-proxy-agent';
import { Socket } from 'net';
import createSocksProxyAgent, { SocksProxyAgent } from 'socks-proxy-agent';
import { Cookie, CookieJar } from 'tough-cookie';

declare module 'agent-base' {
	interface ClientRequest {
		_header: string | null;
		_headerSent: boolean;
		_implicitHeader(): void;
		_onPendingData(amount: number): void;
		outputData: Array<{
			callback: unknown;
			data: string;
			encoding: string;
		}>;
		outputSize: number;
	}
}

abstract class BaseCookieProxyAgent extends Agent {
	private readonly jar: CookieJar;
	private readonly proxyAgent: HttpProxyAgent | HttpsProxyAgent | SocksProxyAgent;

	constructor(jar: CookieJar, proxyAgent: HttpProxyAgent | HttpsProxyAgent | SocksProxyAgent) {
		super();
		this.jar = jar;
		this.proxyAgent = proxyAgent;
	}

	private updateRequestCookies(req: ClientRequest, requestUrl: string) {
		// generate cookie header
		const cookies = this.jar.getCookiesSync(requestUrl);
		const cookiesMap = new Map(cookies.map(cookie => [cookie.key, cookie]));
		const cookieHeaderList = [req.getHeader('Cookie')].flat();
		for (const header of cookieHeaderList) {
			if (typeof header !== 'string') continue;

			for (const str of header.split(';')) {
				const cookie = Cookie.parse(str.trim());
				if (cookie === undefined) {
					continue;
				}
				cookiesMap.set(cookie.key, cookie);
			}
		}
		const cookieHeader = Array.from(cookiesMap.values())
			.map(cookie => cookie.cookieString())
			.join(';\x20');

		// assign the header
		if (cookieHeader) {
			if (req._header === null) {
				req.setHeader('Cookie', cookieHeader);
				return;
			}
			const alreadyHeaderSent = req._headerSent;

			req._header = null;
			req.setHeader('Cookie', cookieHeader);
			req._implicitHeader();
			req._headerSent = alreadyHeaderSent;

			if (alreadyHeaderSent !== true) return;

			const firstChunk = req.outputData.shift();
			if (firstChunk === undefined) return;
			const dataWithoutHeader = firstChunk.data.split('\r\n\r\n').slice(1).join('\r\n\r\n');
			const chunk = {
				...firstChunk,
				data: `${req._header}${dataWithoutHeader}`
			};
			req.outputData.unshift(chunk);

			const diffSize = chunk.data.length - firstChunk.data.length;
			req.outputSize += diffSize;
			req._onPendingData(diffSize);
		}
	}

	private updateRequestEmit(req: ClientRequest, requestUrl: string) {
		const emit = req.emit.bind(req);
		req.emit = (event: string, ...args: unknown[]): boolean => {
			if (event !== 'response') return emit(event, ...args);
			const res = args[0] as IncomingMessage;
			(async () => {
				const cookies = res.headers['set-cookie'];
				if (cookies !== undefined) {
					for (const cookie of cookies) {
						await this.jar.setCookie(cookie, requestUrl, { ignoreError: true });
					}
				}
			})()
				.then(() => emit('response', res))
				.catch(err => emit('error', err));
			return req.listenerCount(event) !== 0;
		};
	}

	callback(req: ClientRequest, opts: RequestOptions): Promise<Socket> {
		// perform cookie agent
		const url = String(
			Object.assign(new URL('http://a.com'), { host: req.host, pathname: req.path, protocol: req.protocol })
		);
		this.updateRequestCookies(req, url);
		this.updateRequestEmit(req, url);

		// send request via proxy
		return this.proxyAgent.callback(req as any, opts);
	}
}

export class HttpCookieProxyAgent extends BaseCookieProxyAgent {
	constructor(jar: CookieJar, proxy: string | createHttpProxyAgent.HttpProxyAgentOptions) {
		super(jar, new HttpProxyAgent(proxy));
	}
}

export class HttpsCookieProxyAgent extends BaseCookieProxyAgent {
	constructor(jar: CookieJar, proxy: string | createHttpsProxyAgent.HttpsProxyAgentOptions) {
		super(jar, new HttpsProxyAgent(proxy));
	}
}

export class SocksCookieProxyAgent extends BaseCookieProxyAgent {
	constructor(jar: CookieJar, proxy: string | createSocksProxyAgent.SocksProxyAgentOptions) {
		super(jar, new SocksProxyAgent(proxy));
	}
}
