import { useEffect, useState } from 'react';
import { Smartphone, Search } from 'lucide-react';
import { getPlatformCapabilities, reserveDevice, releaseDevice } from '../../services/api';
import type { DeviceInfo } from '../../types/platform';
import ExportReportButton from '../common/ExportReportButton';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';

export default function MobileDevicesView() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    getPlatformCapabilities()
      .then((data) => setDevices(data.devices || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = devices.filter((d) => {
    const matchSearch =
      !filter ||
      d.name.toLowerCase().includes(filter.toLowerCase()) ||
      d.os.toLowerCase().includes(filter.toLowerCase());
    const matchPlatform =
      platform === 'all' ||
      (platform === 'ios' && d.platform === 'ios') ||
      (platform === 'android' && d.platform === 'android');
    return matchSearch && matchPlatform;
  });

  const handleReserve = async (deviceId: string) => {
    try {
      await reserveDevice(deviceId);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not reserve device');
    }
  };

  const handleRelease = async (deviceId: string) => {
    try {
      await releaseDevice(deviceId);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not release device');
    }
  };
  const handleExportPdf = () => {
    const columns = ['Device Name', 'OS', 'Version', 'Type', 'Status'];
    const data = filtered.map((d: any) => [
      d.name,
      d.os,
      d.osVersion,
      d.type,
      d.status
    ]);
    exportToPdf('Mobile Devices Report', columns, data);
  };

  const handleExportExcel = () => {
    const data = filtered.map((d: any) => ({
      'Device Name': d.name,
      OS: d.os,
      Version: d.osVersion,
      Type: d.type,
      Status: d.status
    }));
    exportToExcel('Mobile Devices Report', data);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <Smartphone className="text-brand-500" /> Real Device Cloud
          </h1>
          <p className="text-slate-400">
            Reserve iOS and Android devices for Appium/WebdriverIO mobile automation.
          </p>
        </div>
        <ExportReportButton onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search devices…"
            className="w-full bg-surface-900 border border-surface-600 rounded-lg py-2 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="bg-surface-900 border border-surface-600 rounded-lg py-2 px-4 text-slate-200 min-w-[150px]"
        >
          <option value="all">All Platforms</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading device catalog…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((device) => (
            <div
              key={device.id}
              className="panel p-5 flex flex-col justify-between hover:border-brand-500/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <Smartphone size={28} className="text-slate-500" />
                <span
                  className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                    device.status === 'available' || device.status === 'Available'
                      ? 'bg-accent-success/20 text-accent-success'
                      : 'bg-accent-warning/20 text-accent-warning'
                  }`}
                >
                  {device.status === 'in_use' ? 'In Use' : device.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">{device.name}</h3>
              <p className="text-sm text-slate-400 mb-4">
                {device.os} {device.osVersion} • {device.type}
              </p>
              {device.status === 'in_use' ? (
                <button
                  type="button"
                  onClick={() => handleRelease(device.id)}
                  className="w-full py-2 rounded-lg border border-surface-600 text-slate-300 hover:bg-surface-700 text-sm"
                >
                  Release Device
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReserve(device.id)}
                  className="btn-primary w-full py-2 text-sm"
                >
                  Reserve Device
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
