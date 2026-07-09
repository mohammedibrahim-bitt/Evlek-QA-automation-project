import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult
} from '@playwright/test/reporter';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

type FailureRow = {
  title: string;
  url: string;
  deviceBrowser: string;
  steps: string;
  expected: string;
  actual: string;
  severity: string;
  screenshotVideo: string;
  suggestedFix: string;
};

class BugReportReporter implements Reporter {
  private rootSuite?: Suite;
  private outputDir = join(process.cwd(), 'bug-reports', 'generated');

  onBegin(_config: FullConfig, suite: Suite): void {
    this.rootSuite = suite;
  }

  onEnd(_result: FullResult): void {
    if (!this.rootSuite) {
      return;
    }

    const failures = this.collectUnexpectedFailures(this.rootSuite);
    mkdirSync(this.outputDir, { recursive: true });

    if (failures.length === 0) {
      writeFileSync(join(this.outputDir, 'latest-failures.csv'), this.csv([
        {
          title: 'No failed tests',
          url: '',
          deviceBrowser: '',
          steps: '',
          expected: '',
          actual: 'Last run completed without unexpected failures.',
          severity: '',
          screenshotVideo: '',
          suggestedFix: ''
        }
      ]));
      writeFileSync(join(this.outputDir, 'latest-failures.md'), '# Latest Failed Test Bug Drafts\n\nNo unexpected failures were found in the last run.\n');
      return;
    }

    writeFileSync(join(this.outputDir, 'latest-failures.csv'), this.csv(failures));
    writeFileSync(join(this.outputDir, 'latest-failures.md'), this.markdown(failures));
  }

  private collectUnexpectedFailures(suite: Suite): FailureRow[] {
    return suite.allTests()
      .filter((test) => test.outcome() === 'unexpected')
      .map((test) => this.toFailureRow(test));
  }

  private toFailureRow(test: TestCase): FailureRow {
    const result = [...test.results].reverse().find((candidate) => candidate.status !== test.expectedStatus) ?? test.results.at(-1);
    const deviceBrowser = this.projectName(test);
    const errorMessage = this.errorMessage(result);
    const artifacts = this.artifactPaths(result);
    const url = this.attachmentText(result, 'current-url');

    return {
      title: test.title,
      url,
      deviceBrowser,
      steps: `Run ${test.location.file} in Playwright and follow the failing test steps.`,
      expected: `The automated journey "${test.title}" should complete successfully.`,
      actual: errorMessage || `Test finished with status ${result?.status ?? 'unknown'}.`,
      severity: 'Triage',
      screenshotVideo: artifacts || 'See Playwright HTML report for attachments.',
      suggestedFix: 'Review the failing step, attached screenshot/video/trace, and current URL to decide whether this is a product bug or automation drift.'
    };
  }

  private errorMessage(result?: TestResult): string {
    const message = result?.error?.message ?? result?.errors?.map((error) => error.message).find(Boolean);
    return message ? this.cleanText(message) : '';
  }

  private artifactPaths(result?: TestResult): string {
    if (!result) {
      return '';
    }

    return result.attachments
      .filter((attachment) => attachment.path && /screenshot|video|trace/i.test(attachment.name))
      .map((attachment) => `${attachment.name}: ${relative(process.cwd(), attachment.path ?? '')}`)
      .join(' | ');
  }

  private attachmentText(result: TestResult | undefined, name: string): string {
    const attachment = result?.attachments.find((candidate) => candidate.name === name);
    if (!attachment?.body) {
      return '';
    }

    return attachment.body.toString().trim();
  }

  private projectName(test: TestCase): string {
    let suite: Suite | undefined = test.parent;

    while (suite) {
      const project = suite.project();
      if (project?.name) {
        return project.name;
      }

      suite = suite.parent;
    }

    return 'Unknown project';
  }

  private cleanText(value: string): string {
    return value
      .replace(/\u001b\[[0-9;]*m/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private csv(rows: FailureRow[]): string {
    const headers = ['Title', 'URL', 'Device/Browser', 'Steps To Reproduce', 'Expected Result', 'Actual Result', 'Severity', 'Screenshot/Video', 'Suggested Fix'];
    return [
      headers.join(','),
      ...rows.map((row) => [
        row.title,
        row.url,
        row.deviceBrowser,
        row.steps,
        row.expected,
        row.actual,
        row.severity,
        row.screenshotVideo,
        row.suggestedFix
      ].map((value) => this.csvCell(value)).join(','))
    ].join('\n') + '\n';
  }

  private csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private markdown(rows: FailureRow[]): string {
    return [
      '# Latest Failed Test Bug Drafts',
      '',
      ...rows.flatMap((row, index) => [
        `## BUG-DRAFT-${String(index + 1).padStart(3, '0')}: ${row.title}`,
        '',
        `- URL: ${row.url || 'Unknown'}`,
        `- Device / Browser: ${row.deviceBrowser}`,
        `- Severity: ${row.severity}`,
        `- Screenshot / Video: ${row.screenshotVideo}`,
        '',
        '### Steps To Reproduce',
        '',
        row.steps,
        '',
        '### Expected Result',
        '',
        row.expected,
        '',
        '### Actual Result',
        '',
        row.actual,
        '',
        '### Suggested Fix',
        '',
        row.suggestedFix,
        ''
      ])
    ].join('\n');
  }
}

export default BugReportReporter;
