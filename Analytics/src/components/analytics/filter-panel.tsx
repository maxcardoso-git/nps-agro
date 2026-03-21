import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface FilterPanelProps {
  campaignId: string;
  campaignOptions: Array<{ id: string; name: string }>;
  region: string;
  sentiment: string;
  dateFrom: string;
  dateTo: string;
  onCampaignChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSentimentChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  labels: {
    title: string;
    campaign: string;
    region: string;
    sentiment: string;
    dateFrom: string;
    dateTo: string;
    allCampaigns: string;
    allSentiments: string;
  };
}

export function FilterPanel({
  campaignId,
  campaignOptions,
  region,
  sentiment,
  dateFrom,
  dateTo,
  onCampaignChange,
  onRegionChange,
  onSentimentChange,
  onDateFromChange,
  onDateToChange,
  labels
}: FilterPanelProps) {
  return (
    <Card title={labels.title}>
      <div className="grid gap-3 md:grid-cols-5">
        <Select value={campaignId} onChange={(event) => onCampaignChange(event.target.value)}>
          <option value="">{labels.allCampaigns}</option>
          {campaignOptions.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>

        <Input placeholder={labels.region} value={region} onChange={(event) => onRegionChange(event.target.value)} />

        <Select value={sentiment} onChange={(event) => onSentimentChange(event.target.value)}>
          <option value="">{labels.allSentiments}</option>
          <option value="positive">positive</option>
          <option value="neutral">neutral</option>
          <option value="negative">negative</option>
          <option value="mixed">mixed</option>
          <option value="unknown">unknown</option>
        </Select>

        <Input type="date" placeholder={labels.dateFrom} value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        <Input type="date" placeholder={labels.dateTo} value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
      </div>
    </Card>
  );
}
