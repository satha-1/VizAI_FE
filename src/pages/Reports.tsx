import { useState } from 'react';
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
import { useGenerateReport, useBehaviorSummary } from '../api/hooks';
import { ReportType, BehaviorType, ExportFormat } from '../types';
import { behaviorColors, formatDuration } from '../api/mockData';

const reportTypes = [
  { value: 'daily_summary', label: 'Daily Behavior Summary', icon: Calendar },
  { value: 'weekly_monthly_trend', label: 'Weekly/Monthly Trend Report', icon: TrendingUp },
  { value: 'behavior_specific', label: 'Behavior-Specific Analysis', icon: Activity },
  { value: 'welfare_assessment', label: 'Welfare Assessment Report', icon: Shield },
];

const behaviors: BehaviorType[] = ['Pacing', 'Recumbent', 'Scratching', 'Self-directed'];

export function ReportsPage() {
  const { dateRange, formatDateRange } = useDateRange();
  const { showToast } = useToast();
  const generateReportMutation = useGenerateReport();

  // Form state
  const [reportType, setReportType] = useState<ReportType>('daily_summary');
  const [selectedBehaviors, setSelectedBehaviors] = useState<BehaviorType[]>(behaviors);
  const [specificBehavior, setSpecificBehavior] = useState<BehaviorType>('Pacing');
  const [showDurationChart, setShowDurationChart] = useState(true);
  const [showCountChart, setShowCountChart] = useState(true);
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [includeDiversityIndex, setIncludeDiversityIndex] = useState(true);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);

  // Get summary data for preview
  const { data: summary } = useBehaviorSummary(
    dateRange.preset,
    dateRange.startDate,
    dateRange.endDate
  );

  const toggleBehavior = (behavior: BehaviorType) => {
    setSelectedBehaviors((prev) =>
      prev.includes(behavior)
        ? prev.filter((b) => b !== behavior)
        : [...prev, behavior]
    );
  };

  const handleGenerateReport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setGeneratedReportUrl(null);

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
        format,
      });

      setGeneratedReportUrl(result.download_url);
      showToast('success', 'Report generated successfully!');
    } catch {
      showToast('error', 'Failed to generate report. Please try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              {behaviors.map((behavior) => (
                <label
                  key={behavior}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBehaviors.includes(behavior)}
                    onChange={() => toggleBehavior(behavior)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: behaviorColors[behavior] }}
                  />
                  <span className="text-sm text-charcoal">{behavior}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional Options based on Report Type */}
          {reportType === 'behavior_specific' && (
            <Dropdown
              label="Specific Behavior"
              options={behaviors.map((b) => ({ value: b, label: b }))}
              value={specificBehavior}
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
              onClick={() => {}}
            >
              Preview Report
            </Button>
            <Button
              className="w-full"
              onClick={() => setShowExportModal(true)}
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
          <div className="border border-gray-200 rounded-xl bg-white p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
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
              />
            )}

            {reportType === 'behavior_specific' && (
              <BehaviorSpecificPreview
                summary={summary}
                behavior={specificBehavior}
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
          setSelectedFormat(null);
          setGeneratedReportUrl(null);
        }}
        title="Export Report"
        size="sm"
      >
        <div className="p-6 space-y-4">
          {!selectedFormat ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Choose an export format for your report
              </p>
              <div className="space-y-2">
                {(['pdf', 'excel', 'powerpoint'] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleGenerateReport(format)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <span className="font-medium text-charcoal capitalize">{format}</span>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-charcoal font-medium">Generating your report...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
                </>
              ) : generatedReportUrl ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-charcoal font-medium mb-4">Report generated!</p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      showToast('info', 'Download would start here in production');
                    }}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download {selectedFormat.toUpperCase()}
                  </Button>
                </>
              ) : null}
            </div>
          )}
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
}: {
  summary?: ReturnType<typeof useBehaviorSummary>['data'];
  showDuration: boolean;
  showCount: boolean;
}) {
  // Generate mock trend data
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      Pacing: Math.floor(Math.random() * 15) + 5,
      Recumbent: Math.floor(Math.random() * 20) + 10,
      Scratching: Math.floor(Math.random() * 10) + 2,
      'Self-directed': Math.floor(Math.random() * 8) + 3,
    };
  });

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
}: {
  summary?: ReturnType<typeof useBehaviorSummary>['data'];
  behavior: BehaviorType;
}) {
  const behaviorData = summary?.behaviors.find((b) => b.behavior_type === behavior);

  // Mock occurrence data
  const occurrences = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toLocaleString(),
    duration: Math.floor(Math.random() * 600) + 30,
  }));

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

