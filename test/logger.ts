let receivedLogs: string[] = []
export function log(...args: any[]) {
	receivedLogs.push(args.join(' '))
}
export function logs() {
	const rv = receivedLogs
	receivedLogs = []
	return rv
}
