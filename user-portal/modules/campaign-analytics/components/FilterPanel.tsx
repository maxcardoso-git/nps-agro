import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface FilterPanelProps {
  labels: {
    title: string;
    campaign: string;
    dateFrom: string;
    dateTo: string;
    region: string;
    sentiment: string;
    npsMin: string;
    npsMax: string;
    allCampaigns: string;
    allSentiments: string;
    sentiments: {
      positive: string;
      neutral: string;
      negative: string;
      mixed: string;
      unknown: string;
    };
  };
  campaignId: string;
  campaignOptions: Array<{ id: string; name: string }>;
  dateFrom: string;
  dateTo: string;
  region: string;
  sentiment: string;
  npsMin: string;
  npsMax: string;
  onCampaignChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSentimentChange: (value: string) => void;
  onNpsMinChange: (value: string) => void;
  onNpsMaxChange: (value: string) => void;
}

export function FilterPanel(props: FilterPanelProps) {
  const { labels } = props;

  return (
    <Card title={labels.title}>
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Select value={props.campaignId} onChange={(event) => props.onCampaignChange(event.target.value)}>
          <option value="">{labels.allCampaigns}</option>
          {props.campaignOptions.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
        <Input type="date" value={props.dateFrom} onChange={(event) => props.onDateFromChange(event.target.value)} placeholder={labels.dateFrom} />
        <Input type="date" value={props.dateTo} onChange={(event) => props.onDateToChange(event.target.value)} placeholder={labels.dateTo} />
        <Input value={props.region} onChange={(event) => props.onRegionChange(event.target.value)} placeholder={labels.region} />
        <Select value={props.sentiment} onChange={(event) => props.onSentimentChange(event.target.value)}>
          <option value="">{labels.allSentiments}</option>
          <option value="positive">{labels.sentiments.positive}</option>
          <option value="neutral">{labels.sentiments.neutral}</option>
          <option value="negative">{labels.sentiments.negative}</option>
          <option value="mixed">{labels.sentiments.mixed}</option>
          <option value="unknown">{labels.sentiments.unknown}</option>
        </Select>
        <Input type="number" min={0} max={10} value={props.npsMin} onChange={(event) => props.onNpsMinChange(event.target.value)} placeholder={labels.npsMin} />
        <Input type="number" min={0} max={10} value={props.npsMax} onChange={(event) => props.onNpsMaxChange(event.target.value)} placeholder={labels.npsMax} />
      </div>
    </Card>
  );
}
