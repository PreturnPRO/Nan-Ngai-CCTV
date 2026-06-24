import { useState, useEffect, useCallback, useRef } from 'react';

type WebSocketStatus =
	| 'idle'
	| 'connecting'
	| 'open'
	| 'closing'
	| 'closed'
	| 'error';

interface UseWebSocketOptions {
	onOpen?: (event: Event) => void;
	onMessage?: (event: MessageEvent) => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
	reconnectOnClose?: boolean;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
	debug?: boolean;
}

export function useWebSocket(
	url: string | null | undefined,
	options: UseWebSocketOptions = {}
) {
	const [status, setStatus] = useState<WebSocketStatus>('idle');
	const [data, setData] = useState<any | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const manualCloseRef = useRef(false);

	const {
		onOpen,
		onMessage,
		onClose,
		onError,
		reconnectOnClose = true,
		reconnectInterval = 3000,
		maxReconnectAttempts = 5,
		debug = false,
	} = options;

	// Hold the callbacks in refs so an unstable (inline) callback identity
	// doesn't rebuild `connect` and tear down/reopen the socket on every render.
	const onOpenRef = useRef(onOpen);
	const onMessageRef = useRef(onMessage);
	const onCloseRef = useRef(onClose);
	const onErrorRef = useRef(onError);
	onOpenRef.current = onOpen;
	onMessageRef.current = onMessage;
	onCloseRef.current = onClose;
	onErrorRef.current = onError;

	const log = useCallback(
		(message: string, ...args: any[]) => {
			if (debug) {
				console.log(`[WebSocket] ${message}`, ...args);
			}
		},
		[debug]
	);

	const warn = useCallback(
		(message: string, ...args: any[]) => {
			if (debug) {
				console.warn(`[WebSocket] ${message}`, ...args);
			}
		},
		[debug]
	);

	const error = useCallback((message: string, ...args: any[]) => {
		console.warn(`[WebSocket] ${message}`, ...args);
	}, []);

	const connect = useCallback(() => {
		if (!url) {
			log('No URL provided, skipping connection');
			setStatus('idle');
			return;
		}

		if (socketRef.current) {
			if (socketRef.current.readyState === WebSocket.CONNECTING) {
				log('Connection already in progress');
				return;
			}
			if (socketRef.current.readyState === WebSocket.OPEN) {
				log('Connection already open');
				return;
			}
		}

		try {
			manualCloseRef.current = false;
			setStatus('connecting');
			log(`Connecting to ${url}`);

			const socket = new WebSocket(url);
			socketRef.current = socket;

			socket.onopen = event => {
				log('Connection established');
				setStatus('open');
				reconnectAttemptsRef.current = 0;
				onOpenRef.current?.(event);
			};

			socket.onmessage = event => {
				try {
					const parsedData = JSON.parse(event.data);
					setData(parsedData);
					onMessageRef.current?.(event);
				} catch (err) {
					error('Error parsing message:', err);
					setData(event.data);
					onMessageRef.current?.(event);
				}
			};

			socket.onclose = event => {
				warn(`Connection closed: code=${event.code}, reason=${event.reason}`);
				setStatus('closed');
				onCloseRef.current?.(event);

				// Don't reconnect if manually closed or max attempts reached
				if (
					!manualCloseRef.current &&
					reconnectOnClose &&
					reconnectAttemptsRef.current < maxReconnectAttempts
				) {
					log(
						`Reconnecting (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`
					);
					reconnectAttemptsRef.current += 1;

					reconnectTimeoutRef.current = setTimeout(() => {
						log('Attempting reconnection...');
						connect();
					}, reconnectInterval);
				} else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
					warn('Max reconnection attempts reached');
				}
			};

			socket.onerror = event => {
				error('Connection error:', event);
				setStatus('error');
				onErrorRef.current?.(event);
			};
		} catch (err) {
			error('Error creating WebSocket:', err);
			setStatus('error');
		}
	}, [
		url,
		reconnectOnClose,
		reconnectInterval,
		maxReconnectAttempts,
		log,
		warn,
		error,
	]);

	const disconnect = useCallback(() => {
		log('Manual disconnect requested');
		manualCloseRef.current = true;

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (socketRef.current) {
			if (
				socketRef.current.readyState === WebSocket.OPEN ||
				socketRef.current.readyState === WebSocket.CONNECTING
			) {
				log('Closing connection');
				setStatus('closing');
				socketRef.current.close();
			}
		}

		setStatus('closed');
	}, [log]);

	const send = useCallback(
		(message: string | ArrayBufferLike | Blob | ArrayBufferView) => {
			if (socketRef.current?.readyState === WebSocket.OPEN) {
				socketRef.current.send(message);
				return true;
			}
			warn('Cannot send message, WebSocket is not open');
			return false;
		},
		[warn]
	);

	// Connect when URL changes
	useEffect(() => {
		if (url) {
			connect();
		} else {
			disconnect();
		}

		return () => {
			if (socketRef.current) {
				disconnect();
			}
		};
	}, [url, connect, disconnect]);

	return {
		status,
		data,
		send,
		disconnect,
		connect,
		socket: socketRef.current,
	};
}
