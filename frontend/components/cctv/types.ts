import { ColumnDef } from '@tanstack/react-table';

export type CCTV = {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	rtspUrl: string;
	status: string;
	createdAt: string;
	accidentVideoUrl?: string;
	hasAccidentVideo?: boolean;
	sector?: string | null;
	roadSegment?: string | null;
	landmark?: string | null;
	lastPing?: string | null;
	errorMessage?: string | null;
};

export type CCTVStatusFilterValue = string[];
