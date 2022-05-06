import { Agent, ClientRequest, RequestOptions } from 'agent-base';
import { IncomingMessage } from 'http';
import createHttpProxyAgent, { HttpProxyAgent } from 'http-proxy-agent';
import createHttpsProxyAgent, { HttpsProxyAgent } from 'https-proxy-agent';
import { Socket } from 'net';
import { Cookie, CookieJar } from 'tough-cookie';
import url from 'url';

abstract class BaseCookieProxyAgent extends Agent {
	private readonly jar: CookieJar;
	private readonly proxyAgent: HttpProxyAgent | HttpsProxyAgent;

	constructor(jar: CookieJar, proxyAgent: HttpProxyAgent | HttpsProxyAgent) {
		super();
		this.jar = jar;
		this.proxyAgent = proxyAgent;
	}

	async performCookieAgent(req: ClientRequest): Promise<void> {
		// retrieve request url
		const requestUrl = url.format({
			host: req.host,
			pathname: req.path,
			protocol: req.protocol
		});

		// generate cookie header
		const cookies = await this.jar.getCookies(requestUrl);
		const cookiesMap = new Map(cookies.map(cookie => [cookie.key, cookie]));
		const cookieHeaderList = [req.getHeader('Cookie')].flat();
		for (const header of cookieHeaderList) {
			if (typeof header !== 'string') continue;

			for (const str of header.split(';')) {
				const cookie = Cookie.parse(str.trim());
				if (cookie === undefined) continue;

				cookiesMap.set(cookie.key, cookie);
			}
		}
		const cookieHeader = Array.from(cookiesMap.values())
			.map(cookie => cookie.cookieString())
			.join(';\x20');

		// assign cookie header to request
		if (cookieHeader) req.setHeader('Cookie', cookieHeader);

		// update request emit
		const emit = req.emit.bind(req);
		req.emit = (event: string, ...args: unknown[]): boolean => {
			if (event !== 'response') {
				return emit(event, ...args);
			}
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
		return new Promise<Socket>(resolve => {
			this.performCookieAgent(req)
				.then(() => this.proxyAgent.callback(req as any, opts))
				.then(socket => resolve(socket))
				.catch(err => req.emit(err));
		});
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
