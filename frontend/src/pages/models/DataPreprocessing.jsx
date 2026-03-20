import React, { useState } from 'react';
import { FilterX, Clock, Hash, Tag, ArrowRight, Upload, FileSpreadsheet, Table } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const DataPreprocessing = () => {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 21).map(line => line.split(',').map(c => c.trim()));
      setPreview({ headers, rows, totalRows: lines.length - 1 });
    };
    reader.readAsText(f);
  };

  const numericFeatures = [
    'Latitude', 'Longitude', 'Vehicle_Count', 'Traffic_Speed_kmh',
    'Road_Occupancy_Pct', 'Vehicle_Count_Cars', 'Vehicle_Count_Bikes',
    'Vehicle_Count_Buses', 'Vehicle_Count_Trucks', 'Accident_Report',
    'Sentiment_Score', 'horn_events_per_min', 'CO2_Emissions_ppm',
  ];
  const categoricalFeatures = ['Location_ID', 'Traffic_Light_State', 'Weather_Condition'];
  const temporalFeatures = [
    { name: 'hour_sin / hour_cos', desc: t('dp_temp1') },
    { name: 'day_of_week_sin / cos', desc: t('dp_temp2') },
    { name: 'is_weekend', desc: t('dp_temp3') },
    { name: 'is_holiday', desc: t('dp_temp4') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center"><FilterX size={24} /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-dark tracking-tight">{t('dp_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('dp_subtitle')}</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 leading-relaxed max-w-3xl">
          {t('dp_desc')}
        </p>
      </div>

      {/* Upload & Preview */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Upload size={20} className="text-primary" /> {t('dp_preview')}
        </h2>
        <p className="text-xs text-gray-500 mb-4">{t('dp_uploadDesc')}</p>
        <label className="cursor-pointer block">
          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}>
            <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold text-dark dark:text-white">{file ? file.name : t('aqm_clickToSelect')}</p>
            <p className="text-xs text-gray-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : t('dp_previewRows')}</p>
          </div>
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>
      </div>

      {preview && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
            <Table size={20} className="text-secondary" /> {t('dp_rawPreview')} ({preview.totalRows} total rows, showing first {preview.rows.length})
          </h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="text-xs min-w-full">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="py-2 px-2 text-left text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-50 dark:border-gray-800">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-1.5 px-2 text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pipeline Flow */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white mb-4">{t('dp_pipelineArch')}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          {[t('dp_step1'), t('dp_step2'), t('dp_step3'), t('dp_step4'), t('dp_step5')].map((step, idx) => (
            <React.Fragment key={step}>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-center min-w-[140px]">
                <p className="text-sm font-bold text-dark dark:text-white">{step}</p>
              </div>
              {idx < 4 && <ArrowRight size={16} className="text-gray-400 hidden sm:block" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Temporal Features */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Clock size={20} className="text-purple-500" /> {t('dp_temporalFeat')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {temporalFeatures.map((f) => (
            <div key={f.name} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-bold text-dark dark:text-white">{f.name}</p>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Numeric Features */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Hash size={20} className="text-blue-500" /> {t('dp_numeric')} ({numericFeatures.length})
        </h2>
        <p className="text-xs text-gray-500 mb-3">{t('dp_numDesc')}</p>
        <div className="flex flex-wrap gap-2">
          {numericFeatures.map((f) => (
            <span key={f} className="text-xs font-mono font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100">{f}</span>
          ))}
        </div>
      </div>

      {/* Categorical Features */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-dark dark:text-white flex items-center gap-2 mb-4">
          <Tag size={20} className="text-orange-500" /> {t('dp_categorical')} ({categoricalFeatures.length})
        </h2>
        <p className="text-xs text-gray-500 mb-3">{t('dp_catDesc')}</p>
        <div className="flex flex-wrap gap-2">
          {categoricalFeatures.map((f) => (
            <span key={f} className="text-xs font-mono font-semibold bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataPreprocessing;
