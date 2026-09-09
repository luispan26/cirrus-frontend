import { ZONE_COLORS } from '../../lib/kb';
import type { StationCatalogItem } from './types';

export function StationPalette({
  stationsLoading, equipmentLoading, catalogError, stationsError, stationCatalog, equipmentCount, refreshCatalogs, isBenchSelected, assignStation,
}: {
  stationsLoading: boolean;
  equipmentLoading: boolean;
  catalogError: { message: string } | undefined;
  stationsError: unknown;
  stationCatalog: StationCatalogItem[];
  equipmentCount: number;
  refreshCatalogs: () => void;
  isBenchSelected: boolean;
  assignStation: (stationId: string) => void;
}) {
  return <>
    <div className="ls-section-title">Assign stations</div>
    <div className="ls-catalog-status"><span>{stationsLoading || equipmentLoading ? 'Syncing with MongoDB…' : catalogError ? 'Database unavailable' : `${stationCatalog.length} stations · ${equipmentCount} equipment`}</span><button className="btn-out" onClick={refreshCatalogs}>Refresh</button></div>
    {catalogError && <p className="ls-data-error">Could not load the MongoDB catalog through the Cirrus API: {catalogError.message}</p>}
    <p className="ls-help">Select a bench, then add a database station it supports. Stations do not occupy grid space.</p>
    <div className="ls-palette">{stationCatalog.map((s) => <button key={s.stationId} className="ls-palette-item ls-station-choice" disabled={!isBenchSelected} onClick={() => assignStation(s.stationId)}><i style={{ background: ZONE_COLORS[s.zone] || ZONE_COLORS.unassigned }} /><span><b>{s.name}</b><small>Add to selected bench</small></span></button>)}{!stationsLoading && !stationsError && stationCatalog.length === 0 && <p className="ls-help">No stations exist in MongoDB yet.</p>}</div>
  </>;
}
