import type { ConnectorResult, SourceId } from "../types";

/**
 * Every source connector implements this interface.
 * fetch + parse + normalize are kept separate so they can be individually tested.
 */
export interface SourceConnector {
  readonly sourceId: SourceId;
  readonly displayName: string;

  /**
   * Run a full ingest cycle and return normalized jobs + any non-fatal errors.
   * This method orchestrates fetch → parse → normalize internally.
   */
  run(): Promise<ConnectorResult>;
}
