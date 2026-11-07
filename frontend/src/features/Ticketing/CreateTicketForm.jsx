import { field } from './ticketingUi';
import { useState } from 'react';
import FormContainer from '../../Components/FormContainer';
import { Classification, Select } from './TicketFields';
export default function CreateTicketForm({ options, saving, closeModal, onSubmit }) {
const emptyCreate = {
  title: '',
  description: '',
  type: 'incident',
  category: 'hardware',
  impact: 'medium',
  urgency: 'medium',
  perangkat_id: '',
};

const [create, setCreate] = useState(() => ({...emptyCreate, type: options?.types?.[0] || '', category: options?.categories?.[0] || ''}));
const [formError, setError] = useState('');
return (<FormContainer
                  title="Laporan / permintaan layanan"
                  isSubmitting={saving}
                  onCancel={closeModal}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const payload = {
                      ...create,
                      title: create.title.trim(),
                      description: create.description.trim(),
                    };
                    if (!payload.title || !payload.description) {
                      setError('Judul dan deskripsi wajib diisi.');
                      return;
                    }
                    if (payload.perangkat_id)
                      payload.perangkat_id = Number(payload.perangkat_id);
                    else delete payload.perangkat_id;
                    onSubmit(payload);
                  }}
                >
                  {formError && <p role="alert" className="rounded bg-red-100 p-3 text-red-800">{formError}</p>}
<fieldset disabled={saving} className="space-y-4">
                    <label className="block">
                      Judul
                      <input
                        className={field}
                        maxLength={200}
                        required
                        value={create.title}
                        onChange={(e) =>
                          setCreate({ ...create, title: e.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      Deskripsi
                      <textarea
                        className={field}
                        rows={4}
                        maxLength={5000}
                        required
                        value={create.description}
                        onChange={(e) =>
                          setCreate({ ...create, description: e.target.value })
                        }
                      />
                    </label>
                    <Classification value={create} onChange={setCreate} options={options} />
                    <Select
                      label="Perangkat (opsional)"
                      required={false}
                      value={create.perangkat_id}
                      options={[
                        { value: '', label: 'Tanpa perangkat' },
                        ...(options?.devices || []).map((d) => ({
                          value: d.perangkat_id,
                          label: `${d.nama_perangkat} — ${d.nama_lab}`,
                        })),
                      ]}
                      onChange={(v) =>
                        setCreate({ ...create, perangkat_id: v })
                      }
                    />
                  </fieldset>
                </FormContainer>);
}
