import { button, labels } from './ticketingUi';

export default function TicketList({ tickets, onDetail }) {
  return (
<div className="mt-4 overflow-x-auto">
              <table role="table" aria-label="Tiket layanan" className="mobile-data-table w-full text-left text-sm">
                <thead role="rowgroup" className="bg-maroon text-white">
                  <tr role="row">
                    {[
                      'Tiket',
                      'Status / SLA',
                      'Prioritas',
                      'Pelapor / Teknisi',
                      'Aksi',
                    ].map((h) => (
                      <th role="columnheader" scope="col" key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {tickets.map((t) => (
                    <tr role="row" key={t.ticket_id} className="border-b">
                      <td role="cell" data-label="Tiket" className="p-3 break-words"><span aria-hidden="true" className="mobile-cell-label sm:hidden">Tiket</span><div className="min-w-0 sm:contents">
                        <strong>{t.ticket_number}</strong>
                        <p>{t.title}</p>
                        <small>
                          {t.type} · {t.nama_lab || 'Tanpa lab'}
                        </small>
                      </div></td>
                      <td role="cell" data-label="Status / SLA" className="p-3 break-words"><span aria-hidden="true" className="mobile-cell-label sm:hidden">Status / SLA</span><div className="min-w-0 sm:contents">
                        {labels[t.status] || t.status}
                        {t.escalated_at && (
                          <p className="text-maroon">Dieskalasi</p>
                        )}
                        {(t.response_breached || t.resolution_breached) && (
                          <p className="text-red-700">SLA terlewati</p>
                        )}
                      </div></td>
                      <td role="cell" data-label="Prioritas" className="p-3 break-words"><span aria-hidden="true" className="mobile-cell-label sm:hidden">Prioritas</span><div className="min-w-0 sm:contents">{t.priority}</div></td>
                      <td role="cell" data-label="Pelapor / Teknisi" className="p-3 break-words"><span aria-hidden="true" className="mobile-cell-label sm:hidden">Pelapor / Teknisi</span><div className="min-w-0 sm:contents">
                        {t.reporter_name}
                        <p>{t.assignee_name || 'Belum ditugaskan'}</p>
                      </div></td>
                      <td role="cell" data-label="Aksi" className="p-3 break-words"><span aria-hidden="true" className="mobile-cell-label sm:hidden">Aksi</span><div className="min-w-0 sm:contents">
                        <button type="button"
                          className={button}
                          onClick={() => onDetail(t.ticket_id)}
                        >
                          Detail
                        </button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  );
}
