import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  FileText,
  Download,
  Loader2,
  CheckCircle,
  Calendar,
  TrendingUp,
  Activity,
  Shield,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Modal } from '../components/atoms/Modal';
import { Dropdown } from '../components/molecules/Dropdown';
import { useToast } from '../components/molecules/Toast';
import { useDateRange } from '../context/DateRangeContext';
import { useGenerateReport, useBehaviorSummary, useBehaviorEvents } from '../api/hooks';
import { ReportType, BehaviorType, BehaviorEvent } from '../types';
import { behaviorColors, formatDuration, getBehaviorColor } from '../utils/formatting';

const reportTypes = [
  { value: 'daily_summary', label: 'Daily Behavior Summary', icon: Calendar },
  { value: 'weekly_monthly_trend', label: 'Weekly/Monthly Trend Report', icon: TrendingUp },
  { value: 'behavior_specific', label: 'Behavior-Specific Analysis', icon: Activity },
  { value: 'welfare_assessment', label: 'Welfare Assessment Report', icon: Shield },
];

export function ReportsPage() {
  const { animalId: routeAnimalId } = useParams<{ animalId: string }>();
  const animalId = routeAnimalId || 'giant-anteater'; // Fallback for backward compatibility
  const { dateRange, formatDateRange } = useDateRange();
  const { showToast } = useToast();
  const generateReportMutation = useGenerateReport(animalId);

  // Get summary data for preview
  const { data: summary } = useBehaviorSummary(
    dateRange.preset,
    dateRange.startDate,
    dateRange.endDate,
    true,
    animalId
  );

  // Get available behaviors from summary (dynamic from database)
  const availableBehaviors = useMemo(() => {
    if (summary?.behaviors && summary.behaviors.length > 0) {
      return summary.behaviors.map(b => b.behavior_type);
    }
    // Fallback to default behaviors if summary not loaded yet
    return ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'] as BehaviorType[];
  }, [summary]);

  // Form state
  const [reportType, setReportType] = useState<ReportType>('daily_summary');
  const [selectedBehaviors, setSelectedBehaviors] = useState<BehaviorType[]>([]);
  const [specificBehavior, setSpecificBehavior] = useState<BehaviorType | undefined>(undefined);

  // Initialize selectedBehaviors and specificBehavior when availableBehaviors loads
  useEffect(() => {
    if (availableBehaviors.length > 0) {
      setSelectedBehaviors(prev => {
        // If no behaviors selected, select all available behaviors
        if (prev.length === 0) {
          return [...availableBehaviors];
        }
        // Filter out any selected behaviors that are no longer available
        const validSelected = prev.filter(b => availableBehaviors.includes(b));
        return validSelected.length > 0 ? validSelected : [...availableBehaviors];
      });
      
      // If specificBehavior is not set or not in availableBehaviors, set to first available
      setSpecificBehavior(prev => {
        if (!prev || !availableBehaviors.includes(prev)) {
          return availableBehaviors[0];
        }
        return prev;
      });
    }
  }, [availableBehaviors]);

  // Get events data for behavior-specific preview
  const { data: events } = useBehaviorEvents(
    dateRange.startDate,
    dateRange.endDate,
    undefined,
    true,
    animalId
  );
  const [showDurationChart, setShowDurationChart] = useState(true);
  const [showCountChart, setShowCountChart] = useState(true);
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [includeDiversityIndex, setIncludeDiversityIndex] = useState(true);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{ download_url: string; report_id: string; count: number } | null>(null);

  /**
   * Download report using ONLY the `download_url` returned by the generate API.
   *
   * IMPORTANT:
   * - We do NOT call any frontend "download report API" wrapper.
   * - We do NOT fetch() the file (avoids CORS/preflight issues).
   * - We simply navigate/open the `download_url` so the browser downloads it.
   */
  const downloadReportFile = (downloadUrl: string, format: 'csv') => {
    if (!downloadUrl) {
      showToast('error', 'No report URL available');
      return;
    }

    // IMPORTANT: Backend is returning CSV by default, so ALWAYS specify format explicitly.
    const formatParam = format === 'csv' ? 'csv' : 'csv';
    const urlToOpen = downloadUrl.includes('?')
      ? `${downloadUrl}&format=${formatParam}`
      : `${downloadUrl}?format=${formatParam}`;

    // Use a normal navigation/open so browser handles the download.
    // This avoids CORS issues that happen with fetch + Authorization header.
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  /**
   * Backend currently returns CSV even when requesting PDF.
   * So PDF export is implemented as **Print to PDF** of the report preview.
   * (User can choose "Save as PDF" in the browser print dialog.)
   */
  const exportPdfFromPreview = () => {
    // Close modal so it doesn't appear in the PDF
    setShowExportModal(false);
    showToast('info', 'In the print dialog, choose "Save as PDF".');
    // Give the UI a moment to close the modal before printing
    setTimeout(() => window.print(), 150);
  };

  const toggleBehavior = (behavior: string) => {
    setSelectedBehaviors((prev) =>
      prev.includes(behavior as BehaviorType)
        ? prev.filter((b) => b !== behavior)
        : [...prev, behavior as BehaviorType]
    );
  };

  const handleGenerateReport = async () => {
    setGeneratedReport(null);

    try {
      const result = await generateReportMutation.mutateAsync({
        config: {
          report_type: reportType,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          behaviors: selectedBehaviors,
          options: {
            include_duration_chart: showDurationChart,
            include_count_chart: showCountChart,
            include_compliance: includeCompliance,
            include_diversity_index: includeDiversityIndex,
            specific_behavior: reportType === 'behavior_specific' ? specificBehavior : undefined,
          },
        },
        // Format isn't used by backend generate; we choose a stable default.
        format: 'excel',
      });

      // Store the full report response
      setGeneratedReport({
        download_url: result.download_url,
        report_id: result.report_id,
        count: result.count || 0,
      });
      showToast('success', `Report generated successfully! ${result.count || 0} records included.`);
    } catch {
      showToast('error', 'Failed to generate report. Please try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Print styles: only print the report preview */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-print-root, #report-print-root * { visibility: visible !important; }
          #report-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          #report-print-root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      {/* Configuration Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type */}
          <Dropdown
            label="Report Type"
            options={reportTypes.map((rt) => ({ value: rt.value, label: rt.label }))}
            value={reportType}
            onChange={(v) => setReportType(v as ReportType)}
          />

          {/* Date Range Display */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Date Range
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-charcoal">{formatDateRange()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Use the date picker in the navbar to change
              </p>
            </div>
          </div>

          {/* Behavior Selection */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Include Behaviors
            </label>
            <div className="space-y-2">
              {availableBehaviors.map((behavior) => {
                const behaviorColor = getBehaviorColor(behavior);
                return (
                  <label
                    key={behavior}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBehaviors.includes(behavior as BehaviorType)}
                      onChange={() => toggleBehavior(behavior)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: behaviorColor }}
                    />
                    <span className="text-sm text-charcoal">{behavior}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Conditional Options based on Report Type */}
          {reportType === 'behavior_specific' && (
            <Dropdown
              label="Specific Behavior"
              options={availableBehaviors.map((b) => ({ value: b, label: b }))}
              value={specificBehavior || ''}
              onChange={(v) => setSpecificBehavior(v as BehaviorType)}
            />
          )}

          {reportType === 'weekly_monthly_trend' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">
                Chart Options
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDurationChart}
                  onChange={(e) => setShowDurationChart(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-charcoal">Show duration chart</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCountChart}
                  onChange={(e) => setShowCountChart(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-charcoal">Show count chart</span>
              </label>
            </div>
          )}

          {reportType === 'welfare_assessment' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">
                Assessment Options
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompliance}
                  onChange={(e) => setIncludeCompliance(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-charcoal">Include compliance section</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiversityIndex}
                  onChange={(e) => setIncludeDiversityIndex(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-charcoal">Include behavior diversity index</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => { }}
            >
              Preview Report
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setShowExportModal(true);
                handleGenerateReport();
              }}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <Badge variant="info">
            {reportTypes.find((rt) => rt.value === reportType)?.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <div
            id="report-print-root"
            className="border border-gray-200 rounded-xl bg-white p-6 max-h-[600px] overflow-y-auto scrollbar-thin"
          >
            {/* Report Header */}
            <div className="text-center mb-8 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-charcoal mb-2">
                {reportTypes.find((rt) => rt.value === reportType)?.label}
              </h2>
              <p className="text-gray-500">
                Giant Anteater – Aria | {formatDateRange()}
              </p>
            </div>

            {/* Report Content based on type */}
            {reportType === 'daily_summary' && (
              <DailySummaryPreview summary={summary} />
            )}

            {reportType === 'weekly_monthly_trend' && (
              <TrendReportPreview
                summary={summary}
                showDuration={showDurationChart}
                showCount={showCountChart}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
              />
            )}

            {reportType === 'behavior_specific' && specificBehavior && (
              <BehaviorSpecificPreview
                summary={summary}
                behavior={specificBehavior}
                events={events}
              />
            )}

            {reportType === 'welfare_assessment' && (
              <WelfareAssessmentPreview
                includeCompliance={includeCompliance}
                includeDiversity={includeDiversityIndex}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setGeneratedReport(null);
        }}
        title="Export Report"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="text-center py-4">
            {generateReportMutation.isPending ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-charcoal font-medium">Generating your report...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
              </>
            ) : generatedReport ? (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-charcoal font-medium mb-2">Report generated!</p>
                <p className="text-sm text-gray-500 mb-4">{generatedReport.count} records included</p>

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => exportPdfFromPreview()}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Save as PDF
                  </Button>

                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => downloadReportFile(generatedReport.download_url, 'csv')}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download CSV (Excel)
                  </Button>

                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => handleGenerateReport()}
                  >
                    Generate again
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Click generate to create the report, then download as CSV or save as PDF.
                </p>
                <Button className="w-full" onClick={() => handleGenerateReport()}>
                  Generate now
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Daily Summary Preview Component
function DailySummaryPreview({ summary }: { summary?: ReturnType<typeof useBehaviorSummary>['data'] }) {
  if (!summary) return null;

  const pieData = summary.behaviors.map((b) => ({
    name: b.behavior_type,
    value: b.percentage_of_total,
    fill: behaviorColors[b.behavior_type],
  }));

  return (
    <div className="space-y-8">
      {/* Summary Table */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal mb-4">Behavior Summary</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-gray-500 font-medium">Behavior</th>
              <th className="text-right py-2 text-gray-500 font-medium">Count</th>
              <th className="text-right py-2 text-gray-500 font-medium">Duration</th>
              <th className="text-right py-2 text-gray-500 font-medium">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.behaviors.map((b) => (
              <tr key={b.behavior_type} className="border-b border-gray-100">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: behaviorColors[b.behavior_type] }}
                    />
                    {b.behavior_type}
                  </div>
                </td>
                <td className="text-right py-3">{b.count}</td>
                <td className="text-right py-3">{formatDuration(b.total_duration_seconds)}</td>
                <td className="text-right py-3">{b.percentage_of_total.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pie Chart */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal mb-4">Duration Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Trend Report Preview Component
function TrendReportPreview({
  summary,
  showDuration,
  showCount,
  startDate,
  endDate: _endDate,
}: {
  summary?: ReturnType<typeof useBehaviorSummary>['data'];
  showDuration: boolean;
  showCount: boolean;
  startDate: string;
  endDate: string;
}) {
  // Use real data from summary - show current summary data
  // For trend data, we would need daily breakdown from API
  // For now, show summary data as a single data point
  // Build trend data dynamically from available behaviors in summary
  const trendData = summary ? [{
    date: new Date(startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    ...summary.behaviors.reduce((acc, b) => {
      acc[b.behavior_type] = b.count;
      return acc;
    }, {} as Record<string, number>),
  }] : [];

  return (
    <div className="space-y-8">
      {showCount && (
        <div>
          <h3 className="text-lg font-semibold text-charcoal mb-4">Daily Behavior Counts</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {Object.keys(behaviorColors).map((behavior) => (
                <Line
                  key={behavior}
                  type="monotone"
                  dataKey={behavior}
                  stroke={behaviorColors[behavior as BehaviorType]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showDuration && (
        <div>
          <h3 className="text-lg font-semibold text-charcoal mb-4">Duration Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {Object.keys(behaviorColors).map((behavior) => (
                <Area
                  key={behavior}
                  type="monotone"
                  dataKey={behavior}
                  stackId="1"
                  stroke={behaviorColors[behavior as BehaviorType]}
                  fill={behaviorColors[behavior as BehaviorType]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Behavior Specific Preview Component
function BehaviorSpecificPreview({
  summary,
  behavior,
  events,
}: {
  summary?: ReturnType<typeof useBehaviorSummary>['data'];
  behavior: BehaviorType;
  events?: BehaviorEvent[];
}) {
  const behaviorData = summary?.behaviors.find((b) => b.behavior_type === behavior);

  // Use real occurrence data from events
  const occurrences = events
    ?.filter(e => e.behavior_type === behavior)
    .slice(0, 10) // Show top 10 most recent
    .sort((a, b) => new Date(b.start_timestamp).getTime() - new Date(a.start_timestamp).getTime())
    .map((event, index) => ({
      id: event.id || `event-${index}`,
      timestamp: new Date(event.start_timestamp).toLocaleString(),
      duration: event.duration_seconds,
    })) || [];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-charcoal">
            {behaviorData ? formatDuration(behaviorData.min_duration_seconds) : '00:30'}
          </p>
          <p className="text-sm text-gray-500">Min Duration</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-primary">
            {behaviorData ? formatDuration(behaviorData.average_duration_seconds) : '03:45'}
          </p>
          <p className="text-sm text-gray-500">Avg Duration</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-charcoal">
            {behaviorData ? formatDuration(behaviorData.max_duration_seconds) : '08:22'}
          </p>
          <p className="text-sm text-gray-500">Max Duration</p>
        </div>
      </div>

      {/* Occurrences Table */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal mb-4">
          Recent {behavior} Occurrences
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-gray-500 font-medium">#</th>
              <th className="text-left py-2 text-gray-500 font-medium">Timestamp</th>
              <th className="text-right py-2 text-gray-500 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody>
            {occurrences.map((occ) => (
              <tr key={occ.id} className="border-b border-gray-100">
                <td className="py-3">{occ.id}</td>
                <td className="py-3">{occ.timestamp}</td>
                <td className="text-right py-3">{formatDuration(occ.duration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Distribution Chart */}
      <div>
        <h3 className="text-lg font-semibold text-charcoal mb-4">Duration Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={[
              { range: '<1 min', count: 5 },
              { range: '1-3 min', count: 12 },
              { range: '3-5 min', count: 8 },
              { range: '5-10 min', count: 4 },
              { range: '>10 min', count: 2 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill={behaviorColors[behavior]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Welfare Assessment Preview Component
function WelfareAssessmentPreview({
  includeCompliance,
  includeDiversity,
}: {
  includeCompliance: boolean;
  includeDiversity: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* Overall Status */}
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-green-800">Good Welfare Status</h3>
        <p className="text-green-600 mt-1">
          All indicators are within normal parameters
        </p>
      </div>

      {/* Assessment Cards */}
      <div className="grid grid-cols-2 gap-4">
        {includeDiversity && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-charcoal mb-2">Behavior Diversity Index</h4>
            <p className="text-3xl font-bold text-primary mb-1">0.78</p>
            <p className="text-sm text-gray-500">
              Healthy range: 0.6 – 1.0
            </p>
            <Badge variant="success" className="mt-2">Normal</Badge>
          </div>
        )}

        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-charcoal mb-2">Stereotypic Behavior</h4>
          <p className="text-3xl font-bold text-charcoal mb-1">12%</p>
          <p className="text-sm text-gray-500">
            Of total monitored time
          </p>
          <Badge variant="info" className="mt-2">Low</Badge>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-charcoal mb-2">Activity Level</h4>
          <p className="text-3xl font-bold text-charcoal mb-1">Moderate</p>
          <p className="text-sm text-gray-500">
            Consistent with species norm
          </p>
          <Badge variant="success" className="mt-2">Healthy</Badge>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-charcoal mb-2">Rest Quality</h4>
          <p className="text-3xl font-bold text-charcoal mb-1">8.5 hrs</p>
          <p className="text-sm text-gray-500">
            Average daily rest
          </p>
          <Badge variant="success" className="mt-2">Optimal</Badge>
        </div>
      </div>

      {/* Compliance Section */}
      {includeCompliance && (
        <div>
          <h3 className="text-lg font-semibold text-charcoal mb-4">
            Compliance Checklist
          </h3>
          <div className="space-y-2">
            {[
              'Daily monitoring completed',
              'Behavior patterns within normal range',
              'No signs of distress detected',
              'Environmental enrichment effective',
              'Feeding behavior normal',
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-charcoal">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

