export interface TrackingResult {
    trackingNumber: string;
    status: string;
    location?: string;
    lastUpdate?: Date;
    events: TrackingEvent[];
}
export interface ShipmentSummary {
    trackingNumber: string;
    customerName: string;
    status: string;
    location?: string;
    lastUpdate?: Date;
    isOverdue: boolean;
}
export interface TrackingEvent {
    date: string;
    time: string;
    description: string;
    location: string;
}
export interface ProgressCallback {
    (step: string, message: string, progress: number): void;
}
export declare class GlsService {
    private driver;
    private headless;
    constructor(headless?: boolean);
    private setupEdgeOptions;
    initializeDriver(): Promise<void>;
    login(username: string, password: string, progressCallback?: ProgressCallback): Promise<boolean>;
    trackPackage(trackingNumber: string, progressCallback?: ProgressCallback): Promise<TrackingResult>;
    loadAllShipments(progressCallback?: ProgressCallback): Promise<ShipmentSummary[]>;
    private clickSearchButton;
    private scrapeShipmentDetails;
    private extractShipmentDetails;
    private isValidTrackingNumber;
    private extractTextSafely;
    quit(): Promise<void>;
}
export declare const glsService: GlsService;
//# sourceMappingURL=glsService.d.ts.map