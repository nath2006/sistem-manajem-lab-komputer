import { field } from './ticketingUi';
import { useState } from 'react';
import FormContainer from '../../Components/FormContainer';

export default function SlaPolicyForm({ options, saving, closeModal, onSubmit }) {
const [policies, setPolicies] = useState(() => (options?.policies || []).map(p => ({...p})));
const [policyNote, setPolicyNote] = useState('');
const [formError, setError] = useState('');
return (<FormContainer
                  title="Target layanan sekolah"
                  description="Contoh target sekolah, bukan angka wajib ISO. Berlaku untuk tiket baru; klasifikasi ulang memakai kebijakan saat ini. Waktu berjalan 24×7, termasuk pending."
                  isSubmitting={saving}
                  onCancel={closeModal}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!policyNote.trim()) {
                      setError('Alasan perubahan kebijakan wajib diisi.');
                      return;
                    }
                    if (policies.some(policy => ['response_minutes', 'resolution_minutes'].some(key => !Number.isSafeInteger(Number(policy[key])) || Number(policy[key]) < 1))) {
                      setError('Target SLA harus berupa bilangan bulat positif.');
                      return;
                    }
                    onSubmit({policies: policies.map(({priority,response_minutes,resolution_minutes}) => ({priority,response_minutes:Number(response_minutes),resolution_minutes:Number(resolution_minutes)})), note:policyNote.trim()});
                  }}
                >
                  {formError && <p role="alert" className="rounded bg-red-100 p-3 text-red-800">{formError}</p>}
<fieldset disabled={saving} className="space-y-4">
                    {policies.map((p, index) => (
                      <div
                        key={p.priority}
                        className="grid gap-3 sm:grid-cols-3"
                      >
                        <strong>{p.priority}</strong>
                        {['response_minutes', 'resolution_minutes'].map(
                          (key) => (
                            <label key={key}>
                              {key === 'response_minutes'
                                ? 'Respons (menit)'
                                : 'Resolusi (menit)'}
                              <input
                                className={field}
                                type="number"
                                min={1}
                                step={1}
                                required
                                value={p[key]}
                                onChange={(e) =>
                                  setPolicies((current) =>
                                    current.map((item, i) =>
                                      i === index
                                        ? { ...item, [key]: e.target.value }
                                        : item
                                    )
                                  )
                                }
                              />
                            </label>
                          )
                        )}
                      </div>
                    ))}
                    <label className="block">
                      Alasan perubahan
                      <textarea
                        className={field}
                        required
                        maxLength={5000}
                        value={policyNote}
                        onChange={(e) => setPolicyNote(e.target.value)}
                      />
                    </label>
                  </fieldset>
                </FormContainer>);
}
