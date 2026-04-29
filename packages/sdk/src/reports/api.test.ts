import { afterEach, describe, expect, test } from 'bun:test';
import { ReportFormat, type ReportConfig } from '@compass/types';
import { configureSdk, resetSdk } from '../runtime';
import { createReport, triggerReportGeneration } from './api';

type UserResult = Promise<{ data: { user: { id: string } }; error: null }>;
type InsertResult = {
  select: (columns: string) => {
    single: () => Promise<{ data: { id: string }; error: null }>;
  };
};
type ReportsTable = {
  insert: (payload: Record<string, unknown>) => InsertResult;
};
type FunctionInvokeResult = Promise<{
  data: {
    reportId: string;
    status: 'completed';
    storagePath: string;
    signedUrl: string;
    fileSize: number;
    generatedBy: string;
  };
  error: null;
}>;

describe('reports api', () => {
  afterEach(() => {
    resetSdk();
  });

  test('createReport inserts a visible queued report owned by the current user', async () => {
    let insertedPayload: Record<string, unknown> | null = null;
    const config: ReportConfig = {
      surveyId: 'survey-1',
      format: ReportFormat.PDF,
      sections: [
        { id: 'cover', label: 'Cover Page', included: true, locked: true },
        { id: 'recommendations', label: 'Recommendations', included: false },
      ],
    };

    configureSdk({
      client: {
        auth: {
          getUser: async (): UserResult => ({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
        },
        from: (table: string): ReportsTable => {
          expect(table).toBe('reports');
          return {
            insert: (payload: Record<string, unknown>): InsertResult => {
              insertedPayload = payload;
              return {
                select: (columns: string): ReturnType<InsertResult['select']> => {
                  expect(columns).toBe('id');
                  return {
                    single: async (): Promise<{ data: { id: string }; error: null }> => ({
                      data: { id: 'report-1' },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
      } as never,
    });

    const result = await createReport(config);

    expect(result).toEqual({ reportId: 'report-1' });
    expect(insertedPayload).toMatchObject({
      survey_id: 'survey-1',
      format: 'pdf',
      status: 'queued',
      progress: 0,
      sections: ['cover'],
      client_visible: true,
      created_by: 'user-1',
      triggered_by: 'user-1',
    });
  });

  test('triggerReportGeneration returns the edge function download payload', async () => {
    configureSdk({
      client: {
        functions: {
          invoke: async (name: string, opts: { body?: unknown }): FunctionInvokeResult => {
            expect(name).toBe('generate-report');
            expect(opts.body).toEqual({ reportId: 'report-1' });
            return {
              data: {
                reportId: 'report-1',
                status: 'completed',
                storagePath: 'org-1/report-1.html',
                signedUrl: 'https://storage.test/report-1',
                fileSize: 1234,
                generatedBy: 'user-1',
              },
              error: null,
            };
          },
        },
      } as never,
    });

    await expect(triggerReportGeneration('report-1')).resolves.toMatchObject({
      signedUrl: 'https://storage.test/report-1',
      storagePath: 'org-1/report-1.html',
    });
  });
});
