import chalk, { Chalk } from 'chalk';
import path from 'path';

export class Logger {
	private static writeMessage(msg: string, color: Chalk) {
		const pst = Error.prepareStackTrace;
		Error.prepareStackTrace = function (err, stack) {
			return stack;
		};

		// @ts-expect-error
		const stack = new Error().stack as NodeJS.CallSite[];
		const call = stack[2];
		const from = call.getTypeName() ?? path.parse(call.getFileName() ?? '').name;

		console.log(
			color(`[${new Date().toLocaleTimeString()}] ${from}.${call.getFunctionName()}:${call.getLineNumber()} - ${msg}`)
		);

		Error.prepareStackTrace = pst;
	}

	static info(msg: string) {
		this.writeMessage(msg, chalk.green);
	}

	static error(msg: string) {
		this.writeMessage(msg, chalk.red);
	}
}
