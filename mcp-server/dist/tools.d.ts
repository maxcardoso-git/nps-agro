export declare const searchInterviewsSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            tenant_id: {
                type: string;
                description: string;
            };
            query: {
                type: string;
                description: string;
            };
            campaign_id: {
                type: string;
                description: string;
            };
            region: {
                type: string;
                description: string;
            };
            state: {
                type: string;
                description: string;
            };
            segment: {
                type: string;
                description: string;
            };
            sentiment: {
                type: string;
                enum: string[];
                description: string;
            };
            nps_class: {
                type: string;
                enum: string[];
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function searchInterviews(args: unknown): Promise<{
    total: number;
    interviews: import("pg").QueryResultRow[];
}>;
export declare const getInterviewDetailSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            tenant_id: {
                type: string;
                description: string;
            };
            interview_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function getInterviewDetail(args: unknown): Promise<{
    error: string;
} | {
    drivers_positive: any;
    drivers_negative: any;
    keywords: any;
    confidence: any;
    model: any;
    answers: import("pg").QueryResultRow[];
    error?: undefined;
}>;
export declare const getNpsSummarySchema: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            tenant_id: {
                type: string;
                description: string;
            };
            campaign_id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function getNpsSummary(args: unknown): Promise<{
    overall: import("pg").QueryResultRow | null;
    by_segment: import("pg").QueryResultRow[];
    by_region: import("pg").QueryResultRow[];
    top_accounts: import("pg").QueryResultRow[];
    sentiment_distribution: import("pg").QueryResultRow[];
}>;
export declare const searchTopicsSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            tenant_id: {
                type: string;
                description: string;
            };
            campaign_id: {
                type: string;
                description: string;
            };
            nps_class: {
                type: string;
                enum: string[];
                description: string;
            };
            query: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function searchTopics(args: unknown): Promise<{
    topics: import("pg").QueryResultRow[];
}>;
export declare const getDetractorInsightsSchema: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            tenant_id: {
                type: string;
                description: string;
            };
            campaign_id: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function getDetractorInsights(args: unknown): Promise<{
    total_detractors: number;
    detractors: import("pg").QueryResultRow[];
    top_negative_drivers: import("pg").QueryResultRow[];
    most_affected_regions: import("pg").QueryResultRow[];
}>;
