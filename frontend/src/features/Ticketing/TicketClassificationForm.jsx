import { field } from './ticketingUi';
import { useState } from 'react';
import FormContainer from '../../Components/FormContainer';
import { Classification } from './TicketFields';
export default function TicketClassificationForm({ options, saving, closeModal, onSubmit, detail }) {
const [classification, setClassification] = useState(detail);
const [classificationNote, setClassificationNote] = useState('');
const [formError, setError] = useState('');
return (<FormContainer
                          title="Klasifikasi & prioritas"
                          description="Prioritas dihitung dari dampak dan urgensi. Target dihitung dari waktu pembuatan dengan kebijakan saat ini."
                          isSubmitting={saving}
                          onCancel={closeModal}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!classificationNote.trim()) {
                              setError('Alasan klasifikasi wajib diisi.');
                              return;
                            }
                            const { type, category, impact, urgency } =
                              classification;
                            onSubmit({version: detail.version, note: classificationNote.trim(), type, category, impact, urgency});
                          }}
                        >
                          {formError && <p role="alert" className="rounded bg-red-100 p-3 text-red-800">{formError}</p>}
<fieldset disabled={saving} className="space-y-4">
                            <Classification
                              options={options}
                              value={classification}
                              onChange={setClassification}
                            />
                            <label className="block">
                              Alasan perubahan
                              <textarea
                                className={field}
                                required
                                maxLength={5000}
                                value={classificationNote}
                                onChange={(e) =>
                                  setClassificationNote(e.target.value)
                                }
                              />
                            </label>
                          </fieldset>
                        </FormContainer>);
}
