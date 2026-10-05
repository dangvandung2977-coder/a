import { Activity } from 'lucide-react';

export default function AppBrand() {
  return (
    <div className="app-brand" aria-label="GYM PROGRESSION">
      <span className="app-brand-icon" aria-hidden="true"><Activity size={20} /></span>
      <span>GYM <strong>PROGRESSION</strong></span>
    </div>
  );
}
